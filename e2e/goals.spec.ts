import { expect, test } from '@playwright/test'
import { createGoal, silenceReminders } from './helpers/ui'

test.beforeEach(async ({ request }) => {
  await silenceReminders(request)
})

test('validates, edits, archives, and deletes a goal', async ({ page }) => {
  const title = `Half marathon ${Date.now()}`
  await page.goto('/goals')
  await page.getByRole('button', { name: 'New goal' }).click()
  await page.getByRole('button', { name: 'Save goal' }).click()
  await expect(page.getByText('Title is required')).toBeVisible()

  await page.locator('#goal-title').fill(title)
  await page.locator('#goal-description').fill('Train four days a week')
  await page.locator('#goal-priority').selectOption('high')
  await page.getByRole('button', { name: 'Save goal' }).click()
  await page.getByRole('link', { name: new RegExp(title) }).click()
  await expect(page.getByRole('heading', { name: title })).toBeVisible()

  const renamed = `${title} updated`
  await page.getByRole('button', { name: 'Edit' }).click()
  await page.locator('#goal-title').fill(renamed)
  await page.getByRole('button', { name: 'Save goal' }).click()
  await expect(page.getByRole('heading', { name: renamed })).toBeVisible()

  await page.getByRole('button', { name: 'Archive' }).click()
  await page.goto('/goals')
  await expect(page.getByRole('link', { name: new RegExp(renamed) })).toHaveCount(0)
  await page.getByRole('checkbox', { name: 'Archived' }).check()
  await page.getByRole('link', { name: new RegExp(renamed) }).click()
  await page.getByRole('button', { name: 'Unarchive' }).click()
  await page.goto('/goals')
  await page.getByRole('link', { name: new RegExp(renamed) }).click()

  await page.getByRole('button', { name: 'Delete' }).click()
  await page.getByRole('button', { name: 'Delete goal' }).click()
  await expect(page.getByRole('heading', { name: 'Goals' })).toBeVisible()
  await expect(page.getByRole('link', { name: new RegExp(renamed) })).toHaveCount(0)
})

test('filters goals by the search box', async ({ page }) => {
  const title = `Searchable ${Date.now()}`
  await createGoal(page, title)
  await page.getByLabel('Search').fill(title)
  await expect(page.getByRole('link', { name: new RegExp(title) })).toBeVisible()
  await page.getByLabel('Search').fill('zzzz-not-a-goal')
  await expect(page.getByText('No goals yet')).toBeVisible()
})
