import dotenv from 'dotenv'
import path from 'node:path'
import express from 'express'
import type { NextFunction, Request, Response } from 'express'
import cors from 'cors'

import chatRoutes from './routes/chat.js'
import { requestIdMiddleware } from './lib/requestId.js'
import { HttpError } from './lib/httpError.js'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })
dotenv.config({ path: path.resolve(process.cwd(), '..', '.env') })

const app = express()

app.disable('x-powered-by')
app.use(requestIdMiddleware)
app.use(express.json({ limit: '1mb' }))

const corsOrigin = process.env.CORS_ORIGIN?.trim()
if (corsOrigin) {
  app.use(
    cors({
      origin: corsOrigin,
    }),
  )
}

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ ok: true })
})

app.use('/api', chatRoutes)

app.use((req: Request, _res: Response, next: NextFunction) => {
  next(new HttpError(404, `Not found: ${req.method} ${req.path}`))
})

app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const requestId = req.requestId

  if (err instanceof HttpError) {
    res.status(err.status).json({ requestId, error: err.message })
    return
  }

  const message = err instanceof Error ? err.message : 'Internal server error'
  res.status(500).json({ requestId, error: message })
})

const port = Number(process.env.PORT || 8787)
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${port}`)
})
