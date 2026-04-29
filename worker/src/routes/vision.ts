import { Hono } from 'hono'
import { uuid, now } from '../db/helpers'
import { authMiddleware } from '../middleware/auth'
import type { Env } from '../types'

const vision = new Hono<{ Bindings: Env; Variables: { userId: string } }>()
vision.use('*', authMiddleware)

vision.get('/', async (c) => {
  const userId = c.get('userId')
  const v = await c.env.DB.prepare('SELECT * FROM visions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').bind(userId).first()
  return c.json(v || null)
})

vision.post('/', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const existing = await c.env.DB.prepare('SELECT id FROM visions WHERE user_id = ?').bind(userId).first() as any
  if (existing) {
    await c.env.DB.prepare(`UPDATE visions SET vision_statement=?,emotional_connection=?,why_it_matters=?,cost_of_failure=?,reward_of_execution=?,updated_at=? WHERE id=?`)
      .bind(body.visionStatement, body.emotionalConnection, body.whyItMatters, body.costOfFailure, body.rewardOfExecution, now(), existing.id).run()
    return c.json(await c.env.DB.prepare('SELECT * FROM visions WHERE id = ?').bind(existing.id).first())
  }
  const id = uuid()
  await c.env.DB.prepare('INSERT INTO visions (id,user_id,vision_statement,emotional_connection,why_it_matters,cost_of_failure,reward_of_execution,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)')
    .bind(id, userId, body.visionStatement, body.emotionalConnection, body.whyItMatters, body.costOfFailure, body.rewardOfExecution, now(), now()).run()
  return c.json(await c.env.DB.prepare('SELECT * FROM visions WHERE id = ?').bind(id).first(), 201)
})

vision.put('/:id', async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  const body = await c.req.json()
  const v = await c.env.DB.prepare('SELECT id FROM visions WHERE id = ? AND user_id = ?').bind(id, userId).first()
  if (!v) return c.json({ error: 'Not found' }, 404)
  await c.env.DB.prepare(`UPDATE visions SET vision_statement=?,emotional_connection=?,why_it_matters=?,cost_of_failure=?,reward_of_execution=?,updated_at=? WHERE id=?`)
    .bind(body.visionStatement, body.emotionalConnection, body.whyItMatters, body.costOfFailure, body.rewardOfExecution, now(), id).run()
  return c.json(await c.env.DB.prepare('SELECT * FROM visions WHERE id = ?').bind(id).first())
})

export default vision
