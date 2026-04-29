import { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, Plus, Trash2, Edit2, Target, CheckCircle2 } from 'lucide-react'
import { api } from '../lib/api'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { ProgressBar } from '../components/ui/ProgressBar'
import type { QuarterGoal, MonthlyGoal, WeeklyGoal, DailyGoal, Cycle } from '../types'

const STATUS_OPTIONS = ['not_started', 'in_progress', 'blocked', 'completed']
const DAILY_STATUS = ['planned', 'completed', 'missed', 'blocked']

function DailyGoalRow({ goal, onUpdate, onDelete }: { goal: DailyGoal; onUpdate: () => void; onDelete: () => void }) {
  async function setStatus(status: string) {
    await api.put(`/goals/daily/${goal.id}`, { ...goal, status })
    onUpdate()
  }
  return (
    <div className="flex items-center gap-3 pl-16 py-2 group">
      <button
        onClick={() => setStatus(goal.status === 'completed' ? 'planned' : 'completed')}
        className={`w-4 h-4 rounded border-2 flex-shrink-0 transition-all ${goal.status === 'completed' ? 'bg-emerald-500 border-emerald-500' : 'border-surface-600 hover:border-brand-500'}`}
      />
      <span className={`flex-1 text-sm ${goal.status === 'completed' ? 'line-through text-surface-500' : 'text-surface-300'}`}>
        {goal.title}
      </span>
      <span className="text-surface-600 text-xs">{goal.date}</span>
      <Badge status={goal.status} />
      <select
        value={goal.status}
        onChange={(e) => setStatus(e.target.value)}
        className="opacity-0 group-hover:opacity-100 bg-surface-800 border border-surface-700 text-xs text-white rounded px-1 py-0.5 transition-opacity"
      >
        {DAILY_STATUS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
      </select>
      <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-all">
        <Trash2 size={14} />
      </button>
    </div>
  )
}

function WeeklyGoalRow({ goal, onUpdate }: { goal: WeeklyGoal; onUpdate: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [showAddDaily, setShowAddDaily] = useState(false)
  const [newDailyTitle, setNewDailyTitle] = useState('')
  const [newDailyDate, setNewDailyDate] = useState(new Date().toISOString().split('T')[0])

  async function addDaily() {
    if (!newDailyTitle.trim()) return
    await api.post('/goals/daily', { weeklyGoalId: goal.id, title: newDailyTitle, date: newDailyDate })
    setNewDailyTitle(''); setShowAddDaily(false); onUpdate()
  }
  async function deleteDaily(id: string) {
    await api.delete(`/goals/daily/${id}`); onUpdate()
  }

  const completed = goal.dailyGoals?.filter(d => d.status === 'completed').length || 0
  const total = goal.dailyGoals?.length || 0

  return (
    <div>
      <div className="flex items-center gap-2 pl-8 py-2 hover:bg-surface-800/50 rounded-lg group cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <button className="text-surface-500">{expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</button>
        <div className="w-3 h-3 rounded-full border-2 border-yellow-500 flex-shrink-0" />
        <span className="flex-1 text-sm text-surface-200">{goal.title}</span>
        <span className="text-surface-500 text-xs">Week {goal.week_number}</span>
        {total > 0 && <span className="text-xs text-surface-500">{completed}/{total}</span>}
        <Badge status={goal.status} />
        <button
          onClick={(e) => { e.stopPropagation(); setShowAddDaily(!showAddDaily) }}
          className="opacity-0 group-hover:opacity-100 text-brand-400 hover:text-brand-300 transition-all"
        >
          <Plus size={14} />
        </button>
        <button
          onClick={async (e) => { e.stopPropagation(); await api.delete(`/goals/weekly/${goal.id}`); onUpdate() }}
          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-all"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {showAddDaily && (
        <div className="pl-16 py-2 flex gap-2">
          <input value={newDailyTitle} onChange={e => setNewDailyTitle(e.target.value)} placeholder="Daily goal title"
            className="flex-1 bg-surface-800 border border-surface-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-brand-500" />
          <input type="date" value={newDailyDate} onChange={e => setNewDailyDate(e.target.value)}
            className="bg-surface-800 border border-surface-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-brand-500" />
          <Button size="sm" onClick={addDaily}>Add</Button>
        </div>
      )}

      {expanded && goal.dailyGoals?.map(dg => (
        <DailyGoalRow key={dg.id} goal={dg} onUpdate={onUpdate} onDelete={() => deleteDaily(dg.id)} />
      ))}
    </div>
  )
}

function MonthlyGoalRow({ goal, cycleId, onUpdate }: { goal: MonthlyGoal; cycleId: string; onUpdate: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [showAddWeekly, setShowAddWeekly] = useState(false)
  const [weeklyTitle, setWeeklyTitle] = useState('')
  const [weekNum, setWeekNum] = useState(1)

  async function addWeekly() {
    if (!weeklyTitle.trim()) return
    await api.post('/goals/weekly', { monthlyGoalId: goal.id, title: weeklyTitle, weekNumber: weekNum })
    setWeeklyTitle(''); setShowAddWeekly(false); onUpdate()
  }

  return (
    <div>
      <div className="flex items-center gap-2 pl-4 py-2 hover:bg-surface-800/50 rounded-lg group cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <button className="text-surface-500">{expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</button>
        <div className="w-3 h-3 rounded-sm border-2 border-brand-500 flex-shrink-0" />
        <span className="flex-1 text-sm text-surface-100 font-medium">{goal.title}</span>
        <span className="text-surface-500 text-xs">Month {goal.month_number}</span>
        <Badge status={goal.status} />
        <button onClick={(e) => { e.stopPropagation(); setShowAddWeekly(!showAddWeekly) }}
          className="opacity-0 group-hover:opacity-100 text-brand-400 hover:text-brand-300 transition-all"><Plus size={14} /></button>
        <button onClick={async (e) => { e.stopPropagation(); await api.delete(`/goals/monthly/${goal.id}`); onUpdate() }}
          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-all"><Trash2 size={14} /></button>
      </div>

      {showAddWeekly && (
        <div className="pl-8 py-2 flex gap-2">
          <input value={weeklyTitle} onChange={e => setWeeklyTitle(e.target.value)} placeholder="Weekly goal title"
            className="flex-1 bg-surface-800 border border-surface-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-brand-500" />
          <input type="number" value={weekNum} onChange={e => setWeekNum(+e.target.value)} min={1} max={12}
            className="w-20 bg-surface-800 border border-surface-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-brand-500" />
          <Button size="sm" onClick={addWeekly}>Add</Button>
        </div>
      )}

      {expanded && goal.weeklyGoals?.map(wg => (
        <WeeklyGoalRow key={wg.id} goal={wg} onUpdate={onUpdate} />
      ))}
    </div>
  )
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<QuarterGoal[]>([])
  const [cycles, setCycles] = useState<Cycle[]>([])
  const [activeCycle, setActiveCycle] = useState<Cycle | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [showAddGoal, setShowAddGoal] = useState(false)
  const [showAddCycle, setShowAddCycle] = useState(false)
  const [showAddMonthly, setShowAddMonthly] = useState<string | null>(null)
  const [newGoal, setNewGoal] = useState({ title: '', description: '', targetMetric: '', targetValue: 100 })
  const [newMonthly, setNewMonthly] = useState({ title: '', monthNumber: 1 })
  const [newCycle, setNewCycle] = useState({ title: '', startDate: new Date().toISOString().split('T')[0], endDate: '' })

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const [g, c] = await Promise.all([api.get('/goals/tree'), api.get('/cycles')])
    setGoals(g.data)
    setCycles(c.data)
    const active = c.data.find((x: Cycle) => x.status === 'active')
    setActiveCycle(active || null)
  }

  async function createGoal() {
    if (!activeCycle) return alert('Create an active cycle first')
    if (goals.length >= 3) return alert('Maximum 3 twelve-week goals')
    await api.post('/goals/quarter', { ...newGoal, cycleId: activeCycle.id })
    setShowAddGoal(false); setNewGoal({ title: '', description: '', targetMetric: '', targetValue: 100 }); load()
  }

  async function createCycle() {
    await api.post('/cycles', newCycle)
    setShowAddCycle(false); load()
  }

  async function addMonthly(qgId: string) {
    await api.post('/goals/monthly', { twelveWeekGoalId: qgId, ...newMonthly })
    setShowAddMonthly(null); setNewMonthly({ title: '', monthNumber: 1 }); load()
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Goals</h1>
          <p className="text-surface-400 text-sm">12-week vision broken into executable daily actions</p>
        </div>
        <div className="flex gap-3">
          {!activeCycle && (
            <Button variant="secondary" onClick={() => setShowAddCycle(true)}>
              <Plus size={16} /> New Cycle
            </Button>
          )}
          <Button onClick={() => setShowAddGoal(true)} disabled={!activeCycle || goals.length >= 3}>
            <Plus size={16} /> Add 12-Week Goal
          </Button>
        </div>
      </div>

      {!activeCycle && (
        <Card className="mb-6 border-yellow-600/30 bg-yellow-600/5">
          <div className="flex items-center gap-3">
            <Target size={20} className="text-yellow-400" />
            <div>
              <div className="text-yellow-400 font-medium">No Active Cycle</div>
              <div className="text-surface-400 text-sm">Create a 12-week cycle to start setting goals.</div>
            </div>
            <Button size="sm" variant="secondary" className="ml-auto" onClick={() => setShowAddCycle(true)}>Create Cycle</Button>
          </div>
        </Card>
      )}

      {activeCycle && (
        <Card className="mb-6 bg-brand-600/5 border-brand-600/20">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-brand-400 text-sm font-medium">Active Cycle</div>
              <div className="text-white font-semibold">{activeCycle.title}</div>
            </div>
            <div className="text-surface-400 text-sm">{activeCycle.start_date} → {activeCycle.end_date}</div>
            <Badge status="active" />
          </div>
        </Card>
      )}

      {goals.length === 0 ? (
        <Card className="text-center py-12">
          <Target size={48} className="mx-auto mb-4 text-surface-600" />
          <div className="text-surface-400 text-lg font-medium">No goals yet</div>
          <p className="text-surface-500 text-sm mt-1">Create your first 12-week goal to get started.</p>
          {activeCycle && <Button className="mt-4" onClick={() => setShowAddGoal(true)}>Set First Goal</Button>}
        </Card>
      ) : (
        <div className="space-y-4">
          {goals.map((qg) => (
            <Card key={qg.id}>
              <div
                className="flex items-center gap-3 cursor-pointer"
                onClick={() => setExpanded(ex => ({ ...ex, [qg.id]: !ex[qg.id] }))}
              >
                <button className="text-surface-400">
                  {expanded[qg.id] ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </button>
                <Target size={16} className="text-brand-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-semibold">{qg.title}</span>
                    <Badge status={qg.status} />
                  </div>
                  {qg.target_metric && <div className="text-surface-500 text-xs mt-0.5">{qg.target_metric}</div>}
                </div>
                <div className="w-32">
                  <ProgressBar value={qg.current_value} max={qg.target_value || 100} showLabel />
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowAddMonthly(qg.id) }}
                    className="p-1.5 text-brand-400 hover:text-brand-300 hover:bg-brand-600/10 rounded transition-all"
                    title="Add monthly goal"
                  >
                    <Plus size={16} />
                  </button>
                  <button
                    onClick={async (e) => { e.stopPropagation(); await api.delete(`/goals/quarter/${qg.id}`); load() }}
                    className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-600/10 rounded transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {expanded[qg.id] && (
                <div className="mt-4 border-t border-surface-800 pt-4">
                  {qg.monthlyGoals?.length === 0 && (
                    <div className="text-center py-4 text-surface-500 text-sm">
                      No monthly goals. <button className="text-brand-400 hover:underline" onClick={() => setShowAddMonthly(qg.id)}>Add one</button>
                    </div>
                  )}
                  {qg.monthlyGoals?.map(mg => (
                    <MonthlyGoalRow key={mg.id} goal={mg} cycleId={qg.cycle_id} onUpdate={load} />
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Add Cycle Modal */}
      <Modal open={showAddCycle} onClose={() => setShowAddCycle(false)} title="Create 12-Week Cycle">
        <div className="space-y-4">
          <div>
            <label className="block text-surface-300 text-sm mb-1">Cycle Title</label>
            <input value={newCycle.title} onChange={e => setNewCycle({ ...newCycle, title: e.target.value })}
              className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-500"
              placeholder="Q1 2026 Execution Cycle" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-surface-300 text-sm mb-1">Start Date</label>
              <input type="date" value={newCycle.startDate} onChange={e => setNewCycle({ ...newCycle, startDate: e.target.value })}
                className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-500" />
            </div>
            <div>
              <label className="block text-surface-300 text-sm mb-1">End Date</label>
              <input type="date" value={newCycle.endDate} onChange={e => setNewCycle({ ...newCycle, endDate: e.target.value })}
                className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-500" />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" onClick={() => setShowAddCycle(false)}>Cancel</Button>
            <Button onClick={createCycle} disabled={!newCycle.title || !newCycle.endDate}>Create Cycle</Button>
          </div>
        </div>
      </Modal>

      {/* Add Quarter Goal Modal */}
      <Modal open={showAddGoal} onClose={() => setShowAddGoal(false)} title="Add 12-Week Goal">
        <div className="space-y-4">
          <div>
            <label className="block text-surface-300 text-sm mb-1">Goal Title *</label>
            <input value={newGoal.title} onChange={e => setNewGoal({ ...newGoal, title: e.target.value })}
              className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-500"
              placeholder="Run a marathon" />
          </div>
          <div>
            <label className="block text-surface-300 text-sm mb-1">Description</label>
            <textarea value={newGoal.description} onChange={e => setNewGoal({ ...newGoal, description: e.target.value })} rows={2}
              className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-500 resize-none"
              placeholder="Why this goal? What does success look like?" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-surface-300 text-sm mb-1">Target Metric</label>
              <input value={newGoal.targetMetric} onChange={e => setNewGoal({ ...newGoal, targetMetric: e.target.value })}
                className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-500"
                placeholder="Miles, revenue, etc" />
            </div>
            <div>
              <label className="block text-surface-300 text-sm mb-1">Target Value</label>
              <input type="number" value={newGoal.targetValue} onChange={e => setNewGoal({ ...newGoal, targetValue: +e.target.value })}
                className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-500" />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" onClick={() => setShowAddGoal(false)}>Cancel</Button>
            <Button onClick={createGoal} disabled={!newGoal.title}>Create Goal</Button>
          </div>
        </div>
      </Modal>

      {/* Add Monthly Goal Modal */}
      <Modal open={!!showAddMonthly} onClose={() => setShowAddMonthly(null)} title="Add Monthly Goal">
        <div className="space-y-4">
          <div>
            <label className="block text-surface-300 text-sm mb-1">Goal Title *</label>
            <input value={newMonthly.title} onChange={e => setNewMonthly({ ...newMonthly, title: e.target.value })}
              className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-500"
              placeholder="Complete first marathon training block" />
          </div>
          <div>
            <label className="block text-surface-300 text-sm mb-1">Month Number (1-3)</label>
            <input type="number" min={1} max={3} value={newMonthly.monthNumber} onChange={e => setNewMonthly({ ...newMonthly, monthNumber: +e.target.value })}
              className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-500" />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" onClick={() => setShowAddMonthly(null)}>Cancel</Button>
            <Button onClick={() => addMonthly(showAddMonthly!)} disabled={!newMonthly.title}>Add Monthly Goal</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
