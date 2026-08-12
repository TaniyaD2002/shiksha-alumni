import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../lib/authContext'
import Footer from '../components/Footer'

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

  if (loading) return <p className="state">Loading…</p>
  if (user) return <Navigate to="/alumni" replace />

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setNotice(null)
    setBusy(true)

    if (isSignUp) {
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

  function switchMode() {
    setMode(isSignUp ? 'signin' : 'signup')
    setError(null)
    setNotice(null)
  }

  return (
    <div className="page auth-page">
      <main className="auth-main">
        <div className="auth-card">
          <div className="auth-brand">
            <svg
              className="logo-mark"
              viewBox="0 0 32 32"
              role="presentation"
              aria-hidden="true"
            >
              <path
                d="M16 3 3 9.5 16 16l13-6.5L16 3Z"
                fill="currentColor"
                opacity="0.9"
              />
              <path
                d="M8 13.2v6.6c0 .8.4 1.5 1.1 1.9 4.3 2.5 9.5 2.5 13.8 0 .7-.4 1.1-1.1 1.1-1.9v-6.6L16 18 8 13.2Z"
                fill="currentColor"
                opacity="0.55"
              />
            </svg>
            <span className="logo-word">Shiksha</span>
          </div>

          <h1 className="auth-title">
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className="auth-sub">
            {isSignUp
              ? 'Sign up to reach Shiksha graduates across universities and industries.'
              : 'Sign in to access the Shiksha alumni network.'}
          </p>

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

            <label className="field">
              <span className="field-label">Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 6 characters"
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                minLength={6}
                required
              />
            </label>

            {error && <p className="form-error">{error}</p>}
            {notice && <p className="form-notice">{notice}</p>}

            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <p className="auth-switch">
            {isSignUp ? 'Already have an account?' : 'New to Shiksha?'}{' '}
            <button type="button" className="link-btn" onClick={switchMode}>
              {isSignUp ? 'Sign in' : 'Create one'}
            </button>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  )
}
