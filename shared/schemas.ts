import { z } from 'zod'
import { isIsoDate } from './dates.ts'

const optionalDate = z
  .union([z.string(), z.null()])
  .transform((value) => {
    if (value === null) {
      return null
    }
    const trimmed = value.trim()
    return trimmed === '' ? null : trimmed
  })
  .refine((value) => value === null || isIsoDate(value), 'Enter a real date (YYYY-MM-DD)')

const nullableNumber = z.number().finite().nullable()

export const goalInputSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(120, 'Title must be 120 characters or less'),
    description: z
      .string()
      .trim()
      .max(2000, 'Description must be 2000 characters or less')
      .optional()
      .default(''),
    categoryId: z.number().int().positive().nullable().optional().default(null),
    priority: z.enum(['low', 'medium', 'high']).optional().default('medium'),
    status: z.enum(['not_started', 'in_progress', 'completed']).optional().default('not_started'),
    startDate: optionalDate.optional().default(null),
    targetDate: optionalDate.optional().default(null),
    metricType: z.enum(['milestones', 'numeric']).optional().default('milestones'),
    startValue: nullableNumber.optional().default(null),
    targetValue: nullableNumber.optional().default(null),
    unit: z.string().trim().max(40, 'Unit must be 40 characters or less').optional().default(''),
    startLabel: z.string().trim().max(200, 'Starting point must be 200 characters or less').optional().default(''),
    targetLabel: z.string().trim().max(200, 'Target must be 200 characters or less').optional().default(''),
    remind: z.boolean().optional().default(true),
  })
  .superRefine((value, ctx) => {
    if (value.startDate && value.targetDate && value.targetDate < value.startDate) {
      ctx.addIssue({
        code: 'custom',
        path: ['targetDate'],
        message: 'Target date cannot be before the start date',
      })
    }
    if (value.metricType !== 'numeric') {
      return
    }
    if (value.startValue === null) {
      ctx.addIssue({ code: 'custom', path: ['startValue'], message: 'Enter a starting value' })
    }
    if (value.targetValue === null) {
      ctx.addIssue({ code: 'custom', path: ['targetValue'], message: 'Enter a target value' })
    }
    if (value.startValue !== null && value.targetValue !== null && value.startValue === value.targetValue) {
      ctx.addIssue({
        code: 'custom',
        path: ['targetValue'],
        message: 'Target value must be different from the starting value',
      })
    }
  })

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(40, 'Name must be 40 characters or less'),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Choose a color')
    .transform((value) => value.toLowerCase()),
})

export const milestoneInputSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(120, 'Title must be 120 characters or less'),
  dueDate: optionalDate.optional().default(null),
})

export const reorderMilestonesSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1, 'Choose the milestones to reorder'),
})

export const progressInputSchema = z.object({
  entryDate: z.string().trim().refine(isIsoDate, 'Enter a real date (YYYY-MM-DD)'),
  value: z.number().finite('Enter a number'),
  note: z.string().trim().max(500, 'Note must be 500 characters or less').optional().default(''),
})

export const habitInputSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(120, 'Title must be 120 characters or less'),
    frequency: z.enum(['daily', 'weekly']),
    targetPerPeriod: z.number().int().min(1).max(7).optional().default(1),
    goalId: z.number().int().positive().nullable().optional().default(null),
    remind: z.boolean().optional().default(true),
  })
  .superRefine((value, ctx) => {
    if (value.frequency === 'daily' && value.targetPerPeriod !== 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['targetPerPeriod'],
        message: 'Daily habits are checked once a day',
      })
    }
  })

export const checkinInputSchema = z.object({
  date: z.string().trim().refine(isIsoDate, 'Enter a real date (YYYY-MM-DD)'),
})

export const diaryEntryInputSchema = z.object({
  entryDate: z.string().trim().refine(isIsoDate, 'Enter a real date (YYYY-MM-DD)'),
  title: z.string().trim().min(1, 'Title is required').max(120, 'Title must be 120 characters or less'),
  body: z.string().trim().max(10000, 'Entry must be 10000 characters or less').optional().default(''),
  mood: z.number().int().min(1).max(5).nullable().optional().default(null),
})

export const reminderSettingsSchema = z.object({
  enabled: z.boolean(),
  daysBefore: z.number().int().min(0).max(30),
  checkTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Enter a time as HH:MM'),
})

export const backupPathSchema = z.object({
  destinationPath: z.string().trim().min(1, 'Choose where to save the backup'),
})

export const restorePathSchema = z.object({
  sourcePath: z.string().trim().min(1, 'Choose a backup file'),
})

export type GoalInput = z.output<typeof goalInputSchema>
export type CategoryInput = z.output<typeof categoryInputSchema>
export type MilestoneInput = z.output<typeof milestoneInputSchema>
export type ProgressInput = z.output<typeof progressInputSchema>
export type HabitInput = z.output<typeof habitInputSchema>
export type DiaryEntryInput = z.output<typeof diaryEntryInputSchema>
export type ReminderSettingsInput = z.output<typeof reminderSettingsSchema>

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path[0]
    if (typeof key === 'string' && !fields[key]) {
      fields[key] = issue.message
    }
  }
  return fields
}
