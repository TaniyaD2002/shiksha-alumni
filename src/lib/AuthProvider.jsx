import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { AuthContext } from './authContext'
import {
  expiryTimerDelay,
  isSessionExpired,
  rememberExpiry,
} from './session'

export default function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })

    return () => data.subscription.unsubscribe()
  }, [])

  const endExpiredSession = useCallback(async () => {
    if (!isSessionExpired(session)) return
    rememberExpiry()
    await supabase.auth.signOut()
  }, [session])

  // A session has a maximum age. Three things can end it: the check on mount
  // (covers a tab reopened after the window passed), a timer set for the exact
  // moment it lapses, and a re-check when the tab is looked at again — timers
  // do not fire reliably while a laptop is asleep or the tab is backgrounded.
  useEffect(() => {
    if (!session) return

    endExpiredSession()

    const delay = expiryTimerDelay(session)
    if (delay === null) return

    const timer = setTimeout(endExpiredSession, delay)

    function onVisibility() {
      if (document.visibilityState === 'visible') endExpiredSession()
    }

    window.addEventListener('focus', endExpiredSession)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('focus', endExpiredSession)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [session, endExpiredSession])

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signOut: () => supabase.auth.signOut(),
    }),
    [session, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
