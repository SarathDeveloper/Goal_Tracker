import { expect, test } from '@playwright/test'
import { createGoal, localIso, silenceReminders } from './helpers/ui'

test('shows an overdue goal on the dashboard', async ({ page, request }) => {
  await silenceReminders(request)
  const title = `Overdue ${Date.now()}`
  await createGoal(page, title, { targetDate: localIso(-2) })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Overdue' })).toBeVisible()
  await expect(page.getByRole('link', { name: new RegExp(title) })).toBeVisible()
})
