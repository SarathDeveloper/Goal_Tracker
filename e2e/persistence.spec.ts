import { expect, test } from '@playwright/test'
import { startAppServer } from './helpers/server'

test('goals, milestones, progress, and habits survive a server restart', async ({ page }) => {
  const first = await startAppServer()
  const base = `http://127.0.0.1:${first.port}`
  await page.request.put(`${base}/api/reminders/settings`, {
    data: { enabled: false, daysBefore: 3, checkTime: '09:00' },
  })

  await page.goto(`${base}/goals`)
  await page.getByRole('button', { name: 'New goal' }).click()
  await page.locator('#goal-title').fill('Write a book')
  await page.getByRole('button', { name: 'Save goal' }).click()
  await page.getByRole('link', { name: /Write a book/ }).click()
  await page.getByLabel('New milestone').fill('Outline')
  await page.getByRole('button', { name: 'Add milestone' }).click()
  await page.getByLabel('Toggle Outline').click()
  await expect(page.getByLabel('Toggle Outline')).toBeChecked()

  await page.goto(`${base}/goals`)
  await page.getByRole('button', { name: 'New goal' }).click()
  await page.locator('#goal-title').fill('Run 100 km')
  await page.locator('#goal-metric').selectOption('numeric')
  await page.locator('#goal-start-value').fill('0')
  await page.locator('#goal-target-value').fill('100')
  await page.locator('#goal-unit').fill('km')
  await page.getByRole('button', { name: 'Save goal' }).click()
  await page.getByRole('link', { name: /Run 100 km/ }).click()
  await page.locator('#entry-value').fill('25')
  await page.getByRole('button', { name: 'Log progress' }).click()
  await expect(page.getByText('25% complete')).toBeVisible()

  await page.goto(`${base}/habits`)
  await page.getByRole('button', { name: 'New habit' }).click()
  await page.getByLabel('Title').fill('Stretch')
  await page.getByRole('button', { name: 'Save habit' }).click()
  const today = new Date()
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const stretchDay = page.getByRole('article', { name: 'Stretch' }).getByRole('button', { name: new RegExp(iso) })
  await stretchDay.click()
  await expect(stretchDay).toHaveAttribute('aria-pressed', 'true')

  await first.stop()
  const second = await startAppServer(first.dataDir)
  try {
    await page.goto(`http://127.0.0.1:${second.port}/goals`)
    await page.getByRole('link', { name: /Write a book/ }).click()
    await expect(page.getByLabel('Toggle Outline')).toBeChecked()
    await page.goto(`http://127.0.0.1:${second.port}/goals`)
    await page.getByRole('link', { name: /Run 100 km/ }).click()
    await expect(page.getByText('25 km')).toBeVisible()
    await page.goto(`http://127.0.0.1:${second.port}/habits`)
    await expect(page.getByRole('article', { name: 'Stretch' }).getByRole('button', { name: new RegExp(iso) })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  } finally {
    await second.stop()
  }
})
