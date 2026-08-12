import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../lib/authContext'

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
  const [mine, setMine] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [busy, setBusy] = useState(false)

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
      supabase
        .from('bookings')
        .select('id, scheduled_at, status')
        .eq('alumni_id', alumni.id)
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

    if (!mineResult.error) setMine(mineResult.data ?? [])
    setLoading(false)
  }, [alumni.id])

  useEffect(() => {
    if (!user) return
    loadAvailability()
  }, [user, loadAvailability])

  async function handleBook() {
    if (!selected || busy) return

    setBusy(true)
    setError(null)
    setNotice(null)

    const { error } = await supabase.from('bookings').insert({
      student_id: user.id,
      alumni_id: alumni.id,
      scheduled_at: selected.toISOString(),
    })

    if (error) {
      // 23505 = the unique index on (alumni_id, scheduled_at) fired.
      setError(
        error.code === '23505'
          ? 'That slot was just booked by someone else. Pick another.'
          : error.message,
      )
    } else {
      setNotice(
        `Session booked for ${dayLabel(selected)} at ${timeOnly(selected)}.`,
      )
      setSelected(null)
    }

    await loadAvailability()
    setBusy(false)
  }

  async function handleCancel(id) {
    setBusy(true)
    setError(null)
    setNotice(null)

    const { error } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', id)

    if (error) setError(error.message)
    else setNotice('Booking cancelled.')

    await loadAvailability()
    setBusy(false)
  }

  const firstName = alumni.name?.split(' ')[0] ?? 'this alum'

  return (
    <section className="panel">
      <h2 className="panel-title">Book a session with {firstName}</h2>

      {mine.length > 0 && (
        <div className="my-bookings">
          <h3 className="panel-subtitle">Your upcoming sessions</h3>
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
                    onClick={() => handleCancel(booking.id)}
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
                  const isSelected = selected?.getTime() === slot.getTime()

                  return (
                    <button
                      key={slot.toISOString()}
                      type="button"
                      className={`slot${isSelected ? ' is-selected' : ''}`}
                      disabled={isTaken}
                      aria-pressed={isSelected}
                      onClick={() => setSelected(slot)}
                    >
                      {timeOnly(slot)}
                      {isTaken && <span className="slot-tag">booked</span>}
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
        onClick={handleBook}
        disabled={!selected || busy}
      >
        {selected
          ? `Confirm ${dayLabel(selected)} at ${timeOnly(selected)}`
          : 'Pick a slot'}
      </button>
    </section>
  )
}
