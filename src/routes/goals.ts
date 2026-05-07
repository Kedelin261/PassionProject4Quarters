import { Hono } from 'hono'
import { getAuthUser, extractToken } from '../lib/auth'

type Bindings = { DB: D1Database }
const goals = new Hono<{ Bindings: Bindings }>()

// GET /api/goals/tree - full linked hierarchy
goals.get('/tree', async (c) => {
  try {
    const token = extractToken(c)
    const user = await getAuthUser(c.env.DB, token)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const cycleId = c.req.query('cycle_id')
    if (!cycleId) return c.json({ error: 'cycle_id required' }, 400)

    const qGoals = await c.env.DB.prepare(
      'SELECT * FROM quarter_goals WHERE cycle_id = ? AND user_id = ? ORDER BY created_at ASC'
    ).bind(cycleId, user.id).all()

    const tree = []
    for (const qg of (qGoals.results || []) as any[]) {
      const mGoals = await c.env.DB.prepare(
        'SELECT * FROM monthly_goals WHERE quarter_goal_id = ? AND user_id = ? ORDER BY month_number ASC'
      ).bind(qg.id, user.id).all()

      const months = []
      for (const mg of (mGoals.results || []) as any[]) {
        const wGoals = await c.env.DB.prepare(
          'SELECT * FROM weekly_goals WHERE monthly_goal_id = ? AND user_id = ? ORDER BY week_number ASC'
        ).bind(mg.id, user.id).all()

        const weeks = []
        for (const wg of (wGoals.results || []) as any[]) {
          const habits = await c.env.DB.prepare(
            'SELECT * FROM habits WHERE weekly_goal_id = ? AND user_id = ?'
          ).bind(wg.id, user.id).all()
          weeks.push({ ...wg, habits: habits.results || [] })
        }
        months.push({ ...mg, weekly_goals: weeks })
      }

      // recalculate progress
      let qProgress = 0
      if (months.length > 0) {
        const mProgresses = months.map((m: any) => {
          if (m.weekly_goals.length === 0) return m.progress || 0
          const done = m.weekly_goals.filter((w: any) => w.completed).length
          return (done / m.weekly_goals.length) * 100
        })
        qProgress = mProgresses.reduce((a: number, b: number) => a + b, 0) / mProgresses.length
      }

      tree.push({ ...qg, progress: Math.round(qProgress * 10) / 10, monthly_goals: months })
    }

    return c.json({ tree })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// POST /api/goals/quarter
goals.post('/quarter', async (c) => {
  try {
    const token = extractToken(c)
    const user = await getAuthUser(c.env.DB, token)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const { cycle_id, title, description } = await c.req.json()
    if (!cycle_id || !title) return c.json({ error: 'cycle_id and title required' }, 400)

    // Check max 3 per cycle
    const count = await c.env.DB.prepare(
      'SELECT COUNT(*) as cnt FROM quarter_goals WHERE cycle_id = ? AND user_id = ?'
    ).bind(cycle_id, user.id).first() as any

    if ((count?.cnt || 0) >= 3) {
      return c.json({ error: 'Maximum 3 quarter goals per cycle' }, 400)
    }

    const result = await c.env.DB.prepare(
      'INSERT INTO quarter_goals (cycle_id, user_id, title, description) VALUES (?, ?, ?, ?)'
    ).bind(cycle_id, user.id, title, description || '').run()

    const goal = await c.env.DB.prepare('SELECT * FROM quarter_goals WHERE id = ?').bind(result.meta.last_row_id).first()
    return c.json({ goal }, 201)
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// PATCH /api/goals/quarter/:id
goals.patch('/quarter/:id', async (c) => {
  try {
    const token = extractToken(c)
    const user = await getAuthUser(c.env.DB, token)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)
    const id = c.req.param('id')
    const { title, description, status } = await c.req.json()
    await c.env.DB.prepare(
      `UPDATE quarter_goals SET title = COALESCE(?, title), description = COALESCE(?, description), status = COALESCE(?, status) WHERE id = ? AND user_id = ?`
    ).bind(title, description, status, id, user.id).run()
    const goal = await c.env.DB.prepare('SELECT * FROM quarter_goals WHERE id = ?').bind(id).first()
    return c.json({ goal })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

// DELETE /api/goals/quarter/:id
goals.delete('/quarter/:id', async (c) => {
  try {
    const token = extractToken(c)
    const user = await getAuthUser(c.env.DB, token)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)
    const id = c.req.param('id')
    await c.env.DB.prepare('DELETE FROM quarter_goals WHERE id = ? AND user_id = ?').bind(id, user.id).run()
    return c.json({ success: true })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

// POST /api/goals/monthly
goals.post('/monthly', async (c) => {
  try {
    const token = extractToken(c)
    const user = await getAuthUser(c.env.DB, token)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const { quarter_goal_id, title, description, month_number } = await c.req.json()
    if (!quarter_goal_id || !title || !month_number) {
      return c.json({ error: 'quarter_goal_id, title, month_number required' }, 400)
    }

    const result = await c.env.DB.prepare(
      'INSERT INTO monthly_goals (quarter_goal_id, user_id, title, description, month_number) VALUES (?, ?, ?, ?, ?)'
    ).bind(quarter_goal_id, user.id, title, description || '', month_number).run()

    const goal = await c.env.DB.prepare('SELECT * FROM monthly_goals WHERE id = ?').bind(result.meta.last_row_id).first()
    return c.json({ goal }, 201)
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// PATCH /api/goals/monthly/:id
goals.patch('/monthly/:id', async (c) => {
  try {
    const token = extractToken(c)
    const user = await getAuthUser(c.env.DB, token)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)
    const id = c.req.param('id')
    const { title, description, status, progress } = await c.req.json()
    await c.env.DB.prepare(
      `UPDATE monthly_goals SET title = COALESCE(?, title), description = COALESCE(?, description), status = COALESCE(?, status), progress = COALESCE(?, progress) WHERE id = ? AND user_id = ?`
    ).bind(title, description, status, progress, id, user.id).run()
    const goal = await c.env.DB.prepare('SELECT * FROM monthly_goals WHERE id = ?').bind(id).first()
    return c.json({ goal })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

// DELETE /api/goals/monthly/:id
goals.delete('/monthly/:id', async (c) => {
  try {
    const token = extractToken(c)
    const user = await getAuthUser(c.env.DB, token)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)
    const id = c.req.param('id')
    await c.env.DB.prepare('DELETE FROM monthly_goals WHERE id = ? AND user_id = ?').bind(id, user.id).run()
    return c.json({ success: true })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

// POST /api/goals/weekly
goals.post('/weekly', async (c) => {
  try {
    const token = extractToken(c)
    const user = await getAuthUser(c.env.DB, token)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const { monthly_goal_id, title, description, week_number } = await c.req.json()
    if (!monthly_goal_id || !title || !week_number) {
      return c.json({ error: 'monthly_goal_id, title, week_number required' }, 400)
    }

    const result = await c.env.DB.prepare(
      'INSERT INTO weekly_goals (monthly_goal_id, user_id, title, description, week_number) VALUES (?, ?, ?, ?, ?)'
    ).bind(monthly_goal_id, user.id, title, description || '', week_number).run()

    const goal = await c.env.DB.prepare('SELECT * FROM weekly_goals WHERE id = ?').bind(result.meta.last_row_id).first()
    return c.json({ goal }, 201)
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// PATCH /api/goals/weekly/:id
goals.patch('/weekly/:id', async (c) => {
  try {
    const token = extractToken(c)
    const user = await getAuthUser(c.env.DB, token)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)
    const id = c.req.param('id')
    const body = await c.req.json()

    // Get current values first
    const current = await c.env.DB.prepare('SELECT * FROM weekly_goals WHERE id = ? AND user_id = ?').bind(id, user.id).first() as any
    if (!current) return c.json({ error: 'Goal not found' }, 404)

    const newTitle = body.title !== undefined ? body.title : current.title
    const newDesc = body.description !== undefined ? body.description : current.description
    const newCompleted = body.completed !== undefined ? (body.completed ? 1 : 0) : current.completed
    const newStatus = body.status !== undefined ? body.status : current.status

    await c.env.DB.prepare(
      `UPDATE weekly_goals SET title = ?, description = ?, completed = ?, status = ? WHERE id = ? AND user_id = ?`
    ).bind(newTitle, newDesc, newCompleted, newStatus, id, user.id).run()

    const goal = await c.env.DB.prepare('SELECT * FROM weekly_goals WHERE id = ?').bind(id).first()
    return c.json({ goal })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

// DELETE /api/goals/weekly/:id
goals.delete('/weekly/:id', async (c) => {
  try {
    const token = extractToken(c)
    const user = await getAuthUser(c.env.DB, token)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)
    const id = c.req.param('id')
    await c.env.DB.prepare('DELETE FROM weekly_goals WHERE id = ? AND user_id = ?').bind(id, user.id).run()
    return c.json({ success: true })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

export default goals
