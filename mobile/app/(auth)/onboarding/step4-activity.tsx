// mobile/app/(auth)/onboarding/step4-activity.tsx
import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { saveProfile } from '../../../lib/supabase'
import { calcProfile } from '../../../lib/calc'

const LEVELS = [
  { id: 'sedentary', emoji: '🛋️', title: 'Sedentary',   desc: 'Little or no exercise' },
  { id: 'light',     emoji: '🚶', title: 'Light',        desc: '1-3 days/week exercise' },
  { id: 'moderate',  emoji: '🏃', title: 'Moderate',     desc: '3-5 days/week exercise' },
  { id: 'active',    emoji: '⚡', title: 'Very Active',  desc: '6-7 days/week hard training' }
]

const PHYSIQUES = [
  { id: 'lean',     emoji: '🏊', label: 'Lean' },
  { id: 'athletic', emoji: '🏋️', label: 'Athletic' },
  { id: 'bulk',     emoji: '🦍', label: 'Bulk' }
]

export default function Step4Activity() {
  const [activity, setActivity]   = useState('')
  const [physique, setPhysique]   = useState('athletic')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  const finish = async () => {
    if (!activity) return
    setLoading(true)
    setError('')
    try {
      const vals = await AsyncStorage.multiGet([
        'onboarding_goal', 'onboarding_gender', 'onboarding_age',
        'onboarding_height', 'onboarding_weight'
      ])
      const [goal, gender, age, height, weight] = vals.map(v => v[1] || '')

      // Always store locally so app works offline too
      await AsyncStorage.setItem('local_profile', JSON.stringify({
        goal, gender, age: Number(age),
        height_cm: Number(height), weight_kg: Number(weight),
        activity, target_physique: physique
      }))

      // Try to save to Supabase — but don't block navigation if it fails
      try {
        await saveProfile({
          goal, gender, age: Number(age),
          height_cm: Number(height), weight_kg: Number(weight),
          activity, target_physique: physique
        })
      } catch (supaErr: any) {
        console.warn('Supabase profile save failed (will sync later):', supaErr.message)
      }

      // Clear onboarding cache & go to home
      await AsyncStorage.multiRemove(['onboarding_goal','onboarding_gender','onboarding_age','onboarding_height','onboarding_weight'])
      router.replace('/(tabs)/home')
    } catch (e: any) {
      setError(e.message)
      console.error('Step4 error:', e)
    }
    setLoading(false)
  }

  return (
    <View style={s.container}>
      <Text style={s.step}>Step 4 of 4</Text>
      <View style={s.progressBar}><View style={[s.progress, { width: '100%' }]} /></View>
      <Text style={s.title}>Activity level</Text>
      <Text style={s.subtitle}>How active are you currently?</Text>

      <View style={s.options}>
        {LEVELS.map(l => (
          <TouchableOpacity key={l.id} style={[s.card, activity === l.id && s.cardSelected]} onPress={() => setActivity(l.id)}>
            <Text style={s.emoji}>{l.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.cardTitle, activity === l.id && { color: '#6C63FF' }]}>{l.title}</Text>
              <Text style={s.cardDesc}>{l.desc}</Text>
            </View>
            {activity === l.id && <View style={s.dot} />}
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[s.subtitle, { marginBottom: 12, marginTop: 20 }]}>Dream physique goal</Text>
      <View style={s.physiqueRow}>
        {PHYSIQUES.map(p => (
          <TouchableOpacity key={p.id} style={[s.physiqueBtn, physique === p.id && s.physiqueSelected]} onPress={() => setPhysique(p.id)}>
            <Text style={s.physiqueEmoji}>{p.emoji}</Text>
            <Text style={[s.physiqueLabel, physique === p.id && { color: '#fff' }]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={[s.btn, !activity && s.btnDisabled]} onPress={finish} disabled={!activity || loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>🚀 Start My Journey</Text>}
      </TouchableOpacity>
      {error ? <Text style={s.error}>{error}</Text> : null}
    </View>
  )
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#0A0A0F', padding: 24, paddingTop: 60 },
  step:            { color: '#6C63FF', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  progressBar:     { height: 4, backgroundColor: '#1A1A2E', borderRadius: 2, marginBottom: 20 },
  progress:        { height: 4, backgroundColor: '#6C63FF', borderRadius: 2 },
  title:           { color: '#fff', fontSize: 28, fontWeight: '800', marginBottom: 4 },
  subtitle:        { color: '#888', fontSize: 15 },
  options:         { gap: 10, marginTop: 20 },
  card:            { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A2E', borderRadius: 16, padding: 16, gap: 14, borderWidth: 2, borderColor: '#2A2A3E' },
  cardSelected:    { borderColor: '#6C63FF', backgroundColor: '#1E1B3A' },
  emoji:           { fontSize: 26 },
  cardTitle:       { color: '#fff', fontSize: 16, fontWeight: '700' },
  cardDesc:        { color: '#888', fontSize: 13 },
  dot:             { width: 10, height: 10, backgroundColor: '#6C63FF', borderRadius: 5 },
  physiqueRow:     { flexDirection: 'row', gap: 10 },
  physiqueBtn:     { flex: 1, backgroundColor: '#1A1A2E', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 2, borderColor: '#2A2A3E' },
  physiqueSelected:{ backgroundColor: '#6C63FF', borderColor: '#6C63FF' },
  physiqueEmoji:   { fontSize: 24 },
  physiqueLabel:   { color: '#888', fontWeight: '600', marginTop: 4 },
  btn:             { backgroundColor: '#6C63FF', borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 20 },
  btnDisabled:     { opacity: 0.4 },
  error:           { color: '#FF6B6B', textAlign: 'center', marginTop: 12, fontSize: 13 },
  btnText:         { color: '#fff', fontWeight: '700', fontSize: 16 }
})
