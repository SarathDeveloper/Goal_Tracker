import { checkinInputSchema, habitInputSchema } from '@shared/schemas'
import { isIsoDate } from '@shared/dates'
import { Router } from 'express'
import { checkIn, clearCheckIn, createHabit, deleteHabit, getHabit, listHabits, setHabitArchived, updateHabit } from '../habits/habitService'
import { asyncHandler, HttpError, parseBody, parseIdParam, queryString } from '../lib/http'

const router = Router()

router.get(
  '/',
  asyncHandler((req, res) => {
    res.json({ habits: listHabits(queryString(req.query, 'archived') === '1') })
  }),
)

router.get(
  '/:id',
  asyncHandler((req, res) => {
    res.json(getHabit(parseIdParam(req.params.id)))
  }),
)

router.post(
  '/',
  asyncHandler((req, res) => {
    res.status(201).json(createHabit(parseBody(habitInputSchema, req.body)))
  }),
)

router.put(
  '/:id',
  asyncHandler((req, res) => {
    res.json(updateHabit(parseIdParam(req.params.id), parseBody(habitInputSchema, req.body)))
  }),
)

router.post(
  '/:id/archive',
  asyncHandler((req, res) => {
    res.json(setHabitArchived(parseIdParam(req.params.id), true))
  }),
)

router.post(
  '/:id/unarchive',
  asyncHandler((req, res) => {
    res.json(setHabitArchived(parseIdParam(req.params.id), false))
  }),
)

router.delete(
  '/:id',
  asyncHandler((req, res) => {
    deleteHabit(parseIdParam(req.params.id))
    res.status(204).end()
  }),
)

router.post(
  '/:id/checkins',
  asyncHandler((req, res) => {
    const body = parseBody(checkinInputSchema, req.body)
    res.status(201).json(checkIn(parseIdParam(req.params.id), body.date))
  }),
)

router.delete(
  '/:id/checkins/:date',
  asyncHandler((req, res) => {
    const date = Array.isArray(req.params.date) ? req.params.date[0] : req.params.date
    if (!date || !isIsoDate(date)) {
      throw new HttpError(400, 'Enter a real date (YYYY-MM-DD)')
    }
    res.json(clearCheckIn(parseIdParam(req.params.id), date))
  }),
)

export default router
