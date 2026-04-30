import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { isAuthenticated } from './lib/auth'
import AppLayout from './components/layout/AppLayout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import VisionPage from './pages/VisionPage'
import GoalsPage from './pages/GoalsPage'
import HabitsPage from './pages/HabitsPage'
import TimeBlockingPage from './pages/TimeBlockingPage'
import AccountabilityPage from './pages/AccountabilityPage'
import StandupsPage from './pages/StandupsPage'
import AICoachPage from './pages/AICoachPage'
import ReportsPage from './pages/ReportsPage'
import SettingsPage from './pages/SettingsPage'

import { OnboardingProvider } from './context/OnboardingContext'

const queryClient = new QueryClient()

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!isAuthenticated()) return <Navigate to="/login" replace />
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  if (isAuthenticated()) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <OnboardingProvider>
        <Routes>
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="vision" element={<VisionPage />} />
            <Route path="goals" element={<GoalsPage />} />
            <Route path="habits" element={<HabitsPage />} />
            <Route path="time-blocking" element={<TimeBlockingPage />} />
            <Route path="accountability" element={<AccountabilityPage />} />
            <Route path="standups" element={<StandupsPage />} />
            <Route path="ai-coach" element={<AICoachPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </OnboardingProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
