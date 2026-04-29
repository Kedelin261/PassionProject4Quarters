import { useEffect, useState } from 'react'
import { CheckSquare, Plus, Trash2, TrendingUp } from 'lucide-react'
import { api } from '../lib/api'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Badge } from '../components/ui/Badge'
import type { Habit, HabitEntry } from '../types'

function getDatesInWeek(offset = 0): string[] {
  const today = new Date()
  const day = today.getDay()
  const diff = today.getDate() - day + (day === 0 ? -6 : 1) + offset * 7
  const monday = new Date(today.setDate(diff))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d.toISOString().split('T')[0]
  })
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [entries, setEntries] = useState<HabitEntry[]>([])
  const [weekOffset, setWeekOffset] = useState(0)
  const [showAdd, setShowAdd] = useState(false)
  const [newHabit, setNewHabit] = useState({ name: '', habitType: 'positive', goalBehavior: 'execute' })
  const dates = getDatesInWeek(weekOffset)

  useEffect(() => { load() }, [weekOffset])

  async function load() {
    const startDate = dates[0]; const endDate = dates[6]
    const [h, e] = await Promise.all([
      api.get('/habits'),
      api.get(`/habits/entries?startDate=${startDate}&endDate=${endDate}`),
    ])
    setHabits(h.data)
    setEntries(e.data)
  }

  function getEntry(habitId: string, date: string) {
    return entries.find(e => e.habit_id === habitId && e.date === date)
  }

  async function toggleEntry(habit: Habit, date: string) {
    const entry = getEntry(habit.id, date)
    const executed = entry ? (entry.executed ? 0 : 1) : 1
    await api.post('/habits/entries', { habitId: habit.id, date, executed })
    load()
  }

  async function addHabit() {
    if (!newHabit.name.trim()) return
    await api.post('/habits', newHabit)
    setNewHabit({ name: '', habitType: 'positive', goalBehavior: 'execute' })
    setShowAdd(false); load()
  }

  async function deleteHabit(id: string) {
    await api.delete(`/habits/${id}`); load()
  }

  function getCellStyle(habit: Habit, date: string) {
    const entry = getEntry(habit.id, date)
    if (!entry) return 'bg-surface-800 border-surface-700 hover:bg-surface-700'
    if (entry.success) return 'bg-emerald-600/30 border-emerald-600/50 text-emerald-400'
    return 'bg-red-600/30 border-red-600/50 text-red-400'
  }

  function getDailyScore(date: string) {
    const dayEntries = entries.filter(e => e.date === date)
    if (dayEntries.length === 0) return null
    const success = dayEntries.filter(e => e.success).length
    const pct = (success / dayEntries.length) * 100
    return { pct, grade: pct >= 90 ? 'A' : pct >= 80 ? 'B' : pct >= 70 ? 'C' : pct >= 60 ? 'D' : 'F' }
  }

  const today = new Date().toISOString().split('T')[0]
  const overallSuccess = entries.filter(e => e.success).length
  const overallTotal = entries.length

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Habit Tracker</h1>
          <p className="text-surface-400 text-sm">Excel-style daily execution grid</p>
        </div>
        <Button onClick={() => setShowAdd(true)}><Plus size={16} /> Add Habit</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="text-center">
          <div className="text-surface-400 text-xs mb-1">Week Success Rate</div>
          <div className="text-2xl font-bold text-emerald-400">
            {overallTotal > 0 ? Math.round((overallSuccess / overallTotal) * 100) : 0}%
          </div>
          <div className="text-surface-500 text-xs">{overallSuccess}/{overallTotal} entries</div>
        </Card>
        <Card className="text-center">
          <div className="text-surface-400 text-xs mb-1">Active Habits</div>
          <div className="text-2xl font-bold text-brand-400">{habits.length}</div>
        </Card>
        <Card className="text-center">
          <div className="text-surface-400 text-xs mb-1">Today's Habits</div>
          <div className="text-2xl font-bold text-white">
            {entries.filter(e => e.date === today && e.success).length}/{habits.length}
          </div>
        </Card>
      </div>

      {/* Grid */}
      <Card className="overflow-x-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setWeekOffset(w => w - 1)}>← Prev</Button>
            <Button size="sm" variant="ghost" onClick={() => setWeekOffset(0)}>This Week</Button>
            <Button size="sm" variant="ghost" onClick={() => setWeekOffset(w => w + 1)}>Next →</Button>
          </div>
          <div className="text-surface-400 text-sm">{dates[0]} — {dates[6]}</div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left text-surface-400 font-medium pb-3 pr-4 min-w-[180px]">Habit</th>
              {dates.map((date, i) => (
                <th key={date} className={`text-center pb-3 px-2 min-w-[52px] ${date === today ? 'text-brand-400' : 'text-surface-400'}`}>
                  <div className="text-xs">{DAY_LABELS[i]}</div>
                  <div className={`text-xs font-bold ${date === today ? 'text-brand-300' : 'text-surface-500'}`}>{date.slice(8)}</div>
                </th>
              ))}
              <th className="text-center pb-3 px-2 text-surface-400 text-xs">Rate</th>
              <th className="pb-3" />
            </tr>
          </thead>
          <tbody>
            {habits.length === 0 && (
              <tr><td colSpan={10} className="text-center py-12 text-surface-500">
                No habits yet. <button className="text-brand-400 hover:underline" onClick={() => setShowAdd(true)}>Add your first habit</button>
              </td></tr>
            )}
            {habits.map(habit => {
              const habitEntries = entries.filter(e => e.habit_id === habit.id)
              const successCount = habitEntries.filter(e => e.success).length
              const rate = habitEntries.length > 0 ? Math.round((successCount / habitEntries.length) * 100) : 0
              return (
                <tr key={habit.id} className="border-t border-surface-800">
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp size={14} className={habit.habit_type === 'positive' ? 'text-emerald-400' : 'text-red-400'} />
                      <span className="text-surface-200 font-medium">{habit.name}</span>
                      <Badge status={habit.goal_behavior === 'execute' ? 'in_progress' : 'blocked'}>
                        {habit.goal_behavior}
                      </Badge>
                    </div>
                  </td>
                  {dates.map(date => {
                    const entry = getEntry(habit.id, date)
                    return (
                      <td key={date} className="py-2 px-2 text-center">
                        <button
                          onClick={() => toggleEntry(habit, date)}
                          className={`w-8 h-8 rounded border-2 transition-all text-xs font-bold ${getCellStyle(habit, date)}`}
                          title={entry ? (entry.success ? 'Success' : 'Failed') : 'Not tracked'}
                        >
                          {entry ? (entry.success ? '✓' : '✗') : ''}
                        </button>
                      </td>
                    )
                  })}
                  <td className="py-2 px-2 text-center">
                    <span className={`text-xs font-bold ${rate >= 80 ? 'text-emerald-400' : rate >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {rate}%
                    </span>
                  </td>
                  <td className="py-2 pl-2">
                    <button onClick={() => deleteHabit(habit.id)} className="text-surface-600 hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-surface-700">
              <td className="pt-3 text-surface-400 text-xs font-medium">Daily Score</td>
              {dates.map(date => {
                const score = getDailyScore(date)
                return (
                  <td key={date} className="pt-3 text-center">
                    {score ? <Badge status={score.grade}>{score.grade}</Badge> : <span className="text-surface-600 text-xs">—</span>}
                  </td>
                )
              })}
              <td /><td />
            </tr>
          </tfoot>
        </table>
      </Card>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Habit">
        <div className="space-y-4">
          <div>
            <label className="block text-surface-300 text-sm mb-1">Habit Name *</label>
            <input value={newHabit.name} onChange={e => setNewHabit({ ...newHabit, name: e.target.value })}
              className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-500"
              placeholder="Morning workout, journaling..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-surface-300 text-sm mb-1">Type</label>
              <select value={newHabit.habitType} onChange={e => setNewHabit({ ...newHabit, habitType: e.target.value })}
                className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-500">
                <option value="positive">Positive</option>
                <option value="negative">Negative</option>
              </select>
            </div>
            <div>
              <label className="block text-surface-300 text-sm mb-1">Goal Behavior</label>
              <select value={newHabit.goalBehavior} onChange={e => setNewHabit({ ...newHabit, goalBehavior: e.target.value })}
                className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-500">
                <option value="execute">Execute (do it)</option>
                <option value="avoid">Avoid (don't do it)</option>
              </select>
            </div>
          </div>
          <div className="bg-surface-800 rounded-lg p-3 text-xs text-surface-400">
            <strong className="text-surface-300">Scoring:</strong>{' '}
            {newHabit.goalBehavior === 'execute'
              ? 'Completing this habit counts as a success.'
              : 'NOT doing this habit counts as a success.'}
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={addHabit} disabled={!newHabit.name}>Add Habit</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
