import { Hono } from 'hono'
import { db } from '../db/schema.js'
import { uuid, now } from '../db/helpers.js'
import { authMiddleware } from '../middleware/auth.js'

const vision = new Hono()
vision.use('*', authMiddleware)

vision.get('/', (c) => {
  const userId = c.get('userId')
  const v = db.prepare('SELECT * FROM visions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(userId)
  return c.json(v || null)
})

vision.post('/', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const existing = db.prepare('SELECT id FROM visions WHERE user_id = ?').get(userId) as any
  if (existing) {
    db.prepare(`UPDATE visions SET vision_statement=?,emotional_connection=?,why_it_matters=?,cost_of_failure=?,reward_of_execution=?,updated_at=? WHERE id=?`)
      .run(body.visionStatement, body.emotionalConnection, body.whyItMatters, body.costOfFailure, body.rewardOfExecution, now(), existing.id)
    return c.json(db.prepare('SELECT * FROM visions WHERE id = ?').get(existing.id))
  }
  const id = uuid()
  db.prepare('INSERT INTO visions (id,user_id,vision_statement,emotional_connection,why_it_matters,cost_of_failure,reward_of_execution,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)')
    .run(id, userId, body.visionStatement, body.emotionalConnection, body.whyItMatters, body.costOfFailure, body.rewardOfExecution, now(), now())
  return c.json(db.prepare('SELECT * FROM visions WHERE id = ?').get(id), 201)
})

vision.put('/:id', async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  const body = await c.req.json()
  const v = db.prepare('SELECT id FROM visions WHERE id = ? AND user_id = ?').get(id, userId)
  if (!v) return c.json({ error: 'Not found' }, 404)
  db.prepare(`UPDATE visions SET vision_statement=?,emotional_connection=?,why_it_matters=?,cost_of_failure=?,reward_of_execution=?,updated_at=? WHERE id=?`)
    .run(body.visionStatement, body.emotionalConnection, body.whyItMatters, body.costOfFailure, body.rewardOfExecution, now(), id)
  return c.json(db.prepare('SELECT * FROM visions WHERE id = ?').get(id))
})

export default vision
