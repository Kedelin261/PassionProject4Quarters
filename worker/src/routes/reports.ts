import { Hono } from 'hono'
import { letterGrade, calcDailyScore, calcWeeklyScore } from '../db/helpers'
import { authMiddleware } from '../middleware/auth'
import type { Env } from '../types'

const reports = new Hono<{ Bindings: Env; Variables: { userId: string } }>()
reports.use('*', authMiddleware)

reports.get('/daily', async (c) => {
  const userId = c.get('userId')
  const { date } = c.req.query()
  const targetDate = date || new Date().toISOString().split('T')[0]
  const [dg, he, tb, sd] = await Promise.all([
    c.env.DB.prepare('SELECT * FROM daily_goals WHERE user_id = ? AND date = ?').bind(userId, targetDate).all(),
    c.env.DB.prepare('SELECT he.*, h.name, h.goal_behavior FROM habit_entries he JOIN habits h ON he.habit_id = h.id WHERE he.user_id = ? AND he.date = ?').bind(userId, targetDate).all(),
    c.env.DB.prepare('SELECT * FROM time_blocks WHERE user_id = ? AND date = ?').bind(userId, targetDate).all(),
    c.env.DB.prepare('SELECT * FROM standups WHERE user_id = ? AND date = ?').bind(userId, targetDate).all(),
  ])
  const dailyGoals = dg.results as any[]
  const habitEntries = he.results as any[]
  const completed = dailyGoals.filter(g => g.status === 'completed').length
  const successHabits = habitEntries.filter(h => h.success).length
  const score = calcDailyScore(completed, dailyGoals.length, successHabits, habitEntries.length)
  return c.json({
    date: targetDate, score: score.toFixed(1), grade: letterGrade(score),
    dailyGoals: { total: dailyGoals.length, completed, missed: dailyGoals.filter(g => g.status === 'missed').length, items: dailyGoals },
    habits: { total: habitEntries.length, successful: successHabits, items: habitEntries },
    timeBlocks: tb.results, standups: sd.results,
  })
})

reports.get('/weekly', async (c) => {
  const userId = c.get('userId')
  const { weekStart, weekEnd } = c.req.query()
  const today = new Date()
  const day = today.getDay()
  const diff = today.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(today); monday.setDate(diff)
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6)
  const wStart = weekStart || monday.toISOString().split('T')[0]
  const wEnd = weekEnd || sunday.toISOString().split('T')[0]
  const [wg, dg, he, ds] = await Promise.all([
    c.env.DB.prepare('SELECT * FROM weekly_goals WHERE user_id = ?').bind(userId).all(),
    c.env.DB.prepare('SELECT * FROM daily_goals WHERE user_id = ? AND date >= ? AND date <= ?').bind(userId, wStart, wEnd).all(),
    c.env.DB.prepare('SELECT he.*, h.name FROM habit_entries he JOIN habits h ON he.habit_id = h.id WHERE he.user_id = ? AND he.date >= ? AND he.date <= ?').bind(userId, wStart, wEnd).all(),
    c.env.DB.prepare('SELECT * FROM daily_scores WHERE user_id = ? AND date >= ? AND date <= ? ORDER BY date').bind(userId, wStart, wEnd).all(),
  ])
  const weeklyGoals = wg.results as any[]
  const dailyGoals = dg.results as any[]
  const habitEntries = he.results as any[]
  const completedWeekly = weeklyGoals.filter(g => g.status === 'completed').length
  const completedDaily = dailyGoals.filter(g => g.status === 'completed').length
  const successHabits = habitEntries.filter(h => h.success).length
  const score = calcWeeklyScore(completedWeekly, weeklyGoals.length, completedDaily, dailyGoals.length, successHabits, habitEntries.length)
  return c.json({
    weekStart: wStart, weekEnd: wEnd, score: score.toFixed(1), grade: letterGrade(score),
    weeklyGoals: { total: weeklyGoals.length, completed: completedWeekly },
    dailyGoals: { total: dailyGoals.length, completed: completedDaily },
    habits: { total: habitEntries.length, successful: successHabits },
    dailyScores: ds.results, dailyGoalItems: dailyGoals, habitItems: habitEntries,
  })
})

reports.get('/quarterly', async (c) => {
  const userId = c.get('userId')
  const cycle = await c.env.DB.prepare("SELECT * FROM twelve_week_cycles WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1").bind(userId).first() as any
  if (!cycle) return c.json({ error: 'No active cycle' }, 404)
  const [qg, dg, dgc, hs, ht, ws] = await Promise.all([
    c.env.DB.prepare('SELECT * FROM twelve_week_goals WHERE user_id = ? AND cycle_id = ?').bind(userId, cycle.id).all(),
    c.env.DB.prepare('SELECT COUNT(*) as cnt FROM daily_goals WHERE user_id = ? AND date >= ? AND date <= ?').bind(userId, cycle.start_date, cycle.end_date).first() as Promise<any>,
    c.env.DB.prepare("SELECT COUNT(*) as cnt FROM daily_goals WHERE user_id = ? AND date >= ? AND date <= ? AND status = 'completed'").bind(userId, cycle.start_date, cycle.end_date).first() as Promise<any>,
    c.env.DB.prepare('SELECT COUNT(*) as cnt FROM habit_entries WHERE user_id = ? AND date >= ? AND date <= ? AND success = 1').bind(userId, cycle.start_date, cycle.end_date).first() as Promise<any>,
    c.env.DB.prepare('SELECT COUNT(*) as cnt FROM habit_entries WHERE user_id = ? AND date >= ? AND date <= ?').bind(userId, cycle.start_date, cycle.end_date).first() as Promise<any>,
    c.env.DB.prepare('SELECT * FROM weekly_scores WHERE user_id = ? AND week_start_date >= ? ORDER BY week_start_date').bind(userId, cycle.start_date).all(),
  ])
  return c.json({
    cycle, quarterGoals: qg.results,
    dailyGoalCompletion: { completed: dgc.cnt, total: dg.cnt },
    habitCompletion: { successful: hs.cnt, total: ht.cnt },
    weeklyScores: ws.results,
  })
})

export default reports
