import { useState, useEffect, useCallback } from 'react'
import { Target } from 'lucide-react'
import { api } from '../../lib/api'
import type { PyramidData } from '../../types'
import PyramidLayer, { type LayerColor } from './PyramidLayer'
import PyramidDetailDrawer from './PyramidDetailDrawer'

function progressColor(progress: number, hasItems: boolean): LayerColor {
  if (!hasItems) return 'gray'
  if (progress >= 80) return 'green'
  if (progress >= 60) return 'yellow'
  return 'red'
}

function Connector() {
  return (
    <div className="flex justify-center w-full py-0">
      <div className="w-px h-3 bg-surface-700" />
    </div>
  )
}

export default function PyramidView() {
  const [data, setData] = useState<PyramidData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<{ item: any; type: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/goals/pyramid')
      setData(res.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function handleUpdate() {
    load()
    setSelected(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!data?.cycle) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Target size={48} className="text-surface-600" />
        <div className="text-center">
          <div className="text-white font-semibold text-lg">No Active Cycle</div>
          <p className="text-surface-400 text-sm mt-1">
            Switch to List View to create a cycle and set your 12-week goals.
          </p>
        </div>
      </div>
    )
  }

  const { cycle, twelveWeekGoals, monthlyGoals, weeklyGoals, habits, metrics } = data
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <div className="flex gap-6 items-start">
      {/* Pyramid — narrowest (habits) at top, widest (cycle) at bottom */}
      <div className="flex-1 flex flex-col items-center min-w-0">
        <div className="text-surface-500 text-xs uppercase tracking-widest mb-6 font-medium">
          Execution Pyramid — {today}
        </div>

        <PyramidLayer
          widthPct={30}
          label="Habits"
          sublabel="Today's execution"
          progress={metrics.habitProgress}
          color={progressColor(metrics.habitProgress, habits.length > 0)}
          items={habits.map(h => ({
            ...h,
            _label: h.name,
            _sub: h.success === 1
              ? 'success'
              : h.entry_id != null
                ? 'failed'
                : 'not logged',
          }))}
          type="habit"
          onItemClick={item => setSelected({ item, type: 'habit' })}
          emptyText="No habits linked to goals — create habits in the Habits tab and link them to a weekly goal"
        />

        <Connector />

        <PyramidLayer
          widthPct={48}
          label="Weekly Goals"
          sublabel="Linked to current month's goals"
          progress={metrics.weeklyProgress}
          color={progressColor(metrics.weeklyProgress, weeklyGoals.length > 0)}
          items={weeklyGoals.map(g => ({
            ...g,
            _label: g.title,
            _sub: `Week ${g.week_number} · ${g.status.replace(/_/g, ' ')}`,
          }))}
          type="weekly"
          onItemClick={item => setSelected({ item, type: 'weekly' })}
          emptyText="No weekly goals — add them in List View"
        />

        <Connector />

        <PyramidLayer
          widthPct={65}
          label="Monthly Goals"
          sublabel="Current month"
          progress={metrics.monthlyProgress}
          color={progressColor(metrics.monthlyProgress, monthlyGoals.length > 0)}
          items={monthlyGoals.map(g => ({
            ...g,
            _label: g.title,
            _sub: g.status.replace(/_/g, ' '),
          }))}
          type="monthly"
          onItemClick={item => setSelected({ item, type: 'monthly' })}
          emptyText="No monthly goals for current month — add them in List View"
        />

        <Connector />

        <PyramidLayer
          widthPct={82}
          label="12-Week Goals"
          sublabel="This cycle"
          progress={metrics.twelveWeekProgress}
          color={progressColor(metrics.twelveWeekProgress, twelveWeekGoals.length > 0)}
          items={twelveWeekGoals.map(g => ({
            ...g,
            _label: g.title,
            _sub: `${g.progress}% of target`,
          }))}
          type="quarter"
          onItemClick={item => setSelected({ item, type: 'quarter' })}
        />

        <Connector />

        <PyramidLayer
          widthPct={100}
          label="12-Week Cycle"
          sublabel={`${cycle.start_date} → ${cycle.end_date}`}
          progress={metrics.cycleProgress}
          color={progressColor(metrics.cycleProgress, twelveWeekGoals.length > 0)}
          items={[{
            ...cycle,
            _label: cycle.title,
            _sub: `${metrics.cycleProgress}% complete`,
          }]}
          type="cycle"
          onItemClick={() => {}}
        />

        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-5 mt-8 text-xs text-surface-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            On Track (≥80%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" />
            At Risk (60–79%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
            Off Track (&lt;60%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-surface-600 inline-block" />
            No Data
          </span>
        </div>
      </div>

      {/* Detail drawer */}
      {selected && (
        <PyramidDetailDrawer
          item={selected.item}
          type={selected.type}
          onClose={() => setSelected(null)}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  )
}
