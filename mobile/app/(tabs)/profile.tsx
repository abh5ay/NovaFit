// mobile/app/(tabs)/profile.tsx
import { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { getProfile, signOut } from '../../lib/supabase'
import { calcProfile } from '../../lib/calc'
import { router } from 'expo-router'

export default function ProfileScreen() {
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => { getProfile().then(setProfile) }, [])

  const stats = profile
    ? calcProfile(profile.gender, profile.age, profile.height_cm, profile.weight_kg, profile.activity, profile.goal)
    : null

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => { await signOut(); router.replace('/(auth)/login') } }
    ])
  }

  const bmi = stats?.bmi || 0
  const bmiCategory = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Healthy' : bmi < 30 ? 'Overweight' : 'Obese'
  const bmiColor    = bmi < 18.5 ? '#FFD93D' : bmi < 25 ? '#6BCB77' : bmi < 30 ? '#FF9A3C' : '#FF6B6B'

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      {/* Avatar */}
      <View style={s.avatarSection}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{(profile?.full_name || 'A')[0].toUpperCase()}</Text>
        </View>
        <Text style={s.name}>{profile?.full_name || 'Athlete'}</Text>
        <Text style={s.goal}>Goal: <Text style={s.goalAccent}>{profile?.goal?.toUpperCase() || '—'}</Text></Text>
      </View>

      {/* Stats Grid */}
      {stats && (
        <View style={s.statsGrid}>
          <StatBox label="Height" value={`${profile?.height_cm} cm`} emoji="📏" />
          <StatBox label="Weight" value={`${profile?.weight_kg} kg`}  emoji="⚖️" />
          <StatBox label="BMI"    value={`${stats.bmi}`}               emoji="📊" color={bmiColor} sub={bmiCategory} />
          <StatBox label="TDEE"   value={`${stats.tdee}`}              emoji="🔥" sub="kcal/day" />
          <StatBox label="Target" value={`${stats.calories}`}          emoji="🎯" sub="kcal/day" />
          <StatBox label="Protein" value={`${stats.macros.protein}g`}  emoji="🥩" sub="per day" />
        </View>
      )}

      {/* Body Fat History */}
      <TouchableOpacity style={s.bfBtn} onPress={() => router.push('/(tabs)/camera')}>
        <Text style={s.bfBtnEmoji}>📸</Text>
        <View>
          <Text style={s.bfBtnTitle}>Body Scan</Text>
          <Text style={s.bfBtnDesc}>Estimate your body fat % from a photo</Text>
        </View>
        <Text style={s.arrow}>›</Text>
      </TouchableOpacity>

      {/* Profile Info */}
      <View style={s.infoCard}>
        <InfoRow label="Age"       value={`${profile?.age || '—'} years`} />
        <InfoRow label="Gender"    value={profile?.gender || '—'} />
        <InfoRow label="Activity"  value={profile?.activity || '—'} />
        <InfoRow label="Physique"  value={profile?.target_physique || '—'} />
        <InfoRow label="BMR"       value={`${stats?.bmr || '—'} kcal`} />
      </View>

      {/* Sign Out */}
      <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut}>
        <Text style={s.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

function StatBox({ label, value, emoji, color, sub }: any) {
  return (
    <View style={sb.box}>
      <Text style={sb.emoji}>{emoji}</Text>
      <Text style={[sb.value, color && { color }]}>{value}</Text>
      {sub && <Text style={sb.sub}>{sub}</Text>}
      <Text style={sb.label}>{label}</Text>
    </View>
  )
}
const sb = StyleSheet.create({
  box:   { width: '30%', backgroundColor: '#1A1A2E', borderRadius: 16, padding: 14, alignItems: 'center', gap: 2 },
  emoji: { fontSize: 22 },
  value: { color: '#fff', fontWeight: '800', fontSize: 17 },
  sub:   { color: '#888', fontSize: 11 },
  label: { color: '#666', fontSize: 11, fontWeight: '600', marginTop: 2 }
})

function InfoRow({ label, value }: any) {
  return (
    <View style={ir.row}>
      <Text style={ir.label}>{label}</Text>
      <Text style={ir.value}>{value}</Text>
    </View>
  )
}
const ir = StyleSheet.create({
  row:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1A1A2E' },
  label: { color: '#888', fontSize: 15 },
  value: { color: '#fff', fontSize: 15, fontWeight: '600', textTransform: 'capitalize' }
})

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0A0A0F' },
  content:      { padding: 20, paddingTop: 56, paddingBottom: 40, gap: 16 },
  avatarSection:{ alignItems: 'center', gap: 8, paddingBottom: 8 },
  avatar:       { width: 80, height: 80, borderRadius: 40, backgroundColor: '#6C63FF', justifyContent: 'center', alignItems: 'center' },
  avatarText:   { color: '#fff', fontSize: 32, fontWeight: '800' },
  name:         { color: '#fff', fontSize: 24, fontWeight: '800' },
  goal:         { color: '#888', fontSize: 14 },
  goalAccent:   { color: '#6C63FF', fontWeight: '700' },
  statsGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' },
  bfBtn:        { backgroundColor: '#1A1A2E', borderRadius: 18, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: '#6C63FF' },
  bfBtnEmoji:   { fontSize: 28 },
  bfBtnTitle:   { color: '#fff', fontWeight: '700', fontSize: 16 },
  bfBtnDesc:    { color: '#888', fontSize: 13 },
  arrow:        { color: '#6C63FF', fontSize: 22, marginLeft: 'auto' },
  infoCard:     { backgroundColor: '#1A1A2E', borderRadius: 18, padding: 20 },
  signOutBtn:   { backgroundColor: '#1A1A2E', borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#FF6B6B' },
  signOutText:  { color: '#FF6B6B', fontWeight: '700', fontSize: 15 }
})
