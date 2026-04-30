import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { api } from '../lib/api'
import { getUser, getToken, setAuth } from '../lib/auth'

interface OnboardingContextType {
  showModal: boolean
  showTour: boolean
  openModal: () => void
  openTour: () => void
  closeModal: () => void
  closeTour: () => void
  skipAndComplete: () => Promise<void>
}

const OnboardingContext = createContext<OnboardingContextType | null>(null)

export function useOnboarding() {
  const ctx = useContext(OnboardingContext)
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider')
  return ctx
}

async function markComplete() {
  const user = getUser()
  const token = getToken()
  if (!user || !token || user.onboardingCompleted) return
  try {
    await api.put('/auth/me', { onboardingCompleted: true })
    setAuth(token, { ...user, onboardingCompleted: true })
  } catch {
    // Non-critical — fail silently
  }
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [showModal, setShowModal] = useState(false)
  const [showTour, setShowTour] = useState(false)

  useEffect(() => {
    const user = getUser()
    if (user && user.onboardingCompleted === false) {
      const timer = setTimeout(() => setShowModal(true), 600)
      return () => clearTimeout(timer)
    }
  }, [])

  const openModal = useCallback(() => {
    setShowTour(false)
    setShowModal(true)
  }, [])

  const openTour = useCallback(() => {
    setShowModal(false)
    setShowTour(true)
  }, [])

  const closeModal = useCallback(async () => {
    setShowModal(false)
    await markComplete()
  }, [])

  const closeTour = useCallback(async () => {
    setShowTour(false)
    await markComplete()
  }, [])

  const skipAndComplete = useCallback(async () => {
    setShowModal(false)
    setShowTour(false)
    await markComplete()
  }, [])

  return (
    <OnboardingContext.Provider value={{ showModal, showTour, openModal, openTour, closeModal, closeTour, skipAndComplete }}>
      {children}
    </OnboardingContext.Provider>
  )
}
