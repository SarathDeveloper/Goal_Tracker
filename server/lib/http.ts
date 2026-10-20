import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { ZodError, type ZodType } from 'zod'
import { fieldErrors } from '@shared/schemas'

export class HttpError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'HttpError'
    this.status = status
  }
}

export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => unknown | Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next)
  }
}

export function parseBody<T>(schema: ZodType<T>, raw: unknown): T {
  return schema.parse(raw ?? {})
}

export function parseIdParam(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value
  const id = Number.parseInt(raw ?? '', 10)
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, 'Invalid id')
  }
  return id
}

export function queryString(query: Request['query'], key: string): string {
  const value = query[key]
  if (typeof value === 'string') {
    return value.trim()
  }
  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0].trim()
  }
  return ''
}

export function errorMiddleware(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (res.headersSent) {
    return
  }
  if (error instanceof ZodError) {
    const message = error.issues[0]?.message ?? 'Invalid input'
    res.status(400).json({ error: message, fields: fieldErrors(error) })
    return
  }
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message })
    return
  }
  console.error(error)
  res.status(500).json({ error: 'Something went wrong' })
}

export function sqliteCode(error: unknown): string | null {
  if (typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string') {
    return error.code
  }
  return null
}

export function isUniqueConstraint(error: unknown): boolean {
  const code = sqliteCode(error)
  if (code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return true
  }
  return code === 'SQLITE_CONSTRAINT' && error instanceof Error && /unique/i.test(error.message)
}
