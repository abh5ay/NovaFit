// mobile/app/(auth)/onboarding/step1-goal.tsx
import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'

const GOALS = [
  { id: 'lose',     emoji: '🔥', title: 'Lose Fat',    desc: 'Burn fat, get lean' },
  { id: 'maintain', emoji: '⚖️', title: 'Maintain',    desc: 'Stay fit and healthy' },
  { id: 'gain',     emoji: '💪', title: 'Build Muscle', desc: 'Gain size and strength' }
]

export default function Step1Goal() {
  const [selected, setSelected] = useState<string>('')

  const next = async () => {
    if (!selected) return
    await AsyncStorage.setItem('onboarding_goal', selected)
    router.push('/(auth)/onboarding/step2-personal')
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.step}>Step 1 of 4</Text>
        <View style={s.progressBar}><View style={[s.progress, { width: '25%' }]} /></View>
        <Text style={s.title}>What's your main goal?</Text>
        <Text style={s.subtitle}>We'll build your plan around this</Text>
      </View>

      <View style={s.options}>
        {GOALS.map(g => (
          <TouchableOpacity
            key={g.id}
            style={[s.card, selected === g.id && s.cardSelected]}
            onPress={() => setSelected(g.id)}
          >
            <Text style={s.emoji}>{g.emoji}</Text>
            <View>
              <Text style={[s.cardTitle, selected === g.id && s.cardTitleSelected]}>{g.title}</Text>
              <Text style={s.cardDesc}>{g.desc}</Text>
            </View>
            {selected === g.id && <View style={s.checkDot} />}
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={[s.btn, !selected && s.btnDisabled]} onPress={next} disabled={!selected}>
        <Text style={s.btnText}>Continue →</Text>
      </TouchableOpacity>
    </View>
  )
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#0A0A0F', padding: 24, paddingTop: 60 },
  header:          { marginBottom: 36 },
  step:            { color: '#6C63FF', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  progressBar:     { height: 4, backgroundColor: '#1A1A2E', borderRadius: 2, marginBottom: 24 },
  progress:        { height: 4, backgroundColor: '#6C63FF', borderRadius: 2 },
  title:           { color: '#fff', fontSize: 28, fontWeight: '800', marginBottom: 8 },
  subtitle:        { color: '#888', fontSize: 16 },
  options:         { gap: 14, flex: 1 },
  card:            { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A2E', borderRadius: 18, padding: 20, gap: 16, borderWidth: 2, borderColor: '#2A2A3E' },
  cardSelected:    { borderColor: '#6C63FF', backgroundColor: '#1E1B3A' },
  emoji:           { fontSize: 32 },
  cardTitle:       { color: '#fff', fontSize: 18, fontWeight: '700' },
  cardTitleSelected: { color: '#6C63FF' },
  cardDesc:        { color: '#888', fontSize: 14, marginTop: 2 },
  checkDot:        { width: 12, height: 12, backgroundColor: '#6C63FF', borderRadius: 6, marginLeft: 'auto' },
  btn:             { backgroundColor: '#6C63FF', borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 16 },
  btnDisabled:     { opacity: 0.4 },
  btnText:         { color: '#fff', fontWeight: '700', fontSize: 16 }
})
