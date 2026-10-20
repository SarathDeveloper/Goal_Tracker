import { Router } from 'express'
import { getDashboard } from '../dashboard/dashboardService'
import { asyncHandler } from '../lib/http'

const router = Router()

router.get(
  '/',
  asyncHandler((_req, res) => {
    res.json(getDashboard())
  }),
)

export default router
