export interface User {
  id: string
  name: string
  email: string
  onboardingCompleted: boolean
}

export interface Vision {
  id: string
  user_id: string
  vision_statement: string
  emotional_connection: string
  why_it_matters: string
  cost_of_failure: string
  reward_of_execution: string
}

export interface Cycle {
  id: string
  user_id: string
  title: string
  start_date: string
  end_date: string
  status: 'active' | 'completed' | 'archived'
}

export interface QuarterGoal {
  id: string
  user_id: string
  cycle_id: string
  title: string
  description: string
  target_metric: string
  starting_value: number
  target_value: number
  current_value: number
  status: 'not_started' | 'in_progress' | 'blocked' | 'completed'
  priority: number
  monthlyGoals?: MonthlyGoal[]
}

export interface MonthlyGoal {
  id: string
  twelve_week_goal_id: string
  title: string
  description: string
  month_number: number
  status: 'not_started' | 'in_progress' | 'blocked' | 'completed'
  weeklyGoals?: WeeklyGoal[]
}

export interface HabitWithEntry {
  id: string
  user_id: string
  name: string
  habit_type: 'positive' | 'negative'
  goal_behavior: 'execute' | 'avoid'
  active: number
  weekly_goal_id: string | null
  executedToday: boolean
  successToday: boolean
  entryId: string | null
}

export interface WeeklyGoal {
  id: string
  monthly_goal_id: string
  title: string
  description: string
  week_number: number
  status: 'not_started' | 'in_progress' | 'blocked' | 'completed'
  habits?: HabitWithEntry[]
  habitProgress?: number
  dailyGoals?: DailyGoal[]
}

export interface DailyGoal {
  id: string
  weekly_goal_id: string
  title: string
  description: string
  date: string
  status: 'planned' | 'completed' | 'missed' | 'blocked'
}

export interface Habit {
  id: string
  user_id: string
  name: string
  habit_type: 'positive' | 'negative'
  goal_behavior: 'execute' | 'avoid'
  active: number
}

export interface HabitEntry {
  id: string
  habit_id: string
  date: string
  executed: number
  success: number
  note: string
  name?: string
  goal_behavior?: string
}

export interface TimeBlock {
  id: string
  user_id: string
  title: string
  description: string
  date: string
  start_time: string
  end_time: string
  category: string
  linked_goal_type: string
  linked_goal_id: string | null
  color: string
}

export interface DailyScore {
  date: string
  score_percentage: number
  letter_grade: string
  completed_daily_goals: number
  total_daily_goals: number
  successful_habits: number
  total_habits: number
}

export interface Partner {
  id: string
  requester_user_id: string
  receiver_user_id: string
  requester_name: string
  requester_email: string
  receiver_name: string
  receiver_email: string
  status: 'pending' | 'accepted' | 'declined' | 'removed'
}

export interface Standup {
  id: string
  user_id: string
  type: 'daily_standup' | 'end_of_day_reflection' | 'weekly_checkin' | 'quarterly_checkin'
  date: string
  previous_progress: string
  next_focus: string
  blockers: string
  reflection: string
  score_summary: string
}

export interface AIConversation {
  id: string
  user_id: string
  title: string
  created_at: string
  updated_at: string
}

export interface PyramidMetrics {
  cycleProgress: number
  twelveWeekProgress: number
  monthlyProgress: number
  weeklyProgress: number
  habitProgress: number
}

export interface PyramidHabit {
  id: string
  name: string
  goal_behavior: 'execute' | 'avoid'
  habit_type: string
  weekly_goal_id: string | null
  entry_id: string | null
  executed: number | null
  success: number | null
  note: string | null
}

export interface PyramidData {
  cycle: (Cycle & { progress: number }) | null
  twelveWeekGoals: (QuarterGoal & { progress: number })[]
  monthlyGoals: MonthlyGoal[]
  weeklyGoals: WeeklyGoal[]
  habits: PyramidHabit[]
  metrics: PyramidMetrics
}

export interface AIMessage {
  id: string
  conversation_id: string
  user_id?: string
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at: string
}
