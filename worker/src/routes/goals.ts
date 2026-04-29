import { Hono } from 'hono'
import { uuid, now } from '../db/helpers'
import { authMiddleware } from '../middleware/auth'
import type { Env } from '../types'

const goals = new Hono<{ Bindings: Env; Variables: { userId: string } }>()
goals.use('*', authMiddleware)

goals.get('/tree', async (c) => {
  const userId = c.get('userId')
  const [qg, mg, wg, dg] = await Promise.all([
    c.env.DB.prepare('SELECT * FROM twelve_week_goals WHERE user_id = ? ORDER BY priority, created_at').bind(userId).all(),
    c.env.DB.prepare('SELECT * FROM monthly_goals WHERE user_id = ? ORDER BY month_number, created_at').bind(userId).all(),
    c.env.DB.prepare('SELECT * FROM weekly_goals WHERE user_id = ? ORDER BY week_number, created_at').bind(userId).all(),
    c.env.DB.prepare('SELECT * FROM daily_goals WHERE user_id = ? ORDER BY date, created_at').bind(userId).all(),
  ])
  const quarterGoals = qg.results as any[]
  const monthlyGoals = mg.results as any[]
  const weeklyGoals = wg.results as any[]
  const dailyGoals = dg.results as any[]
  const tree = quarterGoals.map((q: any) => ({
    ...q,
    monthlyGoals: monthlyGoals.filter((m: any) => m.twelve_week_goal_id === q.id).map((m: any) => ({
      ...m,
      weeklyGoals: weeklyGoals.filter((w: any) => w.monthly_goal_id === m.id).map((w: any) => ({
        ...w,
        dailyGoals: dailyGoals.filter((d: any) => d.weekly_goal_id === w.id)
      }))
    }))
  }))
  return c.json(tree)
})

goals.post('/quarter', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const cnt = await c.env.DB.prepare(`SELECT COUNT(*) as cnt FROM twelve_week_goals tg JOIN twelve_week_cycles tc ON tg.cycle_id = tc.id WHERE tg.user_id = ? AND tc.status = 'active'`).bind(userId).first() as any
  if (cnt.cnt >= 3) return c.json({ error: 'Maximum 3 active 12-week goals per active cycle' }, 400)
  const id = uuid()
  await c.env.DB.prepare('INSERT INTO twelve_week_goals (id,user_id,cycle_id,title,description,target_metric,starting_value,target_value,current_value,status,priority,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .bind(id, userId, body.cycleId, body.title, body.description || '', body.targetMetric || '', body.startingValue || 0, body.targetValue || 100, body.currentValue || 0, body.status || 'not_started', body.priority || 1, now(), now()).run()
  return c.json(await c.env.DB.prepare('SELECT * FROM twelve_week_goals WHERE id = ?').bind(id).first(), 201)
})

goals.put('/quarter/:id', async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  const body = await c.req.json()
  const g = await c.env.DB.prepare('SELECT id FROM twelve_week_goals WHERE id = ? AND user_id = ?').bind(id, userId).first()
  if (!g) return c.json({ error: 'Not found' }, 404)
  await c.env.DB.prepare('UPDATE twelve_week_goals SET title=?,description=?,target_metric=?,starting_value=?,target_value=?,current_value=?,status=?,priority=?,updated_at=? WHERE id=?')
    .bind(body.title, body.description, body.targetMetric, body.startingValue, body.targetValue, body.currentValue, body.status, body.priority, now(), id).run()
  return c.json(await c.env.DB.prepare('SELECT * FROM twelve_week_goals WHERE id = ?').bind(id).first())
})

goals.delete('/quarter/:id', async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  const g = await c.env.DB.prepare('SELECT id FROM twelve_week_goals WHERE id = ? AND user_id = ?').bind(id, userId).first()
  if (!g) return c.json({ error: 'Not found' }, 404)
  await c.env.DB.prepare('DELETE FROM twelve_week_goals WHERE id = ?').bind(id).run()
  return c.json({ message: 'Deleted' })
})

goals.post('/monthly', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const parent = await c.env.DB.prepare('SELECT id FROM twelve_week_goals WHERE id = ? AND user_id = ?').bind(body.twelveWeekGoalId, userId).first()
  if (!parent) return c.json({ error: 'Parent goal not found' }, 404)
  const id = uuid()
  await c.env.DB.prepare('INSERT INTO monthly_goals (id,user_id,twelve_week_goal_id,title,description,month_number,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)')
    .bind(id, userId, body.twelveWeekGoalId, body.title, body.description || '', body.monthNumber, body.status || 'not_started', now(), now()).run()
  return c.json(await c.env.DB.prepare('SELECT * FROM monthly_goals WHERE id = ?').bind(id).first(), 201)
})

goals.put('/monthly/:id', async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  const body = await c.req.json()
  const g = await c.env.DB.prepare('SELECT id FROM monthly_goals WHERE id = ? AND user_id = ?').bind(id, userId).first()
  if (!g) return c.json({ error: 'Not found' }, 404)
  await c.env.DB.prepare('UPDATE monthly_goals SET title=?,description=?,month_number=?,status=?,updated_at=? WHERE id=?')
    .bind(body.title, body.description, body.monthNumber, body.status, now(), id).run()
  return c.json(await c.env.DB.prepare('SELECT * FROM monthly_goals WHERE id = ?').bind(id).first())
})

goals.delete('/monthly/:id', async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  const g = await c.env.DB.prepare('SELECT id FROM monthly_goals WHERE id = ? AND user_id = ?').bind(id, userId).first()
  if (!g) return c.json({ error: 'Not found' }, 404)
  await c.env.DB.prepare('DELETE FROM monthly_goals WHERE id = ?').bind(id).run()
  return c.json({ message: 'Deleted' })
})

goals.post('/weekly', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const parent = await c.env.DB.prepare('SELECT id FROM monthly_goals WHERE id = ? AND user_id = ?').bind(body.monthlyGoalId, userId).first()
  if (!parent) return c.json({ error: 'Parent goal not found' }, 404)
  const id = uuid()
  await c.env.DB.prepare('INSERT INTO weekly_goals (id,user_id,monthly_goal_id,title,description,week_number,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)')
    .bind(id, userId, body.monthlyGoalId, body.title, body.description || '', body.weekNumber, body.status || 'not_started', now(), now()).run()
  return c.json(await c.env.DB.prepare('SELECT * FROM weekly_goals WHERE id = ?').bind(id).first(), 201)
})

goals.put('/weekly/:id', async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  const body = await c.req.json()
  const g = await c.env.DB.prepare('SELECT id FROM weekly_goals WHERE id = ? AND user_id = ?').bind(id, userId).first()
  if (!g) return c.json({ error: 'Not found' }, 404)
  await c.env.DB.prepare('UPDATE weekly_goals SET title=?,description=?,week_number=?,status=?,updated_at=? WHERE id=?')
    .bind(body.title, body.description, body.weekNumber, body.status, now(), id).run()
  return c.json(await c.env.DB.prepare('SELECT * FROM weekly_goals WHERE id = ?').bind(id).first())
})

goals.delete('/weekly/:id', async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  const g = await c.env.DB.prepare('SELECT id FROM weekly_goals WHERE id = ? AND user_id = ?').bind(id, userId).first()
  if (!g) return c.json({ error: 'Not found' }, 404)
  await c.env.DB.prepare('DELETE FROM weekly_goals WHERE id = ?').bind(id).run()
  return c.json({ message: 'Deleted' })
})

goals.post('/daily', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const parent = await c.env.DB.prepare('SELECT id FROM weekly_goals WHERE id = ? AND user_id = ?').bind(body.weeklyGoalId, userId).first()
  if (!parent) return c.json({ error: 'Parent goal not found' }, 404)
  const id = uuid()
  await c.env.DB.prepare('INSERT INTO daily_goals (id,user_id,weekly_goal_id,title,description,date,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)')
    .bind(id, userId, body.weeklyGoalId, body.title, body.description || '', body.date, body.status || 'planned', now(), now()).run()
  return c.json(await c.env.DB.prepare('SELECT * FROM daily_goals WHERE id = ?').bind(id).first(), 201)
})

goals.put('/daily/:id', async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  const body = await c.req.json()
  const g = await c.env.DB.prepare('SELECT id FROM daily_goals WHERE id = ? AND user_id = ?').bind(id, userId).first()
  if (!g) return c.json({ error: 'Not found' }, 404)
  await c.env.DB.prepare('UPDATE daily_goals SET title=?,description=?,date=?,status=?,updated_at=? WHERE id=?')
    .bind(body.title, body.description, body.date, body.status, now(), id).run()
  return c.json(await c.env.DB.prepare('SELECT * FROM daily_goals WHERE id = ?').bind(id).first())
})

goals.delete('/daily/:id', async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  const g = await c.env.DB.prepare('SELECT id FROM daily_goals WHERE id = ? AND user_id = ?').bind(id, userId).first()
  if (!g) return c.json({ error: 'Not found' }, 404)
  await c.env.DB.prepare('DELETE FROM daily_goals WHERE id = ?').bind(id).run()
  return c.json({ message: 'Deleted' })
})

export default goals
