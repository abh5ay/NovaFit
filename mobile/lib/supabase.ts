// mobile/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

const SUPABASE_URL  = process.env.EXPO_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    storage:          AsyncStorage,
    autoRefreshToken: true,
    persistSession:   true,
    detectSessionInUrl: false
  }
})

// ── Auth helpers ──────────────────────────────────────────────

export async function signUp(email: string, password: string, fullName: string) {
  return supabase.auth.signUp({
    email, password,
    options: { data: { full_name: fullName } }
  })
}

export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password })
}

export async function signOut() {
  return supabase.auth.signOut()
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

// ── Profile helpers ───────────────────────────────────────────

export async function saveProfile(profile: Record<string, any>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return supabase.from('profiles').upsert({ id: user.id, ...profile, updated_at: new Date().toISOString() })
}

export async function getProfile() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      // Fallback to locally cached profile
      const local = await AsyncStorage.getItem('local_profile')
      return local ? JSON.parse(local) : null
    }
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!data) {
      // Profile row not created yet — use local cache
      const local = await AsyncStorage.getItem('local_profile')
      return local ? JSON.parse(local) : null
    }
    return data
  } catch {
    const local = await AsyncStorage.getItem('local_profile')
    return local ? JSON.parse(local) : null
  }
}

// ── Food log helpers ──────────────────────────────────────────

export async function logFood(entry: {
  food_name: string; calories: number; protein: number;
  carbs: number; fat: number; meal_type?: string;
  confidence?: string; ai_provider?: string
}) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return supabase.from('food_logs').insert({ user_id: user.id, date: new Date().toISOString().split('T')[0], ...entry })
}

export async function getTodayFoodLogs() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const today = new Date().toISOString().split('T')[0]
  const { data } = await supabase.from('food_logs').select('*').eq('user_id', user.id).eq('date', today).order('created_at')
  return data || []
}

// ── Workout plan helpers ──────────────────────────────────────

export async function saveWorkoutPlan(planJson: any, daysPerWeek: number, targetPhysique: string, aiProvider: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return supabase.from('workout_plans').insert({ user_id: user.id, plan_json: planJson, days_per_week: daysPerWeek, target_physique: targetPhysique, ai_provider: aiProvider })
}

export async function getLatestWorkoutPlan() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('workout_plans').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).single()
  return data
}

// ── Meal plan helpers ─────────────────────────────────────────

export async function saveMealPlan(planJson: any, calories: number, aiProvider: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return supabase.from('meal_plans').insert({ user_id: user.id, plan_json: planJson, calories, ai_provider: aiProvider })
}

export async function getLatestMealPlan() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('meal_plans').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).single()
  return data
}

// ── Body scan helpers ─────────────────────────────────────────

export async function saveBodyScan(scan: { estimated_bf_pct: number; bf_range: string; body_type?: string; transformation_plan?: any; ai_provider?: string }) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return supabase.from('body_scans').insert({ user_id: user.id, ...scan })
}
