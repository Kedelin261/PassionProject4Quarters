import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Eye, Target, CheckSquare, Calendar,
  Users, MessageSquare, Bot, BarChart3, Settings, LogOut,
  Zap
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import clsx from 'clsx'

const nav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/vision', icon: Eye, label: 'Vision' },
  { to: '/goals', icon: Target, label: 'Goals' },
  { to: '/habits', icon: CheckSquare, label: 'Habit Tracker' },
  { to: '/time-blocking', icon: Calendar, label: 'Time Blocking' },
  { to: '/accountability', icon: Users, label: 'Accountability' },
  { to: '/standups', icon: MessageSquare, label: 'Standups' },
  { to: '/ai-coach', icon: Bot, label: 'AI Coach' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <aside className="w-64 min-h-screen bg-surface-900 border-r border-surface-800 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-surface-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-600 rounded-lg flex items-center justify-center">
            <Zap size={20} className="text-white" />
          </div>
          <div>
            <div className="font-bold text-white text-lg leading-none">4 Quarters</div>
            <div className="text-surface-400 text-xs mt-0.5">Execute. Every. Day.</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-brand-600/20 text-brand-400 border border-brand-600/30'
                  : 'text-surface-400 hover:text-white hover:bg-surface-800'
              )
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-surface-800">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-sm font-bold">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-sm font-medium truncate">{user?.name}</div>
            <div className="text-surface-500 text-xs truncate">{user?.email}</div>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800 text-sm transition-all"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
