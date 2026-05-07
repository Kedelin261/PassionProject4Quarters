import { Hono } from 'hono'
import { getAuthUser, extractToken } from '../lib/auth'

type Bindings = { DB: D1Database }
const habits = new Hono<{ Bindings: Bindings }>()

// POST /api/habits
habits.post('/', async (c) => {
  try {
    const token = extractToken(c)
    const user = await getAuthUser(c.env.DB, token)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const { weekly_goal_id, title, type, target_days } = await c.req.json()
    if (!title) return c.json({ error: 'title required' }, 400)

    const result = await c.env.DB.prepare(
      'INSERT INTO habits (weekly_goal_id, user_id, title, type, target_days) VALUES (?, ?, ?, ?, ?)'
    ).bind(
      weekly_goal_id || null,
      user.id,
      title,
      type || 'execute',
      target_days || '1,2,3,4,5,6,7'
    ).run()

    const habit = await c.env.DB.prepare('SELECT * FROM habits WHERE id = ?').bind(result.meta.last_row_id).first()
    return c.json({ habit }, 201)
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// GET /api/habits
habits.get('/', async (c) => {
  try {
    const token = extractToken(c)
    const user = await getAuthUser(c.env.DB, token)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const result = await c.env.DB.prepare(
      'SELECT * FROM habits WHERE user_id = ? ORDER BY created_at ASC'
    ).bind(user.id).all()

    return c.json({ habits: result.results })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// PATCH /api/habits/:id
habits.patch('/:id', async (c) => {
  try {
    const token = extractToken(c)
    const user = await getAuthUser(c.env.DB, token)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const id = c.req.param('id')
    const { title, type, target_days } = await c.req.json()
    await c.env.DB.prepare(
      `UPDATE habits SET title = COALESCE(?, title), type = COALESCE(?, type), target_days = COALESCE(?, target_days) WHERE id = ? AND user_id = ?`
    ).bind(title, type, target_days, id, user.id).run()
    const habit = await c.env.DB.prepare('SELECT * FROM habits WHERE id = ?').bind(id).first()
    return c.json({ habit })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

// DELETE /api/habits/:id
habits.delete('/:id', async (c) => {
  try {
    const token = extractToken(c)
    const user = await getAuthUser(c.env.DB, token)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)
    const id = c.req.param('id')
    await c.env.DB.prepare('DELETE FROM habits WHERE id = ? AND user_id = ?').bind(id, user.id).run()
    return c.json({ success: true })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

// GET /api/habits/logs - get logs for a date range
habits.get('/logs', async (c) => {
  try {
    const token = extractToken(c)
    const user = await getAuthUser(c.env.DB, token)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const start = c.req.query('start')
    const end = c.req.query('end')
    if (!start || !end) return c.json({ error: 'start and end date required' }, 400)

    const result = await c.env.DB.prepare(
      `SELECT hl.*, h.title, h.type FROM habit_logs hl
       JOIN habits h ON h.id = hl.habit_id
       WHERE hl.user_id = ? AND hl.log_date BETWEEN ? AND ?
       ORDER BY hl.log_date ASC`
    ).bind(user.id, start, end).all()

    return c.json({ logs: result.results })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// POST /api/habits/log - log a habit for a specific date
habits.post('/log', async (c) => {
  try {
    const token = extractToken(c)
    const user = await getAuthUser(c.env.DB, token)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const { habit_id, log_date, completed } = await c.req.json()
    if (!habit_id || !log_date) return c.json({ error: 'habit_id and log_date required' }, 400)

    // Verify habit belongs to user
    const habit = await c.env.DB.prepare('SELECT id FROM habits WHERE id = ? AND user_id = ?').bind(habit_id, user.id).first()
    if (!habit) return c.json({ error: 'Habit not found' }, 404)

    await c.env.DB.prepare(
      `INSERT INTO habit_logs (habit_id, user_id, log_date, completed) VALUES (?, ?, ?, ?)
       ON CONFLICT(habit_id, log_date) DO UPDATE SET completed = excluded.completed`
    ).bind(habit_id, user.id, log_date, completed ? 1 : 0).run()

    const log = await c.env.DB.prepare(
      'SELECT * FROM habit_logs WHERE habit_id = ? AND log_date = ?'
    ).bind(habit_id, log_date).first()

    return c.json({ log })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// GET /api/habits/grid - excel-style grid data
habits.get('/grid', async (c) => {
  try {
    const token = extractToken(c)
    const user = await getAuthUser(c.env.DB, token)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const start = c.req.query('start') || new Date().toISOString().split('T')[0]
    const end = c.req.query('end') || new Date().toISOString().split('T')[0]

    const habitsRes = await c.env.DB.prepare(
      'SELECT * FROM habits WHERE user_id = ? ORDER BY created_at ASC'
    ).bind(user.id).all()

    const logsRes = await c.env.DB.prepare(
      'SELECT * FROM habit_logs WHERE user_id = ? AND log_date BETWEEN ? AND ?'
    ).bind(user.id, start, end).all()

    const logMap: Record<string, Record<string, boolean>> = {}
    for (const log of (logsRes.results || []) as any[]) {
      if (!logMap[log.habit_id]) logMap[log.habit_id] = {}
      logMap[log.habit_id][log.log_date] = !!log.completed
    }

    return c.json({
      habits: habitsRes.results,
      logs: logMap,
      start,
      end
    })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

export default habits
