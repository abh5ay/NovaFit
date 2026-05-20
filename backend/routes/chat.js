// backend/routes/chat.js
// AI Coach — context-aware chat that can modify workout/meal plans AND daily schedule

'use strict'
const express = require('express')
const router  = express.Router()
const { generateText, extractJSON } = require('./aiRouter')

const TEXT_MODELS = {
  groqModel:       'llama-3.1-8b-instant',
  nvidiaModel:     'meta/llama-3.1-8b-instruct',
  openrouterModel: 'meta-llama/llama-3.1-8b-instruct:free',
  hfModel:         'mistralai/Mistral-7B-Instruct-v0.2'
}

// ─────────────────────────────────────────────
// POST /chat
// Body: { message, profile, history, currentWorkoutPlan, currentMealPlan, scheduleConfig }
// ─────────────────────────────────────────────
router.post('/chat', async (req, res) => {
  try {
    const { message, profile, history = [], currentWorkoutPlan, currentMealPlan, scheduleConfig } = req.body
    if (!message) return res.status(400).json({ error: 'message is required' })

    // Build conversation context
    const profileCtx = profile ? `
USER PROFILE:
- Goal: ${profile.goal} weight
- Gender: ${profile.gender}, Age: ${profile.age}
- Height: ${profile.height_cm}cm, Weight: ${profile.weight_kg}kg
- Activity Level: ${profile.activity}
- Target Physique: ${profile.target_physique || 'athletic'}
- Dietary restrictions: ${profile.dietary_restrictions || 'none'}
` : ''

    const planCtx = currentWorkoutPlan ? `\nCURRENT WORKOUT PLAN: The user has a ${currentWorkoutPlan.safeDays || 4}-day per week workout plan.` : ''
    const mealCtx = currentMealPlan ? `\nCURRENT MEAL PLAN: ${currentMealPlan.meals?.length || 0} meals targeting ${currentMealPlan.target_calories || 2000} kcal/day.` : ''
    const schedCtx = scheduleConfig ? `\nCURRENT SCHEDULE: User wakes at ${scheduleConfig.wake_time || '7:00 AM'}, sleeps at ${scheduleConfig.sleep_time || '10:30 PM'}. Breakfast at ${scheduleConfig.breakfast_time || '7:30 AM'}, lunch at ${scheduleConfig.lunch_time || '12:30 PM'}, dinner at ${scheduleConfig.dinner_time || '7:30 PM'}, workout at ${scheduleConfig.workout_time || '6:00 PM'}.` : ''

    // Format conversation history
    const historyText = history.slice(-8).map(m =>
      `${m.role === 'user' ? 'User' : 'NovaFit AI'}: ${m.content}`
    ).join('\n')

    const systemPrompt = `You are NovaFit AI, an elite personal trainer and registered dietitian inside the NovaFit fitness app.
${profileCtx}${planCtx}${mealCtx}${schedCtx}

CRITICAL RULE — READ THIS CAREFULLY:
When the user asks to CHANGE, MODIFY, UPDATE, REDUCE, INCREASE, or ADJUST their workout plan, meal plan, OR daily schedule/timings in ANY WAY, you MUST:
1. Write 1-2 short sentences acknowledging the change
2. IMMEDIATELY generate the FULL updated plan/schedule as JSON inside the correct tags

DO NOT just talk about what you "will do". ALWAYS produce the actual JSON.

WORKOUT PLAN UPDATE — when any workout change is requested:
<plan_update>
{
  "plan": [
    {
      "day": "Monday",
      "focus": "Full Body",
      "warm_up": "5 min light cardio",
      "exercises": [
        {"name": "Squat", "sets": 4, "reps": "8-10", "rest_sec": 90, "notes": "Keep back straight"},
        {"name": "Push-up", "sets": 3, "reps": "12-15", "rest_sec": 60, "notes": "Full range"}
      ],
      "cool_down": "5 min stretching"
    }
  ]
}
</plan_update>

MEAL PLAN UPDATE — when any diet/food change is requested:
<meal_update>
{
  "meals": [
    {"type": "breakfast", "name": "Meal Name", "calories": 400, "protein": 30, "carbs": 40, "fat": 12, "ingredients": ["item1", "item2"], "prep_time_min": 10}
  ],
  "daily_totals": {"calories": 2000, "protein": 150, "carbs": 200, "fat": 65}
}
</meal_update>

SCHEDULE UPDATE — when user mentions wake up time, sleep time, meal timing, workout timing, daily routine:
<schedule_update>
{
  "wake_time": "9:00 AM",
  "sleep_time": "11:00 PM",
  "breakfast_time": "9:30 AM",
  "lunch_time": "1:30 PM",
  "snack_time": "5:00 PM",
  "dinner_time": "8:30 PM",
  "workout_time": "7:00 PM",
  "water_morning_time": "9:00 AM",
  "water_evening_time": "10:00 PM"
}
</schedule_update>

EXAMPLES THAT REQUIRE JSON UPDATES:
- "I wake up at 9am" → generate <schedule_update> with all times shifted accordingly
- "change to X days workout" → generate <plan_update> with exactly X days
- "I'm vegetarian" → generate <meal_update> with no meat
- "add more protein" → generate <meal_update> with adjusted macros
- "I sleep at midnight" → generate <schedule_update> with shifted times
- "workout in the morning" → generate <schedule_update> with workout_time set to morning

For PURE questions (no changes), answer conversationally in 1-3 sentences.
Be motivating, specific, and never say "I'll update it" without ACTUALLY producing the JSON.`

    const fullPrompt = historyText
      ? `${systemPrompt}\n\nCONVERSATION SO FAR:\n${historyText}\n\nUser: ${message}\n\nNovaFit AI:`
      : `${systemPrompt}\n\nUser: ${message}\n\nNovaFit AI:`

    const { text, provider } = await generateText(fullPrompt, TEXT_MODELS)

    // Parse embedded updates
    let reply = text
    let workoutUpdate  = null
    let mealUpdate     = null
    let scheduleUpdate = null

    const planMatch = text.match(/<plan_update>([\s\S]*?)<\/plan_update>/)
    if (planMatch) {
      try {
        workoutUpdate = JSON.parse(planMatch[1].trim())
        reply = text.replace(/<plan_update>[\s\S]*?<\/plan_update>/, '').trim()
      } catch { /* keep reply as-is */ }
    }

    const mealMatch = text.match(/<meal_update>([\s\S]*?)<\/meal_update>/)
    if (mealMatch) {
      try {
        mealUpdate = JSON.parse(mealMatch[1].trim())
        reply = reply.replace(/<meal_update>[\s\S]*?<\/meal_update>/, '').trim()
      } catch { /* keep reply as-is */ }
    }

    const schedMatch = text.match(/<schedule_update>([\s\S]*?)<\/schedule_update>/)
    if (schedMatch) {
      try {
        scheduleUpdate = JSON.parse(schedMatch[1].trim())
        reply = reply.replace(/<schedule_update>[\s\S]*?<\/schedule_update>/, '').trim()
      } catch { /* keep reply as-is */ }
    }

    let pantryUpdate = null
    const pantryMatch = text.match(/<pantry_update>([\s\S]*?)<\/pantry_update>/)
    if (pantryMatch) {
      try {
        pantryUpdate = JSON.parse(pantryMatch[1].trim())
        reply = reply.replace(/<pantry_update>[\s\S]*?<\/pantry_update>/, '').trim()
      } catch { /* keep reply as-is */ }
    }

    res.json({ reply, workoutUpdate, mealUpdate, scheduleUpdate, pantryUpdate, _provider: provider })
  } catch (err) {
    console.error('[/chat]', err.message)
    res.status(503).json({ error: 'AI Coach unavailable. Please try again.', detail: err.message })
  }
})

module.exports = router
