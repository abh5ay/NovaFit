// mobile/app/_layout.tsx
import { useEffect, useState } from 'react'
import { Stack, router, useSegments } from 'expo-router'
import { supabase } from '../lib/supabase'
import { wakeUpServer } from '../lib/api'
import { syncFromSupabase } from '../lib/useUserData'
import { scheduleTaskNotifications } from '../lib/notifications'
import { View, ActivityIndicator } from 'react-native'

export default function RootLayout() {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<any>(null)
  const segments = useSegments()

  useEffect(() => {
    wakeUpServer()

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      if (session) {
        // Pull all user data from Supabase on app launch (persistent login)
        await syncFromSupabase()
        // Schedule notifications based on their schedule
        scheduleTaskNotifications().catch(() => {})
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      if (session && _event === 'SIGNED_IN') {
        // New login — pull their data from Supabase
        await syncFromSupabase()
        scheduleTaskNotifications().catch(() => {})
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (loading) return

    const inAuthGroup = segments[0] === '(auth)'
    const inTabsGroup = segments[0] === '(tabs)'
    const inOnboarding = segments.includes('onboarding')

    if (!session && inTabsGroup) {
      router.replace('/(auth)/login')
    } else if (session && !inTabsGroup && !inOnboarding) {
      router.replace('/(tabs)/home')
    }
  }, [session, loading, segments])

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0A0F', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#6C63FF" size="large" />
      </View>
    )
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0A0A0F' } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  )
}
