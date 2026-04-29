import { Hono } from 'hono'
import { db } from '../db/schema.js'
import { uuid, now } from '../db/helpers.js'
import { authMiddleware } from '../middleware/auth.js'

const habits = new Hono()
habits.use('*', authMiddleware)

habits.get('/', (c) => {
  const userId = c.get('userId')
  return c.json(db.prepare('SELECT * FROM habits WHERE user_id = ? AND active = 1 ORDER BY created_at').all(userId))
})

habits.post('/', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const id = uuid()
  db.prepare('INSERT INTO habits (id,user_id,name,habit_type,goal_behavior,active,created_at,updated_at) VALUES (?,?,?,?,?,1,?,?)')
    .run(id, userId, body.name, body.habitType || 'positive', body.goalBehavior || 'execute', now(), now())
  return c.json(db.prepare('SELECT * FROM habits WHERE id = ?').get(id), 201)
})

habits.put('/:id', async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  const body = await c.req.json()
  const h = db.prepare('SELECT id FROM habits WHERE id = ? AND user_id = ?').get(id, userId)
  if (!h) return c.json({ error: 'Not found' }, 404)
  db.prepare('UPDATE habits SET name=?,habit_type=?,goal_behavior=?,active=?,updated_at=? WHERE id=?')
    .run(body.name, body.habitType, body.goalBehavior, body.active ? 1 : 0, now(), id)
  return c.json(db.prepare('SELECT * FROM habits WHERE id = ?').get(id))
})

habits.delete('/:id', (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  const h = db.prepare('SELECT id FROM habits WHERE id = ? AND user_id = ?').get(id, userId)
  if (!h) return c.json({ error: 'Not found' }, 404)
  db.prepare('UPDATE habits SET active = 0, updated_at = ? WHERE id = ?').run(now(), id)
  return c.json({ message: 'Deleted' })
})

// Habit entries
habits.get('/entries', (c) => {
  const userId = c.get('userId')
  const { startDate, endDate } = c.req.query()
  let query = 'SELECT he.*, h.name, h.goal_behavior, h.habit_type FROM habit_entries he JOIN habits h ON he.habit_id = h.id WHERE he.user_id = ?'
  const params: any[] = [userId]
  if (startDate) { query += ' AND he.date >= ?'; params.push(startDate) }
  if (endDate) { query += ' AND he.date <= ?'; params.push(endDate) }
  query += ' ORDER BY he.date'
  return c.json(db.prepare(query).all(...params))
})

habits.post('/entries', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const habit = db.prepare('SELECT * FROM habits WHERE id = ? AND user_id = ?').get(body.habitId, userId) as any
  if (!habit) return c.json({ error: 'Habit not found' }, 404)

  // Calculate success based on goalBehavior
  const executed = body.executed ? 1 : 0
  const success = habit.goal_behavior === 'execute' ? (executed === 1 ? 1 : 0) : (executed === 0 ? 1 : 0)

  const existing = db.prepare('SELECT id FROM habit_entries WHERE habit_id = ? AND date = ?').get(body.habitId, body.date) as any
  if (existing) {
    db.prepare('UPDATE habit_entries SET executed=?,success=?,note=?,updated_at=? WHERE id=?')
      .run(executed, success, body.note || '', now(), existing.id)
    return c.json(db.prepare('SELECT * FROM habit_entries WHERE id = ?').get(existing.id))
  }
  const id = uuid()
  db.prepare('INSERT INTO habit_entries (id,user_id,habit_id,date,executed,success,note,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)')
    .run(id, userId, body.habitId, body.date, executed, success, body.note || '', now(), now())
  return c.json(db.prepare('SELECT * FROM habit_entries WHERE id = ?').get(id), 201)
})

habits.put('/entries/:id', async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  const body = await c.req.json()
  const entry = db.prepare('SELECT he.*, h.goal_behavior FROM habit_entries he JOIN habits h ON he.habit_id = h.id WHERE he.id = ? AND he.user_id = ?').get(id, userId) as any
  if (!entry) return c.json({ error: 'Not found' }, 404)
  const executed = body.executed ? 1 : 0
  const success = entry.goal_behavior === 'execute' ? (executed === 1 ? 1 : 0) : (executed === 0 ? 1 : 0)
  db.prepare('UPDATE habit_entries SET executed=?,success=?,note=?,updated_at=? WHERE id=?')
    .run(executed, success, body.note || '', now(), id)
  return c.json(db.prepare('SELECT * FROM habit_entries WHERE id = ?').get(id))
})

export default habits
