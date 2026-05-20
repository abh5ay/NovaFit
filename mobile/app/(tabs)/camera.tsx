// mobile/app/(tabs)/camera.tsx
// Dual-mode camera: Food Scan + Body Scan

import { useState, useRef } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  ScrollView, Alert, ActivityIndicator, Image
} from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as ImagePicker from 'expo-image-picker'
import { scanFood, analyzeBody } from '../../lib/api'
import { logFood, getProfile, saveBodyScan } from '../../lib/supabase'

type Mode = 'food' | 'body'

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions()
  const [mode, setMode]         = useState<Mode>('food')
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState<any>(null)
  const [image, setImage]       = useState<string>('')
  const [modalVisible, setModal] = useState(false)
  const cameraRef = useRef<any>(null)

  if (!permission) return <View style={s.container} />
  if (!permission.granted) {
    return (
      <View style={s.permContainer}>
        <Text style={s.permTitle}>📸 Camera Access Needed</Text>
        <Text style={s.permDesc}>novaFit needs camera access to scan food and analyze your body</Text>
        <TouchableOpacity style={s.btn} onPress={requestPermission}>
          <Text style={s.btnText}>Grant Access</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const snap = async () => {
    if (!cameraRef.current) return
    setLoading(true)
    try {
      // On web, takePictureAsync returns a URI but base64 may be empty — convert via fetch
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.7 })
      setImage(photo.uri)
      let b64 = photo.base64
      if (!b64) {
        // Web fallback: fetch the blob URL and convert to base64
        const blob = await fetch(photo.uri).then(r => r.blob())
        b64 = await new Promise<string>(resolve => {
          const reader = new FileReader()
          reader.onloadend = () => resolve((reader.result as string).split(',')[1])
          reader.readAsDataURL(blob)
        })
      }
      await processImage(b64)
    } catch (e: any) {
      console.error('Snap error:', e)
    }
    setLoading(false)
  }

  const pickFromGallery = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.7, mediaTypes: ImagePicker.MediaTypeOptions.Images })
    if (res.canceled || !res.assets[0]) return
    setLoading(true)
    setImage(res.assets[0].uri)
    try {
      let b64 = res.assets[0].base64
      if (!b64) {
        // Web fallback: convert via blob
        const blob = await fetch(res.assets[0].uri).then(r => r.blob())
        b64 = await new Promise<string>(resolve => {
          const reader = new FileReader()
          reader.onloadend = () => resolve((reader.result as string).split(',')[1])
          reader.readAsDataURL(blob)
        })
      }
      await processImage(b64)
    } catch (e: any) {
      console.error('Gallery error:', e)
    }
    setLoading(false)
  }

  const processImage = async (base64: string) => {
    if (!base64 || base64.length < 100) {
      console.error('Invalid base64 data')
      return
    }
    if (mode === 'food') {
      const data = await scanFood(base64)
      setResult(data)
    } else {
      const profile = await getProfile()
      if (!profile) { console.error('No profile'); return }
      const data = await analyzeBody({
        imageBase64: base64, gender: profile.gender,
        weight_kg: profile.weight_kg, height_cm: profile.height_cm,
        age: profile.age, targetPhysique: profile.target_physique || 'athletic'
      })
      setResult(data)
      await saveBodyScan({
        estimated_bf_pct: data.estimated_bf_pct, bf_range: data.bf_range,
        body_type: data.body_type, transformation_plan: data.transformation_plan,
        ai_provider: data._vision_provider
      })
    }
    setModal(true)
  }

  const confirmFoodLog = async () => {
    if (!result || mode !== 'food') { setModal(false); return }

    // 1. Log to Supabase
    await logFood({
      food_name: result.food_name, calories: result.calories,
      protein: result.protein, carbs: result.carbs, fat: result.fat,
      confidence: result.confidence, ai_provider: result._provider
    })

    // 2. Auto-adjust remaining meals to compensate
    try {
      const [mpRaw, profRaw] = await Promise.all([
        AsyncStorage.getItem('meal_plan'),
        AsyncStorage.getItem('local_profile')
      ])
      if (mpRaw) {
        const mp      = JSON.parse(mpRaw)
        const profile = profRaw ? JSON.parse(profRaw) : {}
        const targets = { calories: 2000, protein: 150, carbs: 200, fat: 65, ...profile }
        const remaining = (mp.meals || [])
        if (remaining.length > 0) {
          const { adjustMeals } = await import('../../lib/api')
          const adj = await adjustMeals({
            logged: { food_name: result.food_name, calories: result.calories || 0, protein: result.protein || 0, carbs: result.carbs || 0, fat: result.fat || 0 },
            daily_targets: { calories: targets.calories, protein: targets.protein, carbs: targets.carbs, fat: targets.fat },
            remaining_meals: remaining
          })
          if (adj.adjusted_meals?.length) {
            await AsyncStorage.setItem('meal_plan', JSON.stringify({ ...mp, meals: adj.adjusted_meals, _adjusted: true }))
          }
        }
      }
    } catch (e) {
      console.log('[camera] meal adjustment skipped:', e)
    }

    setModal(false)
    setResult(null)
    Alert.alert('✅ Logged & Adjusted!', `${result.food_name} logged. Remaining meals adjusted to hit daily targets!`)
  }

  return (
    <View style={s.container}>
      {/* Mode Toggle */}
      <View style={s.modeToggle}>
        <TouchableOpacity style={[s.modeBtn, mode === 'food' && s.modeBtnActive]} onPress={() => setMode('food')}>
          <Text style={[s.modeBtnText, mode === 'food' && { color: '#fff' }]}>🍕 Food Scan</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.modeBtn, mode === 'body' && s.modeBtnActive]} onPress={() => setMode('body')}>
          <Text style={[s.modeBtnText, mode === 'body' && { color: '#fff' }]}>💪 Body Scan</Text>
        </TouchableOpacity>
      </View>

      <CameraView ref={cameraRef} style={s.camera} facing={mode === 'body' ? 'front' : 'back'}>
        {/* Scan frame */}
        <View style={s.scanFrame} />
        <Text style={s.hint}>
          {mode === 'food' ? '📸 Point at food to identify & log calories' : '🫃 Stand back 2m, full body visible'}
        </Text>
      </CameraView>

      {/* Controls */}
      <View style={s.controls}>
        <TouchableOpacity style={s.galleryBtn} onPress={pickFromGallery}>
          <Text style={s.galleryText}>🖼️</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.snapBtn} onPress={snap} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" size="large" /> : <View style={s.snapInner} />}
        </TouchableOpacity>
        <View style={{ width: 56 }} />
      </View>

      {/* Result Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {mode === 'food' && result ? (
                <>
                  {image ? <Image source={{ uri: image }} style={s.resultImage} /> : null}
                  <Text style={s.resultTitle}>{result.food_name}</Text>
                  <Text style={s.confidence}>{result.confidence === 'high' ? '✅' : result.confidence === 'medium' ? '⚠️' : '❓'} {result.confidence} confidence • {result._provider}</Text>
                  <View style={s.nutritionGrid}>
                    <NutrientBox label="Calories" value={result.calories} unit="kcal" color="#FF6B6B" />
                    <NutrientBox label="Protein"  value={result.protein}  unit="g"    color="#6C63FF" />
                    <NutrientBox label="Carbs"    value={result.carbs}    unit="g"    color="#FFD93D" />
                    <NutrientBox label="Fat"      value={result.fat}      unit="g"    color="#6BCB77" />
                  </View>
                  <TouchableOpacity style={s.confirmBtn} onPress={confirmFoodLog}>
                    <Text style={s.confirmText}>✅ Log This Food</Text>
                  </TouchableOpacity>
                </>
              ) : mode === 'body' && result ? (
                <>
                  <Text style={s.resultTitle}>Body Analysis 🫀</Text>
                  <View style={s.bfCard}>
                    <Text style={s.bfPct}>{result.estimated_bf_pct}%</Text>
                    <Text style={s.bfLabel}>Estimated Body Fat</Text>
                    <Text style={s.bfRange}>Range: {result.bf_range}</Text>
                    <Text style={s.bfCategory}>{result.bf_category}</Text>
                  </View>
                  <Text style={s.planTitle}>4-Week Transformation Plan 🗓️</Text>
                  {result.transformation_plan?.weeks?.map((w: any, i: number) => (
                    <View key={i} style={s.weekCard}>
                      <Text style={s.weekTitle}>Week {w.week} — {w.theme || w.focus}</Text>
                      <Text style={s.weekDetail}>🥗 {w.diet_tip}</Text>
                      <Text style={s.weekDetail}>🏃 {w.cardio}</Text>
                      {w.top_exercises?.map((ex: string, j: number) => (
                        <Text key={j} style={s.exercise}>• {ex}</Text>
                      ))}
                    </View>
                  ))}
                  <Text style={s.disclaimer}>⚠️ {result.disclaimer}</Text>
                </>
              ) : null}
              <TouchableOpacity style={s.closeBtn} onPress={() => setModal(false)}>
                <Text style={s.closeText}>Close</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  )
}

function NutrientBox({ label, value, unit, color }: any) {
  return (
    <View style={[nn.box, { borderColor: color }]}>
      <Text style={[nn.value, { color }]}>{value}</Text>
      <Text style={nn.unit}>{unit}</Text>
      <Text style={nn.label}>{label}</Text>
    </View>
  )
}
const nn = StyleSheet.create({
  box:   { flex: 1, backgroundColor: '#0A0A0F', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1.5 },
  value: { fontSize: 22, fontWeight: '800' },
  unit:  { color: '#888', fontSize: 12 },
  label: { color: '#ccc', fontSize: 12, fontWeight: '600', marginTop: 4 }
})

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0A0A0F' },
  permContainer:{ flex: 1, backgroundColor: '#0A0A0F', justifyContent: 'center', alignItems: 'center', padding: 32, gap: 16 },
  permTitle:    { color: '#fff', fontSize: 24, fontWeight: '800', textAlign: 'center' },
  permDesc:     { color: '#888', textAlign: 'center', fontSize: 16 },
  btn:          { backgroundColor: '#6C63FF', borderRadius: 14, paddingVertical: 16, paddingHorizontal: 32 },
  btnText:      { color: '#fff', fontWeight: '700', fontSize: 16 },
  modeToggle:   { flexDirection: 'row', backgroundColor: '#1A1A2E', margin: 16, marginTop: 56, borderRadius: 14, padding: 4, gap: 4 },
  modeBtn:      { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  modeBtnActive:{ backgroundColor: '#6C63FF' },
  modeBtnText:  { color: '#888', fontWeight: '600' },
  camera:       { flex: 1, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 20 },
  scanFrame:    { position: 'absolute', top: '20%', width: 220, height: 220, borderRadius: 24, borderWidth: 2, borderColor: 'rgba(108,99,255,0.7)' },
  hint:         { color: 'rgba(255,255,255,0.8)', textAlign: 'center', fontSize: 14, paddingHorizontal: 24, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, padding: 10 },
  controls:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', padding: 20, paddingBottom: 32, backgroundColor: '#0A0A0F' },
  galleryBtn:   { width: 56, height: 56, backgroundColor: '#1A1A2E', borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  galleryText:  { fontSize: 24 },
  snapBtn:      { width: 76, height: 76, backgroundColor: '#6C63FF', borderRadius: 38, justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#fff' },
  snapInner:    { width: 56, height: 56, backgroundColor: '#fff', borderRadius: 28 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet:   { backgroundColor: '#111120', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '85%' },
  resultImage:  { width: '100%', height: 180, borderRadius: 18, marginBottom: 16 },
  resultTitle:  { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 6 },
  confidence:   { color: '#888', fontSize: 13, marginBottom: 16 },
  nutritionGrid:{ flexDirection: 'row', gap: 10, marginBottom: 20 },
  confirmBtn:   { backgroundColor: '#6C63FF', borderRadius: 14, padding: 18, alignItems: 'center', marginBottom: 16 },
  confirmText:  { color: '#fff', fontWeight: '700', fontSize: 16 },
  bfCard:       { backgroundColor: '#1A1A2E', borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 16 },
  bfPct:        { color: '#6C63FF', fontSize: 52, fontWeight: '800' },
  bfLabel:      { color: '#ccc', fontSize: 16, marginTop: 4 },
  bfRange:      { color: '#888', fontSize: 14, marginTop: 4 },
  bfCategory:   { color: '#FFD93D', fontWeight: '700', marginTop: 8, fontSize: 16 },
  planTitle:    { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 12 },
  weekCard:     { backgroundColor: '#1A1A2E', borderRadius: 16, padding: 16, gap: 6, marginBottom: 10 },
  weekTitle:    { color: '#6C63FF', fontWeight: '700', fontSize: 15 },
  weekDetail:   { color: '#ccc', fontSize: 13 },
  exercise:     { color: '#888', fontSize: 13 },
  disclaimer:   { color: '#666', fontSize: 12, textAlign: 'center', marginVertical: 16 },
  closeBtn:     { backgroundColor: '#1A1A2E', borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 8 },
  closeText:    { color: '#888', fontWeight: '600' }
})
