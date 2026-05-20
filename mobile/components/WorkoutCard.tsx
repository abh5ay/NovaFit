// mobile/components/WorkoutCard.tsx
import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'

const FOCUS_COLORS: Record<string, string> = {
  push: '#FF6B6B', pull: '#6C63FF', legs: '#6BCB77',
  cardio: '#FFD93D', rest: '#888', full: '#FF9A3C', core: '#F72585'
}

function getFocusColor(focus: string) {
  const key = Object.keys(FOCUS_COLORS).find(k => focus.toLowerCase().includes(k))
  return key ? FOCUS_COLORS[key] : '#6C63FF'
}

export default function WorkoutCard({ day }: { day: any }) {
  const [expanded, setExpanded] = useState(false)
  const color = getFocusColor(day.focus || '')

  return (
    <View style={[s.card, { borderLeftColor: color }]}>
      <TouchableOpacity style={s.header} onPress={() => setExpanded(!expanded)}>
        <View>
          <Text style={s.day}>{day.day}</Text>
          <Text style={[s.focus, { color }]}>{day.focus}</Text>
        </View>
        <View style={s.right}>
          <Text style={s.count}>{day.exercises?.length || 0} exercises</Text>
          <Text style={s.chevron}>{expanded ? '▲' : '▼'}</Text>
        </View>
      </TouchableOpacity>

      {expanded && day.exercises?.map((ex: any, i: number) => (
        <View key={i} style={s.exercise}>
          <Text style={s.exName}>{ex.name}</Text>
          <View style={s.exMeta}>
            <Text style={s.exChip}>{ex.sets} sets</Text>
            <Text style={s.exChip}>{ex.reps} reps</Text>
            <Text style={s.exChip}>⏱ {ex.rest_sec}s rest</Text>
          </View>
          {ex.notes && <Text style={s.exNote}>💡 {ex.notes}</Text>}
        </View>
      ))}
    </View>
  )
}

const s = StyleSheet.create({
  card:     { backgroundColor: '#1A1A2E', borderRadius: 18, overflow: 'hidden', borderLeftWidth: 4 },
  header:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  day:      { color: '#fff', fontSize: 17, fontWeight: '800' },
  focus:    { fontSize: 13, fontWeight: '600', marginTop: 2 },
  right:    { alignItems: 'flex-end', gap: 4 },
  count:    { color: '#888', fontSize: 13 },
  chevron:  { color: '#555', fontSize: 12 },
  exercise: { backgroundColor: '#0A0A0F', padding: 14, gap: 6, borderTopWidth: 1, borderTopColor: '#1A1A2E' },
  exName:   { color: '#fff', fontSize: 15, fontWeight: '700' },
  exMeta:   { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  exChip:   { backgroundColor: '#1A1A2E', color: '#ccc', borderRadius: 8, paddingVertical: 3, paddingHorizontal: 10, fontSize: 12 },
  exNote:   { color: '#888', fontSize: 12, fontStyle: 'italic' }
})
