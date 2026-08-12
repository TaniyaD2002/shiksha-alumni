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

  // Realtime can deliver a row that is already in state (our own insert
  // returns it too), so every write goes through this.
  const addMessage = useCallback((row) => {
    setMessages((current) =>
      current.some((m) => m.id === row.id)
        ? current
        : [...current, row].sort(
            (a, b) => new Date(a.created_at) - new Date(b.created_at),
          ),
    )
  }, [])

  useEffect(() => {
    if (!me) return
    let cancelled = false

    async function loadThread() {
      const { data, error } = await supabase
        .from('messages')
        .select('id, sender_id, receiver_id, message, created_at')
        .or(
          `and(sender_id.eq.${me},receiver_id.eq.${them}),` +
            `and(sender_id.eq.${them},receiver_id.eq.${me})`,
        )
        .order('created_at', { ascending: true })

      if (cancelled) return

      if (error) setError(error.message)
      else setMessages(data ?? [])
      setLoading(false)
    }

    loadThread()

    const channel = supabase
      .channel(`chat:${me}:${them}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        ({ new: row }) => {
          const inThread =
            (row.sender_id === me && row.receiver_id === them) ||
            (row.sender_id === them && row.receiver_id === me)
          if (inThread) addMessage(row)
        },
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [me, them, addMessage])

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' })
  }, [messages])

  async function handleSend(event) {
    event.preventDefault()
    const body = draft.trim()
    if (!body || sending) return

    setSending(true)
    setError(null)

    const { data, error } = await supabase
      .from('messages')
      .insert({ sender_id: me, receiver_id: them, message: body })
      .select()
      .single()

    if (error) {
      setError(error.message)
    } else {
      setDraft('')
      addMessage(data)
    }

    setSending(false)
  }

  const firstName = alumni.name?.split(' ')[0] ?? 'them'

  return (
    <section className="panel">
      <h2 className="panel-title">Chat with {firstName}</h2>

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
