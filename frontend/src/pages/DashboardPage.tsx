import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Target, CheckSquare, Calendar, TrendingUp, Zap, Bot } from 'lucide-react'
import { api } from '../lib/api'
import { getUser } from '../lib/auth'
import { Card, CardHeader, CardTitle } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { ProgressBar } from '../components/ui/ProgressBar'
import { Button } from '../components/ui/Button'

export default function DashboardPage() {
  const user = getUser()
  const navigate = useNavigate()
  const [dailyScore, setDailyScore] = useState<any>(null)
  const [weeklyScore, setWeeklyScore] = useState<any>(null)
  const [goals, setGoals] = useState<any[]>([])
  const [todayBlocks, setTodayBlocks] = useState<any[]>([])
  const [todayGoals, setTodayGoals] = useState<any[]>([])
  const [cycle, setCycle] = useState<any>(null)
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    Promise.all([
      api.get(`/scores/daily?date=${today}`).catch(() => ({ data: null })),
      api.get('/scores/weekly').catch(() => ({ data: null })),
      api.get('/goals/tree').catch(() => ({ data: [] })),
      api.get(`/time-blocks?date=${today}`).catch(() => ({ data: [] })),
      api.get('/cycles').catch(() => ({ data: [] })),
    ]).then(([daily, weekly, goalTree, blocks, cycles]) => {
      setDailyScore(daily.data)
      setWeeklyScore(weekly.data)
      setGoals(goalTree.data)
      setTodayBlocks(blocks.data)
      const activeCycle = cycles.data.find((c: any) => c.status === 'active')
      setCycle(activeCycle || null)
      // Flatten daily goals for today
      const allDaily: any[] = []
      goalTree.data.forEach((qg: any) => {
        qg.monthlyGoals?.forEach((mg: any) => {
          mg.weeklyGoals?.forEach((wg: any) => {
            wg.dailyGoals?.forEach((dg: any) => {
              if (dg.date === today) allDaily.push(dg)
            })
          })
        })
      })
      setTodayGoals(allDaily)
    })
  }, [today])

  const scoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-400'
    if (score >= 80) return 'text-brand-400'
    if (score >= 70) return 'text-yellow-400'
    if (score >= 60) return 'text-orange-400'
    return 'text-red-400'
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-surface-400 mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <Button onClick={() => navigate('/ai-coach')} variant="secondary" size="sm">
          <Bot size={16} /> Ask AI Coach
        </Button>
      </div>

      {/* Score Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <Card className="text-center">
          <div className="text-surface-400 text-sm mb-2">Today's Score</div>
          <div className={`text-5xl font-bold ${scoreColor(dailyScore?.score_percentage || 0)}`}>
            {dailyScore?.letter_grade || '—'}
          </div>
          <div className="text-surface-500 text-sm mt-1">{dailyScore?.score_percentage?.toFixed(1) || 0}%</div>
          <ProgressBar value={dailyScore?.score_percentage || 0} className="mt-3" />
        </Card>

        <Card className="text-center">
          <div className="text-surface-400 text-sm mb-2">This Week</div>
          <div className={`text-5xl font-bold ${scoreColor(weeklyScore?.score_percentage || 0)}`}>
            {weeklyScore?.letter_grade || '—'}
          </div>
          <div className="text-surface-500 text-sm mt-1">{weeklyScore?.score_percentage?.toFixed(1) || 0}%</div>
          <ProgressBar value={weeklyScore?.score_percentage || 0} className="mt-3" />
        </Card>

        <Card>
          <div className="text-surface-400 text-sm mb-3">Active Cycle</div>
          {cycle ? (
            <>
              <div className="text-white font-semibold truncate">{cycle.title}</div>
              <Badge status="active" />
              <div className="text-surface-500 text-xs mt-2">
                {cycle.start_date} → {cycle.end_date}
              </div>
            </>
          ) : (
            <div className="text-center py-2">
              <div className="text-surface-500 text-sm mb-2">No active cycle</div>
              <Button size="sm" variant="secondary" onClick={() => navigate('/goals')}>
                Create Cycle
              </Button>
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
        {/* 12-Week Goals */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>12-Week Goals</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => navigate('/goals')}>
                <Target size={14} /> View All
              </Button>
            </div>
          </CardHeader>
          {goals.length === 0 ? (
            <div className="text-center py-6 text-surface-500">
              <Target size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No goals yet</p>
              <Button size="sm" className="mt-3" onClick={() => navigate('/goals')}>Set Goals</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {goals.slice(0, 3).map((g: any) => (
                <div key={g.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white text-sm font-medium truncate flex-1">{g.title}</span>
                    <Badge status={g.status} />
                  </div>
                  <ProgressBar value={g.current_value} max={g.target_value || 100} showLabel />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Today's Goals */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Today's Goals ({todayGoals.filter((g: any) => g.status === 'completed').length}/{todayGoals.length})</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => navigate('/goals')}>
                <CheckSquare size={14} /> Manage
              </Button>
            </div>
          </CardHeader>
          {todayGoals.length === 0 ? (
            <div className="text-center py-6 text-surface-500">
              <CheckSquare size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No daily goals set</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayGoals.slice(0, 6).map((g: any) => (
                <div key={g.id} className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded border-2 flex-shrink-0 ${g.status === 'completed' ? 'bg-emerald-500 border-emerald-500' : 'border-surface-600'}`} />
                  <span className={`text-sm ${g.status === 'completed' ? 'text-surface-500 line-through' : 'text-surface-300'}`}>{g.title}</span>
                  <Badge status={g.status} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Today's Time Blocks */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Today's Schedule</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => navigate('/time-blocking')}>
                <Calendar size={14} /> Calendar
              </Button>
            </div>
          </CardHeader>
          {todayBlocks.length === 0 ? (
            <div className="text-center py-6 text-surface-500">
              <Calendar size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No time blocks scheduled</p>
              <Button size="sm" className="mt-3" onClick={() => navigate('/time-blocking')}>Block Time</Button>
            </div>
          ) : (
            <div className="space-y-2">
              {todayBlocks.map((tb: any) => (
                <div key={tb.id} className="flex items-center gap-3 p-2 bg-surface-800 rounded-lg">
                  <div className="w-2 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: tb.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium truncate">{tb.title}</div>
                    <div className="text-surface-500 text-xs">{tb.start_time} – {tb.end_time}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardTitle className="mb-4">Quick Actions</CardTitle>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Daily Standup', icon: Zap, to: '/standups' },
              { label: 'Track Habits', icon: CheckSquare, to: '/habits' },
              { label: 'Block Time', icon: Calendar, to: '/time-blocking' },
              { label: 'AI Coach', icon: Bot, to: '/ai-coach' },
              { label: 'View Goals', icon: Target, to: '/goals' },
              { label: 'Reports', icon: TrendingUp, to: '/reports' },
            ].map(({ label, icon: Icon, to }) => (
              <button
                key={to}
                onClick={() => navigate(to)}
                className="flex items-center gap-2 p-3 bg-surface-800 hover:bg-surface-700 rounded-lg text-surface-300 hover:text-white transition-all text-sm font-medium"
              >
                <Icon size={16} className="text-brand-400" />
                {label}
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
