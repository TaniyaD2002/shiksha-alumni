import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../lib/authContext'
import { alumniPhoto } from '../lib/avatar'
import ConfirmDialog from '../components/ConfirmDialog'

function whenLabel(iso) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function SessionRow({ booking, past, onCancel, busy }) {
  const alum = booking.alumni

  return (
    <li className={`session-row${past ? ' is-past' : ''}`}>
      <img
        className="session-photo"
        src={alumniPhoto(alum, 120)}
        alt=""
        loading="lazy"
      />

      <div className="session-main">
        <p className="session-when">{whenLabel(booking.scheduled_at)}</p>
        <p className="session-who">
          {alum ? (
            <Link to={`/alumni/${alum.id}`}>{alum.name}</Link>
          ) : (
            'Unknown alum'
          )}
          {alum?.field && <span className="session-field"> · {alum.field}</span>}
        </p>
      </div>

      {!past && (
        <button
          type="button"
          className="link-btn"
          onClick={() => onCancel(booking)}
          disabled={busy}
        >
          Cancel
        </button>
      )}
    </li>
  )
}

/**
 * Every booking the signed-in student holds, across all alumni — the same rows
 * that used to be reachable only from one alum's booking panel.
 */
export default function Sessions() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [pending, setPending] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select(
        'id, scheduled_at, status, alumni:alumni_id (id, name, field, photo_url)',
      )
      .eq('status', 'confirmed')
      .order('scheduled_at', { ascending: true })

    if (error) setError(error.message)
    else {
      setBookings(data ?? [])
      setError(null)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (user) load()
  }, [user, load])

  const [upcoming, past] = useMemo(() => {
    const now = Date.now()
    const ahead = []
    const behind = []

    for (const booking of bookings) {
      if (new Date(booking.scheduled_at).getTime() >= now) ahead.push(booking)
      else behind.push(booking)
    }

    behind.reverse()
    return [ahead, behind]
  }, [bookings])

  async function confirmCancel() {
    setBusy(true)
    setError(null)
    setNotice(null)

    const { error } = await supabase.rpc('cancel_booking', {
      p_booking_id: pending.id,
    })

    if (error) setError(error.message)
    else setNotice('Booking cancelled.')

    setPending(null)
    await load()
    setBusy(false)
  }

  return (
    <>
      <section className="hero">
        <h1>Your Sessions</h1>
        <p className="subtitle">
          Every session you have booked with a Shiksha alum, in one place.
        </p>
      </section>

      {loading && <p className="state">Loading your sessions…</p>}
      {error && <p className="state state-error">{error}</p>}
      {notice && <p className="form-notice">{notice}</p>}

      {!loading && !error && bookings.length === 0 && (
        <div className="empty-state">
          <p>You have not booked a session yet.</p>
          <Link className="btn btn-primary" to="/alumni">
            Find an alum
          </Link>
        </div>
      )}

      {upcoming.length > 0 && (
        <section className="panel">
          <h2 className="panel-title">Upcoming</h2>
          <ul className="session-list">
            {upcoming.map((booking) => (
              <SessionRow
                key={booking.id}
                booking={booking}
                onCancel={setPending}
                busy={busy}
              />
            ))}
          </ul>
        </section>
      )}

      {past.length > 0 && (
        <section className="panel">
          <h2 className="panel-title">Past</h2>
          <ul className="session-list">
            {past.map((booking) => (
              <SessionRow key={booking.id} booking={booking} past />
            ))}
          </ul>
        </section>
      )}

      <ConfirmDialog
        open={Boolean(pending)}
        title="Cancel this session?"
        message={
          pending
            ? `Your session with ${pending.alumni?.name ?? 'this alum'} on ${whenLabel(
                pending.scheduled_at,
              )} will be released and someone else can take the slot.`
            : ''
        }
        confirmLabel="Yes, cancel it"
        cancelLabel="Keep it"
        busy={busy}
        onConfirm={confirmCancel}
        onCancel={() => setPending(null)}
      />
    </>
  )
}
