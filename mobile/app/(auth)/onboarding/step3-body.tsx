// mobile/app/(auth)/onboarding/step3-body.tsx
import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'

export default function Step3Body() {
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [unit, setUnit]     = useState<'metric' | 'imperial'>('metric')

  const next = async () => {
    const h = Number(height), w = Number(weight)
    if (!h || !w || h < 100 || w < 20) return
    // Convert to metric if imperial
    const height_cm = unit === 'imperial' ? Math.round(h * 2.54) : h
    const weight_kg = unit === 'imperial' ? Math.round(w * 0.453592 * 10) / 10 : w
    await AsyncStorage.multiSet([
      ['onboarding_height', String(height_cm)],
      ['onboarding_weight', String(weight_kg)]
    ])
    router.push('/(auth)/onboarding/step4-activity')
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.inner}>
      <Text style={s.step}>Step 3 of 4</Text>
      <View style={s.progressBar}><View style={[s.progress, { width: '75%' }]} /></View>
      <Text style={s.title}>Your body stats</Text>
      <Text style={s.subtitle}>Used to calculate your calorie needs</Text>

      {/* Unit toggle */}
      <View style={s.toggle}>
        {(['metric', 'imperial'] as const).map(u => (
          <TouchableOpacity key={u} style={[s.toggleBtn, unit === u && s.toggleActive]} onPress={() => setUnit(u)}>
            <Text style={[s.toggleText, unit === u && { color: '#fff' }]}>
              {u === 'metric' ? 'Metric (cm/kg)' : 'Imperial (in/lb)'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.label}>Height ({unit === 'metric' ? 'cm' : 'inches'})</Text>
      <TextInput
        style={s.input} value={height} onChangeText={setHeight}
        placeholder={unit === 'metric' ? 'e.g. 175' : 'e.g. 69'} placeholderTextColor="#555"
        keyboardType="numeric"
      />

      <Text style={s.label}>Weight ({unit === 'metric' ? 'kg' : 'lbs'})</Text>
      <TextInput
        style={s.input} value={weight} onChangeText={setWeight}
        placeholder={unit === 'metric' ? 'e.g. 75' : 'e.g. 165'} placeholderTextColor="#555"
        keyboardType="numeric"
      />

      <TouchableOpacity
        style={[s.btn, (!height || !weight) && s.btnDisabled]}
        onPress={next} disabled={!height || !weight}
      >
        <Text style={s.btnText}>Continue →</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F' },
  inner:     { padding: 24, paddingTop: 60, gap: 14, flexGrow: 1 },
  step:      { color: '#6C63FF', fontSize: 13, fontWeight: '600' },
  progressBar: { height: 4, backgroundColor: '#1A1A2E', borderRadius: 2 },
  progress:  { height: 4, backgroundColor: '#6C63FF', borderRadius: 2 },
  title:     { color: '#fff', fontSize: 28, fontWeight: '800', marginTop: 16 },
  subtitle:  { color: '#888', fontSize: 16 },
  toggle:    { flexDirection: 'row', backgroundColor: '#1A1A2E', borderRadius: 12, padding: 4, gap: 4 },
  toggleBtn: { flex: 1, padding: 10, borderRadius: 10, alignItems: 'center' },
  toggleActive: { backgroundColor: '#6C63FF' },
  toggleText:   { color: '#888', fontWeight: '600', fontSize: 13 },
  label:     { color: '#ccc', fontSize: 14, fontWeight: '600' },
  input:     { backgroundColor: '#1A1A2E', color: '#fff', borderRadius: 14, padding: 16, fontSize: 18, borderWidth: 1, borderColor: '#2A2A3E' },
  btn:       { backgroundColor: '#6C63FF', borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 'auto' },
  btnDisabled: { opacity: 0.4 },
  btnText:   { color: '#fff', fontWeight: '700', fontSize: 16 }
})
