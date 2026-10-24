import type { Page } from '@playwright/test'

export function localIso(dayOffset: number): string {
  const date = new Date()
  date.setDate(date.getDate() + dayOffset)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export async function silenceReminders(request: { put: (url: string, options: { data: unknown }) => Promise<unknown> }): Promise<void> {
  await request.put('/api/reminders/settings', {
    data: { enabled: false, daysBefore: 3, checkTime: '09:00' },
  })
}

export async function createGoal(page: Page, title: string, options?: { targetDate?: string; measurable?: boolean }): Promise<void> {
  await page.goto('/goals')
  await page.getByRole('button', { name: 'New goal' }).click()
  await page.locator('#goal-title').fill(title)
  if (options?.targetDate) {
    await page.locator('#goal-target').fill(options.targetDate)
  }
  if (options?.measurable) {
    await page.locator('#goal-metric').selectOption('numeric')
    await page.locator('#goal-start-value').fill('0 km')
    await page.locator('#goal-target-value').fill('100 km')
  }
  await page.getByRole('button', { name: 'Save goal' }).click()
  await page.getByRole('link', { name: new RegExp(title) }).waitFor()
}
