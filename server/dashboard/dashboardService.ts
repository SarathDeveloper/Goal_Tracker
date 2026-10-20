import { addDays, monthKey, monthLabel, recentMonths } from '@shared/dates'
import type { Dashboard } from '@shared/types'
import { getToday } from '../lib/clock'
import { listHabits } from '../habits/habitService'
import { listGoals } from '../goals/goalService'

export function getDashboard(): Dashboard {
  const today = getToday()
  const soon = addDays(today, 7)
  const { goals } = listGoals({ archived: false })
  const active = goals.filter((goal) => goal.status !== 'completed')
  const completed = goals.filter((goal) => goal.status === 'completed')
  const overdue = active
    .filter((goal) => goal.overdue)
    .sort((a, b) => (a.targetDate ?? '').localeCompare(b.targetDate ?? ''))
  const dueSoon = active
    .filter((goal) => goal.targetDate !== null && goal.targetDate >= today && goal.targetDate <= soon)
    .sort((a, b) => (a.targetDate ?? '').localeCompare(b.targetDate ?? ''))
  const averageProgress =
    active.length === 0 ? 0 : Math.round(active.reduce((sum, goal) => sum + goal.progressPercent, 0) / active.length)
  const months = recentMonths(today, 6)
  const completionsByMonth = months.map((month) => ({
    month,
    label: monthLabel(month),
    count: completed.filter((goal) => goal.completedAt !== null && monthKey(goal.completedAt) === month).length,
  }))
  const counts = new Map<string, { categoryId: number | null; name: string; color: string; count: number }>()
  for (const goal of goals) {
    const key = goal.categoryId === null ? 'none' : String(goal.categoryId)
    const current = counts.get(key) ?? {
      categoryId: goal.categoryId,
      name: goal.categoryName ?? 'Uncategorized',
      color: goal.categoryColor ?? '#8a8175',
      count: 0,
    }
    current.count += 1
    counts.set(key, current)
  }
  const byCategory = [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  return {
    today,
    counts: {
      active: active.length,
      completed: completed.length,
      overdue: overdue.length,
      dueSoon: dueSoon.length,
    },
    overdue,
    dueSoon,
    averageProgress,
    completionsByMonth,
    byCategory,
    habitsToday: listHabits(false),
  }
}
