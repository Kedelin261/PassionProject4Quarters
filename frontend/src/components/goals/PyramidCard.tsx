import clsx from 'clsx'

const statusDot: Record<string, string> = {
  completed: 'bg-emerald-500',
  in_progress: 'bg-brand-500',
  blocked: 'bg-red-500',
  missed: 'bg-red-500',
  not_started: 'bg-surface-600',
  planned: 'bg-surface-600',
}

const statusCard: Record<string, string> = {
  completed: 'border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10',
  in_progress: 'border-brand-500/40 bg-brand-500/5 hover:bg-brand-500/10',
  blocked: 'border-red-500/40 bg-red-500/5 hover:bg-red-500/10',
  missed: 'border-red-500/40 bg-red-500/5 hover:bg-red-500/10',
  not_started: 'border-surface-700 bg-surface-800/50 hover:bg-surface-800',
  planned: 'border-surface-700 bg-surface-800/50 hover:bg-surface-800',
}

interface PyramidCardProps {
  item: any
  type: string
  onClick: () => void
}

export default function PyramidCard({ item, type, onClick }: PyramidCardProps) {
  const isHabit = type === 'habit'
  const isSuccess = isHabit && item.success === 1
  const hasEntry = isHabit && item.entry_id != null

  const habitDot = isSuccess ? 'bg-emerald-500' : hasEntry ? 'bg-red-500' : 'bg-surface-600'
  const habitCard = isSuccess
    ? 'border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10'
    : hasEntry
      ? 'border-red-500/40 bg-red-500/5 hover:bg-red-500/10'
      : 'border-surface-700 bg-surface-800/50 hover:bg-surface-800'

  const cardClass = isHabit ? habitCard : (statusCard[item.status] ?? 'border-surface-700 bg-surface-800/50 hover:bg-surface-800')
  const dotClass = isHabit ? habitDot : (statusDot[item.status] ?? 'bg-surface-600')

  return (
    <button
      onClick={onClick}
      className={clsx(
        'text-left px-3 py-2 rounded-lg border text-sm transition-all duration-150',
        'hover:scale-[1.02] hover:shadow-md cursor-pointer',
        cardClass
      )}
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        <div className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', dotClass)} />
        <span className="text-white text-xs font-medium max-w-[200px] truncate">{item._label}</span>
      </div>
      <div className="text-surface-500 text-xs capitalize leading-tight">{item._sub}</div>
    </button>
  )
}
