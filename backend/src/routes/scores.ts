import { Hono } from 'hono'
import { db } from '../db/schema.js'
import { uuid, now, letterGrade, calcDailyScore, calcWeeklyScore } from '../db/helpers.js'
import { authMiddleware } from '../middleware/auth.js'

const scores = new Hono()
scores.use('*', authMiddleware)

function recalcDaily(userId: string, date: string) {
  const completedDaily = (db.prepare("SELECT COUNT(*) as cnt FROM daily_goals WHERE user_id = ? AND date = ? AND status = 'completed'").get(userId, date) as any).cnt
  const totalDaily = (db.prepare("SELECT COUNT(*) as cnt FROM daily_goals WHERE user_id = ? AND date = ?").get(userId, date) as any).cnt
  const successHabits = (db.prepare("SELECT COUNT(*) as cnt FROM habit_entries WHERE user_id = ? AND date = ? AND success = 1").get(userId, date) as any).cnt
  const totalHabits = (db.prepare("SELECT COUNT(*) as cnt FROM habit_entries WHERE user_id = ? AND date = ?").get(userId, date) as any).cnt

  const score = calcDailyScore(completedDaily, totalDaily, successHabits, totalHabits)
  const grade = letterGrade(score)

  const existing = db.prepare('SELECT id FROM daily_scores WHERE user_id = ? AND date = ?').get(userId, date) as any
  if (existing) {
    db.prepare('UPDATE daily_scores SET score_percentage=?,letter_grade=?,completed_daily_goals=?,total_daily_goals=?,successful_habits=?,total_habits=?,updated_at=? WHERE id=?')
      .run(score, grade, completedDaily, totalDaily, successHabits, totalHabits, now(), existing.id)
    return db.prepare('SELECT * FROM daily_scores WHERE id = ?').get(existing.id)
  }
  const id = uuid()
  db.prepare('INSERT INTO daily_scores (id,user_id,date,score_percentage,letter_grade,completed_daily_goals,total_daily_goals,successful_habits,total_habits,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
    .run(id, userId, date, score, grade, completedDaily, totalDaily, successHabits, totalHabits, now(), now())
  return db.prepare('SELECT * FROM daily_scores WHERE id = ?').get(id)
}

function recalcWeekly(userId: string, weekStart: string, weekEnd: string) {
  const completedWeekly = (db.prepare("SELECT COUNT(*) as cnt FROM weekly_goals WHERE user_id = ? AND status = 'completed'").get(userId) as any).cnt
  const totalWeekly = (db.prepare("SELECT COUNT(*) as cnt FROM weekly_goals WHERE user_id = ?").get(userId) as any).cnt
  const completedDaily = (db.prepare("SELECT COUNT(*) as cnt FROM daily_goals WHERE user_id = ? AND date >= ? AND date <= ? AND status = 'completed'").get(userId, weekStart, weekEnd) as any).cnt
  const totalDaily = (db.prepare("SELECT COUNT(*) as cnt FROM daily_goals WHERE user_id = ? AND date >= ? AND date <= ?").get(userId, weekStart, weekEnd) as any).cnt
  const successHabits = (db.prepare("SELECT COUNT(*) as cnt FROM habit_entries WHERE user_id = ? AND date >= ? AND date <= ? AND success = 1").get(userId, weekStart, weekEnd) as any).cnt
  const totalHabits = (db.prepare("SELECT COUNT(*) as cnt FROM habit_entries WHERE user_id = ? AND date >= ? AND date <= ?").get(userId, weekStart, weekEnd) as any).cnt

  const score = calcWeeklyScore(completedWeekly, totalWeekly, completedDaily, totalDaily, successHabits, totalHabits)
  const grade = letterGrade(score)

  const existing = db.prepare('SELECT id FROM weekly_scores WHERE user_id = ? AND week_start_date = ?').get(userId, weekStart) as any
  if (existing) {
    db.prepare('UPDATE weekly_scores SET score_percentage=?,letter_grade=?,completed_weekly_goals=?,total_weekly_goals=?,completed_daily_goals=?,total_daily_goals=?,successful_habit_entries=?,total_habit_entries=?,updated_at=? WHERE id=?')
      .run(score, grade, completedWeekly, totalWeekly, completedDaily, totalDaily, successHabits, totalHabits, now(), existing.id)
    return db.prepare('SELECT * FROM weekly_scores WHERE id = ?').get(existing.id)
  }
  const id = uuid()
  db.prepare('INSERT INTO weekly_scores (id,user_id,week_start_date,week_end_date,score_percentage,letter_grade,completed_weekly_goals,total_weekly_goals,completed_daily_goals,total_daily_goals,successful_habit_entries,total_habit_entries,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .run(id, userId, weekStart, weekEnd, score, grade, completedWeekly, totalWeekly, completedDaily, totalDaily, successHabits, totalHabits, now(), now())
  return db.prepare('SELECT * FROM weekly_scores WHERE id = ?').get(id)
}

scores.get('/daily', (c) => {
  const userId = c.get('userId')
  const { date } = c.req.query()
  const targetDate = date || new Date().toISOString().split('T')[0]
  return c.json(recalcDaily(userId, targetDate))
})

scores.get('/weekly', (c) => {
  const userId = c.get('userId')
  const { weekStart, weekEnd } = c.req.query()
  const today = new Date()
  const day = today.getDay()
  const diff = today.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(today.setDate(diff))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const wStart = weekStart || monday.toISOString().split('T')[0]
  const wEnd = weekEnd || sunday.toISOString().split('T')[0]
  return c.json(recalcWeekly(userId, wStart, wEnd))
})

scores.post('/recalculate', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()
  if (body.date) {
    return c.json({ daily: recalcDaily(userId, body.date) })
  }
  if (body.weekStart && body.weekEnd) {
    return c.json({ weekly: recalcWeekly(userId, body.weekStart, body.weekEnd) })
  }
  return c.json({ error: 'Provide date or weekStart/weekEnd' }, 400)
})

export default scores
