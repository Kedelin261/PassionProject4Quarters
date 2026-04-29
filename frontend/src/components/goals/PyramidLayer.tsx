import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import clsx from 'clsx'
import PyramidCard from './PyramidCard'

export type LayerColor = 'green' | 'yellow' | 'red' | 'gray'

const borderColor: Record<LayerColor, string> = {
  green: 'border-emerald-500/40',
  yellow: 'border-yellow-500/40',
  red: 'border-red-500/40',
  gray: 'border-surface-700',
}
const headerBg: Record<LayerColor, string> = {
  green: 'bg-emerald-500/10',
  yellow: 'bg-yellow-500/10',
  red: 'bg-red-500/10',
  gray: 'bg-surface-800/60',
}
const labelColor: Record<LayerColor, string> = {
  green: 'text-emerald-300',
  yellow: 'text-yellow-300',
  red: 'text-red-300',
  gray: 'text-surface-400',
}
const progressFill: Record<LayerColor, string> = {
  green: 'bg-emerald-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
  gray: 'bg-surface-600',
}
const dotColor: Record<LayerColor, string> = {
  green: 'bg-emerald-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
  gray: 'bg-surface-500',
}

interface PyramidLayerProps {
  widthPct: number
  label: string
  sublabel: string
  progress: number
  color: LayerColor
  items: any[]
  type: string
  onItemClick: (item: any) => void
  emptyText?: string
}

export default function PyramidLayer({
  widthPct, label, sublabel, progress, color, items, type, onItemClick, emptyText,
}: PyramidLayerProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div style={{ width: `${widthPct}%` }} className="transition-all duration-300">
      <div className={clsx('rounded-xl border shadow-lg overflow-hidden bg-surface-900/90', borderColor[color])}>
        <div
          className={clsx('px-4 py-2.5 flex items-center gap-3 cursor-pointer select-none', headerBg[color])}
          onClick={() => setCollapsed(c => !c)}
        >
          <div className={clsx('w-2.5 h-2.5 rounded-full flex-shrink-0', dotColor[color])} />
          <div className="flex-1 min-w-0">
            <div className={clsx('font-semibold text-sm', labelColor[color])}>{label}</div>
            <div className="text-surface-500 text-xs">{sublabel}</div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-24 h-1.5 bg-surface-700 rounded-full overflow-hidden">
                <div
                  className={clsx('h-full rounded-full transition-all duration-700', progressFill[color])}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className={clsx('text-xs font-bold tabular-nums w-8 text-right', labelColor[color])}>
                {progress}%
              </span>
            </div>
            <span className="text-surface-600 text-xs">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </span>
            {collapsed
              ? <ChevronDown size={14} className="text-surface-500" />
              : <ChevronUp size={14} className="text-surface-500" />}
          </div>
        </div>

        {!collapsed && (
          <div className="p-3">
            {items.length === 0 ? (
              <div className="text-center py-4 text-surface-600 text-xs italic">
                {emptyText ?? 'No items'}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {items.map((item, i) => (
                  <PyramidCard
                    key={item.id ?? i}
                    item={item}
                    type={type}
                    onClick={() => onItemClick(item)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
