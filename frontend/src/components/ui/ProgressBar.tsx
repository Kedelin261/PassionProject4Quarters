import clsx from 'clsx'

interface ProgressBarProps {
  value: number
  max?: number
  className?: string
  colorClass?: string
  showLabel?: boolean
}

export function ProgressBar({ value, max = 100, className, colorClass = 'bg-brand-600', showLabel }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div className={clsx('flex items-center gap-2', className)}>
      <div className="flex-1 bg-surface-800 rounded-full h-2 overflow-hidden">
        <div
          className={clsx('h-full rounded-full transition-all', colorClass)}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && <span className="text-xs text-surface-400 w-10 text-right">{pct.toFixed(0)}%</span>}
    </div>
  )
}
