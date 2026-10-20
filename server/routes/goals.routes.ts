import {
  goalInputSchema,
  milestoneInputSchema,
  progressInputSchema,
  reorderMilestonesSchema,
} from '@shared/schemas'
import type { GoalStatus, Priority } from '@shared/types'
import { Router } from 'express'
import { createMilestone, reorderMilestones } from '../goals/milestoneService'
import { createProgressEntry } from '../goals/progressService'
import {
  createGoal,
  deleteGoal,
  getGoalDetail,
  listGoals,
  setGoalArchived,
  updateGoal,
  type GoalFilters,
} from '../goals/goalService'
import { asyncHandler, HttpError, parseBody, parseIdParam, queryString } from '../lib/http'

const router = Router()

const STATUSES: readonly GoalStatus[] = ['not_started', 'in_progress', 'completed']
const PRIORITIES: readonly Priority[] = ['low', 'medium', 'high']
const SORTS = ['updated', 'title', 'target', 'priority'] as const

function oneOf<T extends string>(value: string, allowed: readonly T[], label: string): T | undefined {
  if (!value) {
    return undefined
  }
  if ((allowed as readonly string[]).includes(value)) {
    return value as T
  }
  throw new HttpError(400, `Invalid ${label}`)
}

function parseFilters(query: Parameters<typeof queryString>[0]): GoalFilters {
  const q = queryString(query, 'q')
  if (q.length > 200) {
    throw new HttpError(400, 'Search must be 200 characters or less')
  }
  const categoryRaw = queryString(query, 'categoryId')
  let categoryId: number | undefined
  if (categoryRaw) {
    categoryId = Number.parseInt(categoryRaw, 10)
    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      throw new HttpError(400, 'Invalid category')
    }
  }
  return {
    q: q || undefined,
    status: oneOf(queryString(query, 'status'), STATUSES, 'status'),
    priority: oneOf(queryString(query, 'priority'), PRIORITIES, 'priority'),
    categoryId,
    archived: queryString(query, 'archived') === '1',
    sort: oneOf(queryString(query, 'sort'), SORTS, 'sort'),
  }
}

router.get(
  '/',
  asyncHandler((req, res) => {
    res.json(listGoals(parseFilters(req.query)))
  }),
)

router.get(
  '/:id',
  asyncHandler((req, res) => {
    res.json(getGoalDetail(parseIdParam(req.params.id)))
  }),
)

router.post(
  '/',
  asyncHandler((req, res) => {
    res.status(201).json(createGoal(parseBody(goalInputSchema, req.body)))
  }),
)

router.put(
  '/:id',
  asyncHandler((req, res) => {
    res.json(updateGoal(parseIdParam(req.params.id), parseBody(goalInputSchema, req.body)))
  }),
)

router.post(
  '/:id/archive',
  asyncHandler((req, res) => {
    res.json(setGoalArchived(parseIdParam(req.params.id), true))
  }),
)

router.post(
  '/:id/unarchive',
  asyncHandler((req, res) => {
    res.json(setGoalArchived(parseIdParam(req.params.id), false))
  }),
)

router.delete(
  '/:id',
  asyncHandler((req, res) => {
    deleteGoal(parseIdParam(req.params.id))
    res.status(204).end()
  }),
)

router.post(
  '/:id/milestones',
  asyncHandler((req, res) => {
    res.status(201).json(createMilestone(parseIdParam(req.params.id), parseBody(milestoneInputSchema, req.body)))
  }),
)

router.post(
  '/:id/milestones/reorder',
  asyncHandler((req, res) => {
    const body = parseBody(reorderMilestonesSchema, req.body)
    res.json(reorderMilestones(parseIdParam(req.params.id), body.ids))
  }),
)

router.post(
  '/:id/progress',
  asyncHandler((req, res) => {
    res.status(201).json(createProgressEntry(parseIdParam(req.params.id), parseBody(progressInputSchema, req.body)))
  }),
)

export default router
