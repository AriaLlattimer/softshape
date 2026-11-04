import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ExerciseDetail } from '../components/ExerciseDetail';
import { MfpPanel } from '../components/MfpPanel';
import { RestTimer } from '../components/RestTimer';
import {
  getActivePlan,
  getAllExercises,
  getProfile,
  saveSession,
} from '../db/database';
import {
  estimateCompletedSessionKcal,
  estimateExerciseKcal,
  estimatePlanDayKcal,
  formatKcal,
  formatSessionSummary,
} from '../domain/calories';
import { pickTodaysDay } from '../domain/planGenerator';
import {
  estimateExerciseSeconds,
  estimatePlanDaySeconds,
  formatDuration,
} from '../domain/timing';
import type { PlannedExercise, SessionExercise, SetLog, WorkoutSession } from '../domain/types';
import { useLiveQuery } from '../hooks/useLiveQuery';

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function Workout() {
  const location = useLocation();
  const planDayId = (location.state as { planDayId?: string } | null)?.planDayId;

  const { data, loading } = useLiveQuery(async () => {
    const [profile, plan, exercises] = await Promise.all([
      getProfile(),
      getActivePlan(),
      getAllExercises(),
    ]);
    return { profile, plan, exercises };
  }, []);

  const day = useMemo(() => {
    if (!data?.plan) return null;
    if (planDayId) {
      return data.plan.days.find((d) => d.id === planDayId) ?? pickTodaysDay(data.plan);
    }
    return pickTodaysDay(data.plan);
  }, [data?.plan, planDayId]);

  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [activeExerciseIdx, setActiveExerciseIdx] = useState(0);
  const [restFor, setRestFor] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const [summary, setSummary] = useState<{
    durationMinutes: number;
    estimatedKcal: number;
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!data?.profile || !day || session) return;
    const exercises: SessionExercise[] = day.exercises.map((pe) => ({
      exerciseId: pe.exerciseId,
      sets: Array.from({ length: pe.sets }, (_, i) => ({
        id: newId('set'),
        setNumber: i + 1,
        reps: Number(String(pe.reps).split('-')[0]) || 10,
        completed: false,
      })),
    }));
    setSession({
      id: newId('session'),
      date: new Date().toISOString().slice(0, 10),
      planDayId: day.id,
      label: day.label,
      startedAt: new Date().toISOString(),
      exercises,
    });
  }, [data?.profile, day, session]);

  if (loading || !data?.profile) return <p className="muted">Loading…</p>;
  if (!day || !session) {
    return (
      <div className="panel empty">
        <p>No plan day available. Finish onboarding or regenerate your plan in Settings.</p>
        <Link to="/settings">Go to Settings</Link>
      </div>
    );
  }

  const byId = new Map(data.exercises.map((e) => [e.id, e]));
  const current = session.exercises[activeExerciseIdx];
  const currentEx = current ? byId.get(current.exerciseId) : undefined;
  const plannedForCurrent: PlannedExercise | undefined = day.exercises.find(
    (pe) => pe.exerciseId === current?.exerciseId,
  ) ?? (current
    ? {
        exerciseId: current.exerciseId,
        sets: current.sets.length,
        reps: String(current.sets[0]?.reps ?? 10),
      }
    : undefined);
  const sessionEstimate = formatDuration(estimatePlanDaySeconds(day, byId));
  const sessionKcalEst = formatKcal(
    estimatePlanDayKcal(data.profile.weightKg, day, byId),
  );
  const exerciseEstimate =
    plannedForCurrent && currentEx
      ? formatDuration(estimateExerciseSeconds(plannedForCurrent, currentEx))
      : null;
  const exerciseKcal =
    plannedForCurrent && currentEx
      ? formatKcal(
          estimateExerciseKcal(data.profile.weightKg, plannedForCurrent, currentEx),
        )
      : null;

  function updateSet(setId: string, patch: Partial<SetLog>) {
    setSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.map((ex, idx) =>
          idx !== activeExerciseIdx
            ? ex
            : {
                ...ex,
                sets: ex.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)),
              },
        ),
      };
    });
  }

  function completeSet(set: SetLog) {
    updateSet(set.id, { completed: true });
    const rest =
      currentEx?.restSeconds ?? data!.profile!.defaultRestSeconds ?? 60;
    setRestFor(rest);
  }

  async function completeWorkout() {
    if (!session || !data?.profile) return;
    const ended = new Date();
    const started = new Date(session.startedAt);
    const durationMinutes = Math.max(
      1,
      Math.round((ended.getTime() - started.getTime()) / 60000),
    );
    const estimatedKcal = estimateCompletedSessionKcal({
      weightKg: data.profile.weightKg,
      durationMinutes,
      activityLevel: data.profile.activityLevel,
      day,
      exerciseById: byId,
    });
    const names = session.exercises
      .map((se) => byId.get(se.exerciseId)?.name)
      .filter(Boolean) as string[];
    const completed: WorkoutSession = {
      ...session,
      completedAt: ended.toISOString(),
      durationMinutes,
      estimatedKcal,
    };
    await saveSession(completed);
    setSession(completed);
    setFinished(true);
    setRestFor(null);
    setSummary({
      durationMinutes,
      estimatedKcal,
      text: formatSessionSummary({
        date: completed.date,
        label: completed.label,
        durationMinutes,
        estimatedKcal,
        exerciseNames: names,
      }),
    });
  }

  if (finished && summary) {
    return (
      <div className="page stack">
        <section className="hero-panel">
          <p className="eyebrow">Session complete</p>
          <h1>{session.label}</h1>
          <p className="lede">
            {summary.durationMinutes} min · ~{summary.estimatedKcal} kcal (estimate)
          </p>
          <Link className="btn btn--ghost" to="/">
            Back home
          </Link>
        </section>
        <MfpPanel
          summaryText={summary.text}
          durationMinutes={summary.durationMinutes}
          estimatedKcal={summary.estimatedKcal}
        />
      </div>
    );
  }

  return (
    <div className="page stack">
      <section className="hero-panel">
        <p className="eyebrow">In session</p>
        <h1>{session.label}</h1>
        <p className="muted">{day.focusSummary}</p>
        <p className="session-time">
          Session guide: <strong>{sessionEstimate}</strong> · <strong>{sessionKcalEst}</strong>
          {exerciseEstimate ? (
            <>
              {' '}
              · this move: <strong>{exerciseEstimate}</strong>
              {exerciseKcal ? (
                <>
                  {' '}
                  · <strong>{exerciseKcal}</strong>
                </>
              ) : null}
            </>
          ) : null}
        </p>
      </section>

      <div className="exercise-tabs">
        {session.exercises.map((se, idx) => {
          const ex = byId.get(se.exerciseId);
          const done = se.sets.every((s) => s.completed);
          return (
            <button
              key={se.exerciseId}
              type="button"
              className={`exercise-tab ${idx === activeExerciseIdx ? 'is-active' : ''} ${done ? 'is-done' : ''}`}
              onClick={() => setActiveExerciseIdx(idx)}
            >
              {ex?.name ?? 'Exercise'}
            </button>
          );
        })}
      </div>

      {currentEx && current && (
        <section className="panel stack-sm">
          <ExerciseDetail
            exercise={currentEx}
            planned={plannedForCurrent}
            weightKg={data.profile.weightKg}
            defaultOpen
          />

          <div className="sets">
            {current.sets.map((set) => (
              <div key={set.id} className={`set-row ${set.completed ? 'is-done' : ''}`}>
                <span className="set-row__num">Set {set.setNumber}</span>
                <label>
                  Reps
                  <input
                    type="number"
                    min={0}
                    value={set.reps ?? ''}
                    onChange={(e) =>
                      updateSet(set.id, { reps: e.target.value ? Number(e.target.value) : undefined })
                    }
                  />
                </label>
                <label>
                  Load (kg)
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={set.weightKg ?? ''}
                    onChange={(e) =>
                      updateSet(set.id, {
                        weightKg: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                  />
                </label>
                <label>
                  RPE
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={set.rpe ?? ''}
                    onChange={(e) =>
                      updateSet(set.id, { rpe: e.target.value ? Number(e.target.value) : undefined })
                    }
                  />
                </label>
                <button
                  type="button"
                  className="btn btn--primary"
                  disabled={set.completed}
                  onClick={() => completeSet(set)}
                >
                  {set.completed ? 'Done' : 'Log set'}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <RestTimer
        seconds={restFor ?? 60}
        active={restFor != null}
        onDismiss={() => setRestFor(null)}
        onDone={() => setRestFor(null)}
      />

      <div className="row-actions">
        <button
          type="button"
          className="btn btn--ghost"
          disabled={activeExerciseIdx <= 0}
          onClick={() => setActiveExerciseIdx((i) => i - 1)}
        >
          Previous
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          disabled={activeExerciseIdx >= session.exercises.length - 1}
          onClick={() => setActiveExerciseIdx((i) => i + 1)}
        >
          Next exercise
        </button>
        <button type="button" className="btn btn--primary" onClick={completeWorkout}>
          Finish workout
        </button>
      </div>
    </div>
  );
}
