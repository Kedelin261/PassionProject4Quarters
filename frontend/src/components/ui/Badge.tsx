import clsx from 'clsx'

const variants: Record<string, string> = {
  not_started: 'bg-surface-800 text-surface-400',
  in_progress: 'bg-brand-600/20 text-brand-400 border border-brand-600/30',
  completed: 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30',
  blocked: 'bg-red-600/20 text-red-400 border border-red-600/30',
  planned: 'bg-surface-800 text-surface-400',
  missed: 'bg-red-600/20 text-red-400 border border-red-600/30',
  active: 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30',
  archived: 'bg-surface-700 text-surface-500',
  pending: 'bg-yellow-600/20 text-yellow-400 border border-yellow-600/30',
  accepted: 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30',
  A: 'bg-emerald-600/20 text-emerald-400',
  B: 'bg-brand-600/20 text-brand-400',
  C: 'bg-yellow-600/20 text-yellow-400',
  D: 'bg-orange-600/20 text-orange-400',
  F: 'bg-red-600/20 text-red-400',
}

export function Badge({ status, children }: { status?: string; children?: React.ReactNode }) {
  const label = children ?? (status?.replace(/_/g, ' ') || '')
  const key = status || String(children) || ''
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium', variants[key] || 'bg-surface-800 text-surface-400')}>
      {label}
    </span>
  )
}
