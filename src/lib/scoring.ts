// Scoring system for 4 Quarters

export function calculateGrade(score: number): string {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
}

export async function calculateDailyScore(db: D1Database, userId: number, date: string): Promise<{ goals_score: number, habits_score: number, total_score: number, grade: string }> {
  // Get weekly goals for this week
  const weekGoals = await db.prepare(`
    SELECT COUNT(*) as total, SUM(completed) as done
    FROM weekly_goals 
    WHERE user_id = ? AND date(created_at) <= ? 
  `).bind(userId, date).first() as any

  const goalTotal = weekGoals?.total || 0
  const goalDone = weekGoals?.done || 0
  const goalsScore = goalTotal > 0 ? (goalDone / goalTotal) * 100 : 0

  // Get habits for today
  const habitsData = await db.prepare(`
    SELECT h.id, h.type, h.target_days,
           COALESCE(hl.completed, 0) as completed
    FROM habits h
    LEFT JOIN habit_logs hl ON hl.habit_id = h.id AND hl.log_date = ?
    WHERE h.user_id = ?
  `).bind(date, userId).all()

  const habits = habitsData.results || []
  const dayOfWeek = new Date(date).getDay() + 1 // 1=Sunday..7=Saturday
  
  let habitTotal = 0
  let habitDone = 0
  
  for (const h of habits as any[]) {
    let targetDays: number[]
    if (Array.isArray(h.target_days)) {
      targetDays = h.target_days.map(Number)
    } else if (typeof h.target_days === 'string') {
      try { targetDays = JSON.parse(h.target_days) } catch { targetDays = h.target_days.split(',').map(Number) }
    } else {
      targetDays = [1,2,3,4,5,6,7]
    }
    if (!targetDays.includes(dayOfWeek)) continue
    habitTotal++
    if (h.type === 'execute' && h.completed) habitDone++
    if (h.type === 'avoid' && !h.completed) habitDone++
  }

  const habitsScore = habitTotal > 0 ? (habitDone / habitTotal) * 100 : 0

  // Daily: Goals 60%, Habits 40%
  const total = (goalsScore * 0.6) + (habitsScore * 0.4)
  const grade = calculateGrade(total)

  return {
    goals_score: Math.round(goalsScore * 10) / 10,
    habits_score: Math.round(habitsScore * 10) / 10,
    total_score: Math.round(total * 10) / 10,
    grade
  }
}

export async function calculateWeeklyScore(db: D1Database, userId: number, weekStart: string, weekEnd: string): Promise<{ weekly_goals: number, daily_avg: number, habits_avg: number, total: number, grade: string }> {
  // Weekly goals score (40%)
  const wg = await db.prepare(`
    SELECT COUNT(*) as total, SUM(completed) as done
    FROM weekly_goals
    WHERE user_id = ? AND created_at BETWEEN ? AND ?
  `).bind(userId, weekStart, weekEnd).first() as any
  
  const wgScore = (wg?.total || 0) > 0 ? ((wg.done || 0) / wg.total) * 100 : 0

  // Daily scores avg (30% for goals, 30% for habits)
  const dailies = await db.prepare(`
    SELECT AVG(goals_score) as avg_goals, AVG(habits_score) as avg_habits
    FROM daily_scores
    WHERE user_id = ? AND score_date BETWEEN ? AND ?
  `).bind(userId, weekStart, weekEnd).first() as any

  const avgGoals = dailies?.avg_goals || 0
  const avgHabits = dailies?.avg_habits || 0

  // Weekly: Weekly goals 40%, Daily goals 30%, Habits 30%
  const total = (wgScore * 0.4) + (avgGoals * 0.3) + (avgHabits * 0.3)
  const grade = calculateGrade(total)

  return {
    weekly_goals: Math.round(wgScore * 10) / 10,
    daily_avg: Math.round(avgGoals * 10) / 10,
    habits_avg: Math.round(avgHabits * 10) / 10,
    total: Math.round(total * 10) / 10,
    grade
  }
}
