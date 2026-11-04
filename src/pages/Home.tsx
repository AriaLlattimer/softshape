import { Link } from 'react-router-dom';
import { ExerciseDetail } from '../components/ExerciseDetail';
import {
  getActivePlan,
  getAllExercises,
  getProfile,
  getSessions,
} from '../db/database';
import { describeGoalBias, parseGoalsNotes } from '../domain/goals';
import { formatHrtBadge } from '../domain/hrt';
import { pickTodaysDay } from '../domain/planGenerator';
import {
  estimateExerciseKcal,
  estimatePlanDayKcal,
  formatKcal,
} from '../domain/calories';
import {
  estimateExerciseSeconds,
  estimatePlanDaySeconds,
  formatDuration,
} from '../domain/timing';
import { useLiveQuery } from '../hooks/useLiveQuery';

export function Home() {
  const { data, loading } = useLiveQuery(async () => {
    const [profile, plan, exercises, sessions] = await Promise.all([
      getProfile(),
      getActivePlan(),
      getAllExercises(),
      getSessions(),
    ]);
    return { profile, plan, exercises, sessions };
  }, []);

  if (loading || !data?.profile) {
    return <p className="muted">Loading…</p>;
  }

  const { profile, plan, exercises, sessions } = data;
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const today = plan ? pickTodaysDay(plan) : null;
  const completed = sessions.filter((s) => s.completedAt);
  const recent = completed.slice(0, 3);
  const goalBias = parseGoalsNotes(profile.goalsNotes);
  const goalLabel = describeGoalBias(goalBias);
  const sessionSeconds = today ? estimatePlanDaySeconds(today, byId) : 0;
  const sessionKcal = today ? estimatePlanDayKcal(profile.weightKg, today, byId) : 0;

  return (
    <div className="page stack">
      <section className="hero-panel">
        <p className="eyebrow">{formatHrtBadge(profile.hrtStartDate)}</p>
        <h1>Today’s shape session</h1>
        <p className="lede">
          Plan scaled to {profile.weightKg} kg · {profile.activityLevel} ·{' '}
          {profile.equipmentAvailable.join(', ')}
          {goalLabel ? ` · goals: ${goalLabel}` : ''}
        </p>
        {today && (
          <>
            <h2 className="session-title">{today.label}</h2>
            <p className="muted">{today.focusSummary}</p>
            <p className="session-time">
              Est. time <strong>{formatDuration(sessionSeconds)}</strong>
              {' · '}
              Est. burn <strong>{formatKcal(sessionKcal)}</strong>
              <span className="muted"> (for MFP Cardio log)</span>
            </p>
            <Link className="btn btn--primary" to="/workout" state={{ planDayId: today.id }}>
              Start workout
            </Link>
          </>
        )}
      </section>

      {today && (
        <section className="panel">
          <header className="panel__header">
            <h2>Moves</h2>
            <p className="muted">Open any exercise for why, how-to, time, and calorie guide.</p>
          </header>
          <div className="stack-sm">
            {today.exercises.map((pe) => {
              const ex = byId.get(pe.exerciseId);
              if (!ex) return null;
              return (
                <div key={pe.exerciseId} className="planned-row">
                  <div className="planned-row__meta">
                    <span>
                      {pe.sets} × {pe.reps}
                    </span>
                    <span className="planned-row__time">
                      {formatDuration(estimateExerciseSeconds(pe, ex))}
                    </span>
                    <span className="planned-row__kcal">
                      {formatKcal(estimateExerciseKcal(profile.weightKg, pe, ex))}
                    </span>
                  </div>
                  <ExerciseDetail
                    exercise={ex}
                    planned={pe}
                    weightKg={profile.weightKg}
                  />
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="panel">
        <header className="panel__header">
          <h2>Recent</h2>
        </header>
        {recent.length === 0 ? (
          <p className="empty">No completed sessions yet — start today’s workout when you’re ready.</p>
        ) : (
          <ul className="list">
            {recent.map((s) => (
              <li key={s.id}>
                <strong>{s.label}</strong>
                <span className="muted">
                  {s.date}
                  {s.estimatedKcal != null ? ` · ~${s.estimatedKcal} kcal` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
        <Link className="text-link" to="/history">
          View history
        </Link>
      </section>
    </div>
  );
}
