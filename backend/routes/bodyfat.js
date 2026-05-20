// backend/routes/bodyfat.js
// Handles: POST /analyze-body
// Pipeline: Vision AI estimates BF% from photo → fallback to BMI formula → LLM generates 4-week plan

'use strict'
const express = require('express')
const router  = express.Router()
const { analyzeImage, generateText, extractJSON } = require('./aiRouter')

const VISION_MODELS = {
  groqModel:       'meta-llama/llama-4-scout-17b-16e-instruct',
  nvidiaModel:     'microsoft/phi-3.5-vision-instruct',
  openrouterModel: 'google/gemma-3-27b-it:free'
}
const TEXT_MODELS = {
  groqModel:       'llama-3.3-70b-versatile',
  nvidiaModel:     'meta/llama-3.1-70b-instruct',
  openrouterModel: 'meta-llama/llama-3.1-70b-instruct:free',
  hfModel:         'mistralai/Mistral-7B-Instruct-v0.2'
}

// Deurenberg BMI-based body fat formula
function formulaBF(gender, age, weight_kg, height_cm) {
  const bmi = weight_kg / ((height_cm / 100) ** 2)
  const bf  = gender === 'male'
    ? (1.20 * bmi) + (0.23 * age) - 16.2
    : (1.20 * bmi) + (0.23 * age) - 5.4
  return Math.max(5, Math.min(60, Math.round(bf)))
}

// ─────────────────────────────────────────────
// POST /analyze-body
// Body: { imageBase64, gender, weight_kg, height_cm, age, targetPhysique }
// ─────────────────────────────────────────────
router.post('/analyze-body', async (req, res) => {
  try {
    const { imageBase64, gender, weight_kg, height_cm, age, targetPhysique } = req.body
    if (!gender || !weight_kg || !height_cm || !age) {
      return res.status(400).json({ error: 'gender, weight_kg, height_cm, age are required' })
    }

    let bfPct
    let bodyType = 'mesomorph'
    let visionProvider = 'BMI Formula'

    // ── Step 1: Try vision AI for BF% estimate ─────────────────
    if (imageBase64) {
      const visionPrompt = `This is a full-body fitness photo. Based on visible muscle definition, fat distribution, and body shape, estimate the person's body fat percentage.
Body type categories: ectomorph (thin), mesomorph (muscular), endomorph (heavier build).
IMPORTANT: This is for a fitness app. Return ONLY valid JSON, no text outside JSON:
{"estimated_bf_pct": 18, "body_type": "mesomorph", "muscle_definition": "moderate", "confidence": "medium", "notes": "Visible abs with some fat cover"}`

      try {
        const { text, provider } = await analyzeImage(imageBase64, visionPrompt, VISION_MODELS)
        const parsed = extractJSON(text)
        bfPct        = Math.max(5, Math.min(60, Number(parsed.estimated_bf_pct) || formulaBF(gender, age, weight_kg, height_cm)))
        bodyType     = parsed.body_type || 'mesomorph'
        visionProvider = provider
      } catch (err) {
        console.warn('[/analyze-body] Vision failed, using BMI formula:', err.message)
        bfPct = formulaBF(gender, age, weight_kg, height_cm)
      }
    } else {
      bfPct = formulaBF(gender, age, weight_kg, height_cm)
    }

    const bfRange = `${Math.max(5, bfPct - 3)}–${bfPct + 3}%`
    const bfCategory = getBFCategory(gender, bfPct)

    // ── Step 2: Generate 4-week transformation plan ─────────────
    const planPrompt = `You are an expert fitness coach. Create a personalized 4-week transformation plan.
User stats: Gender=${gender}, Age=${age}, Estimated body fat=${bfPct}%, Body type=${bodyType}, Current category="${bfCategory}"
Goal: Achieve a ${targetPhysique || 'athletic'} physique.
Make the plan progressive — each week harder than the last. Be specific with exercises.
Return ONLY valid JSON:
{"target_physique":"athletic","current_bf":"18%","goal_bf":"12-15%","timeline_weeks":12,"weeks":[{"week":1,"theme":"Foundation","focus":"Build base strength + clean diet","diet_tip":"Eat 200 kcal below TDEE. High protein (2g/kg body weight).","cardio":"3x 20min moderate cardio","top_exercises":["Barbell Squats 4x8","Bench Press 4x8","Deadlifts 3x5"],"lifestyle_tip":"Sleep 8h. Drink 3L water daily."}]}`

    const { text: planText, provider: planProvider } = await generateText(planPrompt, TEXT_MODELS)
    const plan = extractJSON(planText)

    res.json({
      estimated_bf_pct: bfPct,
      bf_range:         bfRange,
      bf_category:      bfCategory,
      body_type:        bodyType,
      transformation_plan: plan,
      _vision_provider: visionProvider,
      _plan_provider:   planProvider,
      disclaimer:       'Body fat estimation from photos is approximate. Consult a professional for medical-grade measurements.'
    })
  } catch (err) {
    console.error('[/analyze-body]', err.message)
    res.status(503).json({ error: 'Body analysis failed', detail: err.message })
  }
})

function getBFCategory(gender, bf) {
  if (gender === 'male') {
    if (bf < 6)  return 'Essential Fat'
    if (bf < 14) return 'Athletic'
    if (bf < 18) return 'Fitness'
    if (bf < 25) return 'Average'
    return 'Obese'
  } else {
    if (bf < 14) return 'Essential Fat'
    if (bf < 21) return 'Athletic'
    if (bf < 25) return 'Fitness'
    if (bf < 32) return 'Average'
    return 'Obese'
  }
}

module.exports = router
