/**
 * Absolute session lifetime.
 *
 * Supabase keeps a session alive indefinitely: the access token expires every
 * hour, but the client silently swaps it for a new one using the refresh token
 * in localStorage. Sign in once on a shared or stolen laptop and the session is
 * still good weeks later. This puts a hard ceiling on that.
 *
 * The clock starts at sign-in, not at last use, so it is a maximum age rather
 * than an idle timeout — staying active does not extend it. Signing in again
 * starts a fresh window.
 *
 * Worth being clear about what this is and is not: enforcement here is in the
 * browser, so it protects the person using the app, not the app from someone
 * who has already copied the refresh token out of localStorage — that token
 * stays valid until it expires server-side. The matching server-side control is
 * "Time-box user sessions" under Authentication -> Sessions in the Supabase
 * dashboard, which is a Pro-plan feature. Turn it on alongside this if the
 * project is on Pro; see the README.
 */

/** Hours a session may live before the user has to sign in again. */
export const MAX_SESSION_HOURS = 12

const MAX_SESSION_MS = MAX_SESSION_HOURS * 60 * 60 * 1000

/** setTimeout stores its delay in a signed 32-bit int; longer overflows to 0. */
const MAX_TIMER_MS = 2147483647

/**
 * When the session was established.
 *
 * `last_sign_in_at` is the right anchor because it only moves on a real sign-in.
 * The token's own `iat` is no use: it is rewritten every time the token
 * refreshes, so a session anchored to it would never age.
 */
export function sessionStartedAt(session) {
  const stamp = session?.user?.last_sign_in_at
  if (!stamp) return null

  const started = new Date(stamp).getTime()
  return Number.isNaN(started) ? null : started
}

/** Timestamp the session must not outlive, or null if it cannot be dated. */
export function sessionExpiresAt(session) {
  const started = sessionStartedAt(session)
  return started === null ? null : started + MAX_SESSION_MS
}

/**
 * Milliseconds left, floored at 0. Null means "cannot tell" — an undateable
 * session is left alone rather than signed out, so a missing field logs nobody
 * out by surprise.
 */
export function msUntilExpiry(session, now = Date.now()) {
  const expiresAt = sessionExpiresAt(session)
  return expiresAt === null ? null : Math.max(expiresAt - now, 0)
}

export function isSessionExpired(session, now = Date.now()) {
  const expiresAt = sessionExpiresAt(session)
  return expiresAt === null ? false : now >= expiresAt
}

/** Delay for a timer that should fire at expiry, clamped to what setTimeout takes. */
export function expiryTimerDelay(session, now = Date.now()) {
  const remaining = msUntilExpiry(session, now)
  return remaining === null ? null : Math.min(remaining, MAX_TIMER_MS)
}

/**
 * Left behind so the sign-in page can explain the sign-out instead of leaving
 * the user wondering why they were kicked out. sessionStorage rather than
 * localStorage: the note belongs to this tab and should not resurface days
 * later.
 */
export const EXPIRY_NOTICE_KEY = 'session-expired'

export function rememberExpiry() {
  try {
    window.sessionStorage.setItem(EXPIRY_NOTICE_KEY, '1')
  } catch {
    // Private mode or blocked storage - the sign-out still has to happen.
  }
}

/** Reads the note and clears it, so it is shown once. */
export function takeExpiryNotice() {
  try {
    if (!window.sessionStorage.getItem(EXPIRY_NOTICE_KEY)) return null
    window.sessionStorage.removeItem(EXPIRY_NOTICE_KEY)
    return `You were signed out after ${MAX_SESSION_HOURS} hours. Sign in again to carry on.`
  } catch {
    return null
  }
}
