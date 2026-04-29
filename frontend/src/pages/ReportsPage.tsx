import { useEffect, useState } from 'react'
import { BarChart3, TrendingUp, CheckSquare, Calendar } from 'lucide-react'
import { api } from '../lib/api'
import { Card, CardHeader, CardTitle } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { ProgressBar } from '../components/ui/ProgressBar'

export default function ReportsPage() {
  const [view, setView] = useState<'daily' | 'weekly' | 'quarterly'>('daily')
  const [daily, setDaily] = useState<any>(null)
  const [weekly, setWeekly] = useState<any>(null)
  const [quarterly, setQuarterly] = useState<any>(null)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    if (view === 'daily') api.get(`/reports/daily?date=${date}`).then(r => setDaily(r.data)).catch(() => {})
    if (view === 'weekly') api.get('/reports/weekly').then(r => setWeekly(r.data)).catch(() => {})
    if (view === 'quarterly') api.get('/reports/quarterly').then(r => setQuarterly(r.data)).catch(() => setQuarterly(null))
  }, [view, date])

  const scoreColor = (s: number) => s >= 90 ? 'text-emerald-400' : s >= 80 ? 'text-brand-400' : s >= 70 ? 'text-yellow-400' : s >= 60 ? 'text-orange-400' : 'text-red-400'

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports</h1>
          <p className="text-surface-400 text-sm">Your execution data. No sugarcoating.</p>
        </div>
        <div className="flex bg-surface-800 rounded-lg p-1">
          {(['daily', 'weekly', 'quarterly'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-all capitalize ${view === v ? 'bg-brand-600 text-white' : 'text-surface-400 hover:text-white'}`}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {view === 'daily' && (
        <div>
          <div className="mb-5 flex gap-3 items-center">
            <label className="text-surface-400 text-sm">Date:</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="bg-surface-800 border border-surface-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-brand-500" />
          </div>
          {daily && (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-4">
                <Card className="text-center">
                  <div className="text-surface-400 text-xs mb-2">Daily Score</div>
                  <div className={`text-4xl font-bold ${scoreColor(+daily.score)}`}>{daily.grade}</div>
                  <div className="text-surface-500 text-sm mt-1">{daily.score}%</div>
                </Card>
                <Card className="text-center">
                  <div className="text-surface-400 text-xs mb-2">Goals</div>
                  <div className="text-3xl font-bold text-white">{daily.dailyGoals.completed}/{daily.dailyGoals.total}</div>
                  <div className="text-surface-500 text-xs mt-1">{daily.dailyGoals.missed} missed</div>
                </Card>
                <Card className="text-center">
                  <div className="text-surface-400 text-xs mb-2">Habits</div>
                  <div className="text-3xl font-bold text-white">{daily.habits.successful}/{daily.habits.total}</div>
                  <div className="text-surface-500 text-xs mt-1">success</div>
                </Card>
              </div>

              <Card>
                <CardHeader><CardTitle>Daily Goals</CardTitle></CardHeader>
                {daily.dailyGoals.items.length === 0
                  ? <p className="text-surface-500 text-sm">No daily goals for this date.</p>
                  : <div className="space-y-2">
                    {daily.dailyGoals.items.map((g: any) => (
                      <div key={g.id} className="flex items-center justify-between">
                        <span className={`text-sm ${g.status === 'completed' ? 'text-surface-500 line-through' : 'text-surface-200'}`}>{g.title}</span>
                        <Badge status={g.status} />
                      </div>
                    ))}
                  </div>
                }
              </Card>

              {daily.timeBlocks.length > 0 && (
                <Card>
                  <CardHeader><CardTitle>Time Blocks</CardTitle></CardHeader>
                  <div className="space-y-2">
                    {daily.timeBlocks.map((tb: any) => (
                      <div key={tb.id} className="flex items-center gap-3">
                        <div className="w-2 h-5 rounded-full" style={{ backgroundColor: tb.color }} />
                        <span className="text-surface-200 text-sm">{tb.title}</span>
                        <span className="text-surface-500 text-xs ml-auto">{tb.start_time}–{tb.end_time}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      {view === 'weekly' && weekly && (
        <div className="space-y-5">
          <div className="grid grid-cols-4 gap-4">
            <Card className="text-center">
              <div className="text-surface-400 text-xs mb-2">Weekly Score</div>
              <div className={`text-4xl font-bold ${scoreColor(+weekly.score)}`}>{weekly.grade}</div>
              <div className="text-surface-500 text-sm mt-1">{weekly.score}%</div>
            </Card>
            <Card className="text-center">
              <div className="text-surface-400 text-xs mb-2">Weekly Goals</div>
              <div className="text-3xl font-bold text-white">{weekly.weeklyGoals.completed}/{weekly.weeklyGoals.total}</div>
            </Card>
            <Card className="text-center">
              <div className="text-surface-400 text-xs mb-2">Daily Goals</div>
              <div className="text-3xl font-bold text-white">{weekly.dailyGoals.completed}/{weekly.dailyGoals.total}</div>
            </Card>
            <Card className="text-center">
              <div className="text-surface-400 text-xs mb-2">Habits</div>
              <div className="text-3xl font-bold text-white">{weekly.habits.successful}/{weekly.habits.total}</div>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Daily Scores This Week</CardTitle></CardHeader>
            {weekly.dailyScores.length === 0
              ? <p className="text-surface-500 text-sm">No daily scores recorded yet.</p>
              : <div className="space-y-3">
                {weekly.dailyScores.map((ds: any) => (
                  <div key={ds.date} className="flex items-center gap-3">
                    <span className="text-surface-400 text-sm w-24">{ds.date}</span>
                    <ProgressBar value={ds.score_percentage} className="flex-1" />
                    <Badge status={ds.letter_grade}>{ds.letter_grade}</Badge>
                  </div>
                ))}
              </div>
            }
          </Card>
        </div>
      )}

      {view === 'quarterly' && (
        quarterly === null ? (
          <Card className="text-center py-12">
            <BarChart3 size={48} className="mx-auto mb-4 text-surface-600" />
            <div className="text-surface-400 text-lg font-medium">No Active Cycle</div>
            <p className="text-surface-500 text-sm mt-1">Create a 12-week cycle and start executing to see quarterly reports.</p>
          </Card>
        ) : (
          <div className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>{quarterly.cycle.title}</CardTitle>
                <div className="text-surface-400 text-sm">{quarterly.cycle.start_date} → {quarterly.cycle.end_date}</div>
              </CardHeader>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-surface-400 text-xs mb-1">Daily Goal Completion</div>
                  <div className="text-2xl font-bold text-white">{quarterly.dailyGoalCompletion.completed}/{quarterly.dailyGoalCompletion.total}</div>
                  <ProgressBar value={quarterly.dailyGoalCompletion.completed} max={quarterly.dailyGoalCompletion.total || 1} className="mt-2" />
                </div>
                <div className="text-center">
                  <div className="text-surface-400 text-xs mb-1">Habit Completion</div>
                  <div className="text-2xl font-bold text-white">{quarterly.habitCompletion.successful}/{quarterly.habitCompletion.total}</div>
                  <ProgressBar value={quarterly.habitCompletion.successful} max={quarterly.habitCompletion.total || 1} className="mt-2" colorClass="bg-emerald-500" />
                </div>
                <div className="text-center">
                  <div className="text-surface-400 text-xs mb-1">12-Week Goals</div>
                  <div className="text-2xl font-bold text-white">{quarterly.quarterGoals.filter((g: any) => g.status === 'completed').length}/{quarterly.quarterGoals.length}</div>
                </div>
              </div>
            </Card>

            <Card>
              <CardHeader><CardTitle>12-Week Goal Status</CardTitle></CardHeader>
              <div className="space-y-3">
                {quarterly.quarterGoals.map((g: any) => (
                  <div key={g.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white text-sm font-medium">{g.title}</span>
                      <Badge status={g.status} />
                    </div>
                    <ProgressBar value={g.current_value} max={g.target_value || 100} showLabel />
                  </div>
                ))}
              </div>
            </Card>

            {quarterly.weeklyScores.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Weekly Score History</CardTitle></CardHeader>
                <div className="space-y-2">
                  {quarterly.weeklyScores.map((ws: any) => (
                    <div key={ws.week_start_date} className="flex items-center gap-3">
                      <span className="text-surface-400 text-xs w-24">Week of {ws.week_start_date}</span>
                      <ProgressBar value={ws.score_percentage} className="flex-1" />
                      <Badge status={ws.letter_grade}>{ws.letter_grade}</Badge>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )
      )}
    </div>
  )
}
