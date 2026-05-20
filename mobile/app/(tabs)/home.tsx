// mobile/app/(tabs)/home.tsx
import { useState, useEffect, useCallback } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, RefreshControl } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { router } from 'expo-router'
import { getProfile, getTodayFoodLogs } from '../../lib/supabase'
import { calcProfile } from '../../lib/calc'
import Svg, { Circle } from 'react-native-svg'

function CalorieDonut({ consumed, target }: { consumed: number; target: number }) {
  const R = 54, stroke = 10, circ = 2 * Math.PI * R
  const pct = target > 0 ? Math.min(consumed / target, 1) : 0
  const strokeDash = circ * pct
  const color = pct < 0.75 ? '#7C5CFC' : pct < 0.95 ? '#F59E0B' : '#EF4444'
  return (
    <Svg width={130} height={130} style={{ transform: [{ rotate: '-90deg' }] }}>
      <Circle cx={65} cy={65} r={R} stroke="#1E1E2A" strokeWidth={stroke} fill="none" />
      <Circle cx={65} cy={65} r={R} stroke={color} strokeWidth={stroke} fill="none"
        strokeDasharray={`${strokeDash} ${circ}`}
        strokeLinecap="round" />
    </Svg>
  )
}

export default function HomeScreen() {
  const [profile, setProfile]     = useState<any>(null)
  const [targets, setTargets]     = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 })
  const [consumed, setConsumed]   = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 })
  const [refreshing, setRefreshing] = useState(false)
  const [greeting, setGreeting]   = useState('')
  const [level, setLevel]         = useState(1)
  const [streak, setStreak]       = useState(0)
  const [physiqueProgress, setPhysiqueProgress] = useState(0)

  const load = useCallback(async () => {
    const hour = new Date().getHours()
    setGreeting(hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening')

    const p = await getProfile()
    if (p) {
      setProfile(p)
      const c = calcProfile(p.gender, p.age, p.height_cm, p.weight_kg, p.activity, p.goal)
      setTargets({ calories: c.calories, protein: c.macros.protein, carbs: c.macros.carbs, fat: c.macros.fat })
    }

    try {
      const logs = await getTodayFoodLogs()
      if (logs?.length) {
        setConsumed(logs.reduce((acc: any, l: any) => ({
          calories: acc.calories + (l.calories || 0),
          protein:  acc.protein  + (l.protein  || 0),
          carbs:    acc.carbs    + (l.carbs     || 0),
          fat:      acc.fat      + (l.fat       || 0),
        }), { calories: 0, protein: 0, carbs: 0, fat: 0 }))
      } else {
        setConsumed({ calories: 0, protein: 0, carbs: 0, fat: 0 })
      }
    } catch {
      setConsumed({ calories: 0, protein: 0, carbs: 0, fat: 0 })
    }

    // Load gamification data
    try {
      const [lvl, stk, phys] = await Promise.all([
        AsyncStorage.getItem('user_level'),
        AsyncStorage.getItem('user_streak'),
        AsyncStorage.getItem('physique_progress'),
      ])
      setLevel(lvl ? parseInt(lvl) : (p?.current_level || 1))
      setStreak(stk ? parseInt(stk) : (p?.streak_days || 0))
      
      // Calculate progress dynamically or fallback
      if (p) {
        const { calcPhysiqueProgress } = await import('../../lib/useUserData')
        const calculated = calcPhysiqueProgress(p)
        setPhysiqueProgress(calculated > 0 ? calculated : (phys ? parseFloat(phys) : 0.35))
      } else {
        setPhysiqueProgress(phys ? parseFloat(phys) : 0.35)
      }
    } catch {}
  }, [])

  useEffect(() => { load() }, [load])

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false) }

  const macros = [
    { label: 'Protein', value: consumed.protein, target: targets.protein, color: '#7C5CFC' },
    { label: 'Carbs',   value: consumed.carbs,   target: targets.carbs,   color: '#F59E0B' },
    { label: 'Fat',     value: consumed.fat,      target: targets.fat,     color: '#EF4444' },
  ]

  return (
    <ScrollView style={s.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7C5CFC" />} showsVerticalScrollIndicator={false}>
      {/* Hero */}
      <View style={s.hero}>
        <Image source={require('../../assets/hero_home.png')} style={s.heroBg} />
        <View style={s.heroOverlay} />
        <View style={s.heroContent}>
          <Text style={s.greeting}>{greeting}</Text>
          <Text style={s.heroName}>{profile?.full_name?.split(' ')[0] || 'Athlete'}</Text>
          <Text style={s.heroSub}>Let's crush today's goals</Text>
        </View>
      </View>

      <View style={s.body}>
        {/* Calorie Card */}
        <View style={s.calorieCard}>
          <View style={s.calorieLeft}>
            <CalorieDonut consumed={consumed.calories} target={targets.calories} />
            <View style={s.donutLabel}>
              <Text style={s.donutNum}>{consumed.calories}</Text>
              <Text style={s.donutSub}>/ {targets.calories} kcal</Text>
            </View>
          </View>
          <View style={s.calorieRight}>
            <Text style={s.calorieTitle}>Today's Intake</Text>
            {macros.map(m => (
              <View key={m.label} style={s.macroRow}>
                <Text style={s.macroLabel}>{m.label}</Text>
                <View style={s.macroBarBg}>
                  <View style={[s.macroBarFill, { width: `${Math.min((m.value/(m.target||1))*100, 100)}%` as any, backgroundColor: m.color }]} />
                </View>
                <Text style={s.macroVal}>{Math.round(m.value)}g</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={s.sectionTitle}>Quick Actions</Text>
        <View style={s.actionsGrid}>
          <TouchableOpacity style={[s.actionCard, { backgroundColor: '#1A0A3E' }]} onPress={() => router.push('/(tabs)/workout')}>
            <Image source={require('../../assets/hero_workout.png')} style={s.actionBg} />
            <View style={[s.actionOverlay, { backgroundColor: 'rgba(10,5,30,0.6)' }]} />
            <Text style={s.actionLabel}>Workout Plan</Text>
            <Text style={s.actionSub}>View today's training</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actionCard, { backgroundColor: '#0A1E0A' }]} onPress={() => router.push('/(tabs)/diet')}>
            <Image source={require('../../assets/hero_nutrition.png')} style={s.actionBg} />
            <View style={[s.actionOverlay, { backgroundColor: 'rgba(5,20,5,0.6)' }]} />
            <Text style={s.actionLabel}>Meal Plan</Text>
            <Text style={s.actionSub}>Today's nutrition</Text>
          </TouchableOpacity>
        </View>

        {/* AI Coach Banner */}
        <TouchableOpacity style={s.coachBanner} onPress={() => router.push('/(tabs)/chat')}>
          <View style={s.coachLeft}>
            <View style={s.coachDot}>
              <Text style={{ fontSize: 16 }}>🤖</Text>
            </View>
            <View>
              <Text style={s.coachTitle}>AI Coach</Text>
              <Text style={s.coachSub}>Ask me to change your plans anytime</Text>
            </View>
          </View>
          <Text style={s.coachArrow}>→</Text>
        </TouchableOpacity>

        {/* Hardship Gamification & Physique Progress */}
        <Text style={s.sectionTitle}>Hardship Progression & Ideal Physique</Text>
        <View style={s.progressSection}>
          {/* Level Progress */}
          <View style={s.progressCard}>
            <View style={s.progressHeader}>
              <View>
                <Text style={s.progressTitle}>Hardship Level {level}</Text>
                <Text style={s.progressSubtitle}>Complete all daily tasks to advance a level</Text>
              </View>
              <View style={s.streakBadge}>
                <Text style={s.streakEmoji}>🔥</Text>
                <Text style={s.streakText}>{streak} Day Streak</Text>
              </View>
            </View>
            <View style={s.progBarBg}>
              <View style={[s.progBarFill, { width: '65%', backgroundColor: '#7C5CFC' }]} />
            </View>
            <View style={s.progFooter}>
              <Text style={s.progFooterText}>Level {level}</Text>
              <Text style={s.progFooterText}>65% XP (Next level tomorrow)</Text>
              <Text style={s.progFooterText}>Level {level + 1}</Text>
            </View>
          </View>

          {/* Ideal Physique Progress */}
          <View style={s.progressCard}>
            <View style={s.progressHeader}>
              <View>
                <Text style={s.progressTitle}>Ideal Physique Tracker</Text>
                <Text style={s.progressSubtitle}>Progress towards your target body fat & metrics</Text>
              </View>
              <View style={[s.physiqueBadge, { borderColor: '#10B981' }]}>
                <Text style={[s.physiqueBadgeText, { color: '#10B981' }]}>{Math.round(physiqueProgress * 100)}% Match</Text>
              </View>
            </View>
            <View style={s.progBarBg}>
              <View style={[s.progBarFill, { width: `${Math.round(physiqueProgress * 100)}%`, backgroundColor: '#10B981' }]} />
            </View>
            <View style={s.progFooter}>
              <Text style={s.progFooterText}>Current Physique</Text>
              <Text style={s.progFooterText}>Target: {profile?.target_physique?.toUpperCase() || 'LEAN'}</Text>
              <Text style={s.progFooterText}>Ideal Physique</Text>
            </View>
          </View>
        </View>

        {/* Notifications & Reminders Control */}
        <View style={s.notifCard}>
          <View style={s.notifHeader}>
            <Text style={s.notifTitle}>⏰ Daily Schedule Notifications</Text>
            <Text style={s.notifSubtitle}>Get reminded about water intake, meals, and workouts automatically</Text>
          </View>
          <TouchableOpacity style={s.testNotifBtn} onPress={async () => {
            const { sendTestNotification } = await import('../../lib/notifications')
            await sendTestNotification()
          }}>
            <Text style={s.testNotifText}>Send Test Reminder Now</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        {profile && (
          <View style={s.statsRow}>
            {[
              { label: 'Goal', value: profile.goal === 'lose' ? 'Fat Loss' : profile.goal === 'gain' ? 'Muscle Gain' : 'Maintain' },
              { label: 'Activity', value: profile.activity ? (profile.activity.charAt(0).toUpperCase() + profile.activity.slice(1)) : '-' },
              { label: 'Target', value: `${targets.calories} kcal` },
            ].map((st, i) => (
              <View key={i} style={s.statBox}>
                <Text style={s.statVal}>{st.value}</Text>
                <Text style={s.statLabel}>{st.label}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  )
}


const s = StyleSheet.create({
  scroll:         { flex: 1, backgroundColor: '#0A0A0F' },
  hero:           { height: 220, overflow: 'hidden', position: 'relative' },
  heroBg:         { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', resizeMode: 'cover' },
  heroOverlay:    { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,10,15,0.45)' },
  heroContent:    { position: 'absolute', bottom: 24, left: 20 },
  greeting:       { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '500' },
  heroName:       { color: '#fff', fontSize: 32, fontWeight: '800', letterSpacing: -1 },
  heroSub:        { color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 2 },
  body:           { padding: 16, gap: 16 },
  calorieCard:    { backgroundColor: '#111118', borderRadius: 20, padding: 20, flexDirection: 'row', gap: 20, borderWidth: 1, borderColor: '#1E1E2A' },
  calorieLeft:    { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  donutLabel:     { position: 'absolute', alignItems: 'center' },
  donutNum:       { color: '#fff', fontSize: 20, fontWeight: '800' },
  donutSub:       { color: '#555', fontSize: 9 },
  calorieRight:   { flex: 1, justifyContent: 'center', gap: 10 },
  calorieTitle:   { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 4 },
  macroRow:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  macroLabel:     { color: '#888', fontSize: 12, width: 44 },
  macroBarBg:     { flex: 1, height: 5, backgroundColor: '#1E1E2A', borderRadius: 3, overflow: 'hidden' },
  macroBarFill:   { height: 5, borderRadius: 3 },
  macroVal:       { color: '#ccc', fontSize: 11, width: 34, textAlign: 'right' },
  sectionTitle:   { color: '#fff', fontSize: 17, fontWeight: '700', marginTop: 4 },
  actionsGrid:    { flexDirection: 'row', gap: 12 },
  actionCard:     { flex: 1, height: 130, borderRadius: 16, overflow: 'hidden', justifyContent: 'flex-end', padding: 14 },
  actionBg:       { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', resizeMode: 'cover' },
  actionOverlay:  { ...StyleSheet.absoluteFillObject },
  actionLabel:    { color: '#fff', fontSize: 14, fontWeight: '700' },
  actionSub:      { color: 'rgba(255,255,255,0.6)', fontSize: 11 },
  coachBanner:    { backgroundColor: '#111118', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#7C5CFC33' },
  coachLeft:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  coachDot:       { width: 36, height: 36, borderRadius: 18, backgroundColor: '#7C5CFC22', borderWidth: 1, borderColor: '#7C5CFC', justifyContent: 'center', alignItems: 'center' },
  coachTitle:     { color: '#fff', fontSize: 14, fontWeight: '700' },
  coachSub:       { color: '#666', fontSize: 12 },
  coachArrow:     { color: '#7C5CFC', fontSize: 18, fontWeight: '700' },
  statsRow:       { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statBox:        { flex: 1, backgroundColor: '#111118', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#1E1E2A' },
  statVal:        { color: '#fff', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  statLabel:      { color: '#555', fontSize: 11, marginTop: 3 },
  progressSection:{ gap: 12 },
  progressCard:   { backgroundColor: '#111118', borderRadius: 18, padding: 16, borderOpacity: 0.8, borderWidth: 1, borderColor: '#1E1E2A' },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  progressTitle:  { color: '#fff', fontSize: 15, fontWeight: '800' },
  progressSubtitle:{ color: '#555', fontSize: 11, marginTop: 2 },
  streakBadge:    { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(245,158,11,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)' },
  streakEmoji:    { fontSize: 12 },
  streakText:     { color: '#F59E0B', fontSize: 11, fontWeight: '700' },
  physiqueBadge:  { borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: 'rgba(16,185,129,0.15)' },
  physiqueBadgeText:{ fontSize: 11, fontWeight: '700' },
  progBarBg:      { height: 8, backgroundColor: '#1E1E2A', borderRadius: 4, overflow: 'hidden' },
  progBarFill:    { height: '100%', borderRadius: 4 },
  progFooter:     { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  progFooterText: { color: '#444', fontSize: 10, fontWeight: '600' },
  notifCard:      { backgroundColor: '#111118', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#7C5CFC33', gap: 12 },
  notifHeader:    { gap: 2 },
  notifTitle:     { color: '#fff', fontSize: 15, fontWeight: '700' },
  notifSubtitle:  { color: '#666', fontSize: 11, lineHeight: 15 },
  testNotifBtn:   { backgroundColor: '#7C5CFC', borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  testNotifText:  { color: '#fff', fontSize: 13, fontWeight: '700' },
})
