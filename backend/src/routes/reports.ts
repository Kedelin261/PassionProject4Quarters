import { Hono } from 'hono'
import { db } from '../db/schema.js'
import { authMiddleware } from '../middleware/auth.js'
import { letterGrade, calcDailyScore, calcWeeklyScore } from '../db/helpers.js'

const reports = new Hono()
reports.use('*', authMiddleware)

reports.get('/daily', (c) => {
  const userId = c.get('userId')
  const { date } = c.req.query()
  const targetDate = date || new Date().toISOString().split('T')[0]

  const dailyGoals = db.prepare('SELECT * FROM daily_goals WHERE user_id = ? AND date = ?').all(userId, targetDate) as any[]
  const habitEntries = db.prepare('SELECT he.*, h.name, h.goal_behavior FROM habit_entries he JOIN habits h ON he.habit_id = h.id WHERE he.user_id = ? AND he.date = ?').all(userId, targetDate) as any[]
  const timeBlocks = db.prepare('SELECT * FROM time_blocks WHERE user_id = ? AND date = ?').all(userId, targetDate) as any[]
  const standups = db.prepare("SELECT * FROM standups WHERE user_id = ? AND date = ?").all(userId, targetDate) as any[]

  const completed = dailyGoals.filter((g: any) => g.status === 'completed').length
  const missed = dailyGoals.filter((g: any) => g.status === 'missed').length
  const successHabits = habitEntries.filter((h: any) => h.success).length
  const score = calcDailyScore(completed, dailyGoals.length, successHabits, habitEntries.length)

  return c.json({
    date: targetDate,
    score: score.toFixed(1),
    grade: letterGrade(score),
    dailyGoals: { total: dailyGoals.length, completed, missed, items: dailyGoals },
    habits: { total: habitEntries.length, successful: successHabits, items: habitEntries },
    timeBlocks,
    standups,
  })
})

reports.get('/weekly', (c) => {
  const userId = c.get('userId')
  const { weekStart, weekEnd } = c.req.query()
  const today = new Date()
  const day = today.getDay()
  const diff = today.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(today.setDate(diff))
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6)
  const wStart = weekStart || monday.toISOString().split('T')[0]
  const wEnd = weekEnd || sunday.toISOString().split('T')[0]

  const weeklyGoals = db.prepare('SELECT * FROM weekly_goals WHERE user_id = ?').all(userId) as any[]
  const dailyGoals = db.prepare('SELECT * FROM daily_goals WHERE user_id = ? AND date >= ? AND date <= ?').all(userId, wStart, wEnd) as any[]
  const habitEntries = db.prepare('SELECT he.*, h.name FROM habit_entries he JOIN habits h ON he.habit_id = h.id WHERE he.user_id = ? AND he.date >= ? AND he.date <= ?').all(userId, wStart, wEnd) as any[]
  const dailyScores = db.prepare('SELECT * FROM daily_scores WHERE user_id = ? AND date >= ? AND date <= ? ORDER BY date').all(userId, wStart, wEnd) as any[]

  const completedWeekly = weeklyGoals.filter((g: any) => g.status === 'completed').length
  const completedDaily = dailyGoals.filter((g: any) => g.status === 'completed').length
  const successHabits = habitEntries.filter((h: any) => h.success).length
  const score = calcWeeklyScore(completedWeekly, weeklyGoals.length, completedDaily, dailyGoals.length, successHabits, habitEntries.length)

  return c.json({
    weekStart: wStart, weekEnd: wEnd,
    score: score.toFixed(1), grade: letterGrade(score),
    weeklyGoals: { total: weeklyGoals.length, completed: completedWeekly },
    dailyGoals: { total: dailyGoals.length, completed: completedDaily },
    habits: { total: habitEntries.length, successful: successHabits },
    dailyScores,
    dailyGoalItems: dailyGoals,
    habitItems: habitEntries,
  })
})

reports.get('/quarterly', (c) => {
  const userId = c.get('userId')
  const cycle = db.prepare("SELECT * FROM twelve_week_cycles WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1").get(userId) as any
  if (!cycle) return c.json({ error: 'No active cycle' }, 404)

  const quarterGoals = db.prepare('SELECT * FROM twelve_week_goals WHERE user_id = ? AND cycle_id = ?').all(userId, cycle.id) as any[]
  const totalGoals = db.prepare('SELECT COUNT(*) as cnt FROM daily_goals WHERE user_id = ? AND date >= ? AND date <= ?').get(userId, cycle.start_date, cycle.end_date) as any
  const completedGoals = db.prepare("SELECT COUNT(*) as cnt FROM daily_goals WHERE user_id = ? AND date >= ? AND date <= ? AND status = 'completed'").get(userId, cycle.start_date, cycle.end_date) as any
  const habitSuccess = db.prepare('SELECT COUNT(*) as cnt FROM habit_entries WHERE user_id = ? AND date >= ? AND date <= ? AND success = 1').get(userId, cycle.start_date, cycle.end_date) as any
  const habitTotal = db.prepare('SELECT COUNT(*) as cnt FROM habit_entries WHERE user_id = ? AND date >= ? AND date <= ?').get(userId, cycle.start_date, cycle.end_date) as any
  const weeklyScores = db.prepare('SELECT * FROM weekly_scores WHERE user_id = ? AND week_start_date >= ? ORDER BY week_start_date').all(userId, cycle.start_date) as any[]

  return c.json({
    cycle, quarterGoals,
    dailyGoalCompletion: { completed: completedGoals.cnt, total: totalGoals.cnt },
    habitCompletion: { successful: habitSuccess.cnt, total: habitTotal.cnt },
    weeklyScores,
  })
})

export default reports
