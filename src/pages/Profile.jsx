import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import AlumniImage from '../components/AlumniImage'
import Chat from '../components/Chat'
import Booking from '../components/Booking'

export default function Profile() {
  const { id } = useParams()
  const [alum, setAlum] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [panel, setPanel] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setPanel(null)

    async function loadAlum() {
      const { data, error } = await supabase
        .from('alumni')
        .select('id, name, field, university, current_job, about, photo_url')
        .eq('id', id)
        .maybeSingle()

      if (cancelled) return

      if (error) setError(error.message)
      else if (!data) setError('That alumni profile does not exist.')
      else {
        setAlum(data)
        setError(null)
      }
      setLoading(false)
    }

    loadAlum()
    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) return <p className="state">Loading profile…</p>

  if (error) {
    return (
      <>
        <Link className="back-link" to="/alumni">
          <span aria-hidden="true">←</span> Back to directory
        </Link>
        <p className="state state-error">{error}</p>
      </>
    )
  }

  return (
    <>
      <Link className="back-link" to="/alumni">
        <span aria-hidden="true">←</span> Back to directory
      </Link>

      <article className="profile">
        <div className="profile-photo">
          <AlumniImage alum={alum} tall />
        </div>

        <div className="profile-info">
          {alum.field && <span className="badge">{alum.field}</span>}
          <h1 className="profile-name">{alum.name}</h1>

          <dl className="profile-facts">
            {alum.university && (
              <div className="fact">
                <dt>University</dt>
                <dd>{alum.university}</dd>
              </div>
            )}
            {alum.current_job && (
              <div className="fact">
                <dt>Current job</dt>
                <dd>{alum.current_job}</dd>
              </div>
            )}
          </dl>

          {alum.about && (
            <>
              <h2 className="profile-about-title">About</h2>
              <p className="profile-about">{alum.about}</p>
            </>
          )}

          <div className="profile-actions">
            <button
              type="button"
              className={`btn ${panel === 'chat' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setPanel(panel === 'chat' ? null : 'chat')}
            >
              Chat
            </button>
            <button
              type="button"
              className={`btn ${
                panel === 'booking' ? 'btn-primary' : 'btn-ghost'
              }`}
              onClick={() => setPanel(panel === 'booking' ? null : 'booking')}
            >
              Book a Session
            </button>
          </div>
        </div>
      </article>

      {panel === 'chat' && <Chat alumni={alum} />}
      {panel === 'booking' && <Booking alumni={alum} />}
    </>
  )
}
