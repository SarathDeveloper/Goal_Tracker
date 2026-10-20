export type Priority = 'low' | 'medium' | 'high'
export type GoalStatus = 'not_started' | 'in_progress' | 'completed'
export type MetricType = 'milestones' | 'numeric'
export type HabitFrequency = 'daily' | 'weekly'
export type ReminderKind = 'goal' | 'habit'

export interface Category {
  id: number
  name: string
  color: string
  createdAt: string
  goalCount: number
}

export interface Goal {
  id: number
  title: string
  description: string
  categoryId: number | null
  categoryName: string | null
  categoryColor: string | null
  priority: Priority
  status: GoalStatus
  startDate: string | null
  targetDate: string | null
  completedAt: string | null
  archivedAt: string | null
  createdAt: string
  updatedAt: string
  metricType: MetricType
  startValue: number | null
  targetValue: number | null
  unit: string
  progressPercent: number
  milestoneCount: number
  milestoneDone: number
  overdue: boolean
}

export interface Milestone {
  id: number
  goalId: number
  title: string
  position: number
  dueDate: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ProgressEntry {
  id: number
  goalId: number
  entryDate: string
  value: number
  note: string
  createdAt: string
  updatedAt: string
}

export interface GoalDetail extends Goal {
  milestones: Milestone[]
  progressEntries: ProgressEntry[]
}

export interface GoalList {
  goals: Goal[]
  total: number
}

export interface Habit {
  id: number
  title: string
  frequency: HabitFrequency
  targetPerPeriod: number
  goalId: number | null
  goalTitle: string | null
  archivedAt: string | null
  createdAt: string
  updatedAt: string
  currentStreak: number
  longestStreak: number
  todayChecked: boolean
  periodCount: number
  checkinDates: string[]
}

export interface DashboardMonth {
  month: string
  label: string
  count: number
}

export interface DashboardCategory {
  categoryId: number | null
  name: string
  color: string
  count: number
}

export interface Dashboard {
  today: string
  counts: {
    active: number
    completed: number
    overdue: number
    dueSoon: number
  }
  overdue: Goal[]
  dueSoon: Goal[]
  averageProgress: number
  completionsByMonth: DashboardMonth[]
  byCategory: DashboardCategory[]
  habitsToday: Habit[]
}

export interface ReminderSettings {
  enabled: boolean
  daysBefore: number
  checkTime: string
}

export interface DueReminder {
  kind: ReminderKind
  id: number
  title: string
  detail: string
}

export interface BackupStatus {
  dbPath: string
  backupDir: string
}

export interface Health {
  ok: true
  today: string
  dbPath: string
}
