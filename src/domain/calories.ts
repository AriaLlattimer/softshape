import { DEFAULT_EXERCISE_MET, TRANSITION_MET } from '../data/exerciseMets';
import type { ActivityLevel, Exercise, PlanDay, PlannedExercise } from './types';
import { estimateExerciseSeconds, estimatePlanDaySeconds } from './timing';

/**
 * Rough MET-style estimates.
 * kcal ≈ MET × weightKg × hours
 * Comparable in spirit to logging MFP Cardio → “Strength training”
 * (MFP does not calculate calories on individual Strength diary entries).
 */

const SESSION_MET_BY_ACTIVITY: Record<ActivityLevel, number> = {
  sedentary: 3.5,
  light: 4.0,
  moderate: 5.0,
  active: 5.5,
};

export function metForExercise(exercise?: Pick<Exercise, 'met' | 'id'> | null): number {
  if (exercise?.met != null && exercise.met > 0) return exercise.met;
  return DEFAULT_EXERCISE_MET;
}

export function estimateKcalFromMet(
  weightKg: number,
  durationSeconds: number,
  met: number,
): number {
  if (weightKg <= 0 || durationSeconds <= 0 || met <= 0) return 0;
  return met * weightKg * (durationSeconds / 3600);
}

/** Fallback whole-session estimate when exercise breakdown isn’t available. */
export function estimateSessionKcal(
  weightKg: number,
  durationMinutes: number,
  activityLevel: ActivityLevel,
): number {
  if (weightKg <= 0 || durationMinutes <= 0) return 0;
  const met = SESSION_MET_BY_ACTIVITY[activityLevel] ?? 4.5;
  return Math.round(met * weightKg * (durationMinutes / 60));
}

export function estimateExerciseKcal(
  weightKg: number,
  planned: PlannedExercise,
  exercise?: Pick<Exercise, 'met' | 'id' | 'restSeconds'> | null,
): number {
  const seconds = estimateExerciseSeconds(planned, exercise ?? undefined);
  return Math.round(estimateKcalFromMet(weightKg, seconds, metForExercise(exercise)));
}

const TRANSITION_SEC = 25;

export function estimatePlanDayKcal(
  weightKg: number,
  day: PlanDay,
  exerciseById: Map<string, Exercise>,
): number {
  if (day.exercises.length === 0) return 0;
  let total = 0;
  day.exercises.forEach((pe, i) => {
    total += estimateExerciseKcal(weightKg, pe, exerciseById.get(pe.exerciseId));
    if (i < day.exercises.length - 1) {
      total += estimateKcalFromMet(weightKg, TRANSITION_SEC, TRANSITION_MET);
    }
  });
  return Math.round(total);
}

/** Prefer plan breakdown; fall back to flat session MET. */
export function estimateCompletedSessionKcal(opts: {
  weightKg: number;
  durationMinutes: number;
  activityLevel: ActivityLevel;
  day?: PlanDay | null;
  exerciseById?: Map<string, Exercise>;
}): number {
  if (opts.day && opts.exerciseById && opts.day.exercises.length > 0) {
    const planned = estimatePlanDayKcal(opts.weightKg, opts.day, opts.exerciseById);
    // Scale if actual duration differed a lot from plan estimate
    const plannedMinutes = estimatePlanDaySeconds(opts.day, opts.exerciseById) / 60;
    if (plannedMinutes > 0 && opts.durationMinutes > 0) {
      const scale = opts.durationMinutes / plannedMinutes;
      // Only mild scaling so short/long sessions don’t explode
      const clamped = Math.min(1.4, Math.max(0.7, scale));
      return Math.round(planned * clamped);
    }
    return planned;
  }
  return estimateSessionKcal(opts.weightKg, opts.durationMinutes, opts.activityLevel);
}

export function formatKcal(kcal: number): string {
  return `~${Math.round(kcal)} kcal`;
}

export function formatSessionSummary(opts: {
  date: string;
  label: string;
  durationMinutes: number;
  estimatedKcal: number;
  exerciseNames: string[];
}): string {
  const lines = [
    `Feminizing workout — ${opts.label}`,
    `Date: ${opts.date}`,
    `Duration: ${opts.durationMinutes} min`,
    `Estimated calories: ~${opts.estimatedKcal} kcal (MET-based estimate)`,
    `Exercises: ${opts.exerciseNames.join(', ') || '—'}`,
    '',
    'MyFitnessPal tip: log under Cardio → “Strength training” (or a custom cardio exercise)',
    'with this duration and calorie estimate. MFP Strength entries do not add calories.',
  ];
  return lines.join('\n');
}
