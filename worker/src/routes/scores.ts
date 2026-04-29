import { Hono } from 'hono'
import { uuid, now, letterGrade, calcDailyScore, calcWeeklyScore } from '../db/helpers'
import { authMiddleware } from '../middleware/auth'
import type { Env } from '../types'

const scores = new Hono<{ Bindings: Env; Variables: { userId: string } }>()
scores.use('*', authMiddleware)

async function recalcDaily(DB: D1Database, userId: string, date: string) {
  const [cd, td, sh, th] = await Promise.all([
    DB.prepare("SELECT COUNT(*) as cnt FROM daily_goals WHERE user_id = ? AND date = ? AND status = 'completed'").bind(userId, date).first() as Promise<any>,
    DB.prepare("SELECT COUNT(*) as cnt FROM daily_goals WHERE user_id = ? AND date = ?").bind(userId, date).first() as Promise<any>,
    DB.prepare("SELECT COUNT(*) as cnt FROM habit_entries WHERE user_id = ? AND date = ? AND success = 1").bind(userId, date).first() as Promise<any>,
    DB.prepare("SELECT COUNT(*) as cnt FROM habit_entries WHERE user_id = ? AND date = ?").bind(userId, date).first() as Promise<any>,
  ])
  const score = calcDailyScore(cd.cnt, td.cnt, sh.cnt, th.cnt)
  const grade = letterGrade(score)
  const existing = await DB.prepare('SELECT id FROM daily_scores WHERE user_id = ? AND date = ?').bind(userId, date).first() as any
  if (existing) {
    await DB.prepare('UPDATE daily_scores SET score_percentage=?,letter_grade=?,completed_daily_goals=?,total_daily_goals=?,successful_habits=?,total_habits=?,updated_at=? WHERE id=?')
      .bind(score, grade, cd.cnt, td.cnt, sh.cnt, th.cnt, now(), existing.id).run()
    return DB.prepare('SELECT * FROM daily_scores WHERE id = ?').bind(existing.id).first()
  }
  const id = uuid()
  await DB.prepare('INSERT INTO daily_scores (id,user_id,date,score_percentage,letter_grade,completed_daily_goals,total_daily_goals,successful_habits,total_habits,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
    .bind(id, userId, date, score, grade, cd.cnt, td.cnt, sh.cnt, th.cnt, now(), now()).run()
  return DB.prepare('SELECT * FROM daily_scores WHERE id = ?').bind(id).first()
}

async function recalcWeekly(DB: D1Database, userId: string, weekStart: string, weekEnd: string) {
  const [cw, tw, cd, td, sh, th] = await Promise.all([
    DB.prepare("SELECT COUNT(*) as cnt FROM weekly_goals WHERE user_id = ? AND status = 'completed'").bind(userId).first() as Promise<any>,
    DB.prepare("SELECT COUNT(*) as cnt FROM weekly_goals WHERE user_id = ?").bind(userId).first() as Promise<any>,
    DB.prepare("SELECT COUNT(*) as cnt FROM daily_goals WHERE user_id = ? AND date >= ? AND date <= ? AND status = 'completed'").bind(userId, weekStart, weekEnd).first() as Promise<any>,
    DB.prepare("SELECT COUNT(*) as cnt FROM daily_goals WHERE user_id = ? AND date >= ? AND date <= ?").bind(userId, weekStart, weekEnd).first() as Promise<any>,
    DB.prepare("SELECT COUNT(*) as cnt FROM habit_entries WHERE user_id = ? AND date >= ? AND date <= ? AND success = 1").bind(userId, weekStart, weekEnd).first() as Promise<any>,
    DB.prepare("SELECT COUNT(*) as cnt FROM habit_entries WHERE user_id = ? AND date >= ? AND date <= ?").bind(userId, weekStart, weekEnd).first() as Promise<any>,
  ])
  const score = calcWeeklyScore(cw.cnt, tw.cnt, cd.cnt, td.cnt, sh.cnt, th.cnt)
  const grade = letterGrade(score)
  const existing = await DB.prepare('SELECT id FROM weekly_scores WHERE user_id = ? AND week_start_date = ?').bind(userId, weekStart).first() as any
  if (existing) {
    await DB.prepare('UPDATE weekly_scores SET score_percentage=?,letter_grade=?,completed_weekly_goals=?,total_weekly_goals=?,completed_daily_goals=?,total_daily_goals=?,successful_habit_entries=?,total_habit_entries=?,updated_at=? WHERE id=?')
      .bind(score, grade, cw.cnt, tw.cnt, cd.cnt, td.cnt, sh.cnt, th.cnt, now(), existing.id).run()
    return DB.prepare('SELECT * FROM weekly_scores WHERE id = ?').bind(existing.id).first()
  }
  const id = uuid()
  await DB.prepare('INSERT INTO weekly_scores (id,user_id,week_start_date,week_end_date,score_percentage,letter_grade,completed_weekly_goals,total_weekly_goals,completed_daily_goals,total_daily_goals,successful_habit_entries,total_habit_entries,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .bind(id, userId, weekStart, weekEnd, score, grade, cw.cnt, tw.cnt, cd.cnt, td.cnt, sh.cnt, th.cnt, now(), now()).run()
  return DB.prepare('SELECT * FROM weekly_scores WHERE id = ?').bind(id).first()
}

scores.get('/daily', async (c) => {
  const userId = c.get('userId')
  const { date } = c.req.query()
  const targetDate = date || new Date().toISOString().split('T')[0]
  return c.json(await recalcDaily(c.env.DB, userId, targetDate))
})

scores.get('/weekly', async (c) => {
  const userId = c.get('userId')
  const { weekStart, weekEnd } = c.req.query()
  const today = new Date()
  const day = today.getDay()
  const diff = today.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(today); monday.setDate(diff)
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6)
  const wStart = weekStart || monday.toISOString().split('T')[0]
  const wEnd = weekEnd || sunday.toISOString().split('T')[0]
  return c.json(await recalcWeekly(c.env.DB, userId, wStart, wEnd))
})

scores.post('/recalculate', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()
  if (body.date) return c.json({ daily: await recalcDaily(c.env.DB, userId, body.date) })
  if (body.weekStart && body.weekEnd) return c.json({ weekly: await recalcWeekly(c.env.DB, userId, body.weekStart, body.weekEnd) })
  return c.json({ error: 'Provide date or weekStart/weekEnd' }, 400)
})

export default scores
