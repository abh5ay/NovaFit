// mobile/lib/notifications.ts
// Schedule push notifications for daily tasks
// Works on web via browser Notification API + setTimeouts
// Works on native via expo-notifications

import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'

// ── Request permission ──────────────────────────────────────────
export async function requestNotificationPermission(force: boolean = false): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (!('Notification' in window)) return false
    if (Notification.permission === 'granted') return true
    if (!force) return false // Do NOT auto-prompt on launch (avoids user gesture security exception in Safari iOS)
    try {
      const perm = await Notification.requestPermission()
      return perm === 'granted'
    } catch { return false }
  }
  // Native
  try {
    const { default: Notifications } = await import('expo-notifications')
    const { status } = await Notifications.requestPermissionsAsync()
    return status === 'granted'
  } catch { return false }
}

// ── Send an immediate notification (web) ───────────────────────
function webNotify(title: string, body: string) {
  if (Platform.OS === 'web' && 'Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.ico', badge: '/favicon.ico' })
  }
}

// ── Schedule a notification at a specific wall-clock time ───────
// timeStr: "9:30 AM"
function scheduleAt(timeStr: string, title: string, body: string): NodeJS.Timeout | null {
  if (Platform.OS !== 'web') return null  // native handles its own scheduling

  const now   = new Date()
  const parts = timeStr.split(' ')
  const period = parts[1]
  const [h, m] = (parts[0] || '12:00').split(':').map(Number)
  let hour = h
  if (period === 'PM' && hour !== 12) hour += 12
  if (period === 'AM' && hour === 12) hour = 0

  const target = new Date(now)
  target.setHours(hour, m || 0, 0, 0)

  // If time already passed today, schedule for tomorrow
  if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1)

  const delay = target.getTime() - now.getTime()
  return setTimeout(() => webNotify(title, body), delay) as any
}

// ── Active notification timers (clear on reschedule) ───────────
let activeTimers: (NodeJS.Timeout | null)[] = []

// ── Main: schedule all daily task notifications ─────────────────
export async function scheduleTaskNotifications(): Promise<void> {
  // Clear previous timers
  activeTimers.forEach(t => t && clearTimeout(t))
  activeTimers = []

  const granted = await requestNotificationPermission()
  if (!granted) {
    console.log('[notif] Permission not granted')
    return
  }

  const [sc, mp, wp] = await Promise.all([
    AsyncStorage.getItem('schedule_config'),
    AsyncStorage.getItem('meal_plan'),
    AsyncStorage.getItem('workout_plan'),
  ])

  const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
  const today = DAYS[new Date().getDay()]

  const times = sc ? JSON.parse(sc) : {
    breakfast_time: '7:30 AM', lunch_time: '12:30 PM', snack_time: '4:00 PM',
    dinner_time: '7:30 PM', workout_time: '6:00 PM', water_morning_time: '6:30 AM',
  }

  const mealPlan    = mp ? JSON.parse(mp) : null
  const workoutPlan = wp ? JSON.parse(wp) : null

  // Morning hydration
  activeTimers.push(scheduleAt(times.water_morning_time, '💧 Morning Hydration', 'Drink 500ml of water to start strong!'))

  // Breakfast
  const breakfast = mealPlan?.meals?.find((m:any) => m.type === 'breakfast')
  activeTimers.push(scheduleAt(times.breakfast_time, '🍳 Breakfast Time!',
    breakfast ? `${breakfast.name} — ${breakfast.calories} kcal` : 'Time for a healthy breakfast!'))

  // Lunch
  const lunch = mealPlan?.meals?.find((m:any) => m.type === 'lunch')
  activeTimers.push(scheduleAt(times.lunch_time, '🥗 Lunch Time!',
    lunch ? `${lunch.name} — ${lunch.calories} kcal` : 'Refuel with a balanced lunch!'))

  // Snack
  activeTimers.push(scheduleAt(times.snack_time, '🥜 Snack Time', 'Keep your energy up with a healthy snack!'))

  // Workout
  const todayWorkout = workoutPlan?.plan?.find((d:any) => d.day?.toLowerCase() === today.toLowerCase())
  activeTimers.push(scheduleAt(times.workout_time, '💪 Workout Time!',
    todayWorkout ? `${todayWorkout.focus} — ${todayWorkout.exercises?.length || 0} exercises ready!` : 'Time to move your body!'))

  // Dinner
  const dinner = mealPlan?.meals?.find((m:any) => m.type === 'dinner')
  activeTimers.push(scheduleAt(times.dinner_time, '🍽️ Dinner Time!',
    dinner ? `${dinner.name} — ${dinner.calories} kcal` : 'End the day with a nutritious dinner!'))

  console.log(`[notif] ✅ Scheduled ${activeTimers.filter(Boolean).length} notifications for today`)
}

// ── One-off: send test notification ────────────────────────────
export async function sendTestNotification(): Promise<void> {
  const granted = await requestNotificationPermission(true)
  if (granted) webNotify('🏋️ NovaFit', "Notifications are working! You'll be reminded about your daily tasks.")
}
