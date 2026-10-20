import { reminderSettingsSchema } from '@shared/schemas'
import { Router } from 'express'
import { dueReminders, getReminderSettings, updateReminderSettings } from '../reminders/reminderService'
import { asyncHandler, parseBody } from '../lib/http'

const router = Router()

router.get(
  '/settings',
  asyncHandler((_req, res) => {
    res.json(getReminderSettings())
  }),
)

router.put(
  '/settings',
  asyncHandler((req, res) => {
    res.json(updateReminderSettings(parseBody(reminderSettingsSchema, req.body)))
  }),
)

router.get(
  '/due',
  asyncHandler((_req, res) => {
    res.json({ reminders: dueReminders() })
  }),
)

export default router
