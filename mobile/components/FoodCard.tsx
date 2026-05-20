// mobile/components/FoodCard.tsx
import { View, Text, StyleSheet } from 'react-native'

export default function FoodCard({ food }: { food: any }) {
  const confColor = food.confidence === 'high' ? '#6BCB77' : food.confidence === 'medium' ? '#FFD93D' : '#888'
  const mealColors: Record<string, string> = {
    breakfast: '#FF9A3C', lunch: '#6C63FF', dinner: '#FF6B6B', snack: '#6BCB77'
  }

  return (
    <View style={s.card}>
      <View style={s.top}>
        <View style={{ flex: 1 }}>
          <Text style={s.name} numberOfLines={1}>{food.food_name}</Text>
          {food.meal_type && (
            <View style={[s.badge, { backgroundColor: mealColors[food.meal_type] || '#6C63FF' }]}>
              <Text style={s.badgeText}>{food.meal_type}</Text>
            </View>
          )}
        </View>
        <Text style={s.calories}>{food.calories} <Text style={s.kcal}>kcal</Text></Text>
      </View>
      <View style={s.macros}>
        <Text style={s.macro}>🥩 {food.protein}g</Text>
        <Text style={s.macro}>🍞 {food.carbs}g</Text>
        <Text style={s.macro}>🥑 {food.fat}g</Text>
        {food.confidence && <Text style={[s.conf, { color: confColor }]}>{food.confidence}</Text>}
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  card:     { backgroundColor: '#1A1A2E', borderRadius: 16, padding: 16, gap: 8 },
  top:      { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  name:     { color: '#fff', fontSize: 16, fontWeight: '700' },
  badge:    { alignSelf: 'flex-start', borderRadius: 6, paddingVertical: 2, paddingHorizontal: 8, marginTop: 4 },
  badgeText:{ color: '#fff', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  calories: { color: '#6C63FF', fontSize: 20, fontWeight: '800' },
  kcal:     { fontSize: 12, color: '#888', fontWeight: '400' },
  macros:   { flexDirection: 'row', gap: 12, alignItems: 'center' },
  macro:    { color: '#888', fontSize: 13 },
  conf:     { fontSize: 12, marginLeft: 'auto', fontWeight: '600' }
})
