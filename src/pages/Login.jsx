import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../lib/authContext'
import Footer from '../components/Footer'
import Logo from '../components/Logo'
import PasswordField from '../components/PasswordField'

function GoogleMark() {
  return (
    <svg className="google-mark" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.93v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.93a9 9 0 0 0 0 8.1l3.04-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .93 4.95l3.04 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  )
}

const TITLES = {
  signin: 'Welcome back',
  signup: 'Create your account',
  forgot: 'Reset your password',
}

const SUBTITLES = {
  signin: 'Sign in to access the Shiksha alumni network.',
  signup:
    'Sign up to reach Shiksha graduates across universities and industries.',
  forgot: 'Enter your email and we will send you a link to set a new password.',
}

export default function Login() {
  const { user, loading } = useAuth()
  const [mode, setMode] = useState('signin')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [busy, setBusy] = useState(false)

  const isSignUp = mode === 'signup'
  const isForgot = mode === 'forgot'

  if (loading) return <p className="state">Loading…</p>
  if (user) return <Navigate to="/alumni" replace />

  function goTo(nextMode) {
    setMode(nextMode)
    setError(null)
    setNotice(null)
  }

  async function handleGoogle() {
    setError(null)
    setNotice(null)
    setBusy(true)

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/alumni` },
    })

    // On success the browser navigates away, so we only get here on failure.
    if (error) {
      setError(
        `${error.message}. If this says the provider is disabled, turn Google on under Authentication → Providers in the Supabase dashboard.`,
      )
      setBusy(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setNotice(null)
    setBusy(true)

    if (isForgot) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) setError(error.message)
      else setNotice(`If ${email} has an account, a reset link is on its way.`)
    } else if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName.trim() } },
      })

      if (error) {
        setError(error.message)
      } else if (!data.session) {
        // Email confirmation is on: no session until the link is clicked.
        setNotice(`Check ${email} for a confirmation link, then sign in.`)
        setMode('signin')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) setError(error.message)
    }

    setBusy(false)
  }

  function submitLabel() {
    if (busy) return 'Please wait…'
    if (isForgot) return 'Send reset link'
    return isSignUp ? 'Create account' : 'Sign in'
  }

  return (
    <div className="page auth-page">
      <main className="auth-main">
        <div className="auth-card">
          <div className="auth-brand">
            <Logo to="/" />
          </div>

          <h1 className="auth-title">{TITLES[mode]}</h1>
          <p className="auth-sub">{SUBTITLES[mode]}</p>

          {!isForgot && (
            <>
              <button
                type="button"
                className="btn btn-google"
                onClick={handleGoogle}
                disabled={busy}
              >
                <GoogleMark />
                Continue with Google
              </button>

              <div className="auth-divider">
                <span>or use your email</span>
              </div>
            </>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            {isSignUp && (
              <label className="field">
                <span className="field-label">Full name</span>
                <input
                  type="text"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Sara Tanwar"
                  autoComplete="name"
                  required
                />
              </label>
            )}

            <label className="field">
              <span className="field-label">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </label>

            {!isForgot && (
              <PasswordField
                value={password}
                onChange={setPassword}
                placeholder="At least 6 characters"
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                minLength={6}
              />
            )}

            {mode === 'signin' && (
              <p className="auth-forgot">
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => goTo('forgot')}
                >
                  Forgot your password?
                </button>
              </p>
            )}

            {error && <p className="form-error">{error}</p>}
            {notice && <p className="form-notice">{notice}</p>}

            <button type="submit" className="btn btn-primary" disabled={busy}>
              {submitLabel()}
            </button>
          </form>

          <p className="auth-switch">
            {isForgot && (
              <>
                Remembered it?{' '}
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => goTo('signin')}
                >
                  Back to sign in
                </button>
              </>
            )}

            {isSignUp && (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => goTo('signin')}
                >
                  Sign in
                </button>
              </>
            )}

            {mode === 'signin' && (
              <>
                New to Shiksha?{' '}
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => goTo('signup')}
                >
                  Create one
                </button>
              </>
            )}
          </p>
        </div>
      </main>

      <Footer />
    </div>
  )
}
