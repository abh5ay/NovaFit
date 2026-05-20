// backend/server.js
'use strict'
require('dotenv').config()

const express    = require('express')
const cors       = require('cors')
const rateLimit  = require('express-rate-limit')

const aiRoutes       = require('./routes/ai')
const foodRoutes     = require('./routes/food')
const bodyFatRoutes  = require('./routes/bodyfat')
const chatRoutes     = require('./routes/chat')
const mealsRoutes    = require('./routes/meals')
const { enforceCalorieSafety, validateBodyStats } = require('./middleware/safety')

const app  = express()
const PORT = process.env.PORT || 3000

// ── Middleware ────────────────────────────────────────────────
app.use(cors({ origin: '*' }))
app.use(express.json({ limit: '20mb' }))  // allow large base64 images
app.use(express.urlencoded({ extended: true, limit: '20mb' }))

// Rate limiting (per IP)
const limiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 30,
  message: { error: 'Too many requests, please slow down.' }
})
app.use('/api/', limiter)

// ── Health check (used to wake up Render free tier) ──────────
app.get('/health', (_, res) => res.json({ status: 'ok', ts: new Date().toISOString() }))
app.get('/', (_, res) => res.json({ app: 'novaFit API', version: '1.0.0' }))

// ── Routes ────────────────────────────────────────────────────
app.use('/api', enforceCalorieSafety, aiRoutes)
app.use('/api', foodRoutes)
app.use('/api', validateBodyStats, bodyFatRoutes)
app.use('/api', chatRoutes)
app.use('/api', mealsRoutes)

// ── Global error handler ──────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.message)
  res.status(500).json({ error: 'Internal server error', detail: err.message })
})

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║   novaFit Backend running on :${PORT}   ║
  ╚══════════════════════════════════════╝
  AI Providers configured:
    Groq:       ${process.env.GROQ_API_KEY       ? '✅' : '❌ (GROQ_API_KEY missing)'}
    NVIDIA NIM: ${process.env.NVIDIA_API_KEY     ? '✅' : '❌ (NVIDIA_API_KEY missing)'}
    OpenRouter: ${process.env.OPENROUTER_API_KEY ? '✅' : '❌ (OPENROUTER_API_KEY missing)'}
    HuggingFace:${process.env.HF_TOKEN           ? '✅' : '❌ (HF_TOKEN missing)'}
  `)
})

module.exports = app
