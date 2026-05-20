// backend/routes/ai.js
// Handles: POST /workout, POST /meal-plan

'use strict'
const express = require('express')
const router  = express.Router()
const { generateText, extractJSON } = require('./aiRouter')
const LIMITS  = require('../middleware/safety')

const TEXT_MODELS = {
  groqModel:       'llama-3.1-8b-instant',
  nvidiaModel:     'meta/llama-3.1-8b-instruct',
  openrouterModel: 'meta-llama/llama-3.1-8b-instruct:free',
  hfModel:         'mistralai/Mistral-7B-Instruct-v0.2'
}

// ─────────────────────────────────────────────
// POST /workout — AI-generated weekly workout plan
// ─────────────────────────────────────────────
router.post('/workout', async (req, res) => {
  try {
    const { gender, age, goal, days, duration, targetPhysique } = req.body

    // Enforce safety limits server-side
    const safeDays = Math.min(LIMITS.max_workout_days, Math.max(LIMITS.min_workout_days, Number(days) || 4))
    const safeDur  = Math.min(LIMITS.max_session_min,  Math.max(LIMITS.min_session_min,  Number(duration) || 45))

    const prompt = `You are an expert personal trainer. Create a ${safeDays}-day workout plan.
User profile: Goal="${goal}", Target physique="${targetPhysique || 'athletic'}", Age=${age}, Gender=${gender}, Session duration=${safeDur} minutes.
Include warm-up and cool-down in each day.
Return ONLY valid JSON with no markdown, no explanation:
{"plan":[{"day":"Monday","focus":"Push (Chest, Shoulders, Triceps)","exercises":[{"name":"Bench Press","sets":4,"reps":"8-10","rest_sec":90,"notes":"Keep back flat"}]}]}`

    const { text, provider } = await generateText(prompt, TEXT_MODELS)
    const json = extractJSON(text)
    res.json({ ...json, _provider: provider, safeDays, safeDur })
  } catch (err) {
    console.error('[/workout]', err.message)
    res.status(503).json({ error: 'Could not generate workout plan. All AI providers failed.', detail: err.message })
  }
})

// ─────────────────────────────────────────────
// POST /meal-plan — AI-generated daily meal plan
// ─────────────────────────────────────────────
router.post('/meal-plan', async (req, res) => {
  try {
    const { calories, protein, carbs, fat, restrictions, gender } = req.body

    // Enforce calorie floor
    const minCal = gender === 'male' ? LIMITS.min_calories_male : LIMITS.min_calories_female
    const safeCal = Math.max(minCal, Number(calories) || 2000)

    const prompt = `You are a registered dietitian. Create a realistic daily meal plan.
Targets: ${safeCal} kcal | Protein: ${protein}g | Carbs: ${carbs}g | Fat: ${fat}g
Dietary restrictions: ${restrictions || 'none'}
Include 3 main meals and 1-2 snacks. Use real, accessible foods.
Return ONLY valid JSON:
{"meals":[{"type":"breakfast","name":"Oats with berries","calories":380,"protein":15,"carbs":60,"fat":8,"ingredients":["1 cup rolled oats","1 cup mixed berries","1 tbsp honey"],"prep_time_min":5}],"daily_totals":{"calories":0,"protein":0,"carbs":0,"fat":0}}`

    const { text, provider } = await generateText(prompt, TEXT_MODELS)
    const json = extractJSON(text)
    res.json({ ...json, target_calories: safeCal, _provider: provider })
  } catch (err) {
    console.error('[/meal-plan]', err.message)
    res.status(503).json({ error: 'Could not generate meal plan. All AI providers failed.', detail: err.message })
  }
})

module.exports = router
