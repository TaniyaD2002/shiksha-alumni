import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../lib/authContext'
import { isUpcoming } from '../lib/bookings'
import ConfirmDialog from './ConfirmDialog'

const SLOT_HOURS = [10, 12, 14, 16]
const DAYS_AHEAD = 7

/** Next 7 days of fixed slots, in the student's local timezone. */
function buildSlots() {
  const slots = []
  const now = new Date()

  for (let day = 0; day < DAYS_AHEAD; day += 1) {
    for (const hour of SLOT_HOURS) {
      const start = new Date(now)
      start.setDate(start.getDate() + day)
      start.setHours(hour, 0, 0, 0)
      if (start > now) slots.push(start)
    }
  }

  return slots
}

function dayLabel(date) {
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

function timeOnly(date) {
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function Booking({ alumni }) {
  const { user } = useAuth()
  const [taken, setTaken] = useState(new Set())
  const [myBusy, setMyBusy] = useState(new Set())
  const [mine, setMine] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [busy, setBusy] = useState(false)
  const [pendingCancel, setPendingCancel] = useState(null)
  const [pendingBook, setPendingBook] = useState(null)

  const slots = useMemo(buildSlots, [])

  const days = useMemo(() => {
    const grouped = new Map()
    for (const slot of slots) {
      const key = slot.toDateString()
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key).push(slot)
    }
    return [...grouped.entries()]
  }, [slots])

  const loadAvailability = useCallback(async () => {
    const [takenResult, mineResult] = await Promise.all([
      supabase.rpc('taken_slots', { p_alumni_id: alumni.id }),
      // Row level security limits this to the signed-in student's own rows, so
      // it covers every alum they have booked - not just this one.
      supabase
        .from('bookings')
        .select('id, alumni_id, scheduled_at, status')
        .eq('status', 'confirmed')
        .order('scheduled_at', { ascending: true }),
    ])

    if (takenResult.error) {
      setError(takenResult.error.message)
    } else {
      setTaken(
        new Set(
          (takenResult.data ?? []).map((row) =>
            new Date(row.scheduled_at).getTime(),
          ),
        ),
      )
    }

    if (!mineResult.error) {
      const rows = mineResult.data ?? []
      // "Upcoming" has to mean upcoming: a session whose time has passed
      // belongs in the history on /sessions, not in a list offering to cancel
      // it.
      const now = Date.now()
      setMine(
        rows.filter(
          (row) => row.alumni_id === alumni.id && isUpcoming(row, now),
        ),
      )
      setMyBusy(
        new Set(rows.map((row) => new Date(row.scheduled_at).getTime())),
      )
    }
    setLoading(false)
  }, [alumni.id])

  useEffect(() => {
    if (!user) return
    loadAvailability()
  }, [user, loadAvailability])

  async function confirmBook() {
    if (!pendingBook || busy) return

    setBusy(true)
    setError(null)
    setNotice(null)

    // book_session() inserts in a single statement, so when two students pick
    // the same slot at the same instant the unique index decides it: the first
    // transaction to commit keeps the booking, the other is told to pick again.
    const { error } = await supabase.rpc('book_session', {
      p_alumni_id: alumni.id,
      p_scheduled_at: pendingBook.toISOString(),
    })

    if (error) {
      setError(error.message)
    } else {
      setNotice(
        `Session booked for ${dayLabel(pendingBook)} at ${timeOnly(pendingBook)}.`,
      )
      setSelected(null)
    }

    setPendingBook(null)
    await loadAvailability()
    setBusy(false)
  }

  async function confirmCancel() {
    setBusy(true)
    setError(null)
    setNotice(null)

    const { error } = await supabase.rpc('cancel_booking', {
      p_booking_id: pendingCancel.id,
    })

    if (error) setError(error.message)
    else setNotice('Booking cancelled.')

    setPendingCancel(null)
    await loadAvailability()
    setBusy(false)
  }

  const firstName = alumni.name?.split(' ')[0] ?? 'this alum'
  const pendingWhen = pendingCancel && new Date(pendingCancel.scheduled_at)

  return (
    <section className="panel">
      <h2 className="panel-title">Book a session with {firstName}</h2>

      {mine.length > 0 && (
        <div className="my-bookings">
          <div className="my-bookings-head">
            <h3 className="panel-subtitle">Your upcoming sessions</h3>
            <Link className="btn btn-small btn-accent" to="/sessions">
              See all your sessions <span aria-hidden="true">→</span>
            </Link>
          </div>

          <ul className="booking-list">
            {mine.map((booking) => {
              const when = new Date(booking.scheduled_at)
              return (
                <li key={booking.id}>
                  <span>
                    {dayLabel(when)} · {timeOnly(when)}
                  </span>
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => setPendingCancel(booking)}
                    disabled={busy}
                  >
                    Cancel
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {loading ? (
        <p className="state">Loading available slots…</p>
      ) : (
        <div className="slot-days">
          {days.map(([key, daySlots]) => (
            <div className="slot-day" key={key}>
              <h3 className="slot-day-label">{dayLabel(daySlots[0])}</h3>
              <div className="slot-row">
                {daySlots.map((slot) => {
                  const isTaken = taken.has(slot.getTime())
                  // Busy elsewhere: the student already has another alum at
                  // this time, so the database would reject the insert.
                  const isClash = !isTaken && myBusy.has(slot.getTime())
                  const isSelected = selected?.getTime() === slot.getTime()

                  return (
                    <button
                      key={slot.toISOString()}
                      type="button"
                      className={`slot${isSelected ? ' is-selected' : ''}`}
                      disabled={isTaken || isClash}
                      aria-pressed={isSelected}
                      title={
                        isClash
                          ? 'You already have another session at this time'
                          : undefined
                      }
                      onClick={() => setSelected(slot)}
                    >
                      {timeOnly(slot)}
                      {isTaken && <span className="slot-tag">booked</span>}
                      {isClash && <span className="slot-tag">you are busy</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <p className="form-error">{error}</p>}
      {notice && <p className="form-notice">{notice}</p>}

      <button
        type="button"
        className="btn btn-primary"
        onClick={() => setPendingBook(selected)}
        disabled={!selected || busy}
      >
        {selected
          ? `Confirm ${dayLabel(selected)} at ${timeOnly(selected)}`
          : 'Pick a slot'}
      </button>

      <ConfirmDialog
        open={Boolean(pendingBook)}
        title="Book this session?"
        message={
          pendingBook
            ? `You are booking ${dayLabel(pendingBook)} at ${timeOnly(
                pendingBook,
              )} with ${firstName}. The slot is held for you until you cancel it.`
            : ''
        }
        confirmLabel="Yes, book it"
        cancelLabel="Go back"
        tone="primary"
        busy={busy}
        onConfirm={confirmBook}
        onCancel={() => setPendingBook(null)}
      />

      <ConfirmDialog
        open={Boolean(pendingCancel)}
        title="Cancel this session?"
        message={
          pendingWhen
            ? `Your session with ${firstName} on ${dayLabel(pendingWhen)} at ${timeOnly(
                pendingWhen,
              )} will be released and someone else can take the slot.`
            : ''
        }
        confirmLabel="Yes, cancel it"
        cancelLabel="Keep it"
        busy={busy}
        onConfirm={confirmCancel}
        onCancel={() => setPendingCancel(null)}
      />
    </section>
  )
}
