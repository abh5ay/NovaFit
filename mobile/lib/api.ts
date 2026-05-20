// mobile/lib/api.ts
// All backend API calls — single source of truth

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000'

// Wake up Render free tier on app launch
export async function wakeUpServer(): Promise<void> {
  try {
    await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(5000) })
  } catch { /* silent — server may already be awake */ }
}

async function post<T>(path: string, body: object): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body)
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || `API error ${res.status}`)
  return json as T
}

async function get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const qs  = new URLSearchParams(params).toString()
  const res = await fetch(`${BASE}/api${path}${qs ? '?' + qs : ''}`)
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || `API error ${res.status}`)
  return json as T
}

// ── Workout Plan ──────────────────────────────────────────────
export interface WorkoutPlan {
  plan: Array<{
    day: string; focus: string
    exercises: Array<{ name: string; sets: number; reps: string; rest_sec: number; notes?: string }>
  }>
  _provider?: string
}

export function generateWorkoutPlan(params: {
  gender: string; age: number; goal: string
  days: number; duration: number; targetPhysique: string
}) {
  return post<WorkoutPlan>('/workout', params)
}

// ── Meal Plan ─────────────────────────────────────────────────
export interface MealPlan {
  meals: Array<{
    type: string; name: string; calories: number
    protein: number; carbs: number; fat: number
    ingredients: string[]; prep_time_min?: number
  }>
  daily_totals?: { calories: number; protein: number; carbs: number; fat: number }
  _provider?: string
}

export function generateMealPlan(params: {
  calories: number; protein: number; carbs: number; fat: number
  restrictions?: string; gender: string
}) {
  return post<MealPlan>('/meal-plan', params)
}

// ── Food Scanner ──────────────────────────────────────────────
export interface FoodScanResult {
  food_name: string; serving_size: string
  calories: number; protein: number; carbs: number; fat: number
  confidence: 'high' | 'medium' | 'low'
  _provider?: string
}

export function scanFood(imageBase64: string) {
  return post<FoodScanResult>('/scan-food', { imageBase64 })
}

export function lookupNutrition(query: string) {
  return get<FoodScanResult>('/nutrition', { q: query })
}

// ── Body Fat Analysis ─────────────────────────────────────────
export interface BodyAnalysisResult {
  estimated_bf_pct: number; bf_range: string
  bf_category: string; body_type: string
  transformation_plan: {
    target_physique: string; current_bf: string; goal_bf: string; timeline_weeks: number
    weeks: Array<{ week: number; theme: string; focus: string; diet_tip: string; cardio: string; top_exercises: string[]; lifestyle_tip: string }>
  }
  disclaimer: string
  _vision_provider?: string
  _plan_provider?: string
}

export function analyzeBody(params: {
  imageBase64?: string; gender: string; weight_kg: number
  height_cm: number; age: number; targetPhysique: string
}) {
  return post<BodyAnalysisResult>('/analyze-body', params)
}

// ── AI Coach Chat ─────────────────────────────────────────────
export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatResponse {
  reply: string
  workoutUpdate?: any
  mealUpdate?: any
  scheduleUpdate?: any
  pantryUpdate?: string[]
  _provider?: string
}

export function chatWithCoach(params: {
  message: string
  profile?: any
  history?: ChatMessage[]
  currentWorkoutPlan?: any
  currentMealPlan?: any
  scheduleConfig?: any
}) {
  return post<ChatResponse>('/chat', params)
}

// ── Meal Intelligence ─────────────────────────────────────────
export interface AdjustMealsResult {
  adjusted_meals: any[]
  _provider?: string
}

export function adjustMeals(params: {
  logged: { food_name: string; calories: number; protein: number; carbs: number; fat: number }
  daily_targets: { calories: number; protein: number; carbs: number; fat: number }
  remaining_meals: any[]
}) {
  return post<AdjustMealsResult>('/adjust-meals', params)
}

export interface PantrySuggestion {
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  ingredients: string[]
  instructions: string[]
  prep_time_min: number
  tip?: string
  _provider?: string
}

export function suggestFromPantry(params: {
  pantry_items: string[]
  meal_type?: string
  target_calories?: number
  target_protein?: number
}) {
  return post<PantrySuggestion>('/suggest-from-pantry', params)
}
