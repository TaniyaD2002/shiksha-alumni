/**
 * Concurrency check for suggestion #7: what happens when two students book the
 * same slot with the same alum at the same instant?
 *
 * It signs in as two accounts, fires both bookings with Promise.all so they hit
 * the database together, and reports which one won. Expected result: exactly
 * one "booked", one "That slot was just booked by someone else."
 *
 * Usage (PowerShell):
 *   $env:VITE_SUPABASE_URL="https://xxx.supabase.co"
 *   $env:VITE_SUPABASE_ANON_KEY="..."
 *   $env:TEST_USER_A="john@example.com"; $env:TEST_PASS_A="..."
 *   $env:TEST_USER_B="jane@example.com"; $env:TEST_PASS_B="..."
 *   node scripts/test-booking-race.mjs
 *
 * Both accounts must already exist and be confirmed.
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

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

const {
  VITE_SUPABASE_URL: url,
  VITE_SUPABASE_ANON_KEY: key,
  TEST_USER_A,
  TEST_PASS_A,
  TEST_USER_B,
  TEST_PASS_B,
} = process.env

const missing = Object.entries({
  VITE_SUPABASE_URL: url,
  VITE_SUPABASE_ANON_KEY: key,
  TEST_USER_A,
  TEST_PASS_A,
  TEST_USER_B,
  TEST_PASS_B,
})
  .filter(([, value]) => !value)
  .map(([name]) => name)

if (missing.length) {
  console.error(`Missing env vars: ${missing.join(', ')}`)
  process.exit(1)
}

async function signIn(email, password) {
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`${email}: ${error.message}`)

  return client
}

/** A slot far enough out that a real user is unlikely to hold it. */
function testSlot() {
  const when = new Date()
  when.setDate(when.getDate() + 6)
  when.setHours(16, 0, 0, 0)
  return when
}

const [a, b] = await Promise.all([
  signIn(TEST_USER_A, TEST_PASS_A),
  signIn(TEST_USER_B, TEST_PASS_B),
])

const { data: alumni, error: alumniError } = await a
  .from('alumni')
  .select('id, name')
  .limit(1)

if (alumniError) throw new Error(alumniError.message)
if (!alumni?.length) throw new Error('No alumni rows to test against.')

const alum = alumni[0]
const slot = testSlot()

console.log(`Alum:  ${alum.name} (${alum.id})`)
console.log(`Slot:  ${slot.toISOString()}`)
console.log('Firing both bookings simultaneously...\n')

const book = (client, label) =>
  client
    .rpc('book_session', {
      p_alumni_id: alum.id,
      p_scheduled_at: slot.toISOString(),
    })
    .then(({ data, error }) => ({
      label,
      ok: !error,
      message: error ? error.message : `booked (id ${data?.id})`,
      client,
      id: data?.id ?? null,
    }))

const results = await Promise.all([book(a, 'A'), book(b, 'B')])

for (const result of results) {
  console.log(`${result.label}: ${result.ok ? 'WON  ' : 'lost '} ${result.message}`)
}

const winners = results.filter((result) => result.ok)
console.log(
  `\n${winners.length === 1 ? 'PASS' : 'FAIL'}: ${winners.length} of 2 bookings succeeded (expected exactly 1).`,
)

// Leave the database as we found it.
for (const winner of winners) {
  if (winner.id) await winner.client.rpc('cancel_booking', { p_booking_id: winner.id })
}

process.exit(winners.length === 1 ? 0 : 1)
