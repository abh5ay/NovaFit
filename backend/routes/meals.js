// backend/routes/meals.js
// POST /adjust-meals   — rebalance remaining meals after a logged food
// POST /suggest-from-pantry — generate a meal from available ingredients
'use strict'
const express = require('express')
const router  = express.Router()
const { generateText, extractJSON } = require('./aiRouter')

const TEXT_MODELS = {
  groqModel:       'llama-3.1-8b-instant',
  nvidiaModel:     'meta/llama-3.1-8b-instruct',
  openrouterModel: 'meta-llama/llama-3.1-8b-instruct:free'
}

// ─────────────────────────────────────────────────────────
// POST /adjust-meals
// Body: { logged, daily_targets, remaining_meals }
//   logged: { food_name, calories, protein, carbs, fat }
//   daily_targets: { calories, protein, carbs, fat }
//   remaining_meals: array of meal objects not yet eaten
// ─────────────────────────────────────────────────────────
router.post('/adjust-meals', async (req, res) => {
  try {
    const { logged, daily_targets, remaining_meals } = req.body
    if (!logged || !daily_targets || !remaining_meals?.length) {
      return res.status(400).json({ error: 'logged, daily_targets, and remaining_meals are required' })
    }

    const remainingCal  = Math.max(0, (daily_targets.calories || 2000) - (logged.calories || 0))
    const remainingProt = Math.max(0, (daily_targets.protein  || 150)  - (logged.protein  || 0))
    const remainingCarb = Math.max(0, (daily_targets.carbs    || 200)  - (logged.carbs    || 0))
    const remainingFat  = Math.max(0, (daily_targets.fat      || 65)   - (logged.fat      || 0))

    const mealsList = remaining_meals.map(m => `- ${m.type}: ${m.name} (${m.calories} kcal)`).join('\n')

    const prompt = `You are a registered dietitian. A user just ate: "${logged.food_name}" (${logged.calories} kcal, P:${logged.protein}g, C:${logged.carbs}g, F:${logged.fat}g).

Their remaining daily budget is: ${remainingCal} kcal | Protein: ${remainingProt}g | Carbs: ${remainingCarb}g | Fat: ${remainingFat}g.

Their remaining planned meals are:
${mealsList}

Adjust ONLY these remaining meals to fit the remaining budget. Keep the same meal types (${remaining_meals.map(m=>m.type).join(', ')}).
Make smart, realistic substitutions. Keep meals healthy and satisfying.

Return ONLY valid JSON array (no markdown):
[{"type":"lunch","name":"Grilled Chicken Salad","calories":450,"protein":40,"carbs":30,"fat":15,"ingredients":["200g chicken breast","2 cups mixed greens","1 tbsp olive oil","lemon"],"prep_time_min":15}]`

    const { text, provider } = await generateText(prompt, TEXT_MODELS)
    const adjusted = JSON.parse(text.match(/\[[\s\S]*\]/)?.[0] || '[]')
    res.json({ adjusted_meals: adjusted, _provider: provider })
  } catch (err) {
    console.error('[/adjust-meals]', err.message)
    res.status(503).json({ error: 'Could not adjust meals', detail: err.message })
  }
})

// ─────────────────────────────────────────────────────────
// POST /suggest-from-pantry
// Body: { pantry_items, meal_type, target_calories, target_protein }
// ─────────────────────────────────────────────────────────
router.post('/suggest-from-pantry', async (req, res) => {
  try {
    const { pantry_items, meal_type = 'lunch', target_calories = 500, target_protein = 30 } = req.body
    if (!pantry_items?.length) {
      return res.status(400).json({ error: 'pantry_items array is required' })
    }

    const itemsList = Array.isArray(pantry_items) ? pantry_items.join(', ') : pantry_items

    const prompt = `You are a creative chef and nutritionist. The user only has these ingredients available: ${itemsList}.

Create ONE delicious ${meal_type} recipe using ONLY these ingredients (or a subset of them). 
Target: ~${target_calories} kcal, ~${target_protein}g protein.
Make it practical, tasty, and filling. Be creative!

Return ONLY valid JSON (no markdown):
{"name":"Spiced Egg Rice Bowl","calories":480,"protein":28,"carbs":45,"fat":18,"ingredients":["2 eggs","1 cup rice","soy sauce","garlic"],"instructions":["Cook rice","Scramble eggs with garlic","Combine and add soy sauce"],"prep_time_min":12,"tip":"Add chili flakes for extra kick"}`

    const { text, provider } = await generateText(prompt, TEXT_MODELS)
    const meal = extractJSON(text)
    res.json({ ...meal, _provider: provider })
  } catch (err) {
    console.error('[/suggest-from-pantry]', err.message)
    res.status(503).json({ error: 'Could not generate meal suggestion', detail: err.message })
  }
})

module.exports = router
