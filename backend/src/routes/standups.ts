import { Hono } from 'hono'
import { db } from '../db/schema.js'
import { uuid, now } from '../db/helpers.js'
import { authMiddleware } from '../middleware/auth.js'

const standups = new Hono()
standups.use('*', authMiddleware)

standups.get('/', (c) => {
  const userId = c.get('userId')
  const { type, limit } = c.req.query()
  let query = 'SELECT * FROM standups WHERE user_id = ?'
  const params: any[] = [userId]
  if (type) { query += ' AND type = ?'; params.push(type) }
  query += ' ORDER BY date DESC, created_at DESC'
  if (limit) query += ` LIMIT ${parseInt(limit)}`
  return c.json(db.prepare(query).all(...params))
})

standups.post('/', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const id = uuid()
  db.prepare('INSERT INTO standups (id,user_id,partner_user_id,type,date,previous_progress,next_focus,blockers,reflection,score_summary,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
    .run(id, userId, body.partnerUserId || null, body.type, body.date, body.previousProgress || '', body.nextFocus || '', body.blockers || '', body.reflection || '', body.scoreSummary || '', now(), now())
  return c.json(db.prepare('SELECT * FROM standups WHERE id = ?').get(id), 201)
})

standups.get('/:id', (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  const standup = db.prepare('SELECT * FROM standups WHERE id = ? AND user_id = ?').get(id, userId)
  if (!standup) return c.json({ error: 'Not found' }, 404)
  return c.json(standup)
})

standups.put('/:id', async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  const body = await c.req.json()
  const s = db.prepare('SELECT id FROM standups WHERE id = ? AND user_id = ?').get(id, userId)
  if (!s) return c.json({ error: 'Not found' }, 404)
  db.prepare('UPDATE standups SET previous_progress=?,next_focus=?,blockers=?,reflection=?,score_summary=?,updated_at=? WHERE id=?')
    .run(body.previousProgress, body.nextFocus, body.blockers, body.reflection, body.scoreSummary, now(), id)
  return c.json(db.prepare('SELECT * FROM standups WHERE id = ?').get(id))
})

export default standups
