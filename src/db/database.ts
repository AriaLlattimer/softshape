import Dexie, { type EntityTable } from 'dexie';
import { SEED_EXERCISES } from '../data/exercises';
import { generatePlan } from '../domain/planGenerator';
import type {
  AppMeta,
  Exercise,
  ExportPayload,
  Measurement,
  Profile,
  WorkoutPlan,
  WorkoutSession,
} from '../domain/types';

const SCHEMA_VERSION = 1;

export class WorkoutDB extends Dexie {
  profile!: EntityTable<Profile, 'id'>;
  exercises!: EntityTable<Exercise, 'id'>;
  plan!: EntityTable<WorkoutPlan, 'id'>;
  sessions!: EntityTable<WorkoutSession, 'id'>;
  measurements!: EntityTable<Measurement, 'id'>;
  meta!: EntityTable<AppMeta, 'id'>;

  constructor() {
    super('mtfFeminizingWorkout');
    this.version(1).stores({
      profile: 'id',
      exercises: 'id, name, source',
      plan: 'id',
      sessions: 'id, date, completedAt',
      measurements: 'id, date',
      meta: 'id',
    });
  }
}

export const db = new WorkoutDB();

export async function ensureSeeded(): Promise<void> {
  await db.transaction('rw', db.exercises, db.meta, async () => {
    const existing = await db.exercises.count();
    if (existing === 0) {
      await db.exercises.bulkAdd(SEED_EXERCISES);
    } else {
      // Refresh curated seed rows, but keep user-pasted video URLs
      const current = await db.exercises.bulkGet(SEED_EXERCISES.map((e) => e.id));
      const merged = SEED_EXERCISES.map((seedEx, i) => {
        const prev = current[i];
        if (prev?.videoUrl) {
          return { ...seedEx, videoUrl: prev.videoUrl, met: seedEx.met ?? prev.met };
        }
        return seedEx;
      });
      await db.exercises.bulkPut(merged);
    }
    await db.meta.put({
      id: 'app',
      schemaVersion: SCHEMA_VERSION,
      seededAt: new Date().toISOString(),
    });
  });
}

export async function getProfile(): Promise<Profile | undefined> {
  return db.profile.get('me');
}

export async function saveProfile(profile: Profile): Promise<void> {
  await db.profile.put(profile);
}

export async function getAllExercises(): Promise<Exercise[]> {
  return db.exercises.toArray();
}

export async function getExerciseMap(): Promise<Map<string, Exercise>> {
  const all = await getAllExercises();
  return new Map(all.map((e) => [e.id, e]));
}

export async function getActivePlan(): Promise<WorkoutPlan | undefined> {
  const plans = await db.plan.toArray();
  return plans.sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))[0];
}

export async function savePlan(plan: WorkoutPlan): Promise<void> {
  await db.plan.clear();
  await db.plan.put(plan);
}

export async function regeneratePlanFromProfile(): Promise<WorkoutPlan | null> {
  const profile = await getProfile();
  if (!profile) return null;
  const exercises = await getAllExercises();
  const plan = generatePlan(
    exercises,
    profile.activityLevel,
    profile.equipmentAvailable,
    profile.goalsNotes,
  );
  await savePlan(plan);
  return plan;
}

export async function addExercise(exercise: Exercise): Promise<void> {
  await db.exercises.put(exercise);
}

export async function updateExerciseVideoUrl(
  exerciseId: string,
  videoUrl: string,
): Promise<void> {
  const existing = await db.exercises.get(exerciseId);
  if (!existing) throw new Error('Exercise not found');
  await db.exercises.put({ ...existing, videoUrl });
}

export async function saveSession(session: WorkoutSession): Promise<void> {
  await db.sessions.put(session);
}

export async function getSessions(): Promise<WorkoutSession[]> {
  const all = await db.sessions.toArray();
  return all.sort((a, b) => b.date.localeCompare(a.date) || b.startedAt.localeCompare(a.startedAt));
}

export async function getMeasurements(): Promise<Measurement[]> {
  const all = await db.measurements.toArray();
  return all.sort((a, b) => a.date.localeCompare(b.date));
}

export async function saveMeasurement(m: Measurement): Promise<void> {
  await db.measurements.put(m);
}

export async function deleteMeasurement(id: string): Promise<void> {
  await db.measurements.delete(id);
}

export async function exportAllData(): Promise<ExportPayload> {
  const [profile, exercises, plan, sessions, measurements] = await Promise.all([
    getProfile(),
    getAllExercises(),
    getActivePlan(),
    getSessions(),
    db.measurements.toArray(),
  ]);
  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    profile: profile ?? null,
    exercises,
    plan: plan ?? null,
    sessions,
    measurements,
  };
}

export async function importAllData(
  payload: ExportPayload,
  mode: 'replace' | 'merge',
): Promise<void> {
  if (mode === 'replace') {
    await db.transaction('rw', db.tables, async () => {
      await Promise.all([
        db.profile.clear(),
        db.exercises.clear(),
        db.plan.clear(),
        db.sessions.clear(),
        db.measurements.clear(),
      ]);
      if (payload.profile) await db.profile.put(payload.profile);
      if (payload.exercises?.length) await db.exercises.bulkPut(payload.exercises);
      if (payload.plan) await db.plan.put(payload.plan);
      if (payload.sessions?.length) await db.sessions.bulkPut(payload.sessions);
      if (payload.measurements?.length) await db.measurements.bulkPut(payload.measurements);
      await db.meta.put({
        id: 'app',
        schemaVersion: SCHEMA_VERSION,
        seededAt: new Date().toISOString(),
      });
    });
    return;
  }

  // merge
  await db.transaction('rw', db.tables, async () => {
    if (payload.profile) await db.profile.put(payload.profile);
    if (payload.exercises?.length) await db.exercises.bulkPut(payload.exercises);
    if (payload.plan) await db.plan.put(payload.plan);
    if (payload.sessions?.length) await db.sessions.bulkPut(payload.sessions);
    if (payload.measurements?.length) await db.measurements.bulkPut(payload.measurements);
  });
}

export async function clearAllUserData(): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all([
      db.profile.clear(),
      db.exercises.clear(),
      db.plan.clear(),
      db.sessions.clear(),
      db.measurements.clear(),
      db.meta.clear(),
    ]);
  });
  await ensureSeeded();
}
