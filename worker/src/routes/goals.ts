import { Hono } from 'hono'
import { uuid, now } from '../db/helpers'
import { authMiddleware } from '../middleware/auth'
import type { Env } from '../types'

const goals = new Hono<{ Bindings: Env; Variables: { userId: string } }>()
goals.use('*', authMiddleware)

goals.get('/tree', async (c) => {
  const userId = c.get('userId')
  const today = new Date().toISOString().split('T')[0]

  const cycle = await c.env.DB.prepare(
    "SELECT * FROM twelve_week_cycles WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1"
  ).bind(userId).first() as any

  if (!cycle) return c.json(null)

  const [twgRes, mgRes, wgRes, habitsRes, entriesRes] = await Promise.all([
    c.env.DB.prepare('SELECT * FROM twelve_week_goals WHERE user_id = ? AND cycle_id = ? ORDER BY priority, created_at').bind(userId, cycle.id).all(),
    c.env.DB.prepare('SELECT * FROM monthly_goals WHERE user_id = ? ORDER BY month_number, created_at').bind(userId).all(),
    c.env.DB.prepare('SELECT * FROM weekly_goals WHERE user_id = ? ORDER BY week_number, created_at').bind(userId).all(),
    c.env.DB.prepare('SELECT * FROM habits WHERE user_id = ? AND active = 1 ORDER BY created_at').bind(userId).all(),
    c.env.DB.prepare('SELECT * FROM habit_entries WHERE user_id = ? AND date = ?').bind(userId, today).all(),
  ])

  const twelveWeekGoals = twgRes.results as any[]
  const allMonthlyGoals = mgRes.results as any[]
  const allWeeklyGoals = wgRes.results as any[]
  const allHabits = habitsRes.results as any[]
  const todayEntries = entriesRes.results as any[]

  const entryMap = new Map(todayEntries.map((e: any) => [e.habit_id, e]))
  const twgIds = new Set(twelveWeekGoals.map((g: any) => g.id))
  const monthlyGoals = allMonthlyGoals.filter((m: any) => twgIds.has(m.twelve_week_goal_id))
  const mgIds = new Set(monthlyGoals.map((g: any) => g.id))
  const weeklyGoals = allWeeklyGoals.filter((w: any) => mgIds.has(w.monthly_goal_id))
  const wgIds = new Set(weeklyGoals.map((g: any) => g.id))
  const linkedHabits = allHabits.filter((h: any) => h.weekly_goal_id && wgIds.has(h.weekly_goal_id))

  const pct = (num: number, den: number) => den > 0 ? Math.round((num / den) * 100) : 0

  const enrichHabit = (h: any) => {
    const entry = entryMap.get(h.id) as any
    return {
      ...h,
      executedToday: entry ? entry.executed === 1 : false,
      successToday: entry ? entry.success === 1 : false,
      entryId: entry?.id || null,
    }
  }

  const tree = twelveWeekGoals.map((twg: any) => {
    const twgMonthly = monthlyGoals.filter((m: any) => m.twelve_week_goal_id === twg.id).map((m: any) => {
      const mWeekly = weeklyGoals.filter((w: any) => w.monthly_goal_id === m.id).map((w: any) => {
        const wHabits = linkedHabits.filter((h: any) => h.weekly_goal_id === w.id).map(enrichHabit)
        const successCount = wHabits.filter((h: any) => h.successToday).length
        return { ...w, habits: wHabits, habitProgress: pct(successCount, wHabits.length) }
      })
      const completedWeekly = mWeekly.filter((w: any) => w.status === 'completed').length
      return { ...m, weeklyGoals: mWeekly, weeklyProgress: pct(completedWeekly, mWeekly.length) }
    })
    const completedMonthly = twgMonthly.filter((m: any) => m.status === 'completed').length
    return { ...twg, monthlyGoals: twgMonthly, monthlyProgress: pct(completedMonthly, twgMonthly.length) }
  })

  return c.json({ cycle, twelveWeekGoals: tree })
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
  if (!body.title || !body.twelveWeekGoalId || body.monthNumber == null) return c.json({ error: 'title, twelveWeekGoalId, and monthNumber are required' }, 400)
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
  if (!body.title || !body.monthlyGoalId || body.weekNumber == null) return c.json({ error: 'title, monthlyGoalId, and weekNumber are required' }, 400)
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
  // Unlink habits before delete to avoid FK constraint (schema has no ON DELETE action)
  await c.env.DB.prepare('UPDATE habits SET weekly_goal_id = NULL, updated_at = ? WHERE weekly_goal_id = ?').bind(now(), id).run()
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

goals.get('/pyramid', async (c) => {
  const userId = c.get('userId')
  const today = new Date().toISOString().split('T')[0]
  const nowDate = new Date()

  const cycle = await c.env.DB.prepare(
    "SELECT * FROM twelve_week_cycles WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1"
  ).bind(userId).first() as any

  if (!cycle) {
    return c.json({
      cycle: null, twelveWeekGoals: [], monthlyGoals: [], weeklyGoals: [], habits: [],
      metrics: { cycleProgress: 0, twelveWeekProgress: 0, monthlyProgress: 0, weeklyProgress: 0, habitProgress: 0 },
    })
  }

  const cycleStart = new Date(cycle.start_date)
  const monthsElapsed = (nowDate.getFullYear() - cycleStart.getFullYear()) * 12 + (nowDate.getMonth() - cycleStart.getMonth())
  const currentMonthNumber = Math.min(Math.max(monthsElapsed + 1, 1), 3)

  const [twgRes, mgRes, wgRes, habitsRes, entriesRes] = await Promise.all([
    c.env.DB.prepare('SELECT * FROM twelve_week_goals WHERE user_id = ? AND cycle_id = ? ORDER BY priority').bind(userId, cycle.id).all(),
    c.env.DB.prepare('SELECT * FROM monthly_goals WHERE user_id = ? AND month_number = ? ORDER BY created_at').bind(userId, currentMonthNumber).all(),
    c.env.DB.prepare('SELECT * FROM weekly_goals WHERE user_id = ? ORDER BY week_number, created_at').bind(userId).all(),
    c.env.DB.prepare('SELECT * FROM habits WHERE user_id = ? AND active = 1 ORDER BY created_at').bind(userId).all(),
    c.env.DB.prepare('SELECT * FROM habit_entries WHERE user_id = ? AND date = ?').bind(userId, today).all(),
  ])

  const twelveWeekGoals = twgRes.results as any[]
  const twgIds = new Set(twelveWeekGoals.map((g: any) => g.id))
  const monthlyGoals = (mgRes.results as any[]).filter((m: any) => twgIds.has(m.twelve_week_goal_id))
  const mgIds = new Set(monthlyGoals.map((g: any) => g.id))
  const allWeeklyGoals = wgRes.results as any[]
  const weeklyGoals = allWeeklyGoals.filter((w: any) => mgIds.has(w.monthly_goal_id))
  const wgIds = new Set(weeklyGoals.map((g: any) => g.id))
  const allHabits = habitsRes.results as any[]
  const linkedHabits = allHabits.filter((h: any) => h.weekly_goal_id && wgIds.has(h.weekly_goal_id))
  const todayEntries = entriesRes.results as any[]
  const entryMap = new Map(todayEntries.map((e: any) => [e.habit_id, e]))

  const habits = linkedHabits.map((h: any) => {
    const entry = entryMap.get(h.id) as any
    return { ...h, entry_id: entry?.id || null, executed: entry?.executed ?? null, success: entry?.success ?? null }
  })

  const pct = (num: number, den: number) => den > 0 ? Math.round((num / den) * 100) : 0
  const habitProgress = pct(habits.filter((h: any) => h.success === 1).length, habits.length)
  const weeklyProgress = pct(weeklyGoals.filter((g: any) => g.status === 'completed').length, weeklyGoals.length)
  const monthlyProgress = pct(monthlyGoals.filter((g: any) => g.status === 'completed').length, monthlyGoals.length)
  const twelveWeekProgress = pct(twelveWeekGoals.filter((g: any) => g.status === 'completed').length, twelveWeekGoals.length)

  return c.json({
    cycle: { ...cycle, progress: twelveWeekProgress },
    twelveWeekGoals: twelveWeekGoals.map((g: any) => ({ ...g, progress: pct(g.current_value, g.target_value || 100) })),
    monthlyGoals,
    weeklyGoals,
    habits,
    metrics: { cycleProgress: twelveWeekProgress, twelveWeekProgress, monthlyProgress, weeklyProgress, habitProgress },
  })
})

export default goals
