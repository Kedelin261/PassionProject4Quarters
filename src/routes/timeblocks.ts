import { Hono } from 'hono'
import { getAuthUser, extractToken } from '../lib/auth'

type Bindings = { DB: D1Database }
const timeblocks = new Hono<{ Bindings: Bindings }>()

// POST /api/time-blocks
timeblocks.post('/', async (c) => {
  try {
    const token = extractToken(c)
    const user = await getAuthUser(c.env.DB, token)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const { title, date, start_time, end_time, color, goal_id, habit_id } = await c.req.json()
    if (!title || !date || !start_time || !end_time) {
      return c.json({ error: 'title, date, start_time, end_time required' }, 400)
    }

    const result = await c.env.DB.prepare(
      `INSERT INTO time_blocks (user_id, title, date, start_time, end_time, color, goal_id, habit_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(user.id, title, date, start_time, end_time, color || '#4F46E5', goal_id || null, habit_id || null).run()

    const block = await c.env.DB.prepare('SELECT * FROM time_blocks WHERE id = ?').bind(result.meta.last_row_id).first()
    return c.json({ block }, 201)
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// GET /api/time-blocks
timeblocks.get('/', async (c) => {
  try {
    const token = extractToken(c)
    const user = await getAuthUser(c.env.DB, token)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const date = c.req.query('date') || new Date().toISOString().split('T')[0]

    const result = await c.env.DB.prepare(
      'SELECT * FROM time_blocks WHERE user_id = ? AND date = ? ORDER BY start_time ASC'
    ).bind(user.id, date).all()

    return c.json({ blocks: result.results })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// PATCH /api/time-blocks/:id
timeblocks.patch('/:id', async (c) => {
  try {
    const token = extractToken(c)
    const user = await getAuthUser(c.env.DB, token)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const id = c.req.param('id')
    const { title, start_time, end_time, color, goal_id, habit_id } = await c.req.json()

    await c.env.DB.prepare(
      `UPDATE time_blocks SET 
       title = COALESCE(?, title),
       start_time = COALESCE(?, start_time),
       end_time = COALESCE(?, end_time),
       color = COALESCE(?, color),
       goal_id = COALESCE(?, goal_id),
       habit_id = COALESCE(?, habit_id)
       WHERE id = ? AND user_id = ?`
    ).bind(title, start_time, end_time, color, goal_id, habit_id, id, user.id).run()

    const block = await c.env.DB.prepare('SELECT * FROM time_blocks WHERE id = ?').bind(id).first()
    return c.json({ block })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// DELETE /api/time-blocks/:id
timeblocks.delete('/:id', async (c) => {
  try {
    const token = extractToken(c)
    const user = await getAuthUser(c.env.DB, token)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const id = c.req.param('id')
    await c.env.DB.prepare('DELETE FROM time_blocks WHERE id = ? AND user_id = ?').bind(id, user.id).run()
    return c.json({ success: true })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

export default timeblocks
