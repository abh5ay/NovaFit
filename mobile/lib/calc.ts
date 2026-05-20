// mobile/lib/calc.ts
// Fitness calculations: BMR, TDEE, targets, macros

export type Gender   = 'male' | 'female'
export type Activity = 'sedentary' | 'light' | 'moderate' | 'active'
export type Goal     = 'lose' | 'maintain' | 'gain'

const ACTIVITY_MULTIPLIERS: Record<Activity, number> = {
  sedentary: 1.2,
  light:     1.375,
  moderate:  1.55,
  active:    1.725
}

/** Mifflin-St Jeor BMR formula (kcal/day) */
export function getBMR(gender: Gender, age: number, height_cm: number, weight_kg: number): number {
  const base = 10 * weight_kg + 6.25 * height_cm - 5 * age
  return gender === 'male' ? base + 5 : base - 161
}

/** Total Daily Energy Expenditure */
export function getTDEE(bmr: number, activity: Activity): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activity])
}

/** Calorie target based on goal — enforces safety floors */
export function getCalorieTarget(tdee: number, goal: Goal, gender: Gender): number {
  const floor = gender === 'male' ? 1500 : 1200
  if (goal === 'lose')     return Math.max(floor, tdee - 500)
  if (goal === 'gain')     return tdee + 300
  return tdee
}

/** Macro breakdown */
export function getMacros(calories: number, weight_kg: number) {
  const protein = Math.round(weight_kg * 2.2)          // 2.2g per kg
  const fat     = Math.round((calories * 0.28) / 9)    // 28% of cals from fat
  const carbs   = Math.round((calories - protein * 4 - fat * 9) / 4)
  return { protein: Math.max(0, protein), fat: Math.max(0, fat), carbs: Math.max(0, carbs) }
}

/** Full profile calculation */
export function calcProfile(
  gender: Gender, age: number, height_cm: number,
  weight_kg: number, activity: Activity, goal: Goal
) {
  const bmr      = getBMR(gender, age, height_cm, weight_kg)
  const tdee     = getTDEE(bmr, activity)
  const calories = getCalorieTarget(tdee, goal, gender)
  const macros   = getMacros(calories, weight_kg)
  const bmi      = weight_kg / ((height_cm / 100) ** 2)
  return { bmr: Math.round(bmr), tdee, calories, macros, bmi: Math.round(bmi * 10) / 10 }
}
