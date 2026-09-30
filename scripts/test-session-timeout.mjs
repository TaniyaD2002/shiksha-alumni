/**
 * Checks the absolute session lifetime in src/lib/session.js.
 *
 * Runs offline — no Supabase connection, no accounts needed.
 *
 *   node scripts/test-session-timeout.mjs
 */
import {
  MAX_SESSION_HOURS,
  expiryTimerDelay,
  isSessionExpired,
  msUntilExpiry,
  sessionExpiresAt,
  sessionStartedAt,
} from '../src/lib/session.js'

let failures = 0

function check(name, passed, detail = '') {
  if (passed) {
    console.log(`  PASS  ${name}`)
  } else {
    failures += 1
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

const HOUR = 60 * 60 * 1000
const now = new Date('2026-09-30T12:00:00Z').getTime()

/** A session that signed in `hoursAgo` before `now`. */
const signedIn = (hoursAgo) => ({
  user: { last_sign_in_at: new Date(now - hoursAgo * HOUR).toISOString() },
})

console.log(`\nAbsolute session lifetime (${MAX_SESSION_HOURS}h)`)

check(
  'a session just signed in is not expired',
  !isSessionExpired(signedIn(0), now),
)
check(
  'a session one hour short of the limit is not expired',
  !isSessionExpired(signedIn(MAX_SESSION_HOURS - 1), now),
)
check(
  'a session exactly at the limit is expired',
  isSessionExpired(signedIn(MAX_SESSION_HOURS), now),
)
check(
  'a session well past the limit is expired',
  isSessionExpired(signedIn(MAX_SESSION_HOURS * 10), now),
)

console.log('\nTime remaining')

check(
  'a fresh session has the full window left',
  msUntilExpiry(signedIn(0), now) === MAX_SESSION_HOURS * HOUR,
  `got ${msUntilExpiry(signedIn(0), now)}`,
)
check(
  'remaining time counts down with age',
  msUntilExpiry(signedIn(2), now) === (MAX_SESSION_HOURS - 2) * HOUR,
)
check(
  'remaining time floors at zero rather than going negative',
  msUntilExpiry(signedIn(MAX_SESSION_HOURS + 5), now) === 0,
)
check(
  'expiry is sign-in time plus the window',
  sessionExpiresAt(signedIn(3), now) ===
    sessionStartedAt(signedIn(3)) + MAX_SESSION_HOURS * HOUR,
)

console.log('\nTimer delay')

check(
  'the timer fires at the moment the session lapses',
  expiryTimerDelay(signedIn(1), now) === (MAX_SESSION_HOURS - 1) * HOUR,
)
check(
  'the delay stays inside setTimeout 32-bit range',
  expiryTimerDelay(signedIn(0), now) <= 2147483647,
)

console.log('\nSessions that cannot be dated')

// A missing or unparseable sign-in time must not log anyone out by surprise.
for (const [label, session] of [
  ['no session', null],
  ['no user', {}],
  ['no last_sign_in_at', { user: {} }],
  ['unparseable timestamp', { user: { last_sign_in_at: 'not a date' } }],
]) {
  check(`${label}: treated as not expired`, !isSessionExpired(session, now))
  check(`${label}: no expiry timer scheduled`, expiryTimerDelay(session, now) === null)
}

console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'}: ${failures} failing check(s).`)

process.exitCode = failures === 0 ? 0 : 1
