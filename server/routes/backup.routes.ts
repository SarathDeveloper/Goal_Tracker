import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { backupPathSchema, restorePathSchema } from '@shared/schemas'
import { Router } from 'express'
import express from 'express'
import { backupDatabaseTo, backupStatus, restoreDatabaseFrom } from '../backup/backupService'
import { exportCsv, exportJson } from '../backup/exportService'
import { asyncHandler, HttpError, parseBody, queryString } from '../lib/http'

const router = Router()

router.get(
  '/status',
  asyncHandler((_req, res) => {
    res.json(backupStatus())
  }),
)

router.post(
  '/export',
  asyncHandler(async (req, res) => {
    const body = parseBody(backupPathSchema, req.body)
    const path = await backupDatabaseTo(body.destinationPath)
    res.json({ path })
  }),
)

router.get(
  '/download',
  asyncHandler(async (_req, res, next) => {
    const dir = join(tmpdir(), 'goal-tracker-downloads')
    mkdirSync(dir, { recursive: true })
    const file = join(dir, `goaltracker-${Date.now()}.db`)
    await backupDatabaseTo(file)
    res.download(file, 'goaltracker-backup.db', (error) => {
      rmSync(file, { force: true })
      if (error) {
        next(error)
      }
    })
  }),
)

router.post(
  '/restore',
  express.raw({ type: 'application/octet-stream', limit: '200mb' }),
  asyncHandler(async (req, res) => {
    if (Buffer.isBuffer(req.body)) {
      if (req.body.length === 0) {
        throw new HttpError(400, 'The backup file is empty')
      }
      const file = join(tmpdir(), `goaltracker-restore-${Date.now()}.db`)
      writeFileSync(file, req.body)
      try {
        await restoreDatabaseFrom(file)
      } finally {
        rmSync(file, { force: true })
      }
      res.json({ ok: true })
      return
    }
    const body = parseBody(restorePathSchema, req.body)
    await restoreDatabaseFrom(body.sourcePath)
    res.json({ ok: true })
  }),
)

router.get(
  '/export.json',
  asyncHandler((_req, res) => {
    res.setHeader('Content-Disposition', 'attachment; filename="goal-tracker.json"')
    res.json(exportJson())
  }),
)

router.get(
  '/export.csv',
  asyncHandler((req, res) => {
    const kind = queryString(req.query, 'kind')
    if (kind !== 'goals' && kind !== 'progress' && kind !== 'habits') {
      throw new HttpError(400, 'Choose goals, progress, or habits')
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="goal-tracker-${kind}.csv"`)
    res.send(exportCsv(kind))
  }),
)

export default router
