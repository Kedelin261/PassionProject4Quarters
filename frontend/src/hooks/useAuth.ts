import { useState } from 'react'
import { api } from '../lib/api'
import { setAuth, clearAuth, getUser, isAuthenticated } from '../lib/auth'
import type { User } from '../types'

export function useAuth() {
  const [user, setUser] = useState<User | null>(getUser())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function register(name: string, email: string, password: string) {
    setLoading(true); setError(null)
    try {
      const { data } = await api.post('/auth/register', { name, email, password })
      setAuth(data.token, data.user)
      setUser(data.user)
      return data.user
    } catch (e: any) {
      setError(e.response?.data?.error || 'Registration failed')
      throw e
    } finally { setLoading(false) }
  }

  async function login(email: string, password: string) {
    setLoading(true); setError(null)
    try {
      const { data } = await api.post('/auth/login', { email, password })
      setAuth(data.token, data.user)
      setUser(data.user)
      return data.user
    } catch (e: any) {
      setError(e.response?.data?.error || 'Login failed')
      throw e
    } finally { setLoading(false) }
  }

  async function logout() {
    try { await api.post('/auth/logout') } catch {}
    clearAuth()
    setUser(null)
    window.location.href = '/login'
  }

  return { user, loading, error, register, login, logout, isAuthenticated: isAuthenticated() }
}
