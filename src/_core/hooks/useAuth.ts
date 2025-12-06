import { useState } from 'react'

export function useAuth() {
  // Stub auth hook - always authenticated for local dev
  const [isAuthenticated] = useState(true)
  const [user] = useState({ id: 'local-user', name: 'Local User' })

  return {
    isAuthenticated,
    user,
    login: () => {},
    logout: () => {},
  }
}
