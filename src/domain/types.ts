export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active';

export type Equipment =
  | 'bodyweight'
  | 'yoga-mat'
  | 'bands'
  | 'dumbbells'
  | 'cable'
  | 'machine'
  | 'barbell'
  | 'kettlebell';

export type FocusTag =
  | 'glutes'
  | 'hips'
  | 'core'
  | 'legs'
  | 'posture'
  | 'upper-light'
  | 'mobility';

export interface Profile {
  id: string;
  weightKg: number;
  heightCm?: number;
  activityLevel: ActivityLevel;
  hrtStartDate: string; // YYYY-MM-DD
  goalsNotes?: string;
  equipmentAvailable: Equipment[];
  defaultRestSeconds: number;
  onboardingComplete: boolean;
  updatedAt: string;
}

export interface Exercise {
  id: string;
  name: string;
  focus: FocusTag[];
  equipment: Equipment[];
  cue: string;
  instructions: string[];
  avoid?: string[];
  why: string;
  restSeconds: number;
  /**
   * Metabolic equivalent for calorie estimates (kcal ≈ MET × kg × hours).
   * Rough — similar ballpark to MFP cardio “Strength training”, not lab-accurate.
   */
  met?: number;
  /** Optional YouTube watch URL or video id for an in-app form embed */
  videoUrl?: string;
  source: 'seed' | 'wger' | 'custom';
  wgerId?: number;
  createdAt: string;
}

export interface PlannedExercise {
  exerciseId: string;
  sets: number;
  reps: string; // e.g. "10-12" or "8"
  notes?: string;
}

export interface PlanDay {
  id: string;
  dayIndex: number; // 0-6 Sun-Sat or relative day in week
  label: string;
  focusSummary: string;
  exercises: PlannedExercise[];
}

export interface WorkoutPlan {
  id: string;
  generatedAt: string;
  activityLevel: ActivityLevel;
  equipmentAvailable: Equipment[];
  days: PlanDay[];
}

export interface SetLog {
  id: string;
  setNumber: number;
  reps?: number;
  weightKg?: number;
  rpe?: number;
  completed: boolean;
}

export interface SessionExercise {
  exerciseId: string;
  sets: SetLog[];
  notes?: string;
}

export interface WorkoutSession {
  id: string;
  date: string; // YYYY-MM-DD
  planDayId?: string;
  label: string;
  startedAt: string;
  completedAt?: string;
  durationMinutes?: number;
  exercises: SessionExercise[];
  estimatedKcal?: number;
  notes?: string;
}

export interface Measurement {
  id: string;
  date: string;
  weightKg?: number;
  waistCm?: number;
  hipsCm?: number;
  bustCm?: number;
  thighCm?: number;
  armCm?: number;
  notes?: string;
  createdAt: string;
}

export interface AppMeta {
  id: string;
  schemaVersion: number;
  seededAt?: string;
}

export interface ExportPayload {
  schemaVersion: number;
  exportedAt: string;
  profile: Profile | null;
  exercises: Exercise[];
  plan: WorkoutPlan | null;
  sessions: WorkoutSession[];
  measurements: Measurement[];
}

export const EQUIPMENT_OPTIONS: { value: Equipment; label: string }[] = [
  { value: 'bodyweight', label: 'Bodyweight' },
  { value: 'yoga-mat', label: 'Yoga mat' },
  { value: 'bands', label: 'Resistance bands' },
  { value: 'dumbbells', label: 'Dumbbells' },
  { value: 'cable', label: 'Cable machine' },
  { value: 'machine', label: 'Gym machines' },
  { value: 'barbell', label: 'Barbell' },
  { value: 'kettlebell', label: 'Kettlebell' },
];

export const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; hint: string }[] = [
  { value: 'sedentary', label: 'Sedentary', hint: '2–3 sessions / week' },
  { value: 'light', label: 'Lightly active', hint: '3 sessions / week' },
  { value: 'moderate', label: 'Moderately active', hint: '4 sessions / week' },
  { value: 'active', label: 'Active', hint: '4–5 sessions / week' },
];
