import { progressInputSchema } from '@shared/schemas'
import { Router } from 'express'
import { deleteProgressEntry, updateProgressEntry } from '../goals/progressService'
import { asyncHandler, parseBody, parseIdParam } from '../lib/http'

const router = Router()

router.put(
  '/:id',
  asyncHandler((req, res) => {
    res.json(updateProgressEntry(parseIdParam(req.params.id), parseBody(progressInputSchema, req.body)))
  }),
)

router.delete(
  '/:id',
  asyncHandler((req, res) => {
    res.json(deleteProgressEntry(parseIdParam(req.params.id)))
  }),
)

export default router
