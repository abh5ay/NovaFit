// mobile/app/(tabs)/log.tsx  — Daily Schedule with full meal details, recipe modal, pantry suggestions
import { useState, useCallback } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image,
         Modal, TextInput, ActivityIndicator, Alert, ImageSourcePropType } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useFocusEffect } from 'expo-router'
import { router } from 'expo-router'
import { suggestFromPantry } from '../../lib/api'

// ── Image map ──────────────────────────────────────────────
const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const FOCUS_IMAGES: { [key: string]: ImageSourcePropType } = {
  arms:  require('../../assets/hero_arms.png'),
  bicep: require('../../assets/hero_arms.png'), push: require('../../assets/hero_arms.png'),
  back:  require('../../assets/hero_back.png'), pull: require('../../assets/hero_back.png'),
  legs:  require('../../assets/hero_legs.png'), squat:require('../../assets/hero_legs.png'),
  rest:  require('../../assets/hero_rest.png'), core: require('../../assets/hero_rest.png'),
  default: require('../../assets/hero_workout.png'),
}
function getHeroImage(focus: string): ImageSourcePropType {
  const f = (focus||'').toLowerCase()
  const key = Object.keys(FOCUS_IMAGES).find(k => f.includes(k))
  return FOCUS_IMAGES[key||'default']
}

// ── Schedule config ────────────────────────────────────────
const DEFAULT_TIMES = {
  wake_time:'7:00 AM', breakfast_time:'7:30 AM', lunch_time:'12:30 PM',
  snack_time:'4:00 PM', dinner_time:'7:30 PM', workout_time:'6:00 PM',
  water_morning_time:'6:30 AM', water_evening_time:'9:00 PM', sleep_time:'10:30 PM',
}
type Times = typeof DEFAULT_TIMES

// ── Task type ──────────────────────────────────────────────
type TaskItem = {
  id: string; type: 'meal'|'workout'|'water'|'sleep'
  time: string; title: string; subtitle: string
  calories?: number; done: boolean; accent: string
  mealData?: any  // full meal object for recipe modal
}

// ── Build schedule ─────────────────────────────────────────
function buildSchedule(workoutPlan:any, mealPlan:any, today:string, T:Times): TaskItem[] {
  const tasks: TaskItem[] = []
  tasks.push({ id:'water-am', type:'water', time:T.water_morning_time, title:'Morning Hydration', subtitle:'500ml water — start the day right', done:false, accent:'#3B82F6' })

  if (mealPlan?.meals) {
    mealPlan.meals.forEach((m:any, i:number) => {
      const tKey = `${m.type}_time` as keyof Times
      const t = T[tKey] || T.lunch_time
      tasks.push({
        id:`meal-${i}`, type:'meal', time:t,
        title: m.name || (m.type ? (m.type.charAt(0).toUpperCase() + m.type.slice(1)) : 'Meal'),
        subtitle: m.ingredients?.slice(0,2).join(', ') || `${m.calories||0} kcal`,
        calories: m.calories, done:false,
        accent: m.type==='breakfast'?'#F59E0B':m.type==='lunch'?'#10B981':m.type==='dinner'?'#7C5CFC':'#3B82F6',
        mealData: m,
      })
    })
  } else {
    tasks.push(
      {id:'meal-0',type:'meal',time:T.breakfast_time,title:'Breakfast',subtitle:'Generate a plan to see meal details',done:false,accent:'#F59E0B'},
      {id:'meal-1',type:'meal',time:T.lunch_time,   title:'Lunch',    subtitle:'Generate a plan to see meal details',done:false,accent:'#10B981'},
      {id:'meal-2',type:'meal',time:T.dinner_time,  title:'Dinner',   subtitle:'Generate a plan to see meal details',done:false,accent:'#7C5CFC'},
    )
  }

  if (workoutPlan?.plan) {
    const tw = workoutPlan.plan.find((d:any)=>d.day?.toLowerCase()===today.toLowerCase())
    if (tw) tasks.push({id:'workout-main',type:'workout',time:T.workout_time,title:`Training — ${tw.focus}`,subtitle:`${tw.exercises?.length||0} exercises · 45 min`,done:false,accent:'#EF4444'})
  }
  tasks.push({id:'water-pm',type:'water',time:T.water_evening_time,title:'Evening Hydration',subtitle:'Wind down with water',done:false,accent:'#3B82F6'})
  tasks.push({id:'sleep',type:'sleep',time:T.sleep_time,title:'8hrs Sleep Target',subtitle:'Recovery is training too',done:false,accent:'#8B5CF6'})

  return tasks.sort((a,b)=>{
    const toMin=(t:string)=>{const p=t.split(' ');const[h,m]=(p[0]||'12:00').split(':').map(Number);let hr=h;if(p[1]==='PM'&&hr!==12)hr+=12;if(p[1]==='AM'&&hr===12)hr=0;return hr*60+(m||0)}
    return toMin(a.time)-toMin(b.time)
  })
}

// ── Meal Recipe Modal ──────────────────────────────────────
function MealModal({ meal, onClose, pantry }: { meal: any; onClose:()=>void; pantry:string[] }) {
  const [view, setView]             = useState<'recipe'|'pantry'>('recipe')
  const [pantryInput, setPantryInput] = useState('')
  const [suggestion, setSuggestion] = useState<any>(null)
  const [loading, setLoading]       = useState(false)
  const [savedPantry, setSavedPantry] = useState<string[]>(pantry)

  const getFromPantry = async () => {
    const items = [...savedPantry, ...pantryInput.split(',').map(s=>s.trim()).filter(Boolean)]
    if (!items.length) return
    setLoading(true)
    try {
      const res = await suggestFromPantry({ pantry_items:items, meal_type: meal?.type||'lunch', target_calories: meal?.calories||500, target_protein: meal?.protein||30 })
      setSuggestion(res)
      // Save pantry items
      const newPantry = [...new Set(items)]
      setSavedPantry(newPantry)
      await AsyncStorage.setItem('user_pantry', JSON.stringify(newPantry))
    } catch(e){ console.log('pantry suggest failed',e) }
    setLoading(false)
  }

  if (!meal) return null
  const accent = meal.type==='breakfast'?'#F59E0B':meal.type==='lunch'?'#10B981':meal.type==='dinner'?'#7C5CFC':'#3B82F6'

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={m.overlay}>
        <View style={m.sheet}>
          {/* Header */}
          <View style={[m.header, {borderBottomColor: accent+'44'}]}>
            <View style={[m.mealBadge, {backgroundColor: accent+'22', borderColor: accent+'44'}]}>
              <Text style={[m.mealType, {color: accent}]}>{meal.type?.toUpperCase()}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={m.closeBtn}><Text style={m.closeX}>✕</Text></TouchableOpacity>
          </View>

          <Text style={m.mealName}>{meal.name}</Text>
          <Text style={m.mealPrep}>{meal.prep_time_min} min prep</Text>

          {/* Macros */}
          <View style={m.macroRow}>
            <MacroChip label="Cal" value={meal.calories} unit="kcal" color="#FF6B6B"/>
            <MacroChip label="Protein" value={meal.protein} unit="g" color="#6C63FF"/>
            <MacroChip label="Carbs"   value={meal.carbs}   unit="g" color="#F59E0B"/>
            <MacroChip label="Fat"     value={meal.fat}     unit="g" color="#10B981"/>
          </View>

          {/* Tabs */}
          <View style={m.tabRow}>
            <TouchableOpacity style={[m.tab, view==='recipe'&&m.tabActive]} onPress={()=>setView('recipe')}>
              <Text style={[m.tabText, view==='recipe'&&{color:'#fff'}]}>Recipe</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[m.tab, view==='pantry'&&m.tabActive]} onPress={()=>setView('pantry')}>
              <Text style={[m.tabText, view==='pantry'&&{color:'#fff'}]}>Missing Ingredients?</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {view==='recipe' ? (
              <>
                <Text style={m.sectionLabel}>Ingredients</Text>
                {meal.ingredients?.map((ing:string, i:number)=>(
                  <View key={i} style={m.ingredientRow}>
                    <View style={[m.ingredientDot,{backgroundColor:accent}]}/>
                    <Text style={m.ingredientText}>{ing}</Text>
                  </View>
                ))}
                {meal.instructions?.length > 0 && <>
                  <Text style={m.sectionLabel}>How to Make</Text>
                  {meal.instructions.map((step:string, i:number)=>(
                    <View key={i} style={m.stepRow}>
                      <View style={[m.stepNum,{backgroundColor:accent+'33',borderColor:accent+'66'}]}>
                        <Text style={[m.stepNumText,{color:accent}]}>{i+1}</Text>
                      </View>
                      <Text style={m.stepText}>{step}</Text>
                    </View>
                  ))}
                </>}
              </>
            ) : (
              <>
                <Text style={m.pantryTitle}>What do you have at home?</Text>
                <Text style={m.pantrySub}>Enter ingredients separated by commas and I'll create a meal for you</Text>

                {savedPantry.length > 0 && (
                  <View style={m.pantryChips}>
                    {savedPantry.map((item,i)=>(
                      <View key={i} style={m.chip}><Text style={m.chipText}>{item}</Text></View>
                    ))}
                  </View>
                )}

                <View style={m.pantryInputRow}>
                  <TextInput
                    style={m.pantryInput}
                    value={pantryInput}
                    onChangeText={setPantryInput}
                    placeholder="e.g. chicken, rice, broccoli, eggs..."
                    placeholderTextColor="#555"
                  />
                </View>
                <TouchableOpacity style={[m.suggestBtn, {backgroundColor: accent}]} onPress={getFromPantry} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" size="small"/> : <Text style={m.suggestBtnText}>Generate Meal from My Ingredients</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={m.coachLink} onPress={()=>{onClose();router.push('/(tabs)/chat')}}>
                  <Text style={m.coachLinkText}>→ Or register pantry items via AI Coach</Text>
                </TouchableOpacity>

                {suggestion && (
                  <View style={m.suggestionCard}>
                    <Text style={m.suggestionName}>{suggestion.name}</Text>
                    <Text style={m.suggestionMacros}>{suggestion.calories} kcal · P:{suggestion.protein}g · C:{suggestion.carbs}g · F:{suggestion.fat}g</Text>
                    <Text style={m.sectionLabel}>Ingredients</Text>
                    {suggestion.ingredients?.map((ing:string,i:number)=>(
                      <Text key={i} style={m.suggestionIng}>• {ing}</Text>
                    ))}
                    <Text style={m.sectionLabel}>Steps</Text>
                    {suggestion.instructions?.map((step:string,i:number)=>(
                      <Text key={i} style={m.suggestionStep}>{i+1}. {step}</Text>
                    ))}
                    {suggestion.tip && <Text style={m.suggestionTip}>💡 {suggestion.tip}</Text>}
                  </View>
                )}
              </>
            )}
            <View style={{height:20}}/>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

function MacroChip({label,value,unit,color}:{label:string;value:number;unit:string;color:string}) {
  return (
    <View style={[m.macroChip,{borderColor:color+'44'}]}>
      <Text style={[m.macroVal,{color}]}>{value}</Text>
      <Text style={m.macroUnit}>{unit}</Text>
      <Text style={m.macroLabel}>{label}</Text>
    </View>
  )
}

// ── Main Screen ────────────────────────────────────────────
export default function LogScreen() {
  const [tasks, setTasks]           = useState<TaskItem[]>([])
  const [todayName, setTodayName]   = useState('')
  const [todayFocus, setTodayFocus] = useState('')
  const [progress, setProgress]     = useState(0)
  const [selectedMeal, setSelectedMeal] = useState<any>(null)
  const [pantry, setPantry]         = useState<string[]>([])

  useFocusEffect(
    useCallback(() => {
      const today = DAYS[new Date().getDay()]
      setTodayName(today)
      Promise.all([
        AsyncStorage.getItem('workout_plan'),
        AsyncStorage.getItem('meal_plan'),
        AsyncStorage.getItem(`log_done_${today}`),
        AsyncStorage.getItem('schedule_config'),
        AsyncStorage.getItem('user_pantry'),
      ]).then(([wp,mp,done,sc,pant]) => {
        const workoutPlan = wp ? JSON.parse(wp) : null
        const mealPlan    = mp ? JSON.parse(mp) : null
        const doneset     = done ? new Set(JSON.parse(done)) : new Set<string>()
        const times       = sc ? {...DEFAULT_TIMES,...JSON.parse(sc)} : DEFAULT_TIMES
        if (pant) setPantry(JSON.parse(pant))
        if (workoutPlan?.plan) {
          const tw = workoutPlan.plan.find((d:any)=>d.day?.toLowerCase()===today.toLowerCase())
          if (tw) setTodayFocus(tw.focus||'')
        }
        let built = buildSchedule(workoutPlan, mealPlan, today, times)
        built = built.map(t=>({...t, done: doneset.has(t.id)}))
        setTasks(built)
        setProgress(built.filter(t=>t.done).length / Math.max(built.length,1))
      })
    },[])
  )

  const toggleTask = async (id:string) => {
    const updated = tasks.map(t=>t.id===id?{...t,done:!t.done}:t)
    setTasks(updated)
    const done = updated.filter(t=>t.done).map(t=>t.id)
    const newProgress = done.length/Math.max(updated.length,1)
    setProgress(newProgress)
    await AsyncStorage.setItem(`log_done_${todayName}`, JSON.stringify(done))

    if (done.length === updated.length && updated.length > 0) {
      // Level Up trigger!
      try {
        const { recordDayComplete } = await import('../../lib/useUserData')
        const res = await recordDayComplete(done.length, updated.length)
        Alert.alert(
          '🔥 Level Up!',
          `You crushed all tasks today! You have advanced to Hardship Level ${res.level} with a ${res.streak}-day streak! Keep going!`
        )
      } catch (e) {
        console.log('level checkin err', e)
      }
    }
  }

  const openMeal = (task:TaskItem) => {
    if (task.type==='meal' && task.mealData) setSelectedMeal(task.mealData)
  }

  const doneCount = tasks.filter(t=>t.done).length
  const typeIcon: Record<string,string> = {meal:'●',workout:'▲',water:'◆',sleep:'○'}

  return (
    <>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={s.hero}>
          <Image source={getHeroImage(todayFocus)} style={s.heroBg}/>
          <View style={s.heroOverlay}/>
          <View style={s.heroContent}>
            <Text style={s.dayLabel}>{todayName?.toUpperCase()}</Text>
            <Text style={s.heroTitle}>{todayFocus||'Daily Schedule'}</Text>
            <Text style={s.heroSub}>{doneCount} of {tasks.length} completed</Text>
            <View style={s.progressBg}><View style={[s.progressFill,{width:`${progress*100}%` as any}]}/></View>
          </View>
        </View>

        <View style={s.body}>
          {/* AI Coach shortcut */}
          <TouchableOpacity style={s.coachBanner} onPress={()=>router.push('/(tabs)/chat')}>
            <View style={s.coachLeft}>
              <View style={s.coachDot}/>
              <View>
                <Text style={s.coachTitle}>Adjust Schedule or Pantry with AI Coach</Text>
                <Text style={s.coachSub}>Tell me your wake time, pantry items, or change workouts</Text>
              </View>
            </View>
            <Text style={s.coachArrow}>→</Text>
          </TouchableOpacity>

          {/* Task List */}
          {tasks.map((task,i)=>(
            <TouchableOpacity key={task.id}
              style={[s.taskCard, task.done&&s.taskDone, task.type==='meal'&&{borderColor: task.accent+'44'}]}
              onPress={()=>{ if(task.type==='meal'&&task.mealData) openMeal(task); else toggleTask(task.id) }}
              onLongPress={()=>toggleTask(task.id)}
              activeOpacity={0.8}>
              {/* Time col */}
              <View style={s.timeCol}>
                <Text style={s.taskTime}>{task.time.split(' ')[0]}</Text>
                <Text style={s.taskAmPm}>{task.time.split(' ')[1]}</Text>
                {i<tasks.length-1&&<View style={[s.timeLine,{backgroundColor:task.accent+'33'}]}/>}
              </View>

              {/* Dot */}
              <View style={[s.accentDot,{backgroundColor:task.done?'#4ADE80':task.accent}]}>
                <Text style={s.accentIcon}>{task.done?'✓':typeIcon[task.type]}</Text>
              </View>

              {/* Content */}
              <View style={s.taskContent}>
                <Text style={[s.taskTitle,task.done&&s.taskTitleDone]}>{task.title}</Text>
                <Text style={s.taskSub}>{task.subtitle}</Text>
                {task.calories&&!task.done?(
                  <Text style={[s.taskCal,{color:task.accent}]}>{task.calories} kcal</Text>
                ):null}
                {task.type==='meal'&&task.mealData&&!task.done&&(
                  <Text style={[s.tapHint,{color:task.accent+'99'}]}>Tap for recipe →</Text>
                )}
              </View>

              {/* Checkbox (non-meal) / arrow (meal) */}
              {task.type==='meal'&&task.mealData ? (
                <TouchableOpacity style={[s.checkbox,task.done&&s.checkboxDone,{borderColor:task.accent+'66'}]}
                  onPress={()=>toggleTask(task.id)}>
                  {task.done&&<Text style={s.checkmark}>✓</Text>}
                </TouchableOpacity>
              ) : (
                <View style={[s.checkbox,task.done&&s.checkboxDone,!task.done&&{borderColor:task.accent+'66'}]}>
                  {task.done&&<Text style={s.checkmark}>✓</Text>}
                </View>
              )}
            </TouchableOpacity>
          ))}

          {doneCount===tasks.length&&tasks.length>0&&(
            <View style={s.completeBanner}>
              <Text style={s.completeTitle}>Day Complete! 🎉</Text>
              <Text style={s.completeSub}>Incredible work today. Rest and recover.</Text>
            </View>
          )}
          <View style={{height:30}}/>
        </View>
      </ScrollView>

      {selectedMeal && (
        <MealModal meal={selectedMeal} pantry={pantry} onClose={()=>setSelectedMeal(null)}/>
      )}
    </>
  )
}

const s = StyleSheet.create({
  scroll:          { flex: 1, backgroundColor: '#0A0A0F' },
  hero:            { height: 220, overflow: 'hidden' },
  heroBg:          { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', resizeMode: 'cover' },
  heroOverlay:     { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,10,15,0.6)' },
  heroContent:     { position: 'absolute', bottom: 20, left: 20, right: 20 },
  dayLabel:        { color: '#7C5CFC', fontSize: 11, fontWeight: '800', letterSpacing: 3, marginBottom: 4 },
  heroTitle:       { color: '#fff', fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  heroSub:         { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 10, marginTop: 2 },
  progressBg:      { height: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2, overflow: 'hidden' },
  progressFill:    { height: 4, backgroundColor: '#4ADE80', borderRadius: 2 },
  body:            { padding: 16, gap: 10 },
  coachBanner:     { backgroundColor: '#111118', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#7C5CFC33', marginBottom: 6 },
  coachLeft:       { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  coachDot:        { width: 32, height: 32, borderRadius: 16, backgroundColor: '#7C5CFC22', borderWidth: 1, borderColor: '#7C5CFC', alignItems: 'center', justifyContent: 'center' },
  coachTitle:      { color: '#fff', fontSize: 13, fontWeight: '700' },
  coachSub:        { color: '#555', fontSize: 11 },
  coachArrow:      { color: '#7C5CFC', fontSize: 18, fontWeight: '700' },
  taskCard:        { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#111118', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#1E1E2A', gap: 12 },
  taskDone:        { opacity: 0.45 },
  timeCol:         { width: 40, alignItems: 'center', paddingTop: 2 },
  taskTime:        { color: '#666', fontSize: 11, fontWeight: '700' },
  taskAmPm:        { color: '#444', fontSize: 9 },
  timeLine:        { width: 1, height: 30, marginTop: 6 },
  accentDot:       { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', flexShrink: 0, marginTop: 2 },
  accentIcon:      { color: '#fff', fontSize: 9, fontWeight: '800' },
  taskContent:     { flex: 1, gap: 2 },
  taskTitle:       { color: '#fff', fontSize: 14, fontWeight: '700', lineHeight: 19 },
  taskTitleDone:   { color: '#555', textDecorationLine: 'line-through' },
  taskSub:         { color: '#666', fontSize: 12 },
  taskCal:         { fontSize: 11, fontWeight: '700', marginTop: 2 },
  tapHint:         { fontSize: 10, marginTop: 2 },
  checkbox:        { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  checkboxDone:    { backgroundColor: '#4ADE80', borderColor: '#4ADE80' },
  checkmark:       { color: '#0A0A0F', fontSize: 11, fontWeight: '900' },
  completeBanner:  { backgroundColor: '#0D2A1A', borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#4ADE8044' },
  completeTitle:   { color: '#4ADE80', fontSize: 20, fontWeight: '800' },
  completeSub:     { color: '#666', fontSize: 13, marginTop: 4 },
})

const m = StyleSheet.create({
  overlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  sheet:          { backgroundColor: '#111120', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '90%' },
  header:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, paddingBottom: 12, marginBottom: 12 },
  mealBadge:      { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1 },
  mealType:       { fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  closeBtn:       { width: 32, height: 32, borderRadius: 16, backgroundColor: '#1A1A2E', justifyContent: 'center', alignItems: 'center' },
  closeX:         { color: '#888', fontSize: 15, fontWeight: '700' },
  mealName:       { color: '#fff', fontSize: 22, fontWeight: '800', lineHeight: 28 },
  mealPrep:       { color: '#555', fontSize: 12, marginTop: 4, marginBottom: 14 },
  macroRow:       { flexDirection: 'row', gap: 8, marginBottom: 16 },
  macroChip:      { flex: 1, backgroundColor: '#0A0A0F', borderRadius: 12, padding: 10, alignItems: 'center', borderWidth: 1 },
  macroVal:       { fontSize: 18, fontWeight: '800' },
  macroUnit:      { color: '#666', fontSize: 10 },
  macroLabel:     { color: '#aaa', fontSize: 10, marginTop: 2 },
  tabRow:         { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tab:            { flex: 1, backgroundColor: '#1A1A2E', borderRadius: 10, padding: 10, alignItems: 'center' },
  tabActive:      { backgroundColor: '#7C5CFC' },
  tabText:        { color: '#888', fontSize: 12, fontWeight: '600' },
  sectionLabel:   { color: '#7C5CFC', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginTop: 14, marginBottom: 8 },
  ingredientRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  ingredientDot:  { width: 6, height: 6, borderRadius: 3 },
  ingredientText: { color: '#ccc', fontSize: 14 },
  stepRow:        { flexDirection: 'row', gap: 12, marginBottom: 10, alignItems: 'flex-start' },
  stepNum:        { width: 24, height: 24, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  stepNumText:    { fontSize: 11, fontWeight: '800' },
  stepText:       { color: '#ccc', fontSize: 13, flex: 1, lineHeight: 18 },
  pantryTitle:    { color: '#fff', fontSize: 16, fontWeight: '700', marginTop: 4 },
  pantrySub:      { color: '#666', fontSize: 12, marginTop: 4, marginBottom: 12 },
  pantryChips:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  chip:           { backgroundColor: '#1A1A2E', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  chipText:       { color: '#aaa', fontSize: 11 },
  pantryInputRow: { backgroundColor: '#0A0A0F', borderRadius: 12, borderWidth: 1, borderColor: '#2A2A3A', marginBottom: 10 },
  pantryInput:    { color: '#fff', fontSize: 13, padding: 12 },
  suggestBtn:     { borderRadius: 14, padding: 14, alignItems: 'center', marginBottom: 8 },
  suggestBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  coachLink:      { alignItems: 'center', padding: 8 },
  coachLinkText:  { color: '#7C5CFC', fontSize: 12 },
  suggestionCard: { backgroundColor: '#0A0A0F', borderRadius: 16, padding: 16, marginTop: 16, borderWidth: 1, borderColor: '#2A2A3A' },
  suggestionName: { color: '#fff', fontSize: 17, fontWeight: '800' },
  suggestionMacros:{ color: '#888', fontSize: 12, marginTop: 4, marginBottom: 4 },
  suggestionIng:  { color: '#ccc', fontSize: 13, marginBottom: 4 },
  suggestionStep: { color: '#ccc', fontSize: 13, marginBottom: 6, lineHeight: 18 },
  suggestionTip:  { color: '#F59E0B', fontSize: 12, marginTop: 8, fontStyle: 'italic' },
})
