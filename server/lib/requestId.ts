import type { NextFunction, Request, Response } from 'express'
import crypto from 'node:crypto'

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const incoming = req.header('x-request-id')?.trim()
  const requestId = incoming && incoming.length > 0 ? incoming : crypto.randomUUID()

  res.setHeader('x-request-id', requestId)
  ;(req as Request & { requestId?: string }).requestId = requestId

  next()
}
