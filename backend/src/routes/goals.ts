import { Hono } from 'hono'
import { db } from '../db/schema.js'
import { uuid, now } from '../db/helpers.js'
import { authMiddleware } from '../middleware/auth.js'

const goals = new Hono()
goals.use('*', authMiddleware)

// Full goal tree for the user
goals.get('/tree', (c) => {
  const userId = c.get('userId')
  const quarterGoals = db.prepare('SELECT * FROM twelve_week_goals WHERE user_id = ? ORDER BY priority, created_at').all(userId) as any[]
  const monthlyGoals = db.prepare('SELECT * FROM monthly_goals WHERE user_id = ? ORDER BY month_number, created_at').all(userId) as any[]
  const weeklyGoals = db.prepare('SELECT * FROM weekly_goals WHERE user_id = ? ORDER BY week_number, created_at').all(userId) as any[]
  const dailyGoals = db.prepare('SELECT * FROM daily_goals WHERE user_id = ? ORDER BY date, created_at').all(userId) as any[]

  const tree = quarterGoals.map((qg: any) => ({
    ...qg,
    monthlyGoals: monthlyGoals
      .filter((mg: any) => mg.twelve_week_goal_id === qg.id)
      .map((mg: any) => ({
        ...mg,
        weeklyGoals: weeklyGoals
          .filter((wg: any) => wg.monthly_goal_id === mg.id)
          .map((wg: any) => ({
            ...wg,
            dailyGoals: dailyGoals.filter((dg: any) => dg.weekly_goal_id === wg.id)
          }))
      }))
  }))
  return c.json(tree)
})

// 12-week goals
goals.post('/quarter', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()
  // Validate max 3 active quarter goals per active cycle
  const count = (db.prepare(`
    SELECT COUNT(*) as cnt FROM twelve_week_goals tg
    JOIN twelve_week_cycles tc ON tg.cycle_id = tc.id
    WHERE tg.user_id = ? AND tc.status = 'active'
  `).get(userId) as any).cnt
  if (count >= 3) return c.json({ error: 'Maximum 3 active 12-week goals per active cycle' }, 400)
  const id = uuid()
  db.prepare('INSERT INTO twelve_week_goals (id,user_id,cycle_id,title,description,target_metric,starting_value,target_value,current_value,status,priority,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .run(id, userId, body.cycleId, body.title, body.description || '', body.targetMetric || '', body.startingValue || 0, body.targetValue || 100, body.currentValue || 0, body.status || 'not_started', body.priority || 1, now(), now())
  return c.json(db.prepare('SELECT * FROM twelve_week_goals WHERE id = ?').get(id), 201)
})

goals.put('/quarter/:id', async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  const body = await c.req.json()
  const g = db.prepare('SELECT id FROM twelve_week_goals WHERE id = ? AND user_id = ?').get(id, userId)
  if (!g) return c.json({ error: 'Not found' }, 404)
  db.prepare('UPDATE twelve_week_goals SET title=?,description=?,target_metric=?,starting_value=?,target_value=?,current_value=?,status=?,priority=?,updated_at=? WHERE id=?')
    .run(body.title, body.description, body.targetMetric, body.startingValue, body.targetValue, body.currentValue, body.status, body.priority, now(), id)
  return c.json(db.prepare('SELECT * FROM twelve_week_goals WHERE id = ?').get(id))
})

goals.delete('/quarter/:id', (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  const g = db.prepare('SELECT id FROM twelve_week_goals WHERE id = ? AND user_id = ?').get(id, userId)
  if (!g) return c.json({ error: 'Not found' }, 404)
  db.prepare('DELETE FROM twelve_week_goals WHERE id = ?').run(id)
  return c.json({ message: 'Deleted' })
})

// Monthly goals
goals.post('/monthly', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()
  // Validate parent ownership
  const parent = db.prepare('SELECT id FROM twelve_week_goals WHERE id = ? AND user_id = ?').get(body.twelveWeekGoalId, userId)
  if (!parent) return c.json({ error: 'Parent goal not found' }, 404)
  // Max 3 monthly goals per parent per month
  const count = (db.prepare('SELECT COUNT(*) as cnt FROM monthly_goals WHERE twelve_week_goal_id = ? AND user_id = ? AND month_number = ?').get(body.twelveWeekGoalId, userId, body.monthNumber) as any).cnt
  if (count >= 3) return c.json({ error: 'Maximum 3 monthly goals per 12-week goal per month' }, 400)
  const id = uuid()
  db.prepare('INSERT INTO monthly_goals (id,user_id,twelve_week_goal_id,title,description,month_number,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)')
    .run(id, userId, body.twelveWeekGoalId, body.title, body.description || '', body.monthNumber, body.status || 'not_started', now(), now())
  return c.json(db.prepare('SELECT * FROM monthly_goals WHERE id = ?').get(id), 201)
})

goals.put('/monthly/:id', async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  const body = await c.req.json()
  const g = db.prepare('SELECT id FROM monthly_goals WHERE id = ? AND user_id = ?').get(id, userId)
  if (!g) return c.json({ error: 'Not found' }, 404)
  db.prepare('UPDATE monthly_goals SET title=?,description=?,month_number=?,status=?,updated_at=? WHERE id=?')
    .run(body.title, body.description, body.monthNumber, body.status, now(), id)
  return c.json(db.prepare('SELECT * FROM monthly_goals WHERE id = ?').get(id))
})

goals.delete('/monthly/:id', (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  const g = db.prepare('SELECT id FROM monthly_goals WHERE id = ? AND user_id = ?').get(id, userId)
  if (!g) return c.json({ error: 'Not found' }, 404)
  db.prepare('DELETE FROM monthly_goals WHERE id = ?').run(id)
  return c.json({ message: 'Deleted' })
})

// Weekly goals
goals.post('/weekly', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const parent = db.prepare('SELECT id FROM monthly_goals WHERE id = ? AND user_id = ?').get(body.monthlyGoalId, userId)
  if (!parent) return c.json({ error: 'Parent goal not found' }, 404)
  const id = uuid()
  db.prepare('INSERT INTO weekly_goals (id,user_id,monthly_goal_id,title,description,week_number,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)')
    .run(id, userId, body.monthlyGoalId, body.title, body.description || '', body.weekNumber, body.status || 'not_started', now(), now())
  return c.json(db.prepare('SELECT * FROM weekly_goals WHERE id = ?').get(id), 201)
})

goals.put('/weekly/:id', async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  const body = await c.req.json()
  const g = db.prepare('SELECT id FROM weekly_goals WHERE id = ? AND user_id = ?').get(id, userId)
  if (!g) return c.json({ error: 'Not found' }, 404)
  db.prepare('UPDATE weekly_goals SET title=?,description=?,week_number=?,status=?,updated_at=? WHERE id=?')
    .run(body.title, body.description, body.weekNumber, body.status, now(), id)
  return c.json(db.prepare('SELECT * FROM weekly_goals WHERE id = ?').get(id))
})

goals.delete('/weekly/:id', (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  const g = db.prepare('SELECT id FROM weekly_goals WHERE id = ? AND user_id = ?').get(id, userId)
  if (!g) return c.json({ error: 'Not found' }, 404)
  db.prepare('DELETE FROM weekly_goals WHERE id = ?').run(id)
  return c.json({ message: 'Deleted' })
})

// Daily goals
goals.post('/daily', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const parent = db.prepare('SELECT id FROM weekly_goals WHERE id = ? AND user_id = ?').get(body.weeklyGoalId, userId)
  if (!parent) return c.json({ error: 'Parent goal not found' }, 404)
  const id = uuid()
  db.prepare('INSERT INTO daily_goals (id,user_id,weekly_goal_id,title,description,date,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)')
    .run(id, userId, body.weeklyGoalId, body.title, body.description || '', body.date, body.status || 'planned', now(), now())
  return c.json(db.prepare('SELECT * FROM daily_goals WHERE id = ?').get(id), 201)
})

goals.put('/daily/:id', async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  const body = await c.req.json()
  const g = db.prepare('SELECT id FROM daily_goals WHERE id = ? AND user_id = ?').get(id, userId)
  if (!g) return c.json({ error: 'Not found' }, 404)
  db.prepare('UPDATE daily_goals SET title=?,description=?,date=?,status=?,updated_at=? WHERE id=?')
    .run(body.title, body.description, body.date, body.status, now(), id)
  return c.json(db.prepare('SELECT * FROM daily_goals WHERE id = ?').get(id))
})

goals.delete('/daily/:id', (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  const g = db.prepare('SELECT id FROM daily_goals WHERE id = ? AND user_id = ?').get(id, userId)
  if (!g) return c.json({ error: 'Not found' }, 404)
  db.prepare('DELETE FROM daily_goals WHERE id = ?').run(id)
  return c.json({ message: 'Deleted' })
})

export default goals
