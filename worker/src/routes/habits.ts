import { Hono } from 'hono'
import { uuid, now } from '../db/helpers'
import { authMiddleware } from '../middleware/auth'
import type { Env } from '../types'

const habits = new Hono<{ Bindings: Env; Variables: { userId: string } }>()
habits.use('*', authMiddleware)

habits.get('/', async (c) => {
  const userId = c.get('userId')
  const { results } = await c.env.DB.prepare('SELECT * FROM habits WHERE user_id = ? AND active = 1 ORDER BY created_at').bind(userId).all()
  return c.json(results)
})

habits.post('/', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()
  if (body.weeklyGoalId) {
    const wg = await c.env.DB.prepare('SELECT id FROM weekly_goals WHERE id = ? AND user_id = ?').bind(body.weeklyGoalId, userId).first()
    if (!wg) return c.json({ error: 'Weekly goal not found' }, 404)
  }
  const id = uuid()
  await c.env.DB.prepare('INSERT INTO habits (id,user_id,name,habit_type,goal_behavior,active,weekly_goal_id,created_at,updated_at) VALUES (?,?,?,?,?,1,?,?,?)')
    .bind(id, userId, body.name, body.habitType || 'positive', body.goalBehavior || 'execute', body.weeklyGoalId || null, now(), now()).run()
  return c.json(await c.env.DB.prepare('SELECT * FROM habits WHERE id = ?').bind(id).first(), 201)
})

habits.put('/:id', async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  const body = await c.req.json()
  const h = await c.env.DB.prepare('SELECT id FROM habits WHERE id = ? AND user_id = ?').bind(id, userId).first()
  if (!h) return c.json({ error: 'Not found' }, 404)
  await c.env.DB.prepare('UPDATE habits SET name=?,habit_type=?,goal_behavior=?,active=?,weekly_goal_id=?,updated_at=? WHERE id=?')
    .bind(body.name, body.habitType, body.goalBehavior, body.active ? 1 : 0, body.weeklyGoalId ?? null, now(), id).run()
  return c.json(await c.env.DB.prepare('SELECT * FROM habits WHERE id = ?').bind(id).first())
})

habits.delete('/:id', async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  const h = await c.env.DB.prepare('SELECT id FROM habits WHERE id = ? AND user_id = ?').bind(id, userId).first()
  if (!h) return c.json({ error: 'Not found' }, 404)
  await c.env.DB.prepare('UPDATE habits SET active = 0, updated_at = ? WHERE id = ?').bind(now(), id).run()
  return c.json({ message: 'Deleted' })
})

habits.get('/entries', async (c) => {
  const userId = c.get('userId')
  const { startDate, endDate } = c.req.query()
  let query = 'SELECT he.*, h.name, h.goal_behavior, h.habit_type FROM habit_entries he JOIN habits h ON he.habit_id = h.id WHERE he.user_id = ?'
  const params: any[] = [userId]
  if (startDate) { query += ' AND he.date >= ?'; params.push(startDate) }
  if (endDate) { query += ' AND he.date <= ?'; params.push(endDate) }
  query += ' ORDER BY he.date'
  const { results } = await c.env.DB.prepare(query).bind(...params).all()
  return c.json(results)
})

habits.post('/entries', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const habit = await c.env.DB.prepare('SELECT * FROM habits WHERE id = ? AND user_id = ?').bind(body.habitId, userId).first() as any
  if (!habit) return c.json({ error: 'Habit not found' }, 404)
  const executed = body.executed ? 1 : 0
  const success = habit.goal_behavior === 'execute' ? (executed === 1 ? 1 : 0) : (executed === 0 ? 1 : 0)
  const existing = await c.env.DB.prepare('SELECT id FROM habit_entries WHERE habit_id = ? AND date = ?').bind(body.habitId, body.date).first() as any
  if (existing) {
    await c.env.DB.prepare('UPDATE habit_entries SET executed=?,success=?,note=?,updated_at=? WHERE id=?')
      .bind(executed, success, body.note || '', now(), existing.id).run()
    return c.json(await c.env.DB.prepare('SELECT * FROM habit_entries WHERE id = ?').bind(existing.id).first())
  }
  const id = uuid()
  await c.env.DB.prepare('INSERT INTO habit_entries (id,user_id,habit_id,date,executed,success,note,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)')
    .bind(id, userId, body.habitId, body.date, executed, success, body.note || '', now(), now()).run()
  return c.json(await c.env.DB.prepare('SELECT * FROM habit_entries WHERE id = ?').bind(id).first(), 201)
})

habits.put('/entries/:id', async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  const body = await c.req.json()
  const entry = await c.env.DB.prepare('SELECT he.*, h.goal_behavior FROM habit_entries he JOIN habits h ON he.habit_id = h.id WHERE he.id = ? AND he.user_id = ?').bind(id, userId).first() as any
  if (!entry) return c.json({ error: 'Not found' }, 404)
  const executed = body.executed ? 1 : 0
  const success = entry.goal_behavior === 'execute' ? (executed === 1 ? 1 : 0) : (executed === 0 ? 1 : 0)
  await c.env.DB.prepare('UPDATE habit_entries SET executed=?,success=?,note=?,updated_at=? WHERE id=?')
    .bind(executed, success, body.note || '', now(), id).run()
  return c.json(await c.env.DB.prepare('SELECT * FROM habit_entries WHERE id = ?').bind(id).first())
})

export default habits
