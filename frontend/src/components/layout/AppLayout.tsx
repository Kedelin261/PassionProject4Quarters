import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import OnboardingModal from '../onboarding/OnboardingModal'
import GuidedTourOverlay from '../onboarding/GuidedTourOverlay'

export default function AppLayout() {
  return (
    <div className="flex min-h-screen bg-surface-950">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
      <OnboardingModal />
      <GuidedTourOverlay />
    </div>
  )
}
