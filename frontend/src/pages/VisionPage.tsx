import { useEffect, useState, type FormEvent } from 'react'
import { Eye, Save } from 'lucide-react'
import { api } from '../lib/api'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'

export default function VisionPage() {
  const [vision, setVision] = useState<any>(null)
  const [form, setForm] = useState({
    visionStatement: '',
    emotionalConnection: '',
    whyItMatters: '',
    costOfFailure: '',
    rewardOfExecution: '',
  })
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    api.get('/vision').then(({ data }) => {
      if (data) {
        setVision(data)
        setForm({
          visionStatement: data.vision_statement || '',
          emotionalConnection: data.emotional_connection || '',
          whyItMatters: data.why_it_matters || '',
          costOfFailure: data.cost_of_failure || '',
          rewardOfExecution: data.reward_of_execution || '',
        })
      }
    }).catch(() => {})
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/vision', form)
      setVision(data)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {}
    setLoading(false)
  }

  const fields = [
    { key: 'visionStatement', label: 'Vision Statement', placeholder: 'Paint the picture. Who are you in 12 weeks? What does your life look like?', rows: 4 },
    { key: 'emotionalConnection', label: 'Emotional Connection', placeholder: 'Why does this vision matter to you emotionally? What feeling are you chasing?', rows: 3 },
    { key: 'whyItMatters', label: 'Why It Matters', placeholder: 'What changes for you and the people around you when you achieve this?', rows: 3 },
    { key: 'costOfFailure', label: 'Cost of Failure', placeholder: 'What does your life look like if you don\'t execute? Be brutally honest.', rows: 3 },
    { key: 'rewardOfExecution', label: 'Reward of Execution', placeholder: 'What do you earn — materially and emotionally — when you deliver?', rows: 3 },
  ]

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-brand-600/20 rounded-xl flex items-center justify-center">
          <Eye size={20} className="text-brand-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Vision</h1>
          <p className="text-surface-400 text-sm">Define what you're executing toward. Your north star.</p>
        </div>
      </div>

      {saved && (
        <div className="mb-6 p-3 bg-emerald-600/20 border border-emerald-600/30 rounded-lg text-emerald-400 text-sm flex items-center gap-2">
          <Save size={16} /> Vision saved successfully.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {fields.map(({ key, label, placeholder, rows }) => (
          <Card key={key}>
            <label className="block text-white font-semibold mb-1">{label}</label>
            <p className="text-surface-500 text-xs mb-3">{placeholder}</p>
            <textarea
              value={(form as any)[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              rows={rows}
              placeholder={placeholder}
              className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2.5 text-white placeholder-surface-600 focus:outline-none focus:border-brand-500 transition-colors resize-none text-sm"
            />
          </Card>
        ))}

        <div className="flex justify-end">
          <Button type="submit" loading={loading} size="lg">
            <Save size={16} />
            {vision ? 'Update Vision' : 'Save Vision'}
          </Button>
        </div>
      </form>
    </div>
  )
}
