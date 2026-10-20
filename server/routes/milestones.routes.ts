import { milestoneInputSchema } from '@shared/schemas'
import { Router } from 'express'
import { deleteMilestone, toggleMilestone, updateMilestone } from '../goals/milestoneService'
import { asyncHandler, parseBody, parseIdParam } from '../lib/http'

const router = Router()

router.put(
  '/:id',
  asyncHandler((req, res) => {
    res.json(updateMilestone(parseIdParam(req.params.id), parseBody(milestoneInputSchema, req.body)))
  }),
)

router.post(
  '/:id/toggle',
  asyncHandler((req, res) => {
    res.json(toggleMilestone(parseIdParam(req.params.id)))
  }),
)

router.delete(
  '/:id',
  asyncHandler((req, res) => {
    res.json(deleteMilestone(parseIdParam(req.params.id)))
  }),
)

export default router
