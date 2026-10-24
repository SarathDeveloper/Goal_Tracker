import { expect, test } from '@playwright/test'
import { silenceReminders } from './helpers/ui'

test('writes a diary entry and keeps it after reload', async ({ page, request }) => {
  await silenceReminders(request)
  const title = `Morning note ${Date.now()}`
  await page.goto('/diary')
  await page.getByRole('button', { name: 'New entry' }).click()
  const dialog = page.getByRole('dialog', { name: 'New entry' })
  await dialog.getByLabel('Title').fill(title)
  await dialog.getByRole('button', { name: 'Good', exact: true }).click()
  await dialog.getByRole('textbox', { name: 'Entry' }).fill('Felt steady today.')
  await dialog.getByRole('button', { name: 'Save entry' }).click()

  const card = page.getByRole('article', { name: title })
  await expect(card).toContainText('Good')
  await expect(card).toContainText('Felt steady today.')
  await page.reload()
  await expect(page.getByRole('article', { name: title })).toContainText('Felt steady today.')
})
