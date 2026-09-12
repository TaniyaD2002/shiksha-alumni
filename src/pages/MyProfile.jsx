import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'
import { displayName, useAuth, userInitials } from '../lib/authContext'
import PasswordField from '../components/PasswordField'

const BUCKET = 'avatars'
const MAX_BYTES = 3 * 1024 * 1024
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

/** "avatars/<uid>/x.png" out of a public URL, so the old file can be removed. */
function storagePathFromUrl(url) {
  if (!url) return null
  const marker = `/object/public/${BUCKET}/`
  const index = url.indexOf(marker)
  return index === -1 ? null : decodeURIComponent(url.slice(index + marker.length))
}

export default function MyProfile() {
  const { user } = useAuth()
  const fileRef = useRef(null)

  const [profile, setProfile] = useState(null)
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [pwError, setPwError] = useState(null)
  const [pwNotice, setPwNotice] = useState(null)
  const [pwBusy, setPwBusy] = useState(false)

  const isGoogleAccount = user?.app_metadata?.provider === 'google'

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, photo_url')
      .eq('id', user.id)
      .maybeSingle()

    if (error) {
      setError(error.message)
    } else {
      const row = data ?? { id: user.id, full_name: null, photo_url: null }
      setProfile(row)
      setFullName(row.full_name ?? displayName(user) ?? '')
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (user) load()
  }, [user, load])

  async function saveProfile(patch) {
    const next = {
      id: user.id,
      ...profile,
      ...patch,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase.from('profiles').upsert(next)
    if (error) throw new Error(error.message)

    // Keep the auth metadata in step so the header avatar matches everywhere.
    await supabase.auth.updateUser({
      data: {
        full_name: next.full_name,
        avatar_url: next.photo_url,
      },
    })

    setProfile(next)
  }

  async function handleDetailsSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setNotice(null)

    try {
      await saveProfile({ full_name: fullName.trim() || null })
      setNotice('Profile saved.')
    } catch (saveError) {
      setError(saveError.message)
    }

    setBusy(false)
  }

  async function handleFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setError(null)
    setNotice(null)

    if (!ACCEPTED.includes(file.type)) {
      setError('Pick a JPG, PNG, WebP, or GIF image.')
      return
    }

    if (file.size > MAX_BYTES) {
      setError('That image is over 3 MB. Pick a smaller one.')
      return
    }

    setBusy(true)

    try {
      const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `${user.id}/avatar-${Date.now()}.${extension}`

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type })

      if (uploadError) throw new Error(uploadError.message)

      const {
        data: { publicUrl },
      } = supabase.storage.from(BUCKET).getPublicUrl(path)

      const previous = storagePathFromUrl(profile?.photo_url)
      await saveProfile({ photo_url: publicUrl })

      if (previous && previous !== path) {
        await supabase.storage.from(BUCKET).remove([previous])
      }

      setNotice('Photo updated.')
    } catch (uploadError) {
      setError(
        `${uploadError.message}. If this mentions a missing bucket, run supabase/migrations/002_avatar_storage.sql.`,
      )
    }

    setBusy(false)
  }

  async function handleRemovePhoto() {
    setBusy(true)
    setError(null)
    setNotice(null)

    try {
      const previous = storagePathFromUrl(profile?.photo_url)
      await saveProfile({ photo_url: null })
      if (previous) await supabase.storage.from(BUCKET).remove([previous])
      setNotice('Photo removed.')
    } catch (removeError) {
      setError(removeError.message)
    }

    setBusy(false)
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault()
    setPwError(null)
    setPwNotice(null)

    if (password !== confirm) {
      setPwError('The two passwords do not match.')
      return
    }

    if (currentPassword === password) {
      setPwError('Pick a password you have not used here before.')
      return
    }

    setPwBusy(true)

    // updateUser() will change the password on the strength of the session
    // alone, which means anyone who walks up to an unlocked browser can lock
    // the real owner out. Re-checking the old password first is what stops
    // that. signInWithPassword() on the current user is the check: it either
    // returns a fresh session for the same account or an invalid-credentials
    // error, and it leaves the existing session in place either way.
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    })

    if (verifyError) {
      setPwBusy(false)
      setPwError('That current password is not right. Try again.')
      return
    }

    const { error } = await supabase.auth.updateUser({ password })
    setPwBusy(false)

    if (error) {
      setPwError(error.message)
      return
    }

    setCurrentPassword('')
    setPassword('')
    setConfirm('')
    setPwNotice('Password updated.')
  }

  if (loading) return <p className="state">Loading your profile…</p>

  return (
    <>
      <section className="hero">
        <h1>My Profile</h1>
        <p className="subtitle">
          Your photo and name are what alumni see when you message them.
        </p>
      </section>

      <section className="panel">
        <h2 className="panel-title">Profile photo</h2>

        <div className="avatar-editor">
          <div className="avatar-preview">
            {profile?.photo_url ? (
              <img src={profile.photo_url} alt="Your profile photo" />
            ) : (
              <span className="avatar-fallback">{userInitials(user)}</span>
            )}
          </div>

          <div className="avatar-controls">
            <p className="avatar-hint">JPG, PNG, WebP or GIF. Up to 3 MB.</p>

            <input
              ref={fileRef}
              type="file"
              className="sr-only"
              accept={ACCEPTED.join(',')}
              onChange={handleFile}
            />

            <div className="avatar-buttons">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => fileRef.current?.click()}
                disabled={busy}
              >
                {profile?.photo_url ? 'Replace photo' : 'Upload photo'}
              </button>

              {profile?.photo_url && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={handleRemovePhoto}
                  disabled={busy}
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="panel">
        <h2 className="panel-title">Your details</h2>

        <form className="stacked-form" onSubmit={handleDetailsSubmit}>
          <label className="field">
            <span className="field-label">Full name</span>
            <input
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Sara Tanwar"
              autoComplete="name"
            />
          </label>

          <label className="field">
            <span className="field-label">Email</span>
            <input type="email" value={user?.email ?? ''} disabled readOnly />
          </label>

          {error && <p className="form-error">{error}</p>}
          {notice && <p className="form-notice">{notice}</p>}

          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </section>

      <section className="panel">
        <h2 className="panel-title">Password</h2>

        {isGoogleAccount ? (
          <p className="muted">
            You sign in with Google, so there is no password to change here.
            Manage it in your Google account.
          </p>
        ) : (
          <form className="stacked-form" onSubmit={handlePasswordSubmit}>
            <PasswordField
              label="Current password"
              value={currentPassword}
              onChange={setCurrentPassword}
              placeholder="The password you sign in with today"
              autoComplete="current-password"
            />
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

            {pwError && <p className="form-error">{pwError}</p>}
            {pwNotice && <p className="form-notice">{pwNotice}</p>}

            <button type="submit" className="btn btn-primary" disabled={pwBusy}>
              {pwBusy ? 'Saving…' : 'Update password'}
            </button>
          </form>
        )}
      </section>
    </>
  )
}
