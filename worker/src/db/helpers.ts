export const uuid = () => crypto.randomUUID()
export const now = () => new Date().toISOString()

export function letterGrade(score: number): string {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
}

export function calcDailyScore(completedGoals: number, totalGoals: number, successHabits: number, totalHabits: number): number {
  const goalScore = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 100
  const habitScore = totalHabits > 0 ? (successHabits / totalHabits) * 100 : 100
  return goalScore * 0.60 + habitScore * 0.40
}

export function calcWeeklyScore(
  completedWeekly: number, totalWeekly: number,
  completedDaily: number, totalDaily: number,
  successHabits: number, totalHabits: number
): number {
  const weeklyGoalScore = totalWeekly > 0 ? (completedWeekly / totalWeekly) * 100 : 100
  const dailyGoalScore = totalDaily > 0 ? (completedDaily / totalDaily) * 100 : 100
  const habitScore = totalHabits > 0 ? (successHabits / totalHabits) * 100 : 100
  return weeklyGoalScore * 0.40 + dailyGoalScore * 0.30 + habitScore * 0.30
}
