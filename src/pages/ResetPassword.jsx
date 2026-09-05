import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import Footer from '../components/Footer'
import Logo from '../components/Logo'
import PasswordField from '../components/PasswordField'

/**
 * Where the "forgot password" email lands. Supabase turns the recovery link
 * into a session as soon as this page loads, so all that is left is to set a
 * new password on the already-signed-in user.
 */
export default function ResetPassword() {
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)
  const [linkValid, setLinkValid] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      setLinkValid(Boolean(data.session))
      setReady(true)
    })

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return
      if (event === 'PASSWORD_RECOVERY' || session) {
        setLinkValid(true)
        setReady(true)
      }
    })

    return () => {
      cancelled = true
      data.subscription.unsubscribe()
    }
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setNotice(null)

    if (password !== confirm) {
      setError('The two passwords do not match.')
      return
    }

    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)

    if (error) {
      setError(error.message)
      return
    }

    setNotice('Password updated. Taking you to the alumni network…')
    setTimeout(() => navigate('/alumni', { replace: true }), 1200)
  }

  return (
    <div className="page auth-page">
      <main className="auth-main">
        <div className="auth-card">
          <div className="auth-brand">
            <Logo to="/" />
          </div>

          <h1 className="auth-title">Set a new password</h1>

          {!ready && <p className="state">Checking your link…</p>}

          {ready && !linkValid && (
            <>
              <p className="auth-sub">
                This reset link is invalid or has expired. Request a fresh one
                from the sign-in page.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => navigate('/login')}
              >
                Back to sign in
              </button>
            </>
          )}

          {ready && linkValid && (
            <>
              <p className="auth-sub">
                Pick something at least 6 characters long.
              </p>

              <form className="auth-form" onSubmit={handleSubmit}>
                <PasswordField
                  label="New password"
                  value={password}
                  onChange={setPassword}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  minLength={6}
                />
                <PasswordField
                  label="Confirm new password"
                  value={confirm}
                  onChange={setConfirm}
                  placeholder="Type it again"
                  autoComplete="new-password"
                  minLength={6}
                />

                {error && <p className="form-error">{error}</p>}
                {notice && <p className="form-notice">{notice}</p>}

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={busy}
                >
                  {busy ? 'Saving…' : 'Update password'}
                </button>
              </form>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
