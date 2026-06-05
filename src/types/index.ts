// ─── Sport (issu de FitTracker) ───────────────────────────────────────────────
export type DisciplineSlug = 'natation' | 'musculation' | 'cardio' | 'boxe'

export interface Discipline {
  id: string
  name: string
  icon: string
  met_default: number
}

export interface Exercise {
  id: string
  discipline_id: string
  name: string
  description: string | null
  illustration_url: string | null
  met_value: number | null
  difficulty: 'débutant' | 'intermédiaire' | 'avancé' | null
}

export interface Session {
  id: string
  user_id: string
  discipline_id: string
  session_date: string
  duration_min: number
  calories_burned: number | null
  notes: string | null
  created_at: string
  discipline?: Discipline
}

export interface SessionExercise {
  id: string
  session_id: string
  exercise_id: string | null
  exercise_name: string
  sets: number | null
  reps: number | null
  duration_sec: number | null
  weight_kg: number | null
}

export interface WeekStats {
  totalSessions: number
  totalCalories: number
  totalMinutes: number
  streak: number
  sessionsByDay: (Session | null)[]
}

// ─── Nutrition (issu de NutriTrack) ───────────────────────────────────────────
export interface JournalEntry {
  id: string
  user_id: string
  date: string
  food_id: string | null
  food_name: string
  food_cat: string | null
  quantity: number
  cal: number
  prot: number
  carb: number
  fat: number
  image_url: string | null
  created_at: string
}

export interface WeightLog {
  id: string
  user_id: string
  date: string
  weight_kg: number
  created_at: string
}

export interface DayMacros {
  cal: number
  prot: number
  carb: number
  fat: number
}

// ─── Profil partagé ───────────────────────────────────────────────────────────
export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  weight_kg: number | null
  height_cm: number | null
  birth_date: string | null
  // Objectifs sport
  goal: string | null
  // Objectifs nutrition
  calorie_target: number | null
  prot_target: number | null
  carb_target: number | null
  fat_target: number | null
  created_at: string
}

// ─── Gamification ─────────────────────────────────────────────────────────────
export interface UserBadge {
  id:        string
  user_id:   string
  badge_key: string
  earned_at: string
}

export interface ChallengeCompletion {
  id:             string
  user_id:        string
  challenge_key:  string
  completed_date: string
  created_at:     string
}

export interface SmokingLog {
  id:         string
  user_id:    string
  log_date:   string
  count:      number
  created_at: string
  updated_at: string
}

// ─── UI helpers ───────────────────────────────────────────────────────────────
export type Module = 'nutrition' | 'sport'
