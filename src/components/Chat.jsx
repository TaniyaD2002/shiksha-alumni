import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../lib/authContext'

function timeLabel(iso) {
  return new Date(iso).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function LockIcon() {
  return (
    <svg className="lock-icon" viewBox="0 0 24 24" aria-hidden="true">
      <rect
        x="5"
        y="10.5"
        width="14"
        height="9.5"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default function Chat({ alumni }) {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sending, setSending] = useState(false)
  const endRef = useRef(null)

  const me = user?.id
  const them = alumni.id

  // Bodies are stored encrypted, so the plaintext only ever comes back from
  // thread_messages(). Realtime hands us ciphertext, which is why an INSERT
  // event re-reads the thread instead of appending the payload directly.
  const loadThread = useCallback(async () => {
    const { data, error } = await supabase.rpc('thread_messages', {
      p_other_id: them,
    })

    if (error) setError(error.message)
    else {
      setMessages(data ?? [])
      setError(null)
    }

    setLoading(false)
  }, [them])

  useEffect(() => {
    if (!me) return
    let cancelled = false

    async function refresh() {
      if (cancelled) return
      await loadThread()
    }

    refresh()

    const channel = supabase
      .channel(`chat:${me}:${them}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        ({ new: row }) => {
          const inThread =
            (row.sender_id === me && row.receiver_id === them) ||
            (row.sender_id === them && row.receiver_id === me)
          if (inThread) refresh()
        },
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [me, them, loadThread])

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' })
  }, [messages])

  async function handleSend(event) {
    event.preventDefault()
    const body = draft.trim()
    if (!body || sending) return

    setSending(true)
    setError(null)

    const { data, error } = await supabase.rpc('send_message', {
      p_receiver_id: them,
      p_body: body,
    })

    if (error) {
      setError(error.message)
    } else {
      setDraft('')
      const sent = Array.isArray(data) ? data[0] : data
      if (sent) {
        setMessages((current) =>
          current.some((m) => m.id === sent.id) ? current : [...current, sent],
        )
      }
    }

    setSending(false)
  }

  const firstName = alumni.name?.split(' ')[0] ?? 'them'

  return (
    <section className="panel">
      <div className="panel-head">
        <h2 className="panel-title">Chat with {firstName}</h2>
        <p className="encrypted-note" title="Encrypted at rest with pgcrypto">
          <LockIcon />
          Messages are encrypted
        </p>
      </div>

      <div className="chat-log">
        {loading && <p className="state">Loading conversation…</p>}

        {!loading && messages.length === 0 && (
          <p className="chat-empty">
            No messages yet. Say hello and ask {firstName} a question.
          </p>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`bubble${message.sender_id === me ? ' bubble-mine' : ''}`}
          >
            <p className="bubble-text">{message.message}</p>
            <time className="bubble-time" dateTime={message.created_at}>
              {timeLabel(message.created_at)}
            </time>
          </div>
        ))}

        <div ref={endRef} />
      </div>

      {error && <p className="form-error">{error}</p>}

      <form className="chat-form" onSubmit={handleSend}>
        <label className="sr-only" htmlFor="chat-input">
          Message
        </label>
        <input
          id="chat-input"
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={`Message ${firstName}…`}
          autoComplete="off"
          maxLength={4000}
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={sending || !draft.trim()}
        >
          Send
        </button>
      </form>
    </section>
  )
}
