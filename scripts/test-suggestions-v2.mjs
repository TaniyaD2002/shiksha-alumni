/**
 * Checks for the Version 2 review items that are not visible in a screenshot.
 *
 *   #7  past sessions must not appear under "Your upcoming sessions"
 *   #12 "forgot password" must ask the user database before sending mail
 *
 * #7 runs offline against src/lib/bookings.js. #12 needs the project's Supabase
 * URL and anon key, and needs migration 007 to have been applied — if it has
 * not, that is exactly what this reports.
 *
 * Usage (PowerShell):
 *   node scripts/test-suggestions-v2.mjs
 *
 * Reads .env for VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Set
 * TEST_KNOWN_EMAIL to a real account's address to also check the positive
 * case; without it that one check is skipped rather than failed.
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { isUpcoming, splitBookings } from '../src/lib/bookings.js'

function loadEnvFile() {
  try {
    const text = readFileSync(new URL('../.env', import.meta.url), 'utf8')
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].replace(/^["']|["']$/g, '')
      }
    }
  } catch {
    // No .env file - rely on the real environment.
  }
}

loadEnvFile()

let failures = 0
let skipped = 0

function check(name, passed, detail = '') {
  if (passed) {
    console.log(`  PASS  ${name}`)
  } else {
    failures += 1
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

function skip(name, why) {
  skipped += 1
  console.log(`  SKIP  ${name} — ${why}`)
}

// ------------------------------------------------------- #7 session expiry ---

console.log('\n#7  Past sessions expire off the upcoming list')

const now = new Date('2026-09-12T12:00:00Z').getTime()
const at = (iso) => ({ id: iso, scheduled_at: iso })

const yesterday = at('2026-09-11T12:00:00Z')
const lastHour = at('2026-09-12T11:00:00Z')
const rightNow = at('2026-09-12T12:00:00Z')
const nextHour = at('2026-09-12T13:00:00Z')
const tomorrow = at('2026-09-13T12:00:00Z')

check('a session an hour ago is not upcoming', !isUpcoming(lastHour, now))
check('a session yesterday is not upcoming', !isUpcoming(yesterday, now))
check('a session an hour from now is upcoming', isUpcoming(nextHour, now))
check('a session starting exactly now still counts', isUpcoming(rightNow, now))

const [upcoming, past] = splitBookings(
  [yesterday, lastHour, rightNow, nextHour, tomorrow],
  now,
)

check(
  'split keeps only future sessions in upcoming',
  upcoming.length === 3 && upcoming.every((b) => isUpcoming(b, now)),
  `got ${upcoming.length} upcoming`,
)
check(
  'upcoming stays soonest-first',
  upcoming[0] === rightNow && upcoming[2] === tomorrow,
)
check(
  'past is most-recent-first',
  past.length === 2 && past[0] === lastHour && past[1] === yesterday,
)

// ------------------------------------------------- #12 account_exists RPC ---

console.log('\n#12 Forgot-password checks the address against the database')

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  skip('account_exists reachable', 'VITE_SUPABASE_URL / ANON_KEY not set')
} else {
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const unknown = `no-such-user-${Date.now()}@example.invalid`
  const { data, error } = await client.rpc('account_exists', {
    p_email: unknown,
  })

  if (error) {
    const missing = /could not find the function|does not exist|schema cache/i.test(
      error.message,
    )
    check(
      'account_exists is callable by anon',
      false,
      missing
        ? 'migration 007_account_lookup.sql has not been run on this project'
        : error.message,
    )
  } else {
    check('account_exists is callable by anon', true)
    check(
      'an unregistered address returns false',
      data === false,
      `returned ${JSON.stringify(data)}`,
    )

    const known = process.env.TEST_KNOWN_EMAIL
    if (!known) {
      skip('a registered address returns true', 'set TEST_KNOWN_EMAIL to check')
    } else {
      const hit = await client.rpc('account_exists', { p_email: known })
      check(
        'a registered address returns true',
        hit.data === true,
        hit.error ? hit.error.message : `returned ${JSON.stringify(hit.data)}`,
      )
      const cased = await client.rpc('account_exists', {
        p_email: `  ${known.toUpperCase()}  `,
      })
      check(
        'lookup ignores case and surrounding spaces',
        cased.data === true,
        cased.error ? cased.error.message : `returned ${JSON.stringify(cased.data)}`,
      )
    }
  }
}

console.log(
  `\n${failures === 0 ? 'PASS' : 'FAIL'}: ${failures} failing check(s)` +
    (skipped ? `, ${skipped} skipped.` : '.'),
)

// Set the code rather than calling process.exit(): the Supabase client still
// has sockets open, and tearing them down mid-flight trips a libuv assertion on
// Windows. Node exits on its own once they drain.
process.exitCode = failures === 0 ? 0 : 1
