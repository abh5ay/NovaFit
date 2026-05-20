// backend/middleware/safety.js
// Server-side safety guardrails — always enforced regardless of frontend

'use strict'

const LIMITS = {
  // Calorie floors (WHO / ACSM minimums)
  min_calories_female: 1200,
  min_calories_male:   1500,

  // Maximum calorie deficit per day
  max_deficit: 750,

  // Workout session constraints
  min_workout_days: 2,
  max_workout_days: 6,
  min_session_min:  20,
  max_session_min:  90,

  // Age constraints for app usage
  min_age: 13,
  max_age: 100,

  // Body weight constraints
  min_weight_kg: 20,
  max_weight_kg: 500
}

/**
 * Express middleware — clamps calories to safe minimums
 * Attach to routes that accept calorie targets
 */
function enforceCalorieSafety(req, res, next) {
  const { calories, gender } = req.body
  if (calories !== undefined) {
    const floor = gender === 'male' ? LIMITS.min_calories_female : LIMITS.min_calories_male
    req.body.calories = Math.max(floor, Number(calories))
  }
  next()
}

/**
 * Express middleware — validates body stats are in safe ranges
 */
function validateBodyStats(req, res, next) {
  const { age, weight_kg, height_cm } = req.body
  const errors = []

  if (age !== undefined && (age < LIMITS.min_age || age > LIMITS.max_age))
    errors.push(`Age must be between ${LIMITS.min_age} and ${LIMITS.max_age}`)

  if (weight_kg !== undefined && (weight_kg < LIMITS.min_weight_kg || weight_kg > LIMITS.max_weight_kg))
    errors.push(`Weight must be between ${LIMITS.min_weight_kg} and ${LIMITS.max_weight_kg} kg`)

  if (height_cm !== undefined && (height_cm < 100 || height_cm > 250))
    errors.push('Height must be between 100 and 250 cm')

  if (errors.length > 0) return res.status(400).json({ errors })
  next()
}

module.exports = { ...LIMITS, enforceCalorieSafety, validateBodyStats }
