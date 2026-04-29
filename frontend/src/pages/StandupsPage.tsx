import { useEffect, useState } from 'react'
import { MessageSquare, Plus, ChevronDown, ChevronRight } from 'lucide-react'
import { api } from '../lib/api'
import { Card, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Badge } from '../components/ui/Badge'
import type { Standup } from '../types'

const TYPES = [
  { value: 'daily_standup', label: 'Daily Standup' },
  { value: 'end_of_day_reflection', label: 'End-of-Day Reflection' },
  { value: 'weekly_checkin', label: 'Weekly Check-In' },
  { value: 'quarterly_checkin', label: 'Quarterly Check-In' },
]

const FIELDS: Record<string, { key: keyof typeof EMPTY_FORM; label: string; placeholder: string }[]> = {
  daily_standup: [
    { key: 'previousProgress', label: 'What did I complete yesterday?', placeholder: 'List what you actually delivered...' },
    { key: 'nextFocus', label: 'What am I executing today?', placeholder: 'Your top priorities for today...' },
    { key: 'blockers', label: 'What is blocking me?', placeholder: 'Name every obstacle...' },
  ],
  end_of_day_reflection: [
    { key: 'previousProgress', label: 'What did I complete today?', placeholder: 'Everything you actually finished...' },
    { key: 'blockers', label: 'What did I miss? Why?', placeholder: 'Be honest. What happened?' },
    { key: 'reflection', label: 'What correction will I make tomorrow?', placeholder: 'Specific action you will take...' },
  ],
  weekly_checkin: [
    { key: 'previousProgress', label: 'Wins this week', placeholder: 'What went right?' },
    { key: 'blockers', label: 'Losses this week', placeholder: 'What fell short?' },
    { key: 'reflection', label: 'What must change next week?', placeholder: 'Specific adjustments...' },
    { key: 'nextFocus', label: 'Top priorities next week', placeholder: 'Your focus areas...' },
  ],
  quarterly_checkin: [
    { key: 'previousProgress', label: '12-Week Goal Results', placeholder: 'How did you do against each goal?' },
    { key: 'nextFocus', label: 'Biggest Wins', placeholder: 'What are you most proud of?' },
    { key: 'blockers', label: 'Biggest Failures', placeholder: 'Where did you fall short?' },
    { key: 'reflection', label: 'Lessons Learned + Next Cycle Adjustments', placeholder: 'What changes for next cycle?' },
  ],
}

const EMPTY_FORM = {
  type: 'daily_standup',
  date: new Date().toISOString().split('T')[0],
  previousProgress: '',
  nextFocus: '',
  blockers: '',
  reflection: '',
  scoreSummary: '',
}

export default function StandupsPage() {
  const [standups, setStandups] = useState<Standup[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [filter, setFilter] = useState('')

  useEffect(() => { load() }, [filter])

  async function load() {
    const params = filter ? `?type=${filter}` : ''
    const { data } = await api.get(`/standups${params}`)
    setStandups(data)
  }

  async function submit() {
    await api.post('/standups', form)
    setShowAdd(false); setForm({ ...EMPTY_FORM }); load()
  }

  const fields = FIELDS[form.type] || FIELDS.daily_standup

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Standups & Reflections</h1>
          <p className="text-surface-400 text-sm">Daily accountability. Weekly reviews. Quarterly reckoning.</p>
        </div>
        <Button onClick={() => setShowAdd(true)}><Plus size={16} /> New Entry</Button>
      </div>

      {/* Type Filter Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        <button onClick={() => setFilter('')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${!filter ? 'bg-brand-600 text-white' : 'text-surface-400 hover:text-white hover:bg-surface-800'}`}>
          All
        </button>
        {TYPES.map(t => (
          <button key={t.value} onClick={() => setFilter(t.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${filter === t.value ? 'bg-brand-600 text-white' : 'text-surface-400 hover:text-white hover:bg-surface-800'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {standups.length === 0 ? (
        <Card className="text-center py-12">
          <MessageSquare size={48} className="mx-auto mb-4 text-surface-600" />
          <div className="text-surface-400 text-lg font-medium">No entries yet</div>
          <p className="text-surface-500 text-sm mt-1">Start your first standup to build accountability.</p>
          <Button className="mt-4" onClick={() => setShowAdd(true)}>Start Now</Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {standups.map(s => (
            <Card key={s.id}>
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => setExpanded(ex => ({ ...ex, [s.id]: !ex[s.id] }))}>
                <button className="text-surface-500">{expanded[s.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</button>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">{TYPES.find(t => t.value === s.type)?.label}</span>
                    <Badge status={s.type === 'daily_standup' ? 'in_progress' : s.type === 'quarterly_checkin' ? 'completed' : 'active'}>
                      {TYPES.find(t => t.value === s.type)?.label}
                    </Badge>
                  </div>
                </div>
                <div className="text-surface-500 text-sm">{s.date}</div>
              </div>
              {expanded[s.id] && (
                <div className="mt-4 pt-4 border-t border-surface-800 space-y-3">
                  {s.previous_progress && (
                    <div>
                      <div className="text-surface-400 text-xs font-medium mb-1">PROGRESS / WINS</div>
                      <p className="text-surface-200 text-sm whitespace-pre-wrap">{s.previous_progress}</p>
                    </div>
                  )}
                  {s.next_focus && (
                    <div>
                      <div className="text-surface-400 text-xs font-medium mb-1">FOCUS / NEXT STEPS</div>
                      <p className="text-surface-200 text-sm whitespace-pre-wrap">{s.next_focus}</p>
                    </div>
                  )}
                  {s.blockers && (
                    <div>
                      <div className="text-surface-400 text-xs font-medium mb-1">BLOCKERS / MISSES</div>
                      <p className="text-surface-200 text-sm whitespace-pre-wrap">{s.blockers}</p>
                    </div>
                  )}
                  {s.reflection && (
                    <div>
                      <div className="text-surface-400 text-xs font-medium mb-1">REFLECTION</div>
                      <p className="text-surface-200 text-sm whitespace-pre-wrap">{s.reflection}</p>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="New Standup / Reflection">
        <div className="space-y-4">
          <div>
            <label className="block text-surface-300 text-sm mb-1">Type</label>
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
              className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-500">
              {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-surface-300 text-sm mb-1">Date</label>
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
              className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-500" />
          </div>
          {FIELDS[form.type]?.map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="block text-surface-300 text-sm font-medium mb-1">{label}</label>
              <textarea value={(form as any)[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} rows={3}
                className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-white placeholder-surface-600 focus:outline-none focus:border-brand-500 resize-none text-sm"
                placeholder={placeholder} />
            </div>
          ))}
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={submit}>Save Entry</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
