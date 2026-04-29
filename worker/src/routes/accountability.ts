import { Hono } from 'hono'
import { uuid, now } from '../db/helpers'
import { authMiddleware } from '../middleware/auth'
import type { Env } from '../types'

const accountability = new Hono<{ Bindings: Env; Variables: { userId: string } }>()
accountability.use('*', authMiddleware)

accountability.get('/partners', async (c) => {
  const userId = c.get('userId')
  const { results } = await c.env.DB.prepare(`
    SELECT ap.*, ru.name as requester_name, ru.email as requester_email,
      rv.name as receiver_name, rv.email as receiver_email
    FROM accountability_partners ap
    JOIN users ru ON ap.requester_user_id = ru.id
    JOIN users rv ON ap.receiver_user_id = rv.id
    WHERE (ap.requester_user_id = ? OR ap.receiver_user_id = ?) AND ap.status != 'removed'
  `).bind(userId, userId).all()
  return c.json(results)
})

accountability.post('/invite', async (c) => {
  const userId = c.get('userId')
  const { email } = await c.req.json()
  const receiver = await c.env.DB.prepare('SELECT id, name, email FROM users WHERE email = ?').bind(email).first() as any
  if (!receiver) return c.json({ error: 'User not found' }, 404)
  if (receiver.id === userId) return c.json({ error: 'Cannot invite yourself' }, 400)
  const existing = await c.env.DB.prepare("SELECT id FROM accountability_partners WHERE ((requester_user_id=? AND receiver_user_id=?) OR (requester_user_id=? AND receiver_user_id=?)) AND status IN ('pending','accepted')").bind(userId, receiver.id, receiver.id, userId).first()
  if (existing) return c.json({ error: 'Partnership already exists' }, 409)
  const id = uuid()
  await c.env.DB.prepare("INSERT INTO accountability_partners (id,requester_user_id,receiver_user_id,status,created_at,updated_at) VALUES (?,?,?,'pending',?,?)")
    .bind(id, userId, receiver.id, now(), now()).run()
  return c.json(await c.env.DB.prepare('SELECT * FROM accountability_partners WHERE id = ?').bind(id).first(), 201)
})

accountability.post('/accept/:id', async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  const ap = await c.env.DB.prepare("SELECT * FROM accountability_partners WHERE id = ? AND receiver_user_id = ? AND status = 'pending'").bind(id, userId).first()
  if (!ap) return c.json({ error: 'Not found' }, 404)
  await c.env.DB.prepare("UPDATE accountability_partners SET status='accepted', updated_at=? WHERE id=?").bind(now(), id).run()
  return c.json(await c.env.DB.prepare('SELECT * FROM accountability_partners WHERE id = ?').bind(id).first())
})

accountability.post('/decline/:id', async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  const ap = await c.env.DB.prepare("SELECT id FROM accountability_partners WHERE id = ? AND receiver_user_id = ? AND status = 'pending'").bind(id, userId).first()
  if (!ap) return c.json({ error: 'Not found' }, 404)
  await c.env.DB.prepare("UPDATE accountability_partners SET status='declined', updated_at=? WHERE id=?").bind(now(), id).run()
  return c.json({ message: 'Declined' })
})

accountability.delete('/:id', async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  const ap = await c.env.DB.prepare('SELECT id FROM accountability_partners WHERE id = ? AND (requester_user_id=? OR receiver_user_id=?)').bind(id, userId, userId).first()
  if (!ap) return c.json({ error: 'Not found' }, 404)
  await c.env.DB.prepare("UPDATE accountability_partners SET status='removed', updated_at=? WHERE id=?").bind(now(), id).run()
  return c.json({ message: 'Removed' })
})

accountability.get('/challenges', async (c) => {
  const userId = c.get('userId')
  const { results } = await c.env.DB.prepare(`
    SELECT c.*, cm.role, cm.joined_at,
      (SELECT COUNT(*) FROM challenge_members WHERE challenge_id = c.id) as member_count
    FROM challenges c
    LEFT JOIN challenge_members cm ON c.id = cm.challenge_id AND cm.user_id = ?
    WHERE c.creator_user_id = ? OR cm.user_id = ?
    ORDER BY c.created_at DESC
  `).bind(userId, userId, userId).all()
  return c.json(results)
})

accountability.post('/challenges', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const id = uuid()
  await c.env.DB.prepare("INSERT INTO challenges (id,creator_user_id,title,description,start_date,end_date,status,created_at,updated_at) VALUES (?,?,?,?,?,?,'active',?,?)")
    .bind(id, userId, body.title, body.description || '', body.startDate, body.endDate, now(), now()).run()
  await c.env.DB.prepare("INSERT INTO challenge_members (id,challenge_id,user_id,role,joined_at) VALUES (?,?,?,'creator',?)")
    .bind(uuid(), id, userId, now()).run()
  return c.json(await c.env.DB.prepare('SELECT * FROM challenges WHERE id = ?').bind(id).first(), 201)
})

accountability.post('/challenges/:id/invite', async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  const { email } = await c.req.json()
  const challenge = await c.env.DB.prepare('SELECT id FROM challenges WHERE id = ? AND creator_user_id = ?').bind(id, userId).first()
  if (!challenge) return c.json({ error: 'Not found or not authorized' }, 404)
  const invitee = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first() as any
  if (!invitee) return c.json({ error: 'User not found' }, 404)
  const existing = await c.env.DB.prepare('SELECT id FROM challenge_members WHERE challenge_id = ? AND user_id = ?').bind(id, invitee.id).first()
  if (existing) return c.json({ error: 'User already a member' }, 409)
  await c.env.DB.prepare("INSERT INTO challenge_members (id,challenge_id,user_id,role,joined_at) VALUES (?,?,?,'member',?)")
    .bind(uuid(), id, invitee.id, now()).run()
  return c.json({ message: 'Invited' }, 201)
})

accountability.get('/challenges/:id/leaderboard', async (c) => {
  const { id } = c.req.param()
  const { results } = await c.env.DB.prepare(`
    SELECT u.id, u.name, u.email,
      COALESCE(AVG(ds.score_percentage), 0) as avg_daily_score,
      COALESCE(AVG(ws.score_percentage), 0) as avg_weekly_score,
      COUNT(DISTINCT CASE WHEN dg.status='completed' THEN dg.id END) as completed_goals,
      COUNT(DISTINCT CASE WHEN he.success=1 THEN he.id END) as successful_habits
    FROM challenge_members cm
    JOIN users u ON cm.user_id = u.id
    LEFT JOIN daily_scores ds ON ds.user_id = u.id
    LEFT JOIN weekly_scores ws ON ws.user_id = u.id
    LEFT JOIN daily_goals dg ON dg.user_id = u.id
    LEFT JOIN habit_entries he ON he.user_id = u.id
    WHERE cm.challenge_id = ?
    GROUP BY u.id, u.name, u.email
    ORDER BY avg_weekly_score DESC, completed_goals DESC
  `).bind(id).all()
  return c.json(results)
})

export default accountability
