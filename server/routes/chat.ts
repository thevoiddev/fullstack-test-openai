import { Router } from 'express'
import type { NextFunction, Request, Response } from 'express'
import { z } from 'zod'
import { createOpenAIClient } from '../lib/openai.js'
import { HttpError } from '../lib/httpError.js'

const router = Router()

const ChatRequestSchema = z.object({
  message: z.string().trim().min(1, 'Message is required').max(4000, 'Message is too long'),
})

router.post('/chat', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = ChatRequestSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid request')
    }

    const client = createOpenAIClient()

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: parsed.data.message },
      ],
      temperature: 0.2,
    })

    const text = completion.choices[0]?.message?.content ?? ''

    res.json({
      requestId: req.requestId,
      answer: text,
    })
  } catch (err) {
    next(err)
  }
})

export default router
