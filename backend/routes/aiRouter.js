// backend/routes/aiRouter.js
// ─────────────────────────────────────────────────────────────────
// The 4-Provider AI Fallback Engine
// Priority: Groq → NVIDIA NIM → OpenRouter → Hugging Face
// Each call has a 15s timeout. On failure, the next provider is tried.
// ─────────────────────────────────────────────────────────────────

'use strict'
require('dotenv').config()

const Groq    = require('groq-sdk')
const OpenAI  = require('openai')
const { HfInference } = require('@huggingface/inference')

// ── Initialise clients ──────────────────────────────────────────
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' })

const nvidia = new OpenAI({
  baseURL: 'https://integrate.api.nvidia.com/v1',
  apiKey: process.env.NVIDIA_API_KEY || ''
})

const openrouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY || '',
  defaultHeaders: {
    'HTTP-Referer': 'https://novafit.app',
    'X-Title': 'novaFit'
  }
})

const hf = new HfInference(process.env.HF_TOKEN || '')

// ── Helper: race a promise against a timeout ────────────────────
function withTimeout(promise, ms = 15000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    )
  ])
}

// ── Extract JSON from LLM output ───────────────────────────────
function extractJSON(text) {
  if (!text) throw new Error('Empty response from AI')
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No JSON found in AI response')
  return JSON.parse(match[0])
}

// ─────────────────────────────────────────────────────────────────
// TEXT GENERATION  (workout plans, meal plans, transformation plans)
// ─────────────────────────────────────────────────────────────────
async function generateText(prompt, models = {}) {
  const {
    groqModel       = 'llama-3.3-70b-versatile',
    nvidiaModel     = 'meta/llama-3.1-70b-instruct',
    openrouterModel = 'meta-llama/llama-3.1-70b-instruct:free',
    hfModel         = 'mistralai/Mistral-7B-Instruct-v0.2'
  } = models

  const providers = [
    {
      name: 'Groq',
      enabled: !!process.env.GROQ_API_KEY,
      fn: () =>
        withTimeout(
          groq.chat.completions.create({
            model: groqModel,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 1500,
            temperature: 0.7
          })
        ).then(r => r.choices[0].message.content)
    },
    {
      name: 'NVIDIA NIM',
      enabled: !!process.env.NVIDIA_API_KEY,
      fn: () =>
        withTimeout(
          nvidia.chat.completions.create({
            model: nvidiaModel,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 1500,
            temperature: 0.7
          })
        ).then(r => r.choices[0].message.content)
    },
    {
      name: 'OpenRouter',
      enabled: !!process.env.OPENROUTER_API_KEY,
      fn: () =>
        withTimeout(
          openrouter.chat.completions.create({
            model: openrouterModel,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 1500
          })
        ).then(r => r.choices[0].message.content)
    },
    {
      name: 'HuggingFace',
      enabled: !!process.env.HF_TOKEN,
      fn: () =>
        withTimeout(
          hf.textGeneration({
            model: hfModel,
            inputs: `<s>[INST] ${prompt} [/INST]`,
            parameters: { max_new_tokens: 1500, return_full_text: false }
          }),
          25000  // HF gets longer timeout due to cold starts
        ).then(r => r.generated_text)
    }
  ]

  let lastError
  for (const provider of providers) {
    if (!provider.enabled) {
      console.log(`[AI] Skipping ${provider.name} (no API key)`)
      continue
    }
    try {
      console.log(`[AI] Trying ${provider.name}...`)
      const text = await provider.fn()
      console.log(`[AI] ✅ ${provider.name} succeeded`)
      return { text, provider: provider.name }
    } catch (err) {
      lastError = err
      console.warn(`[AI] ❌ ${provider.name} failed: ${err.message}`)
    }
  }
  throw new Error(`All AI providers failed. Last error: ${lastError?.message}`)
}

// ─────────────────────────────────────────────────────────────────
// VISION ANALYSIS  (food scan, body fat estimation)
// ─────────────────────────────────────────────────────────────────
async function analyzeImage(imageBase64, textPrompt, models = {}) {
  const {
    groqModel       = 'meta-llama/llama-4-scout-17b-16e-instruct', // Groq Llama 4 Scout (vision)
    nvidiaModel     = 'nvidia/llama-3.2-90b-vision-instruct',      // NVIDIA vision
    openrouterModel = 'meta-llama/llama-4-scout:free'               // OpenRouter free vision
  } = models

  if (!imageBase64 || imageBase64.length < 500) {
    throw new Error('Invalid image data — too small or empty')
  }

  const imageContent = [
    {
      type: 'image_url',
      image_url: { url: `data:image/jpeg;base64,${imageBase64}`, detail: 'low' }
    },
    { type: 'text', text: textPrompt }
  ]

  const providers = [
    {
      name: 'Groq Vision',
      enabled: !!process.env.GROQ_API_KEY,
      fn: () =>
        withTimeout(
          groq.chat.completions.create({
            model: groqModel,
            messages: [{ role: 'user', content: imageContent }],
            max_tokens: 600,
            temperature: 0.1
          }),
          25000
        ).then(r => r.choices[0].message.content)
    },
    {
      name: 'NVIDIA Vision',
      enabled: !!process.env.NVIDIA_API_KEY,
      fn: () =>
        withTimeout(
          nvidia.chat.completions.create({
            model: nvidiaModel,
            messages: [{ role: 'user', content: imageContent }],
            max_tokens: 600,
            temperature: 0.1
          }),
          25000
        ).then(r => r.choices[0].message.content)
    },
    {
      name: 'OpenRouter Vision',
      enabled: !!process.env.OPENROUTER_API_KEY,
      fn: () =>
        withTimeout(
          openrouter.chat.completions.create({
            model: openrouterModel,
            messages: [{ role: 'user', content: imageContent }],
            max_tokens: 600
          }),
          25000
        ).then(r => r.choices[0].message.content)
    }
  ]

  let lastError
  for (const provider of providers) {
    if (!provider.enabled) {
      console.log(`[Vision] Skipping ${provider.name} (no API key)`)
      continue
    }
    try {
      console.log(`[Vision] Trying ${provider.name}...`)
      const text = await provider.fn()
      console.log(`[Vision] ✅ ${provider.name} succeeded`)
      return { text, provider: provider.name }
    } catch (err) {
      lastError = err
      console.warn(`[Vision] ❌ ${provider.name} failed: ${err.status || ''} ${err.message}`)
    }
  }
  throw new Error(`All vision providers failed. Last error: ${lastError?.message}`)
}

module.exports = { generateText, analyzeImage, extractJSON, hf }
