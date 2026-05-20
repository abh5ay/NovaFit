// mobile/app/(auth)/onboarding/step2-personal.tsx
import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'

const GENDERS = [
  { id: 'male',   emoji: '♂️', label: 'Male' },
  { id: 'female', emoji: '♀️', label: 'Female' }
]
const AGE_RANGES = ['13-17','18-24','25-34','35-44','45-54','55-64','65+']
// Map ranges to midpoint ages
const AGE_MID: Record<string, number> = { '13-17':15,'18-24':21,'25-34':29,'35-44':39,'45-54':49,'55-64':59,'65+':68 }

export default function Step2Personal() {
  const [gender, setGender]   = useState('')
  const [ageRange, setAgeRange] = useState('')

  const next = async () => {
    if (!gender || !ageRange) return
    await AsyncStorage.multiSet([
      ['onboarding_gender', gender],
      ['onboarding_age',    String(AGE_MID[ageRange])]
    ])
    router.push('/(auth)/onboarding/step3-body')
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.step}>Step 2 of 4</Text>
        <View style={s.progressBar}><View style={[s.progress, { width: '50%' }]} /></View>
        <Text style={s.title}>Tell us about yourself</Text>
        <Text style={s.subtitle}>Used to calculate your metabolism</Text>
      </View>

      <Text style={s.sectionTitle}>Gender</Text>
      <View style={s.row}>
        {GENDERS.map(g => (
          <TouchableOpacity
            key={g.id} style={[s.genderBtn, gender === g.id && s.selectedBtn]}
            onPress={() => setGender(g.id)}
          >
            <Text style={s.genderEmoji}>{g.emoji}</Text>
            <Text style={[s.genderLabel, gender === g.id && { color: '#6C63FF' }]}>{g.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[s.sectionTitle, { marginTop: 28 }]}>Age Range</Text>
      <View style={s.ageGrid}>
        {AGE_RANGES.map(a => (
          <TouchableOpacity
            key={a} style={[s.ageChip, ageRange === a && s.selectedChip]}
            onPress={() => setAgeRange(a)}
          >
            <Text style={[s.ageText, ageRange === a && { color: '#fff' }]}>{a}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={[s.btn, (!gender || !ageRange) && s.btnDisabled]} onPress={next} disabled={!gender || !ageRange}>
        <Text style={s.btnText}>Continue →</Text>
      </TouchableOpacity>
    </View>
  )
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0A0A0F', padding: 24, paddingTop: 60 },
  header:       { marginBottom: 32 },
  step:         { color: '#6C63FF', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  progressBar:  { height: 4, backgroundColor: '#1A1A2E', borderRadius: 2, marginBottom: 24 },
  progress:     { height: 4, backgroundColor: '#6C63FF', borderRadius: 2 },
  title:        { color: '#fff', fontSize: 28, fontWeight: '800', marginBottom: 8 },
  subtitle:     { color: '#888', fontSize: 16 },
  sectionTitle: { color: '#ccc', fontSize: 16, fontWeight: '600', marginBottom: 12 },
  row:          { flexDirection: 'row', gap: 12 },
  genderBtn:    { flex: 1, backgroundColor: '#1A1A2E', borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 2, borderColor: '#2A2A3E' },
  selectedBtn:  { borderColor: '#6C63FF', backgroundColor: '#1E1B3A' },
  genderEmoji:  { fontSize: 28, marginBottom: 6 },
  genderLabel:  { color: '#ccc', fontWeight: '600', fontSize: 16 },
  ageGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  ageChip:      { backgroundColor: '#1A1A2E', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16, borderWidth: 2, borderColor: '#2A2A3E' },
  selectedChip: { backgroundColor: '#6C63FF', borderColor: '#6C63FF' },
  ageText:      { color: '#888', fontWeight: '600' },
  btn:          { backgroundColor: '#6C63FF', borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 'auto' },
  btnDisabled:  { opacity: 0.4 },
  btnText:      { color: '#fff', fontWeight: '700', fontSize: 16 }
})
