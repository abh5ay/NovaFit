// mobile/components/CalorieRing.tsx
// SVG donut ring showing consumed vs target calories

import Svg, { Circle } from 'react-native-svg'
import { View, Text, StyleSheet } from 'react-native'

interface Props {
  consumed: number
  target:   number
  size?:    number
}

export default function CalorieRing({ consumed, target, size = 120 }: Props) {
  const radius      = (size - 20) / 2
  const circumference = 2 * Math.PI * radius
  const pct         = target > 0 ? Math.min(consumed / target, 1) : 0
  const strokeDash  = circumference * pct
  const over        = consumed > target
  const color       = over ? '#FF6B6B' : consumed > target * 0.8 ? '#FFD93D' : '#6C63FF'

  return (
    <View style={s.container}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        {/* Background track */}
        <Circle cx={size/2} cy={size/2} r={radius} stroke="#1A1A2E" strokeWidth={10} fill="none" />
        {/* Progress arc */}
        <Circle
          cx={size/2} cy={size/2} r={radius}
          stroke={color} strokeWidth={10} fill="none"
          strokeDasharray={`${strokeDash} ${circumference}`}
          strokeLinecap="round"
        />
      </Svg>
      <View style={[s.center, { width: size, height: size }]}>
        <Text style={[s.value, { color }]}>{consumed}</Text>
        <Text style={s.label}>eaten</Text>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  container: { position: 'relative', justifyContent: 'center', alignItems: 'center' },
  center:    { position: 'absolute', justifyContent: 'center', alignItems: 'center' },
  value:     { fontSize: 24, fontWeight: '800' },
  label:     { color: '#888', fontSize: 12 }
})
