import { Hono } from 'hono'
import { getAuthUser, extractToken } from '../lib/auth'
import { calculateDailyScore, calculateWeeklyScore } from '../lib/scoring'

type Bindings = { DB: D1Database }
const scores = new Hono<{ Bindings: Bindings }>()

// GET /api/scores/daily
scores.get('/daily', async (c) => {
  try {
    const token = extractToken(c)
    const user = await getAuthUser(c.env.DB, token)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const date = c.req.query('date') || new Date().toISOString().split('T')[0]
    const score = await calculateDailyScore(c.env.DB, user.id, date)

    // Upsert score
    await c.env.DB.prepare(
      `INSERT INTO daily_scores (user_id, score_date, goals_score, habits_score, total_score, grade)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, score_date) DO UPDATE SET
       goals_score = excluded.goals_score,
       habits_score = excluded.habits_score,
       total_score = excluded.total_score,
       grade = excluded.grade`
    ).bind(user.id, date, score.goals_score, score.habits_score, score.total_score, score.grade).run()

    return c.json({ date, ...score })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// GET /api/scores/weekly
scores.get('/weekly', async (c) => {
  try {
    const token = extractToken(c)
    const user = await getAuthUser(c.env.DB, token)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const weekStart = c.req.query('week_start') || getMonday(new Date())
    const weekEnd = c.req.query('week_end') || getSunday(new Date())

    const score = await calculateWeeklyScore(c.env.DB, user.id, weekStart, weekEnd)
    return c.json({ week_start: weekStart, week_end: weekEnd, ...score })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// GET /api/scores/history
scores.get('/history', async (c) => {
  try {
    const token = extractToken(c)
    const user = await getAuthUser(c.env.DB, token)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const days = parseInt(c.req.query('days') || '30')
    const result = await c.env.DB.prepare(
      `SELECT * FROM daily_scores WHERE user_id = ? 
       ORDER BY score_date DESC LIMIT ?`
    ).bind(user.id, days).all()

    return c.json({ history: result.results })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

function getMonday(d: Date): string {
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d.setDate(diff))
  return monday.toISOString().split('T')[0]
}

function getSunday(d: Date): string {
  const day = d.getDay()
  const diff = d.getDate() + (day === 0 ? 0 : 7 - day)
  const sunday = new Date(d.setDate(diff))
  return sunday.toISOString().split('T')[0]
}

export default scores
