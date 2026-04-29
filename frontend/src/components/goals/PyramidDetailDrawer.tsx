import { useState } from 'react'
import { X, CheckCircle2, XCircle } from 'lucide-react'
import { api } from '../../lib/api'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'

const DAILY_STATUSES = ['planned', 'completed', 'missed', 'blocked'] as const
const GOAL_STATUSES = ['not_started', 'in_progress', 'blocked', 'completed'] as const

interface DrawerProps {
  item: any
  type: string
  onClose: () => void
  onUpdate: () => void
}

export default function PyramidDetailDrawer({ item, type, onClose, onUpdate }: DrawerProps) {
  const [loading, setLoading] = useState(false)
  const [localItem, setLocalItem] = useState({ ...item })

  const isHabit = type === 'habit'
  const isDaily = type === 'daily'
  const isGoal = ['quarter', 'monthly', 'weekly'].includes(type)

  async function updateDailyStatus(status: string) {
    setLoading(true)
    try {
      const res = await api.put(`/goals/daily/${localItem.id}`, {
        title: localItem.title,
        description: localItem.description ?? '',
        date: localItem.date,
        status,
      })
      setLocalItem(res.data)
      onUpdate()
    } finally {
      setLoading(false)
    }
  }

  async function toggleHabit(executed: boolean) {
    setLoading(true)
    try {
      await api.post('/habits/entries', {
        habitId: localItem.id,
        date: new Date().toISOString().split('T')[0],
        executed,
      })
      const success = localItem.goal_behavior === 'execute' ? (executed ? 1 : 0) : (executed ? 0 : 1)
      setLocalItem((prev: any) => ({
        ...prev,
        executed: executed ? 1 : 0,
        success,
        entry_id: prev.entry_id ?? 'logged',
      }))
      onUpdate()
    } finally {
      setLoading(false)
    }
  }

  async function updateGoalStatus(status: string) {
    setLoading(true)
    try {
      let res
      if (type === 'quarter') {
        res = await api.put(`/goals/quarter/${localItem.id}`, {
          title: localItem.title,
          description: localItem.description ?? '',
          targetMetric: localItem.target_metric ?? '',
          startingValue: localItem.starting_value ?? 0,
          targetValue: localItem.target_value ?? 100,
          currentValue: localItem.current_value ?? 0,
          status,
          priority: localItem.priority ?? 1,
        })
      } else if (type === 'monthly') {
        res = await api.put(`/goals/monthly/${localItem.id}`, {
          title: localItem.title,
          description: localItem.description ?? '',
          monthNumber: localItem.month_number,
          status,
        })
      } else if (type === 'weekly') {
        res = await api.put(`/goals/weekly/${localItem.id}`, {
          title: localItem.title,
          description: localItem.description ?? '',
          weekNumber: localItem.week_number,
          status,
        })
      }
      if (res) setLocalItem(res.data)
      onUpdate()
    } finally {
      setLoading(false)
    }
  }

  const typeLabel: Record<string, string> = {
    quarter: '12-Week Goal',
    monthly: 'Monthly Goal',
    weekly: 'Weekly Goal',
    daily: 'Daily Goal',
    habit: 'Habit',
  }

  const isSuccess = isHabit && localItem.success === 1
  const hasEntry = isHabit && localItem.entry_id != null

  const dailyStatusStyle = (s: string): string => {
    const active = localItem.status === s
    const map: Record<string, string> = {
      completed: active
        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
        : 'border-surface-700 text-surface-400 hover:border-emerald-500/30 hover:text-emerald-400',
      missed: active
        ? 'bg-red-500/20 border-red-500/50 text-red-400'
        : 'border-surface-700 text-surface-400 hover:border-red-500/30 hover:text-red-400',
      blocked: active
        ? 'bg-orange-500/20 border-orange-500/50 text-orange-400'
        : 'border-surface-700 text-surface-400 hover:border-orange-500/30 hover:text-orange-400',
      planned: active
        ? 'bg-surface-700 border-surface-600 text-surface-300'
        : 'border-surface-700 text-surface-500 hover:border-surface-600',
    }
    return map[s] ?? 'border-surface-700 text-surface-400'
  }

  const goalStatusStyle = (s: string): string => {
    const active = localItem.status === s
    const map: Record<string, string> = {
      completed: active
        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
        : 'border-surface-700 text-surface-400 hover:border-emerald-500/30 hover:text-emerald-400',
      in_progress: active
        ? 'bg-brand-500/20 border-brand-500/50 text-brand-400'
        : 'border-surface-700 text-surface-400 hover:border-brand-500/30 hover:text-brand-400',
      blocked: active
        ? 'bg-red-500/20 border-red-500/50 text-red-400'
        : 'border-surface-700 text-surface-400 hover:border-red-500/30 hover:text-red-400',
      not_started: active
        ? 'bg-surface-700 border-surface-600 text-surface-300'
        : 'border-surface-700 text-surface-500 hover:border-surface-600',
    }
    return map[s] ?? 'border-surface-700 text-surface-400'
  }

  return (
    <div className="w-72 flex-shrink-0">
      <div className="bg-surface-900 border border-surface-700 rounded-xl overflow-hidden sticky top-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-surface-800">
          <div className="flex-1 min-w-0 pr-3">
            <div className="text-xs text-surface-500 uppercase tracking-wider mb-1 font-medium">
              {typeLabel[type]}
            </div>
            <div className="text-white font-semibold text-sm leading-snug">
              {localItem.title ?? localItem.name}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-surface-500 hover:text-white transition-colors flex-shrink-0 mt-0.5"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-[68vh] overflow-y-auto">
          {/* Status badge */}
          {localItem.status && (
            <div className="flex items-center gap-2">
              <span className="text-surface-500 text-xs w-14">Status</span>
              <Badge status={localItem.status} />
            </div>
          )}

          {/* Date */}
          {localItem.date && (
            <div className="flex items-center gap-2">
              <span className="text-surface-500 text-xs w-14">Date</span>
              <span className="text-surface-300 text-xs">{localItem.date}</span>
            </div>
          )}

          {/* Description / note */}
          {(localItem.description || localItem.note) && (
            <div>
              <div className="text-surface-500 text-xs mb-1">Notes</div>
              <div className="text-surface-300 text-xs leading-relaxed">
                {localItem.description ?? localItem.note}
              </div>
            </div>
          )}

          {/* Quarter goal progress */}
          {type === 'quarter' && (
            <div>
              <div className="text-surface-500 text-xs mb-2">Progress toward target</div>
              <div className="flex items-center gap-2 mb-1">
                <div className="flex-1 h-2 bg-surface-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-500 rounded-full transition-all"
                    style={{ width: `${localItem.progress ?? 0}%` }}
                  />
                </div>
                <span className="text-white text-xs font-bold">{localItem.progress ?? 0}%</span>
              </div>
              {localItem.target_metric && (
                <div className="text-surface-500 text-xs">
                  {localItem.current_value} / {localItem.target_value} {localItem.target_metric}
                </div>
              )}
            </div>
          )}

          {/* Habit toggle */}
          {isHabit && (
            <div>
              <div className="text-surface-500 text-xs mb-1">
                Goal behavior:{' '}
                <span className="text-surface-300 capitalize">{localItem.goal_behavior}</span>
              </div>
              <div className="flex gap-2 mt-2">
                <Button
                  size="sm"
                  variant={isSuccess ? 'primary' : 'secondary'}
                  onClick={() => toggleHabit(true)}
                  loading={loading}
                  className="flex-1"
                >
                  <CheckCircle2 size={13} />
                  {localItem.goal_behavior === 'execute' ? 'Done' : 'Avoided'}
                </Button>
                <Button
                  size="sm"
                  variant={hasEntry && !isSuccess ? 'danger' : 'secondary'}
                  onClick={() => toggleHabit(false)}
                  loading={loading}
                  className="flex-1"
                >
                  <XCircle size={13} />
                  {localItem.goal_behavior === 'execute' ? 'Skipped' : 'Failed'}
                </Button>
              </div>
              {hasEntry && (
                <div className={`text-xs mt-2 text-center font-medium ${isSuccess ? 'text-emerald-400' : 'text-red-400'}`}>
                  {isSuccess ? '✓ Logged as success' : '✗ Logged as failed'}
                </div>
              )}
            </div>
          )}

          {/* Daily goal status controls */}
          {isDaily && (
            <div>
              <div className="text-surface-500 text-xs mb-2">Update status</div>
              <div className="grid grid-cols-2 gap-1.5">
                {DAILY_STATUSES.map(s => (
                  <button
                    key={s}
                    onClick={() => updateDailyStatus(s)}
                    disabled={loading}
                    className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition-all capitalize ${dailyStatusStyle(s)}`}
                  >
                    {s.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quarter / monthly / weekly status controls */}
          {isGoal && (
            <div>
              <div className="text-surface-500 text-xs mb-2">Update status</div>
              <div className="grid grid-cols-2 gap-1.5">
                {GOAL_STATUSES.map(s => (
                  <button
                    key={s}
                    onClick={() => updateGoalStatus(s)}
                    disabled={loading}
                    className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition-all ${goalStatusStyle(s)}`}
                  >
                    {s.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
