import { useState } from 'react'
import { Settings, Save, User } from 'lucide-react'
import { api } from '../lib/api'
import { getUser, setAuth, getToken } from '../lib/auth'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'

export default function SettingsPage() {
  const user = getUser()
  const [name, setName] = useState(user?.name || '')
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)

  async function save() {
    setLoading(true)
    const { data } = await api.put('/auth/me', { name })
    setAuth(getToken()!, data)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    setLoading(false)
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-surface-800 rounded-xl flex items-center justify-center">
          <Settings size={20} className="text-surface-300" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-surface-400 text-sm">Manage your account</p>
        </div>
      </div>

      {saved && (
        <div className="mb-5 p-3 bg-emerald-600/20 border border-emerald-600/30 rounded-lg text-emerald-400 text-sm">
          Settings saved.
        </div>
      )}

      <Card>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 bg-brand-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
            {user?.name?.charAt(0)?.toUpperCase()}
          </div>
          <div>
            <div className="text-white font-semibold">{user?.name}</div>
            <div className="text-surface-400 text-sm">{user?.email}</div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-surface-300 text-sm font-medium mb-1.5">Display Name</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-brand-500" />
          </div>
          <div>
            <label className="block text-surface-300 text-sm font-medium mb-1.5">Email</label>
            <input value={user?.email} disabled
              className="w-full bg-surface-700/50 border border-surface-700 rounded-lg px-3 py-2.5 text-surface-400 cursor-not-allowed" />
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={save} loading={loading}><Save size={16} /> Save Changes</Button>
          </div>
        </div>
      </Card>

      <Card className="mt-5">
        <h3 className="text-white font-semibold mb-4">About 4 Quarters</h3>
        <div className="space-y-2 text-surface-400 text-sm">
          <div className="flex justify-between"><span>Version</span><span className="text-white">1.0.0</span></div>
          <div className="flex justify-between"><span>Method</span><span className="text-white">The 12 Week Year</span></div>
          <div className="flex justify-between"><span>Stack</span><span className="text-white">React + Hono + SQLite</span></div>
        </div>
      </Card>
    </div>
  )
}
