// mobile/lib/useUserData.ts
// Central hook — syncs all user data (plans, schedule, pantry, gamification) to Supabase
// On login: pulls from Supabase → saves to AsyncStorage
// On change: saves to both AsyncStorage AND Supabase

import { useEffect, useCallback } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase, getLocalDateString } from './supabase'

// ── Pull all user data from Supabase and store locally ──────────
export async function syncFromSupabase(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profile) return

    // Save base profile
    const localProfile = {
      id: profile.id, full_name: profile.full_name, age: profile.age,
      gender: profile.gender, height_cm: profile.height_cm, weight_kg: profile.weight_kg,
      goal: profile.goal, activity: profile.activity, body_fat_pct: profile.body_fat_pct,
      target_physique: profile.target_physique, dietary_restrictions: profile.dietary_restrictions,
    }
    await AsyncStorage.setItem('local_profile', JSON.stringify(localProfile))

    // Sync plans
    if (profile.meal_plan && Object.keys(profile.meal_plan).length > 0)
      await AsyncStorage.setItem('meal_plan', JSON.stringify(profile.meal_plan))

    if (profile.workout_plan && Object.keys(profile.workout_plan).length > 0)
      await AsyncStorage.setItem('workout_plan', JSON.stringify(profile.workout_plan))

    if (profile.schedule_config && Object.keys(profile.schedule_config).length > 0)
      await AsyncStorage.setItem('schedule_config', JSON.stringify(profile.schedule_config))

    if (profile.pantry_items && profile.pantry_items.length > 0)
      await AsyncStorage.setItem('user_pantry', JSON.stringify(profile.pantry_items))

    // Gamification
    await AsyncStorage.setItem('user_level',  String(profile.current_level  || 1))
    await AsyncStorage.setItem('user_streak', String(profile.streak_days    || 0))
    await AsyncStorage.setItem('physique_progress', String(profile.physique_progress || 0))

    console.log('[sync] ✅ Pulled data from Supabase for', profile.full_name)
  } catch (e) {
    console.warn('[sync] Supabase pull failed (offline?):', e)
  }
}

// ── Push a single field to Supabase ────────────────────────────
export async function pushToSupabase(fields: Record<string, any>): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').update(fields).eq('id', user.id)
  } catch (e) {
    console.warn('[sync] Supabase push failed:', e)
  }
}

// ── Save meal plan to both AsyncStorage + Supabase ─────────────
export async function saveMealPlan(plan: any): Promise<void> {
  await AsyncStorage.setItem('meal_plan', JSON.stringify(plan))
  await pushToSupabase({ meal_plan: plan })
}

// ── Save workout plan to both ───────────────────────────────────
export async function saveWorkoutPlan(plan: any): Promise<void> {
  await AsyncStorage.setItem('workout_plan', JSON.stringify(plan))
  await pushToSupabase({ workout_plan: plan })
}

// ── Save schedule config to both ───────────────────────────────
export async function saveScheduleConfig(config: any): Promise<void> {
  await AsyncStorage.setItem('schedule_config', JSON.stringify(config))
  await pushToSupabase({ schedule_config: config })
}

// ── Save pantry items ──────────────────────────────────────────
export async function savePantry(items: string[]): Promise<void> {
  await AsyncStorage.setItem('user_pantry', JSON.stringify(items))
  await pushToSupabase({ pantry_items: items })
}

// ── Record a day completion → update level + streak ─────────────
export async function recordDayComplete(tasksDone: number, tasksTotal: number): Promise<{level:number; streak:number}> {
  const today = getLocalDateString()
  const levelRaw  = await AsyncStorage.getItem('user_level')
  const streakRaw = await AsyncStorage.getItem('user_streak')
  const lastDateRaw = await AsyncStorage.getItem('last_level_date')

  let level  = parseInt(levelRaw  || '1')
  let streak = parseInt(streakRaw || '0')

  // Only level up once per day
  if (lastDateRaw !== today && tasksDone === tasksTotal && tasksTotal > 0) {
    level  += 1
    streak += 1
    await AsyncStorage.setItem('user_level',      String(level))
    await AsyncStorage.setItem('user_streak',     String(streak))
    await AsyncStorage.setItem('last_level_date', today)

    // Push to Supabase
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('profiles').update({
        current_level: level, streak_days: streak, last_active_date: today
      }).eq('id', user.id)

      // Record in checkins table
      await supabase.from('level_checkins').upsert({
        user_id: user.id, date: today, level, tasks_done: tasksDone, tasks_total: tasksTotal
      }, { onConflict: 'user_id,date' })
    }
  }

  return { level, streak }
}

// ── Calculate physique progress (0–1) ──────────────────────────
export function calcPhysiqueProgress(profile: any): number {
  if (!profile) return 0
  const startBF  = profile.physique_start_bf  || profile.body_fat_pct || 25
  const currentBF= profile.body_fat_pct || startBF
  const targetBF = profile.target_physique === 'lean' ? 12
    : profile.target_physique === 'athletic' ? 15
    : profile.target_physique === 'bulk' ? 20
    : 18

  // Progress based on body fat reduction (capped 0–1)
  if (startBF <= targetBF) return 1
  const progress = 1 - (currentBF - targetBF) / (startBF - targetBF)
  return Math.max(0, Math.min(1, progress))
}
