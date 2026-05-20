// mobile/app/(tabs)/chat.tsx
import { useState, useRef, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Image
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { chatWithCoach, ChatMessage } from '../../lib/api'

const QUICK_PROMPTS = [
  "Make my workout more intense",
  "I'm vegetarian, update my meal plan",
  "Add more protein to my diet",
  "I can only train 3 days this week",
  "How do I lose fat faster?",
  "What should I eat post-workout?",
]

export default function ChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: "Hi! I'm your NovaFit AI Coach. I know your goals, your workout plan, your meal plan, and your daily schedule. Ask me anything — or tell me to update your plans or timings!" }
  ])
  const [input, setInput]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [profile, setProfile]     = useState<any>(null)
  const [scheduleConfig, setScheduleConfig] = useState<any>(null)
  const scrollRef = useRef<ScrollView>(null)

  useEffect(() => {
    AsyncStorage.getItem('local_profile').then(p => { if (p) setProfile(JSON.parse(p)) })
    AsyncStorage.getItem('schedule_config').then(s => { if (s) setScheduleConfig(JSON.parse(s)) })
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true })
  }, [messages, loading])

  const send = async (text?: string) => {
    const msg = (text || input).trim()
    if (!msg || loading) return
    setInput('')

    const userMsg: ChatMessage = { role: 'user', content: msg }
    const history = [...messages, userMsg]
    setMessages(history)
    setLoading(true)

    try {
      const res = await chatWithCoach({
        message: msg,
        profile,
        history: messages.slice(-6),
        scheduleConfig,
      } as any)
      const aiMsg: ChatMessage = { role: 'assistant', content: res.reply }
      setMessages([...history, aiMsg])

      // Save updated plans/schedule to AsyncStorage
      if ((res as any).workoutUpdate) {
        await AsyncStorage.setItem('workout_plan', JSON.stringify((res as any).workoutUpdate))
      }
      if ((res as any).mealUpdate) {
        await AsyncStorage.setItem('meal_plan', JSON.stringify((res as any).mealUpdate))
      }
      if ((res as any).scheduleUpdate) {
        const newConfig = { ...(scheduleConfig || {}), ...(res as any).scheduleUpdate }
        setScheduleConfig(newConfig)
        await AsyncStorage.setItem('schedule_config', JSON.stringify(newConfig))
      }
      if ((res as any).pantryUpdate) {
        const existing = await AsyncStorage.getItem('user_pantry')
        const current  = existing ? JSON.parse(existing) : []
        const merged   = [...new Set([...current, ...(res as any).pantryUpdate])]
        await AsyncStorage.setItem('user_pantry', JSON.stringify(merged))
      }
    } catch (e: any) {
      setMessages([...history, { role: 'assistant', content: "I'm having trouble connecting right now. Please try again in a moment." }])
    }
    setLoading(false)
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Header */}
      <View style={s.header}>
        <Image source={require('../../assets/hero_ai.png')} style={s.headerBg} />
        <View style={s.headerOverlay} />
        <View style={s.headerContent}>
          <View style={s.aiBadge}><View style={s.aiBadgeDot} /><Text style={s.aiBadgeText}>AI Coach Online</Text></View>
          <Text style={s.headerTitle}>NovaFit Coach</Text>
          <Text style={s.headerSub}>Your personal AI trainer & nutritionist</Text>
        </View>
      </View>

      {/* Quick Prompts */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.quickScroll} contentContainerStyle={s.quickContent}>
        {QUICK_PROMPTS.map((p, i) => (
          <TouchableOpacity key={i} style={s.chip} onPress={() => send(p)}>
            <Text style={s.chipText}>{p}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Messages */}
      <ScrollView ref={scrollRef} style={s.messages} contentContainerStyle={s.messagesContent}>
        {messages.map((m, i) => (
          <View key={i} style={[s.bubble, m.role === 'user' ? s.userBubble : s.aiBubble]}>
            {m.role === 'assistant' && (
              <View style={s.aiAvatar}><Text style={s.aiAvatarText}>N</Text></View>
            )}
            <View style={[s.bubbleInner, m.role === 'user' ? s.userInner : s.aiInner]}>
              <Text style={[s.bubbleText, m.role === 'user' && s.userText]}>{m.content}</Text>
            </View>
          </View>
        ))}
        {loading && (
          <View style={[s.bubble, s.aiBubble]}>
            <View style={s.aiAvatar}><Text style={s.aiAvatarText}>N</Text></View>
            <View style={s.typing}>
              <ActivityIndicator size="small" color="#7C5CFC" />
              <Text style={s.typingText}>Thinking...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <View style={s.inputRow}>
        <TextInput
          style={s.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask your AI coach..."
          placeholderTextColor="#555"
          multiline
          maxLength={500}
          onSubmitEditing={() => send()}
        />
        <TouchableOpacity style={[s.sendBtn, (!input.trim() || loading) && s.sendDisabled]} onPress={() => send()} disabled={!input.trim() || loading}>
          <Text style={s.sendIcon}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#0A0A0F' },
  header:         { height: 180, overflow: 'hidden' },
  headerBg:       { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', resizeMode: 'cover' },
  headerOverlay:  { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,10,15,0.55)' },
  headerContent:  { position: 'absolute', bottom: 20, left: 20 },
  aiBadge:        { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(124,92,252,0.2)', borderWidth: 1, borderColor: '#7C5CFC', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 8 },
  aiBadgeDot:     { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4ADE80' },
  aiBadgeText:    { color: '#7C5CFC', fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  headerTitle:    { color: '#fff', fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  headerSub:      { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  quickScroll:    { maxHeight: 48, marginTop: 12 },
  quickContent:   { paddingHorizontal: 16, gap: 8 },
  chip:           { backgroundColor: '#1A1A2E', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#2A2A3E' },
  chipText:       { color: '#aaa', fontSize: 12 },
  messages:       { flex: 1, marginTop: 8 },
  messagesContent:{ padding: 16, gap: 12 },
  bubble:         { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  userBubble:     { flexDirection: 'row-reverse' },
  aiBubble:       {},
  aiAvatar:       { width: 32, height: 32, borderRadius: 16, backgroundColor: '#7C5CFC', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  aiAvatarText:   { color: '#fff', fontWeight: '800', fontSize: 14 },
  bubbleInner:    { maxWidth: '78%', borderRadius: 18, padding: 14 },
  aiInner:        { backgroundColor: '#1A1A2E', borderBottomLeftRadius: 4 },
  userInner:      { backgroundColor: '#7C5CFC', borderBottomRightRadius: 4 },
  bubbleText:     { color: '#ccc', fontSize: 14, lineHeight: 21 },
  userText:       { color: '#fff' },
  typing:         { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1A1A2E', borderRadius: 18, borderBottomLeftRadius: 4, padding: 14 },
  typingText:     { color: '#666', fontSize: 13 },
  inputRow:       { flexDirection: 'row', alignItems: 'flex-end', padding: 12, paddingBottom: 24, gap: 10, borderTopWidth: 1, borderTopColor: '#1A1A2E' },
  input:          { flex: 1, backgroundColor: '#1A1A2E', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 12, color: '#fff', fontSize: 15, maxHeight: 100, borderWidth: 1, borderColor: '#2A2A3E' },
  sendBtn:        { width: 44, height: 44, borderRadius: 22, backgroundColor: '#7C5CFC', justifyContent: 'center', alignItems: 'center' },
  sendDisabled:   { opacity: 0.35 },
  sendIcon:       { color: '#fff', fontSize: 20, fontWeight: '700' },
})
