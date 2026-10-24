import { existsSync } from 'node:fs'
import { join, sep } from 'node:path'
import cors from 'cors'
import express from 'express'
import { getDbPath } from './db'
import { getToday } from './lib/clock'
import { errorMiddleware } from './lib/http'
import { getAppRoot } from './lib/appPaths'
import backupRoutes from './routes/backup.routes'
import categoriesRoutes from './routes/categories.routes'
import dashboardRoutes from './routes/dashboard.routes'
import diaryRoutes from './routes/diary.routes'
import goalsRoutes from './routes/goals.routes'
import habitsRoutes from './routes/habits.routes'
import milestonesRoutes from './routes/milestones.routes'
import progressRoutes from './routes/progress.routes'
import remindersRoutes from './routes/reminders.routes'

export function createApp(): express.Express {
  const app = express()
  app.use(cors({ origin: true }))
  app.use(express.json({ limit: '1mb' }))

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, today: getToday(), dbPath: getDbPath() })
  })
  app.use('/api/categories', categoriesRoutes)
  app.use('/api/goals', goalsRoutes)
  app.use('/api/milestones', milestonesRoutes)
  app.use('/api/progress', progressRoutes)
  app.use('/api/dashboard', dashboardRoutes)
  app.use('/api/diary', diaryRoutes)
  app.use('/api/habits', habitsRoutes)
  app.use('/api/backup', backupRoutes)
  app.use('/api/reminders', remindersRoutes)

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not found' })
  })

  const distDir = join(getAppRoot(), 'dist')
  if (existsSync(distDir)) {
    app.use(
      express.static(distDir, {
        setHeaders: (res, filePath) => {
          if (filePath.includes(`${sep}assets${sep}`)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
          } else {
            res.setHeader('Cache-Control', 'no-cache')
          }
        },
      }),
    )
    app.use((req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api')) {
        next()
        return
      }
      res.sendFile(join(distDir, 'index.html'))
    })
  }

  app.use(errorMiddleware)
  return app
}
