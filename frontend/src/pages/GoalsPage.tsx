import { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, Plus, Trash2, Target, LayoutList, Triangle } from 'lucide-react'
import { api } from '../lib/api'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { ProgressBar } from '../components/ui/ProgressBar'
import PyramidView from '../components/goals/PyramidView'
import type { QuarterGoal, MonthlyGoal, WeeklyGoal, HabitWithEntry, Cycle } from '../types'

type ViewMode = 'list' | 'pyramid'

const STATUS_OPTIONS = ['not_started', 'in_progress', 'blocked', 'completed']

function HabitRow({ habit, onUpdate }: { habit: HabitWithEntry; onUpdate: () => void }) {
  const today = new Date().toISOString().split('T')[0]
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    try {
      // When undoing success, flip the executed state.
      // When initially marking success, use the goal direction: execute=true, avoid=false.
      const executed = isSuccess
        ? !habit.executedToday
        : habit.goal_behavior === 'execute'
      await api.post('/habits/entries', { habitId: habit.id, date: today, executed })
      onUpdate()
    } finally {
      setLoading(false)
    }
  }

  async function deleteHabit() {
    await api.delete(`/habits/${habit.id}`)
    onUpdate()
  }

  const isSuccess = habit.successToday
  const hasEntry = habit.entryId != null

  return (
    <div className="flex items-center gap-2 pl-20 py-2 group">
      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isSuccess ? 'bg-emerald-500' : hasEntry ? 'bg-red-500' : 'bg-surface-600'}`} />
      <span className="flex-1 text-sm text-surface-400">{habit.name}</span>
      <span className="text-xs text-surface-600 capitalize">{habit.goal_behavior}</span>
      {isSuccess
        ? <span className="text-emerald-400 text-xs font-medium">✓ Done</span>
        : hasEntry
          ? <span className="text-red-400 text-xs">✗ Skipped</span>
          : <span className="text-surface-600 text-xs">Not logged</span>
      }
      <button
        onClick={toggle}
        disabled={loading}
        className={`text-xs px-2 py-1 rounded border transition-all ${
          isSuccess
            ? 'border-emerald-600/40 bg-emerald-600/10 text-emerald-400 hover:bg-emerald-600/20'
            : 'border-surface-700 text-surface-400 hover:text-white hover:border-surface-600'
        }`}
      >
        {isSuccess ? 'Undo' : habit.goal_behavior === 'execute' ? 'Done' : 'Avoided'}
      </button>
      <button onClick={deleteHabit} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-all">
        <Trash2 size={14} />
      </button>
    </div>
  )
}

function WeeklyGoalRow({ goal, onUpdate }: { goal: WeeklyGoal; onUpdate: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [showAddHabit, setShowAddHabit] = useState(false)
  const [habitName, setHabitName] = useState('')
  const [goalBehavior, setGoalBehavior] = useState<'execute' | 'avoid'>('execute')

  async function addHabit() {
    if (!habitName.trim()) return
    await api.post('/habits', { name: habitName, goalBehavior, habitType: 'positive', weeklyGoalId: goal.id })
    setHabitName(''); setGoalBehavior('execute'); setShowAddHabit(false); onUpdate()
  }

  const habits = goal.habits || []
  const successCount = habits.filter(h => h.successToday).length

  return (
    <div>
      <div className="flex items-center gap-2 pl-8 py-2 hover:bg-surface-800/50 rounded-lg group cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <button className="text-surface-500">{expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</button>
        <div className="w-3 h-3 rounded-full border-2 border-yellow-500 flex-shrink-0" />
        <span className="flex-1 text-sm text-surface-200">{goal.title}</span>
        <span className="text-surface-500 text-xs">Week {goal.week_number}</span>
        {habits.length > 0 && (
          <span className="text-xs text-surface-500">{successCount}/{habits.length} habits</span>
        )}
        <Badge status={goal.status} />
        <button
          onClick={(e) => { e.stopPropagation(); setShowAddHabit(!showAddHabit) }}
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

      {showAddHabit && (
        <div className="pl-16 py-2 flex gap-2">
          <input
            value={habitName}
            onChange={e => setHabitName(e.target.value)}
            placeholder="Habit name"
            onKeyDown={e => e.key === 'Enter' && addHabit()}
            className="flex-1 bg-surface-800 border border-surface-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-brand-500"
          />
          <select
            value={goalBehavior}
            onChange={e => setGoalBehavior(e.target.value as 'execute' | 'avoid')}
            className="bg-surface-800 border border-surface-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-brand-500"
          >
            <option value="execute">Execute</option>
            <option value="avoid">Avoid</option>
          </select>
          <Button size="sm" onClick={addHabit}>Add</Button>
        </div>
      )}

      {expanded && habits.map(h => (
        <HabitRow key={h.id} habit={h} onUpdate={onUpdate} />
      ))}

      {expanded && habits.length === 0 && (
        <div className="pl-20 py-2 text-surface-600 text-xs">
          No habits linked.{' '}
          <button className="text-brand-400 hover:underline" onClick={() => setShowAddHabit(true)}>Add one</button>
        </div>
      )}
    </div>
  )
}

function MonthlyGoalRow({ goal, onUpdate }: { goal: MonthlyGoal; onUpdate: () => void }) {
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
            onKeyDown={e => e.key === 'Enter' && addWeekly()}
            className="flex-1 bg-surface-800 border border-surface-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-brand-500" />
          <input type="number" value={weekNum} onChange={e => setWeekNum(+e.target.value)} min={1} max={12}
            className="w-20 bg-surface-800 border border-surface-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-brand-500" />
          <Button size="sm" onClick={addWeekly}>Add</Button>
        </div>
      )}

      {expanded && goal.weeklyGoals?.map(wg => (
        <WeeklyGoalRow key={wg.id} goal={wg} onUpdate={onUpdate} />
      ))}

      {expanded && (goal.weeklyGoals?.length ?? 0) === 0 && (
        <div className="pl-8 py-2 text-surface-600 text-xs">
          No weekly goals.{' '}
          <button className="text-brand-400 hover:underline" onClick={() => setShowAddWeekly(true)}>Add one</button>
        </div>
      )}
    </div>
  )
}

export default function GoalsPage() {
  const [view, setView] = useState<ViewMode>('list')
  const [goals, setGoals] = useState<QuarterGoal[]>([])
  const [activeCycle, setActiveCycle] = useState<Cycle | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [showAddGoal, setShowAddGoal] = useState(false)
  const [showAddCycle, setShowAddCycle] = useState(false)
  const [showAddMonthly, setShowAddMonthly] = useState<string | null>(null)
  const [newGoal, setNewGoal] = useState({ title: '', description: '', targetMetric: '', targetValue: 100 })
  const [newMonthly, setNewMonthly] = useState({ title: '', monthNumber: 1 })
  const [newCycle, setNewCycle] = useState({ title: '', startDate: new Date().toISOString().split('T')[0], endDate: '' })
  const [cycleLoading, setCycleLoading] = useState(false)
  const [cycleError, setCycleError] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const g = await api.get('/goals/tree')
    const treeData = g.data
    setGoals(treeData?.twelveWeekGoals || [])
    setActiveCycle(treeData?.cycle || null)
  }

  async function createGoal() {
    if (!activeCycle) return alert('Create an active cycle first')
    if (goals.length >= 3) return alert('Maximum 3 twelve-week goals')
    await api.post('/goals/quarter', { ...newGoal, cycleId: activeCycle.id })
    setShowAddGoal(false); setNewGoal({ title: '', description: '', targetMetric: '', targetValue: 100 }); load()
  }

  async function createCycle() {
    setCycleLoading(true)
    setCycleError(null)
    try {
      console.log('[CreateCycle] Sending payload:', newCycle)
      const res = await api.post('/cycles', newCycle)
      console.log('[CreateCycle] Success:', res.data)
      setShowAddCycle(false)
      setNewCycle({ title: '', startDate: new Date().toISOString().split('T')[0], endDate: '' })
      await load()
    } catch (err: any) {
      console.error('[CreateCycle] Error:', err)
      const msg = err?.response?.data?.error || err?.message || 'Failed to create cycle. Please try again.'
      setCycleError(msg)
    } finally {
      setCycleLoading(false)
    }
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
          <p className="text-surface-400 text-sm">12-week vision broken into executable weekly habits</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-surface-800 border border-surface-700 rounded-lg p-1">
            <button
              onClick={() => setView('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                view === 'list' ? 'bg-brand-600 text-white shadow-sm' : 'text-surface-400 hover:text-white'
              }`}
            >
              <LayoutList size={13} /> List
            </button>
            <button
              onClick={() => setView('pyramid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                view === 'pyramid' ? 'bg-brand-600 text-white shadow-sm' : 'text-surface-400 hover:text-white'
              }`}
            >
              <Triangle size={13} /> Pyramid
            </button>
          </div>

          {view === 'list' && (
            <>
              {!activeCycle && (
                <Button variant="secondary" onClick={() => setShowAddCycle(true)}>
                  <Plus size={16} /> New Cycle
                </Button>
              )}
              <Button onClick={() => setShowAddGoal(true)} disabled={!activeCycle || goals.length >= 3}>
                <Plus size={16} /> Add 12-Week Goal
              </Button>
            </>
          )}
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

      {view === 'pyramid' && <PyramidView />}

      {view === 'list' && goals.length === 0 && (
        <Card className="text-center py-12">
          <Target size={48} className="mx-auto mb-4 text-surface-600" />
          <div className="text-surface-400 text-lg font-medium">No goals yet</div>
          <p className="text-surface-500 text-sm mt-1">Create your first 12-week goal to get started.</p>
          {activeCycle && <Button className="mt-4" onClick={() => setShowAddGoal(true)}>Set First Goal</Button>}
        </Card>
      )}

      {view === 'list' && goals.length > 0 && (
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
                  {(qg.monthlyGoals?.length ?? 0) === 0 && (
                    <div className="text-center py-4 text-surface-500 text-sm">
                      No monthly goals.{' '}
                      <button className="text-brand-400 hover:underline" onClick={() => setShowAddMonthly(qg.id)}>Add one</button>
                    </div>
                  )}
                  {qg.monthlyGoals?.map(mg => (
                    <MonthlyGoalRow key={mg.id} goal={mg} onUpdate={load} />
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={showAddCycle}
        onClose={() => { setShowAddCycle(false); setCycleError(null) }}
        title="Create 12-Week Cycle"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-surface-300 text-sm mb-1">Cycle Title *</label>
            <input
              value={newCycle.title}
              onChange={e => setNewCycle({ ...newCycle, title: e.target.value })}
              className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-500"
              placeholder="Q2 2026 Execution Cycle"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-surface-300 text-sm mb-1">Start Date *</label>
              <input
                type="date"
                value={newCycle.startDate}
                onChange={e => setNewCycle({ ...newCycle, startDate: e.target.value })}
                className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-surface-300 text-sm mb-1">End Date *</label>
              <input
                type="date"
                value={newCycle.endDate}
                onChange={e => setNewCycle({ ...newCycle, endDate: e.target.value })}
                min={newCycle.startDate}
                className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>
          {cycleError && (
            <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              {cycleError}
            </div>
          )}
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" onClick={() => { setShowAddCycle(false); setCycleError(null) }}>
              Cancel
            </Button>
            <Button
              onClick={createCycle}
              disabled={!newCycle.title.trim() || !newCycle.endDate}
              loading={cycleLoading}
            >
              Create Cycle
            </Button>
          </div>
        </div>
      </Modal>

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
