import { useEffect, useState } from 'react'
import { Plus, Trash2, Edit2, Calendar } from 'lucide-react'
import { api } from '../lib/api'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import type { TimeBlock } from '../types'

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const COLORS = ['#6172f3', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316']
const CATEGORIES = ['general', 'work', 'health', 'learning', 'personal', 'goals']

function formatHour(h: number) {
  if (h === 0) return '12 AM'
  if (h < 12) return `${h} AM`
  if (h === 12) return '12 PM'
  return `${h - 12} PM`
}

function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export default function TimeBlockingPage() {
  const [view, setView] = useState<'day' | 'week'>('day')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [blocks, setBlocks] = useState<TimeBlock[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [editBlock, setEditBlock] = useState<TimeBlock | null>(null)
  const [form, setForm] = useState({
    title: '',
    description: '',
    date: selectedDate,
    startTime: '09:00',
    endTime: '10:00',
    category: 'general',
    color: COLORS[0],
  })

  useEffect(() => { load() }, [selectedDate, view])

  async function load() {
    if (view === 'day') {
      const { data } = await api.get(`/time-blocks?date=${selectedDate}`)
      setBlocks(data)
    } else {
      const dates = getWeekDates()
      const { data } = await api.get(`/time-blocks?startDate=${dates[0]}&endDate=${dates[6]}`)
      setBlocks(data)
    }
  }

  function getWeekDates(): string[] {
    const d = new Date(selectedDate)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(d.setDate(diff))
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(monday)
      date.setDate(monday.getDate() + i)
      return date.toISOString().split('T')[0]
    })
  }

  async function saveBlock() {
    if (form.startTime >= form.endTime) return alert('End time must be after start time')
    if (editBlock) {
      await api.put(`/time-blocks/${editBlock.id}`, form)
    } else {
      await api.post('/time-blocks', form)
    }
    setShowAdd(false); setEditBlock(null)
    setForm({ title: '', description: '', date: selectedDate, startTime: '09:00', endTime: '10:00', category: 'general', color: COLORS[0] })
    load()
  }

  async function deleteBlock(id: string) {
    await api.delete(`/time-blocks/${id}`); load()
  }

  function openAdd(hour?: number) {
    setForm({
      title: '',
      description: '',
      date: selectedDate,
      startTime: hour !== undefined ? `${String(hour).padStart(2, '0')}:00` : '09:00',
      endTime: hour !== undefined ? `${String(hour + 1).padStart(2, '0')}:00` : '10:00',
      category: 'general',
      color: COLORS[0],
    })
    setEditBlock(null); setShowAdd(true)
  }

  function openEdit(block: TimeBlock) {
    setForm({ title: block.title, description: block.description, date: block.date, startTime: block.start_time, endTime: block.end_time, category: block.category, color: block.color })
    setEditBlock(block); setShowAdd(true)
  }

  function getBlockStyle(block: TimeBlock) {
    const start = timeToMinutes(block.start_time)
    const end = timeToMinutes(block.end_time)
    const top = (start / 60) * 64
    const height = ((end - start) / 60) * 64
    return { top, height: Math.max(height, 28) }
  }

  const weekDates = getWeekDates()

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Time Blocking</h1>
          <p className="text-surface-400 text-sm">Own every hour. Schedule your execution.</p>
        </div>
        <div className="flex gap-3">
          <div className="flex bg-surface-800 rounded-lg p-1">
            <button onClick={() => setView('day')} className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${view === 'day' ? 'bg-brand-600 text-white' : 'text-surface-400 hover:text-white'}`}>Day</button>
            <button onClick={() => setView('week')} className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${view === 'week' ? 'bg-brand-600 text-white' : 'text-surface-400 hover:text-white'}`}>Week</button>
          </div>
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
            className="bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-500" />
          <Button onClick={() => openAdd()}><Plus size={16} /> Add Block</Button>
        </div>
      </div>

      {view === 'day' ? (
        <Card className="overflow-hidden">
          <div className="relative" style={{ height: `${24 * 64}px` }}>
            {/* Hour lines */}
            {HOURS.map(h => (
              <div key={h} className="absolute w-full border-t border-surface-800 flex items-start" style={{ top: `${h * 64}px`, height: 64 }}>
                <div className="w-16 pr-3 text-right">
                  <span className="text-surface-600 text-xs">{formatHour(h)}</span>
                </div>
                <div className="flex-1 h-full hover:bg-surface-800/30 cursor-pointer transition-colors" onClick={() => openAdd(h)} />
              </div>
            ))}
            {/* Blocks */}
            {blocks.map(block => {
              const style = getBlockStyle(block)
              return (
                <div
                  key={block.id}
                  className="absolute left-16 right-4 rounded-lg px-3 py-1 cursor-pointer group"
                  style={{ top: style.top + 1, height: style.height - 2, backgroundColor: block.color + '30', borderLeft: `3px solid ${block.color}` }}
                  onClick={() => openEdit(block)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-white text-xs font-semibold truncate">{block.title}</div>
                      <div className="text-white/60 text-xs">{block.start_time}–{block.end_time}</div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); deleteBlock(block.id) }}
                      className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-all ml-1">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              )
            })}
            {/* Current time line */}
            {(() => {
              const now = new Date()
              const todayStr = now.toISOString().split('T')[0]
              if (selectedDate !== todayStr) return null
              const mins = now.getHours() * 60 + now.getMinutes()
              return (
                <div className="absolute left-16 right-0 border-t-2 border-red-500 pointer-events-none" style={{ top: (mins / 60) * 64 }}>
                  <div className="w-2 h-2 rounded-full bg-red-500 -mt-1 -ml-1" />
                </div>
              )
            })()}
          </div>
        </Card>
      ) : (
        <Card className="overflow-x-auto">
          <div className="min-w-[700px]">
            <div className="grid grid-cols-8 mb-2">
              <div className="text-surface-600 text-xs" />
              {weekDates.map(date => {
                const today = new Date().toISOString().split('T')[0]
                const label = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                return (
                  <div key={date} className={`text-center pb-2 text-xs font-medium ${date === today ? 'text-brand-400' : 'text-surface-400'}`}>
                    {label}
                  </div>
                )
              })}
            </div>
            <div className="relative" style={{ height: `${24 * 48}px` }}>
              {HOURS.map(h => (
                <div key={h} className="absolute w-full border-t border-surface-800 grid grid-cols-8" style={{ top: `${h * 48}px`, height: 48 }}>
                  <div className="text-surface-600 text-xs pr-2 text-right pt-1">{formatHour(h)}</div>
                  {weekDates.map(date => (
                    <div key={date} className="border-l border-surface-800 hover:bg-surface-800/30 cursor-pointer transition-colors"
                      onClick={() => { setSelectedDate(date); setView('day'); openAdd(h) }} />
                  ))}
                </div>
              ))}
              {blocks.map(block => {
                const colIdx = weekDates.indexOf(block.date)
                if (colIdx < 0) return null
                const start = timeToMinutes(block.start_time)
                const end = timeToMinutes(block.end_time)
                const top = (start / 60) * 48
                const height = Math.max(((end - start) / 60) * 48 - 2, 20)
                const leftPct = (1 + colIdx) / 8 * 100
                const widthPct = 1 / 8 * 100
                return (
                  <div key={block.id} className="absolute rounded px-1 py-0.5 cursor-pointer overflow-hidden"
                    style={{ top, height, left: `${leftPct}%`, width: `calc(${widthPct}% - 4px)`, backgroundColor: block.color + '40', borderLeft: `2px solid ${block.color}` }}
                    onClick={() => openEdit(block)}>
                    <div className="text-white text-xs font-medium truncate">{block.title}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </Card>
      )}

      <Modal open={showAdd} onClose={() => { setShowAdd(false); setEditBlock(null) }} title={editBlock ? 'Edit Time Block' : 'Add Time Block'}>
        <div className="space-y-4">
          <div>
            <label className="block text-surface-300 text-sm mb-1">Title *</label>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-500"
              placeholder="Deep work session, workout..." />
          </div>
          <div>
            <label className="block text-surface-300 text-sm mb-1">Date</label>
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
              className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-surface-300 text-sm mb-1">Start Time</label>
              <input type="time" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })}
                className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-500" />
            </div>
            <div>
              <label className="block text-surface-300 text-sm mb-1">End Time</label>
              <input type="time" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })}
                className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-500" />
            </div>
          </div>
          <div>
            <label className="block text-surface-300 text-sm mb-1">Category</label>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
              className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-500">
              {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-surface-300 text-sm mb-2">Color</label>
            <div className="flex gap-2">
              {COLORS.map(color => (
                <button key={color} onClick={() => setForm({ ...form, color })}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${form.color === color ? 'border-white scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: color }} />
              ))}
            </div>
          </div>
          <div>
            <label className="block text-surface-300 text-sm mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2}
              className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-500 resize-none text-sm"
              placeholder="Optional details..." />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" onClick={() => { setShowAdd(false); setEditBlock(null) }}>Cancel</Button>
            {editBlock && <Button variant="danger" onClick={() => { deleteBlock(editBlock.id); setShowAdd(false); setEditBlock(null) }}>Delete</Button>}
            <Button onClick={saveBlock} disabled={!form.title}>{editBlock ? 'Update' : 'Add'} Block</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
