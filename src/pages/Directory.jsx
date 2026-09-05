import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import AlumniImage from '../components/AlumniImage'

const ALL = 'All'

const BASE_FIELDS = [
  'Medicine',
  'Engineering',
  'Law',
  'Business',
  'Computer Science',
  'Arts & Humanities',
]

function AlumniCard({ alum }) {
  const line = [alum.university, alum.current_job].filter(Boolean).join(' · ')

  return (
    <article className="card">
      <div className="card-photo">
        <AlumniImage alum={alum} />
      </div>

      <div className="card-body">
        {alum.field && <span className="badge">{alum.field}</span>}
        <h2 className="card-name">{alum.name}</h2>
        {line && <p className="card-line">{line}</p>}
        {alum.about && <p className="card-about">{alum.about}</p>}
      </div>

      <Link className="view-profile" to={`/alumni/${alum.id}`}>
        View Profile <span aria-hidden="true">→</span>
      </Link>
    </article>
  )
}

export default function Directory() {
  const [alumni, setAlumni] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')
  const [field, setField] = useState(ALL)

  useEffect(() => {
    let cancelled = false

    async function loadAlumni() {
      const { data, error } = await supabase
        .from('alumni')
        .select('id, name, field, university, current_job, about, photo_url')
        .order('name', { ascending: true })

      if (cancelled) return

      if (error) {
        setError(error.message)
      } else {
        setAlumni(data ?? [])
        setError(null)
      }
      setLoading(false)
    }

    loadAlumni()
    return () => {
      cancelled = true
    }
  }, [])

  const fields = useMemo(() => {
    const extra = [...new Set(alumni.map((a) => a.field).filter(Boolean))]
      .filter((f) => !BASE_FIELDS.includes(f))
      .sort((a, b) => a.localeCompare(b))

    return [ALL, ...BASE_FIELDS, ...extra]
  }, [alumni])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()

    return alumni.filter((alum) => {
      if (field !== ALL && alum.field !== field) return false
      if (!q) return true

      return [
        alum.name,
        alum.field,
        alum.university,
        alum.current_job,
        alum.about,
      ].some((value) => value?.toLowerCase().includes(q))
    })
  }, [alumni, query, field])

  return (
    <>
      <section className="hero">
        <h1>Alumni Network</h1>
        <p className="subtitle">
          Connect with Shiksha graduates across universities and industries —
          chat, ask questions, or book a session.
        </p>
      </section>

      <label className="search">
        <span className="sr-only">Search alumni</span>
        <svg
          className="search-icon"
          viewBox="0 0 24 24"
          role="presentation"
          aria-hidden="true"
        >
          <circle
            cx="11"
            cy="11"
            r="6.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="m16 16 4.5 4.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name, university, or job..."
        />
      </label>

      <div className="chips" role="group" aria-label="Filter by field">
        {fields.map((option) => (
          <button
            key={option}
            type="button"
            className={`chip${option === field ? ' is-active' : ''}`}
            aria-pressed={option === field}
            onClick={() => setField(option)}
          >
            {option}
          </button>
        ))}
      </div>

      {loading && <p className="state">Loading alumni…</p>}

      {error && (
        <p className="state state-error">Could not load alumni: {error}</p>
      )}

      {!loading && !error && (
        <>
          <p className="count">
            {visible.length} {visible.length === 1 ? 'alum' : 'alumni'}
          </p>

          {visible.length === 0 ? (
            <p className="state">No alumni match your search.</p>
          ) : (
            <div className="grid">
              {visible.map((alum) => (
                <AlumniCard key={alum.id} alum={alum} />
              ))}
            </div>
          )}
        </>
      )}
    </>
  )
}
