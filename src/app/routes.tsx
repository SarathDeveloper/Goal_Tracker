import { createBrowserRouter } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { DiaryPage } from '../features/diary/DiaryPage'
import { GoalDetailPage } from '../features/goals/GoalDetailPage'
import { GoalsPage } from '../features/goals/GoalsPage'
import { HabitsPage } from '../features/habits/HabitsPage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { AppLayout } from './AppLayout'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'goals', element: <GoalsPage /> },
      { path: 'goals/:id', element: <GoalDetailPage /> },
      { path: 'habits', element: <HabitsPage /> },
      { path: 'diary', element: <DiaryPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <EmptyState title="Page not found" hint="That address is not part of Goal Tracker." /> },
    ],
  },
])
