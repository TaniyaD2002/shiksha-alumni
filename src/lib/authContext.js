import { createContext, useContext } from 'react'

export const AuthContext = createContext(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}

/** "Sara Tanwar" -> "ST", falling back to the email address. */
export function userInitials(user) {
  if (!user) return '?'

  const name = user.user_metadata?.full_name?.trim()
  const source = name || user.email?.split('@')[0] || ''
  const parts = source.split(/[\s._-]+/).filter(Boolean)

  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()

  return (parts[0][0] + parts[1][0]).toUpperCase()
}

export function displayName(user) {
  return user?.user_metadata?.full_name?.trim() || user?.email || 'there'
}
