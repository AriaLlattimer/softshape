import type { Exercise, PlanDay, PlannedExercise } from './types';

const SEC_PER_REP = 3; // controlled tempo assumption
const TRANSITION_SEC = 25; // between exercises

/** Midpoint of a numeric range like "10-12" or "8". */
function midNumber(raw: string): number | null {
  const cleaned = raw.replace(/\/side/i, '').replace(/s\b/i, '').trim();
  const range = cleaned.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/);
  if (range) return (Number(range[1]) + Number(range[2])) / 2;
  const single = cleaned.match(/^(\d+(?:\.\d+)?)/);
  return single ? Number(single[1]) : null;
}

function isTimedHold(reps: string): boolean {
  return /\d+\s*-\s*\d+\s*s\b/i.test(reps) || /^\d+\s*s\b/i.test(reps.trim());
}

function isPerSide(reps: string): boolean {
  return /\/side/i.test(reps);
}

/** Working seconds for one set (not including rest). */
export function estimateSetWorkSeconds(reps: string): number {
  const mid = midNumber(reps);
  if (mid == null) return 40;

  if (isTimedHold(reps)) {
    // hold / timed set — already in seconds
    return Math.round(mid * (isPerSide(reps) ? 2 : 1));
  }

  const repsCount = mid * (isPerSide(reps) ? 2 : 1);
  return Math.round(repsCount * SEC_PER_REP);
}

/**
 * Estimated time for one planned exercise including rests between its sets.
 * Does not include transition to the next exercise.
 */
export function estimateExerciseSeconds(
  planned: PlannedExercise,
  exercise?: Pick<Exercise, 'restSeconds'>,
): number {
  const sets = Math.max(1, planned.sets);
  const work = estimateSetWorkSeconds(planned.reps) * sets;
  const rest = (exercise?.restSeconds ?? 60) * Math.max(0, sets - 1);
  return work + rest;
}

export function estimatePlanDaySeconds(
  day: PlanDay,
  exerciseById: Map<string, Exercise>,
): number {
  if (day.exercises.length === 0) return 0;
  let total = 0;
  day.exercises.forEach((pe, i) => {
    total += estimateExerciseSeconds(pe, exerciseById.get(pe.exerciseId));
    if (i < day.exercises.length - 1) total += TRANSITION_SEC;
  });
  return total;
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  if (s < 60) return `~${s}s`;
  const mins = Math.floor(s / 60);
  const rem = s % 60;
  if (mins < 60) {
    if (rem === 0) return `~${mins} min`;
    if (rem < 15) return `~${mins} min`;
    if (rem > 45) return `~${mins + 1} min`;
    return `~${mins}½ min`;
  }
  const hrs = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `~${hrs} hr` : `~${hrs} hr ${m} min`;
}

export function formatExerciseTiming(
  planned: PlannedExercise,
  exercise?: Pick<Exercise, 'restSeconds'>,
): string {
  const sec = estimateExerciseSeconds(planned, exercise);
  const rest = exercise?.restSeconds ?? 60;
  return `${formatDuration(sec)} · ${planned.sets}×${planned.reps} · ${rest}s rest`;
}
