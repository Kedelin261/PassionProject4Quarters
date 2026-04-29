import { useEffect, useState } from 'react'
import { Users, Plus, UserCheck, UserX, Trophy, Search } from 'lucide-react'
import { api } from '../lib/api'
import { getUser } from '../lib/auth'
import { Card, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Badge } from '../components/ui/Badge'
import type { Partner } from '../types'

export default function AccountabilityPage() {
  const me = getUser()
  const [partners, setPartners] = useState<Partner[]>([])
  const [challenges, setChallenges] = useState<any[]>([])
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [selectedChallenge, setSelectedChallenge] = useState<string | null>(null)
  const [showInvite, setShowInvite] = useState(false)
  const [showChallenge, setShowChallenge] = useState(false)
  const [showInviteToChallenge, setShowInviteToChallenge] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [challengeEmail, setChallengeEmail] = useState('')
  const [challengeForm, setChallengeForm] = useState({ title: '', description: '', startDate: '', endDate: '' })
  const [error, setError] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const [p, c] = await Promise.all([
      api.get('/accountability/partners').catch(() => ({ data: [] })),
      api.get('/accountability/challenges').catch(() => ({ data: [] })),
    ])
    setPartners(p.data)
    setChallenges(c.data)
  }

  async function sendInvite() {
    setError('')
    try {
      await api.post('/accountability/invite', { email: inviteEmail })
      setInviteEmail(''); setShowInvite(false); load()
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to send invite')
    }
  }

  async function respondToInvite(id: string, action: 'accept' | 'decline') {
    if (action === 'accept') await api.post(`/accountability/accept/${id}`)
    else await api.post(`/accountability/decline/${id}`)
    load()
  }

  async function removePartner(id: string) {
    await api.delete(`/accountability/${id}`); load()
  }

  async function createChallenge() {
    await api.post('/accountability/challenges', challengeForm)
    setShowChallenge(false); load()
  }

  async function inviteToChallenge(id: string) {
    await api.post(`/accountability/challenges/${id}/invite`, { email: challengeEmail })
    setChallengeEmail(''); setShowInviteToChallenge(null); load()
  }

  async function loadLeaderboard(id: string) {
    const { data } = await api.get(`/accountability/challenges/${id}/leaderboard`)
    setLeaderboard(data)
    setSelectedChallenge(id)
  }

  const incoming = partners.filter(p => p.receiver_user_id === me?.id && p.status === 'pending')
  const accepted = partners.filter(p => p.status === 'accepted')
  const outgoing = partners.filter(p => p.requester_user_id === me?.id && p.status === 'pending')

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Accountability</h1>
          <p className="text-surface-400 text-sm">Partners, challenges, leaderboards</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setShowInvite(true)}>
            <Search size={16} /> Invite Partner
          </Button>
          <Button onClick={() => setShowChallenge(true)}>
            <Plus size={16} /> Create Challenge
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Partners */}
        <div className="space-y-5">
          {incoming.length > 0 && (
            <Card className="border-yellow-600/30">
              <CardHeader><CardTitle>Incoming Invites ({incoming.length})</CardTitle></CardHeader>
              <div className="space-y-3">
                {incoming.map(p => (
                  <div key={p.id} className="flex items-center justify-between bg-surface-800 rounded-lg p-3">
                    <div>
                      <div className="text-white font-medium">{p.requester_name}</div>
                      <div className="text-surface-500 text-sm">{p.requester_email}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => respondToInvite(p.id, 'accept')}>
                        <UserCheck size={14} /> Accept
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => respondToInvite(p.id, 'decline')}>
                        <UserX size={14} /> Decline
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Accountability Partners</CardTitle>
                <Badge status="accepted">{accepted.length} active</Badge>
              </div>
            </CardHeader>
            {accepted.length === 0 ? (
              <div className="text-center py-8 text-surface-500">
                <Users size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No partners yet. Invite someone.</p>
                <Button size="sm" className="mt-3" onClick={() => setShowInvite(true)}>Send Invite</Button>
              </div>
            ) : (
              <div className="space-y-3">
                {accepted.map(p => {
                  const isMe = p.requester_user_id === me?.id
                  const name = isMe ? p.receiver_name : p.requester_name
                  const email = isMe ? p.receiver_email : p.requester_email
                  return (
                    <div key={p.id} className="flex items-center gap-3 bg-surface-800 rounded-lg p-3">
                      <div className="w-9 h-9 bg-brand-600 rounded-full flex items-center justify-center text-white font-bold">
                        {name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="text-white font-medium">{name}</div>
                        <div className="text-surface-500 text-sm">{email}</div>
                      </div>
                      <Badge status="accepted" />
                      <button onClick={() => removePartner(p.id)} className="text-surface-500 hover:text-red-400 transition-colors">
                        <UserX size={16} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
            {outgoing.length > 0 && (
              <div className="mt-4 pt-4 border-t border-surface-800">
                <div className="text-surface-400 text-xs mb-2">Pending Sent Invites</div>
                {outgoing.map(p => (
                  <div key={p.id} className="flex items-center justify-between text-sm py-1">
                    <span className="text-surface-300">{p.receiver_email}</span>
                    <Badge status="pending">pending</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Challenges */}
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Active Challenges</CardTitle>
            </CardHeader>
            {challenges.length === 0 ? (
              <div className="text-center py-8 text-surface-500">
                <Trophy size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No challenges yet. Create one.</p>
                <Button size="sm" className="mt-3" onClick={() => setShowChallenge(true)}>Create Challenge</Button>
              </div>
            ) : (
              <div className="space-y-3">
                {challenges.map(c => (
                  <div key={c.id} className="bg-surface-800 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="text-white font-semibold">{c.title}</div>
                        <div className="text-surface-500 text-xs mt-0.5">{c.start_date} → {c.end_date}</div>
                      </div>
                      <Badge status="active">{c.member_count} members</Badge>
                    </div>
                    {c.description && <p className="text-surface-400 text-sm mb-3">{c.description}</p>}
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => loadLeaderboard(c.id)}>
                        <Trophy size={14} /> Leaderboard
                      </Button>
                      {c.creator_user_id === me?.id && (
                        <Button size="sm" variant="ghost" onClick={() => setShowInviteToChallenge(c.id)}>
                          <Plus size={14} /> Invite
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {selectedChallenge && leaderboard.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Leaderboard</CardTitle></CardHeader>
              <div className="space-y-2">
                {leaderboard.map((entry: any, i: number) => (
                  <div key={entry.id} className={`flex items-center gap-3 p-3 rounded-lg ${i === 0 ? 'bg-yellow-600/10 border border-yellow-600/20' : 'bg-surface-800'}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${i === 0 ? 'bg-yellow-500 text-black' : i === 1 ? 'bg-surface-500 text-white' : i === 2 ? 'bg-amber-700 text-white' : 'bg-surface-700 text-surface-300'}`}>
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <div className="text-white text-sm font-medium">{entry.name}</div>
                      <div className="text-surface-500 text-xs">{entry.completed_goals} goals · {entry.successful_habits} habits</div>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-semibold">{Math.round(entry.avg_weekly_score || 0)}%</div>
                      <div className="text-surface-500 text-xs">weekly avg</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Invite Partner Modal */}
      <Modal open={showInvite} onClose={() => { setShowInvite(false); setError('') }} title="Invite Accountability Partner">
        <div className="space-y-4">
          {error && <div className="text-red-400 text-sm bg-red-600/10 p-2 rounded">{error}</div>}
          <div>
            <label className="block text-surface-300 text-sm mb-1">Partner's Email</label>
            <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} type="email"
              className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-500"
              placeholder="friend@example.com" />
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setShowInvite(false)}>Cancel</Button>
            <Button onClick={sendInvite} disabled={!inviteEmail}>Send Invite</Button>
          </div>
        </div>
      </Modal>

      {/* Create Challenge Modal */}
      <Modal open={showChallenge} onClose={() => setShowChallenge(false)} title="Create Challenge">
        <div className="space-y-4">
          <div>
            <label className="block text-surface-300 text-sm mb-1">Challenge Title *</label>
            <input value={challengeForm.title} onChange={e => setChallengeForm({ ...challengeForm, title: e.target.value })}
              className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-500"
              placeholder="90-Day Execution Sprint" />
          </div>
          <div>
            <label className="block text-surface-300 text-sm mb-1">Description</label>
            <textarea value={challengeForm.description} onChange={e => setChallengeForm({ ...challengeForm, description: e.target.value })} rows={2}
              className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-500 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-surface-300 text-sm mb-1">Start Date</label>
              <input type="date" value={challengeForm.startDate} onChange={e => setChallengeForm({ ...challengeForm, startDate: e.target.value })}
                className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-500" />
            </div>
            <div>
              <label className="block text-surface-300 text-sm mb-1">End Date</label>
              <input type="date" value={challengeForm.endDate} onChange={e => setChallengeForm({ ...challengeForm, endDate: e.target.value })}
                className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-500" />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setShowChallenge(false)}>Cancel</Button>
            <Button onClick={createChallenge} disabled={!challengeForm.title || !challengeForm.startDate || !challengeForm.endDate}>Create</Button>
          </div>
        </div>
      </Modal>

      {/* Invite to Challenge Modal */}
      <Modal open={!!showInviteToChallenge} onClose={() => setShowInviteToChallenge(null)} title="Invite to Challenge">
        <div className="space-y-4">
          <div>
            <label className="block text-surface-300 text-sm mb-1">User Email</label>
            <input value={challengeEmail} onChange={e => setChallengeEmail(e.target.value)} type="email"
              className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-500"
              placeholder="user@example.com" />
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setShowInviteToChallenge(null)}>Cancel</Button>
            <Button onClick={() => inviteToChallenge(showInviteToChallenge!)} disabled={!challengeEmail}>Invite</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
