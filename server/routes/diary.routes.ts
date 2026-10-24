import { diaryEntryInputSchema } from '@shared/schemas'
import { Router } from 'express'
import {
  createDiaryEntry,
  deleteDiaryEntry,
  getDiaryEntry,
  listDiaryEntries,
  updateDiaryEntry,
} from '../diary/diaryService'
import { asyncHandler, parseBody, parseIdParam, queryString } from '../lib/http'

const router = Router()

router.get(
  '/',
  asyncHandler((req, res) => {
    res.json({ entries: listDiaryEntries(queryString(req.query, 'q')) })
  }),
)

router.get(
  '/:id',
  asyncHandler((req, res) => {
    res.json(getDiaryEntry(parseIdParam(req.params.id)))
  }),
)

router.post(
  '/',
  asyncHandler((req, res) => {
    res.status(201).json(createDiaryEntry(parseBody(diaryEntryInputSchema, req.body)))
  }),
)

router.put(
  '/:id',
  asyncHandler((req, res) => {
    res.json(updateDiaryEntry(parseIdParam(req.params.id), parseBody(diaryEntryInputSchema, req.body)))
  }),
)

router.delete(
  '/:id',
  asyncHandler((req, res) => {
    deleteDiaryEntry(parseIdParam(req.params.id))
    res.status(204).end()
  }),
)

export default router
