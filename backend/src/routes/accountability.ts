import { Hono } from 'hono'
import { db } from '../db/schema.js'
import { uuid, now } from '../db/helpers.js'
import { authMiddleware } from '../middleware/auth.js'

const accountability = new Hono()
accountability.use('*', authMiddleware)

accountability.get('/partners', (c) => {
  const userId = c.get('userId')
  const partners = db.prepare(`
    SELECT ap.*,
      ru.name as requester_name, ru.email as requester_email,
      rv.name as receiver_name, rv.email as receiver_email
    FROM accountability_partners ap
    JOIN users ru ON ap.requester_user_id = ru.id
    JOIN users rv ON ap.receiver_user_id = rv.id
    WHERE (ap.requester_user_id = ? OR ap.receiver_user_id = ?) AND ap.status != 'removed'
  `).all(userId, userId)
  return c.json(partners)
})

accountability.post('/invite', async (c) => {
  const userId = c.get('userId')
  const { email } = await c.req.json()
  const receiver = db.prepare('SELECT id, name, email FROM users WHERE email = ?').get(email) as any
  if (!receiver) return c.json({ error: 'User not found' }, 404)
  if (receiver.id === userId) return c.json({ error: 'Cannot invite yourself' }, 400)
  const existing = db.prepare('SELECT id FROM accountability_partners WHERE ((requester_user_id=? AND receiver_user_id=?) OR (requester_user_id=? AND receiver_user_id=?)) AND status IN (\'pending\',\'accepted\')').get(userId, receiver.id, receiver.id, userId)
  if (existing) return c.json({ error: 'Partnership already exists' }, 409)
  const id = uuid()
  db.prepare('INSERT INTO accountability_partners (id,requester_user_id,receiver_user_id,status,created_at,updated_at) VALUES (?,?,?,\'pending\',?,?)')
    .run(id, userId, receiver.id, now(), now())
  return c.json(db.prepare('SELECT * FROM accountability_partners WHERE id = ?').get(id), 201)
})

accountability.post('/accept/:id', (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  const ap = db.prepare('SELECT * FROM accountability_partners WHERE id = ? AND receiver_user_id = ? AND status = \'pending\'').get(id, userId) as any
  if (!ap) return c.json({ error: 'Not found or not pending' }, 404)
  db.prepare('UPDATE accountability_partners SET status=\'accepted\', updated_at=? WHERE id=?').run(now(), id)
  return c.json(db.prepare('SELECT * FROM accountability_partners WHERE id = ?').get(id))
})

accountability.post('/decline/:id', (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  const ap = db.prepare('SELECT * FROM accountability_partners WHERE id = ? AND receiver_user_id = ? AND status = \'pending\'').get(id, userId)
  if (!ap) return c.json({ error: 'Not found' }, 404)
  db.prepare('UPDATE accountability_partners SET status=\'declined\', updated_at=? WHERE id=?').run(now(), id)
  return c.json({ message: 'Declined' })
})

accountability.delete('/:id', (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  const ap = db.prepare('SELECT * FROM accountability_partners WHERE id = ? AND (requester_user_id=? OR receiver_user_id=?)').get(id, userId, userId)
  if (!ap) return c.json({ error: 'Not found' }, 404)
  db.prepare('UPDATE accountability_partners SET status=\'removed\', updated_at=? WHERE id=?').run(now(), id)
  return c.json({ message: 'Removed' })
})

// Challenges
accountability.get('/challenges', (c) => {
  const userId = c.get('userId')
  const challenges = db.prepare(`
    SELECT c.*, cm.role, cm.joined_at,
      (SELECT COUNT(*) FROM challenge_members WHERE challenge_id = c.id) as member_count
    FROM challenges c
    LEFT JOIN challenge_members cm ON c.id = cm.challenge_id AND cm.user_id = ?
    WHERE c.creator_user_id = ? OR cm.user_id = ?
    ORDER BY c.created_at DESC
  `).all(userId, userId, userId)
  return c.json(challenges)
})

accountability.post('/challenges', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const id = uuid()
  db.prepare('INSERT INTO challenges (id,creator_user_id,title,description,start_date,end_date,status,created_at,updated_at) VALUES (?,?,?,?,?,?,\'active\',?,?)')
    .run(id, userId, body.title, body.description || '', body.startDate, body.endDate, now(), now())
  db.prepare('INSERT INTO challenge_members (id,challenge_id,user_id,role,joined_at) VALUES (?,?,?,\'creator\',?)')
    .run(uuid(), id, userId, now())
  return c.json(db.prepare('SELECT * FROM challenges WHERE id = ?').get(id), 201)
})

accountability.post('/challenges/:id/invite', async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  const { email } = await c.req.json()
  const challenge = db.prepare('SELECT id FROM challenges WHERE id = ? AND creator_user_id = ?').get(id, userId)
  if (!challenge) return c.json({ error: 'Challenge not found or not authorized' }, 404)
  const invitee = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as any
  if (!invitee) return c.json({ error: 'User not found' }, 404)
  const existing = db.prepare('SELECT id FROM challenge_members WHERE challenge_id = ? AND user_id = ?').get(id, invitee.id)
  if (existing) return c.json({ error: 'User already a member' }, 409)
  db.prepare('INSERT INTO challenge_members (id,challenge_id,user_id,role,joined_at) VALUES (?,?,?,\'member\',?)')
    .run(uuid(), id, invitee.id, now())
  return c.json({ message: 'Invited' }, 201)
})

accountability.get('/challenges/:id/leaderboard', (c) => {
  const { id } = c.req.param()
  const leaderboard = db.prepare(`
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
  `).all(id)
  return c.json(leaderboard)
})

export default accountability
