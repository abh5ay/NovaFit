// backend/routes/food.js
// Handles: POST /scan-food
// Pipeline: Groq Vision → NVIDIA Vision → OpenRouter Vision → HF Classifier + USDA

'use strict'
const express = require('express')
const router  = express.Router()
const axios   = require('axios')
const { analyzeImage, extractJSON, hf } = require('./aiRouter')

const VISION_MODELS = {
  groqModel:       'meta-llama/llama-4-scout-17b-16e-instruct', // Groq Llama 4 Scout
  nvidiaModel:     'nvidia/llama-3.2-90b-vision-instruct',      // NVIDIA vision
  openrouterModel: 'meta-llama/llama-4-scout:free'              // OpenRouter free vision
}

// ─────────────────────────────────────────────
// USDA FoodData Central lookup
// ─────────────────────────────────────────────
async function lookupUSDA(foodName) {
  try {
    const res = await axios.get('https://api.nal.usda.gov/fdc/v1/foods/search', {
      params: { query: foodName, api_key: process.env.USDA_KEY || 'DEMO_KEY', pageSize: 1 },
      timeout: 8000
    })
    const food = res.data.foods?.[0]
    if (!food) return null
    const n = (id) => food.foodNutrients?.find(x => x.nutrientId === id)?.value || 0
    return {
      food_name:    food.description,
      serving_size: '100g',
      calories:     Math.round(n(1008)),
      protein:      Math.round(n(1003) * 10) / 10,
      carbs:        Math.round(n(1005) * 10) / 10,
      fat:          Math.round(n(1004) * 10) / 10
    }
  } catch { return null }
}

// ─────────────────────────────────────────────
// Open Food Facts lookup (free, no key)
// ─────────────────────────────────────────────
async function lookupOpenFoodFacts(foodName) {
  try {
    const res = await axios.get(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(foodName)}&json=1&page_size=1`,
      { timeout: 8000 }
    )
    const p = res.data.products?.[0]?.nutriments
    if (!p) return null
    return {
      calories: Math.round(p['energy-kcal_100g'] || 0),
      protein:  Math.round((p['proteins_100g']       || 0) * 10) / 10,
      carbs:    Math.round((p['carbohydrates_100g']   || 0) * 10) / 10,
      fat:      Math.round((p['fat_100g']             || 0) * 10) / 10
    }
  } catch { return null }
}

// ─────────────────────────────────────────────
// Text-AI nutrition estimation from food description
// Much more accurate than USDA for complex dishes
// ─────────────────────────────────────────────
async function estimateNutritionByText(foodDescription) {
  const { generateText, extractJSON: extractJ } = require('./aiRouter')
  const prompt = `You are a professional nutritionist and food scientist. A user has a dish: "${foodDescription}".

Carefully estimate the realistic nutritional values for a TYPICAL single serving of this exact dish.
Consider all visible components (proteins, vegetables, grains, sauces, oils).
Be specific and accurate — do NOT default to oats or generic foods.

Return ONLY valid JSON (no markdown, no explanation):
{"food_name":"Grilled Chicken Salad Bowl","serving_size":"1 bowl (~400g)","calories":520,"protein":38,"carbs":32,"fat":22,"confidence":"medium"}`

  try {
    const { text } = await generateText(prompt, {
      groqModel:       'llama-3.3-70b-versatile',
      nvidiaModel:     'meta/llama-3.1-70b-instruct',
      openrouterModel: 'meta-llama/llama-3.1-70b-instruct:free'
    })
    return extractJ(text)
  } catch { return null }
}

// ─────────────────────────────────────────────
// POST /scan-food
// 4-layer pipeline: Vision → HF → Text AI → USDA
// ─────────────────────────────────────────────
router.post('/scan-food', async (req, res) => {
  try {
    const { imageBase64 } = req.body
    if (!imageBase64) return res.status(400).json({ error: 'imageBase64 is required' })
    if (imageBase64.length < 500) {
      return res.status(400).json({ error: 'Image too small or corrupted. Please try again.' })
    }

    // ── Vision prompt: no example food name to avoid AI copying it ────
    const visionPrompt = `You are a professional food nutritionist analyzing a meal photo.

Look carefully at ALL visible ingredients in this image. Identify:
1. Every protein source (meat, fish, eggs, tofu, legumes)
2. Every vegetable and grain
3. Approximate portion sizes
4. Cooking method if visible

Then estimate total nutritional values for the ENTIRE dish as served.

Return ONLY this JSON structure with no markdown or explanation:
{"food_name":"[specific dish name based on what you see]","serving_size":"[realistic serving, e.g. 1 bowl 400g]","calories":[number],"protein":[number in g],"carbs":[number in g],"fat":[number in g],"confidence":"[high/medium/low]","ingredients_detected":"[comma-separated list of what you see]"}`

    let foodData = null
    let usedProvider = ''

    // ── Step 1: Vision AI (Groq → NVIDIA → OpenRouter) ───────
    try {
      const { text, provider } = await analyzeImage(imageBase64, visionPrompt, VISION_MODELS)
      console.log(`[/scan-food] Vision raw: ${text?.substring(0, 150)}`)
      const parsed = extractJSON(text)

      // Validate: reject if AI hallucinated a default name or no calories
      const suspicious = ['oats', 'example', 'pizza margherita', 'banana', 'food name']
      const nameLC = (parsed.food_name || '').toLowerCase()
      const isSuspicious = suspicious.some(s => nameLC.startsWith(s) || nameLC === s)

      if (!isSuspicious && parsed.calories > 0) {
        foodData = parsed
        usedProvider = provider
        console.log(`[/scan-food] Vision identified: ${parsed.food_name} (${parsed.calories} kcal)`)
      } else {
        console.warn(`[/scan-food] Vision gave suspicious result "${parsed.food_name}", falling through`)
        // Use ingredients_detected if available for text estimation
        if (parsed.ingredients_detected) {
          const textEst = await estimateNutritionByText(parsed.ingredients_detected)
          if (textEst) { foodData = textEst; usedProvider = `${provider} + Text AI` }
        }
      }
    } catch (visionErr) {
      console.warn('[/scan-food] All vision providers failed:', visionErr.message)
    }

    // ── Step 2: HuggingFace food-101 classifier ───────────────
    if (!foodData) {
      let hfFoodName = null
      let hfConfidence = 'low'
      try {
        const hfResult = await hf.imageClassification({
          model: 'nateraw/food',
          data: Buffer.from(imageBase64, 'base64')
        })
        const top = hfResult?.[0]
        if (top && top.score > 0.25) {
          hfFoodName   = top.label.replace(/_/g, ' ')
          hfConfidence = top.score > 0.7 ? 'medium' : 'low' // downgrade HF confidence
          console.log(`[/scan-food] HF classified: ${hfFoodName} (score: ${top.score.toFixed(2)})`)
        }
      } catch (hfErr) {
        console.warn('[/scan-food] HF classifier failed:', hfErr.message)
      }

      if (hfFoodName) {
        // Step 3: Use Text AI to estimate (much more accurate than USDA for complex dishes)
        console.log(`[/scan-food] Using text AI to estimate nutrition for: ${hfFoodName}`)
        const textEst = await estimateNutritionByText(hfFoodName)
        if (textEst && textEst.calories > 0) {
          foodData = { ...textEst, confidence: hfConfidence }
          usedProvider = 'HF + Text AI'
        } else {
          // Step 4: USDA as last resort for single known ingredients
          const usdaData = await lookupUSDA(hfFoodName)
          const offData  = await lookupOpenFoodFacts(hfFoodName)
          const dbData   = usdaData || offData
          if (dbData && dbData.calories > 0) {
            foodData = {
              food_name:    usdaData?.food_name || hfFoodName,
              serving_size: '100g',
              calories:     dbData.calories,
              protein:      dbData.protein,
              carbs:        dbData.carbs,
              fat:          dbData.fat,
              confidence:   hfConfidence
            }
            usedProvider = usdaData ? 'HF + USDA' : 'HF + OpenFoodFacts'
          }
        }
      }
    }

    // ── Step 5: Pure text AI fallback (image too unclear) ─────
    if (!foodData || foodData.calories === 0) {
      console.warn('[/scan-food] All image methods failed, using generic text AI estimate')
      const generic = await estimateNutritionByText('mixed healthy meal bowl with protein and vegetables')
      foodData = generic || {
        food_name:    'Mixed Meal',
        serving_size: '1 serving',
        calories:     400, protein: 25, carbs: 35, fat: 15,
        confidence:   'low'
      }
      usedProvider = 'Text AI Estimate'
    }

    // ── Enrich ONLY if calories are 0 and we have a good name ─
    if (foodData.calories === 0 && foodData.food_name !== 'Unknown food') {
      const usdaData = await lookupUSDA(foodData.food_name)
      if (usdaData?.calories > 0) {
        foodData = { ...foodData, ...usdaData, food_name: usdaData.food_name }
        usedProvider += ' + USDA'
      }
    }

    res.json({ ...foodData, _provider: usedProvider })
  } catch (err) {
    console.error('[/scan-food]', err.message)
    res.status(503).json({ error: 'Food scan failed. Please try a clearer image.', detail: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /nutrition?q=food_name — text-based lookup
// ─────────────────────────────────────────────
router.get('/nutrition', async (req, res) => {
  try {
    const { q } = req.query
    if (!q) return res.status(400).json({ error: 'Query param q is required' })

    const [usda, off] = await Promise.all([lookupUSDA(q), lookupOpenFoodFacts(q)])
    const result = usda || (off ? { food_name: q, serving_size: '100g', ...off } : null)

    if (!result) return res.status(404).json({ error: 'Food not found in any database' })
    res.json({ ...result, _sources: usda ? 'USDA' : 'OpenFoodFacts' })
  } catch (err) {
    res.status(503).json({ error: 'Nutrition lookup failed', detail: err.message })
  }
})

module.exports = router

// ─────────────────────────────────────────────
// POST /scan-food
// ─────────────────────────────────────────────
router.post('/scan-food', async (req, res) => {
  try {
    const { imageBase64 } = req.body
    if (!imageBase64) return res.status(400).json({ error: 'imageBase64 is required' })

    if (imageBase64.length < 500) {
      return res.status(400).json({ error: 'Image data is too small or corrupted. Please try again.' })
    }

    const visionPrompt = `Identify the food in this image and estimate nutritional content per typical serving.
Return ONLY valid JSON with no explanation:
{"food_name":"Oats with banana","serving_size":"1 bowl (300g)","calories":350,"protein":12,"carbs":65,"fat":6,"confidence":"high"}`

    let foodData
    let usedProvider

    // ── Step 1: Try vision providers ──────────────────────────
    try {
      const { text, provider } = await analyzeImage(imageBase64, visionPrompt, VISION_MODELS)
      foodData = extractJSON(text)
      usedProvider = provider
      console.log(`[/scan-food] Vision succeeded: ${provider}`)
    } catch (visionErr) {
      console.warn('[/scan-food] All vision providers failed, trying HF classifier...')

      // ── Step 2: HF Food-101 image classifier ──────────────
      let foodName = 'Unknown food'
      let confidence = 'low'
      try {
        const hfResult = await hf.imageClassification({
          model: 'nateraw/food',
          data: Buffer.from(imageBase64, 'base64')
        })
        const top = hfResult[0]
        if (top) {
          foodName   = top.label.replace(/_/g, ' ')
          confidence = top.score > 0.7 ? 'high' : top.score > 0.4 ? 'medium' : 'low'
        }
        usedProvider = 'HF Classifier'
        console.log(`[/scan-food] HF identified: ${foodName} (${confidence})`)
      } catch (hfErr) {
        console.warn('[/scan-food] HF classifier also failed:', hfErr.message)
        usedProvider = 'Text AI Estimate'
      }

      // ── Step 3: Try USDA/OpenFoodFacts with classified name ─
      const usdaData = await lookupUSDA(foodName)
      const offData  = await lookupOpenFoodFacts(foodName)
      const dbData   = usdaData || offData

      if (dbData && dbData.calories > 0) {
        foodData = {
          food_name: usdaData?.food_name || foodName,
          serving_size: '100g',
          calories: dbData.calories,
          protein: dbData.protein,
          carbs: dbData.carbs,
          fat: dbData.fat,
          confidence
        }
        usedProvider = usdaData ? 'HF + USDA' : 'HF + OpenFoodFacts'
      } else {
        // ── Step 4: Text AI nutrition estimate (last resort) ──
        console.warn('[/scan-food] DB lookup failed, using text AI estimate')
        const textEstimate = await estimateNutritionByText(foodName)
        foodData = textEstimate || {
          food_name: foodName,
          serving_size: '1 serving',
          calories: 0, protein: 0, carbs: 0, fat: 0,
          confidence: 'low'
        }
        usedProvider = 'Text AI Estimate'
      }
    }

    // ── Enrich: if vision returned 0 calories, augment from DB ─
    if (!foodData.calories || foodData.calories === 0) {
      const usdaData = await lookupUSDA(foodData.food_name)
      const offData  = await lookupOpenFoodFacts(foodData.food_name)
      const source   = usdaData || offData
      if (source) {
        foodData = { ...foodData, ...source, food_name: usdaData?.food_name || foodData.food_name, confidence: foodData.confidence || 'medium' }
        usedProvider += ' + USDA'
      }
    }

    res.json({ ...foodData, _provider: usedProvider })
  } catch (err) {
    console.error('[/scan-food]', err.message)
    res.status(503).json({ error: 'Food scan failed. Please try uploading a clearer image.', detail: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /nutrition?q=food_name — text-based lookup
// ─────────────────────────────────────────────
router.get('/nutrition', async (req, res) => {
  try {
    const { q } = req.query
    if (!q) return res.status(400).json({ error: 'Query param q is required' })

    const [usda, off] = await Promise.all([lookupUSDA(q), lookupOpenFoodFacts(q)])
    const result = usda || (off ? { food_name: q, serving_size: '100g', ...off } : null)

    if (!result) return res.status(404).json({ error: 'Food not found in any database' })
    res.json({ ...result, _sources: usda ? 'USDA' : 'OpenFoodFacts' })
  } catch (err) {
    res.status(503).json({ error: 'Nutrition lookup failed', detail: err.message })
  }
})

module.exports = router
