import { describeGoalBias, parseGoalsNotes, type GoalBias } from './goals';
import type {
  ActivityLevel,
  Equipment,
  Exercise,
  FocusTag,
  PlanDay,
  PlannedExercise,
  WorkoutPlan,
} from './types';

const DAYS_BY_ACTIVITY: Record<ActivityLevel, number> = {
  sedentary: 2,
  light: 3,
  moderate: 4,
  active: 5,
};

interface DayTemplate {
  id: string;
  label: string;
  focusSummary: string;
  focuses: FocusTag[];
  slots: { focus: FocusTag; sets: number; reps: string }[];
}

const DAY_TEMPLATES: DayTemplate[] = [
  {
    id: 'glute-hip',
    label: 'Glute & Hip Shape',
    focusSummary: 'Glute shelf, outer hips, light core',
    focuses: ['glutes', 'hips'],
    slots: [
      { focus: 'glutes', sets: 3, reps: '10-12' },
      { focus: 'glutes', sets: 3, reps: '12-15' },
      { focus: 'hips', sets: 3, reps: '12-15' },
      { focus: 'core', sets: 2, reps: '10/side' },
      { focus: 'mobility', sets: 1, reps: '30-40s' },
    ],
  },
  {
    id: 'lower-sculpt',
    label: 'Lower Body Sculpt',
    focusSummary: 'Legs + glutes, upright posture finish',
    focuses: ['legs', 'glutes'],
    slots: [
      { focus: 'legs', sets: 3, reps: '8-12' },
      { focus: 'glutes', sets: 3, reps: '10-12' },
      { focus: 'hips', sets: 2, reps: '12-15' },
      { focus: 'posture', sets: 2, reps: '12-15' },
      { focus: 'core', sets: 2, reps: '8-10' },
    ],
  },
  {
    id: 'core-posture',
    label: 'Core & Posture',
    focusSummary: 'Waist control, posture, light upper',
    focuses: ['core', 'posture'],
    slots: [
      { focus: 'core', sets: 3, reps: '8-12' },
      { focus: 'core', sets: 2, reps: '20-40s' },
      { focus: 'posture', sets: 3, reps: '12-15' },
      { focus: 'upper-light', sets: 2, reps: '12-15' },
      { focus: 'mobility', sets: 2, reps: '30-40s' },
    ],
  },
  {
    id: 'hip-width',
    label: 'Hip Width Focus',
    focusSummary: 'Outer hips, glutes, gentle mobility',
    focuses: ['hips', 'glutes'],
    slots: [
      { focus: 'hips', sets: 3, reps: '12-15' },
      { focus: 'hips', sets: 3, reps: '12-20' },
      { focus: 'glutes', sets: 3, reps: '12-15' },
      { focus: 'glutes', sets: 2, reps: '15-20' },
      { focus: 'mobility', sets: 2, reps: '30-40s' },
    ],
  },
  {
    id: 'full-lower',
    label: 'Full Lower Soft Day',
    focusSummary: 'Full lower emphasis, minimal upper load',
    focuses: ['glutes', 'legs', 'hips'],
    slots: [
      { focus: 'glutes', sets: 3, reps: '8-12' },
      { focus: 'legs', sets: 3, reps: '10-12' },
      { focus: 'hips', sets: 3, reps: '12-15' },
      { focus: 'core', sets: 2, reps: '10-12' },
      { focus: 'posture', sets: 2, reps: '12-15' },
    ],
  },
];

function canUseExercise(ex: Exercise, available: Equipment[]): boolean {
  if (available.length === 0) return ex.equipment.includes('bodyweight');
  return ex.equipment.some((eq) => available.includes(eq));
}

function templateScore(template: DayTemplate, bias: GoalBias): number {
  let score = 0;
  for (let i = 0; i < bias.priorities.length; i++) {
    const tag = bias.priorities[i];
    const weight = bias.priorities.length - i;
    if (template.focuses.includes(tag)) score += weight * 3;
    const slotHits = template.slots.filter((s) => s.focus === tag).length;
    score += slotHits * weight;
  }
  if (bias.preferMobility && template.focuses.includes('mobility')) score += 8;
  if (bias.softenUpper && template.id === 'full-lower') score += 6;
  if (bias.softenUpper && template.id === 'core-posture') score -= 2;
  return score;
}

function orderTemplates(bias: GoalBias): DayTemplate[] {
  return [...DAY_TEMPLATES].sort((a, b) => templateScore(b, bias) - templateScore(a, bias));
}

function adaptSlots(
  slots: DayTemplate['slots'],
  bias: GoalBias,
): DayTemplate['slots'] {
  const top = bias.priorities[0];
  if (!top || bias.themes.length === 0) return slots;

  const adapted = slots.map((s) => ({ ...s }));

  // Boost volume on the top priority focus
  for (const slot of adapted) {
    if (slot.focus === top) {
      slot.sets = Math.min(slot.sets + 1, 4);
    }
  }

  // Soften heavy upper emphasis if requested
  if (bias.softenUpper) {
    for (const slot of adapted) {
      if (slot.focus === 'upper-light') {
        slot.sets = Math.max(1, slot.sets - 1);
        slot.reps = '12-15';
      }
    }
  }

  // Swap a low-priority slot toward the #1 goal if missing
  if (!adapted.some((s) => s.focus === top)) {
    const replaceIdx = adapted.findIndex(
      (s) => s.focus !== top && !bias.priorities.slice(0, 2).includes(s.focus),
    );
    if (replaceIdx >= 0) {
      adapted[replaceIdx] = { focus: top, sets: 3, reps: '10-12' };
    }
  }

  return adapted;
}

function exerciseGoalScore(ex: Exercise, bias: GoalBias, available: Equipment[]): number {
  let score = 0;
  const haystack = `${ex.name} ${ex.why} ${ex.cue} ${ex.focus.join(' ')}`.toLowerCase();

  if (bias.themes.length > 0) {
    for (let i = 0; i < bias.priorities.length; i++) {
      const tag = bias.priorities[i];
      if (ex.focus.includes(tag)) score += (bias.priorities.length - i) * 2;
    }
    for (const kw of bias.keywords) {
      if (haystack.includes(kw.toLowerCase())) score += 3;
    }
    if (bias.softenUpper && ex.focus.includes('upper-light') && !ex.focus.includes('posture')) {
      score -= 2;
    }
  }

  // Prefer floor work when a yoga mat is available
  if (available.includes('yoga-mat') && ex.equipment.includes('yoga-mat')) {
    score += 2;
  }

  return score;
}

function pickExercise(
  catalog: Exercise[],
  focus: FocusTag,
  available: Equipment[],
  usedIds: Set<string>,
  bias: GoalBias,
): Exercise | undefined {
  const candidates = catalog.filter(
    (ex) =>
      ex.focus.includes(focus) &&
      canUseExercise(ex, available) &&
      !usedIds.has(ex.id),
  );
  if (candidates.length === 0) return undefined;

  return [...candidates].sort((a, b) => {
    const scoreDiff =
      exerciseGoalScore(b, bias, available) - exerciseGoalScore(a, bias, available);
    if (scoreDiff !== 0) return scoreDiff;
    return a.name.localeCompare(b.name);
  })[0];
}

function buildDay(
  template: DayTemplate,
  dayIndex: number,
  catalog: Exercise[],
  available: Equipment[],
  bias: GoalBias,
): PlanDay {
  const used = new Set<string>();
  const exercises: PlannedExercise[] = [];
  const slots = adaptSlots(template.slots, bias);
  const themeNote = describeGoalBias(bias);

  for (const slot of slots) {
    const ex = pickExercise(catalog, slot.focus, available, used, bias);
    if (!ex) continue;
    used.add(ex.id);
    exercises.push({
      exerciseId: ex.id,
      sets: slot.sets,
      reps: slot.reps,
    });
  }

  if (exercises.length < 3) {
    const fallbackFocus = bias.priorities[0] ?? 'glutes';
    const ranked = [...catalog].sort(
      (a, b) =>
        exerciseGoalScore(b, bias, available) - exerciseGoalScore(a, bias, available),
    );
    for (const ex of ranked) {
      if (exercises.length >= 4) break;
      if (!canUseExercise(ex, available) || used.has(ex.id)) continue;
      if (!ex.focus.includes(fallbackFocus) && exercises.length >= 2) continue;
      used.add(ex.id);
      exercises.push({ exerciseId: ex.id, sets: 3, reps: '10-12' });
    }
  }

  return {
    id: `day-${dayIndex}`,
    dayIndex,
    label: template.label,
    focusSummary: themeNote
      ? `${template.focusSummary} · tuned for ${themeNote}`
      : template.focusSummary,
    exercises,
  };
}

export function generatePlan(
  catalog: Exercise[],
  activityLevel: ActivityLevel,
  equipmentAvailable: Equipment[],
  goalsNotes?: string,
): WorkoutPlan {
  const bias = parseGoalsNotes(goalsNotes);
  const dayCount = DAYS_BY_ACTIVITY[activityLevel];
  const available =
    equipmentAvailable.length > 0 ? equipmentAvailable : (['bodyweight'] as Equipment[]);
  const templates = orderTemplates(bias);

  const days: PlanDay[] = [];
  for (let i = 0; i < dayCount; i++) {
    const template = templates[i % templates.length];
    days.push(buildDay(template, i, catalog, available, bias));
  }

  return {
    id: `plan-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    activityLevel,
    equipmentAvailable: available,
    days,
  };
}

/** Pick today's suggested day by rotating through plan days by weekday. */
export function pickTodaysDay(plan: WorkoutPlan, date = new Date()): PlanDay {
  if (plan.days.length === 0) {
    return {
      id: 'day-empty',
      dayIndex: 0,
      label: 'Rest / mobility',
      focusSummary: 'No plan days yet',
      exercises: [],
    };
  }
  const idx = date.getDay() % plan.days.length;
  return plan.days[idx] ?? plan.days[0];
}
