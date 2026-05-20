// mobile/components/MacroBar.tsx
import { View, Text, StyleSheet } from 'react-native'

interface Props {
  label:    string
  consumed: number
  target:   number
  color:    string
  unit?:    string
}

export default function MacroBar({ label, consumed, target, color, unit = 'g' }: Props) {
  const pct = target > 0 ? Math.min(consumed / target, 1) : 0
  return (
    <View style={s.row}>
      <Text style={s.label}>{label}</Text>
      <View style={s.barTrack}>
        <View style={[s.barFill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
      <Text style={s.value}>{consumed}<Text style={s.unit}>/{target}{unit}</Text></Text>
    </View>
  )
}

const s = StyleSheet.create({
  row:      { gap: 6 },
  label:    { color: '#ccc', fontSize: 13, fontWeight: '600' },
  barTrack: { height: 8, backgroundColor: '#0A0A0F', borderRadius: 4, overflow: 'hidden' },
  barFill:  { height: 8, borderRadius: 4 },
  value:    { color: '#fff', fontSize: 13, fontWeight: '700' },
  unit:     { color: '#666', fontWeight: '400' }
})
