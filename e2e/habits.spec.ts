import { expect, test } from '@playwright/test'
import { silenceReminders } from './helpers/ui'

test('checks a habit for today and keeps it after reload', async ({ page, request }) => {
  await silenceReminders(request)
  const title = `Water plants ${Date.now()}`
  await page.goto('/habits')
  await page.getByRole('button', { name: 'New habit' }).click()
  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Frequency').selectOption('weekly')
  await page.getByLabel('Days per week').fill('3')
  await page.getByRole('button', { name: 'Save habit' }).click()

  const today = new Date()
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const card = page.getByRole('article', { name: title })
  const button = card.getByRole('button', { name: new RegExp(iso) })
  await button.click()
  await expect(button).toHaveAttribute('aria-pressed', 'true')
  await expect(card).toContainText('1 of 3 this week')
  await page.reload()
  await expect(page.getByRole('article', { name: title }).getByRole('button', { name: new RegExp(iso) })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})
