import { Link } from 'react-router-dom';
import { MfpPanel } from '../components/MfpPanel';
import { getAllExercises, getSessions } from '../db/database';
import { formatSessionSummary } from '../domain/calories';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { useMemo, useState } from 'react';

export function History() {
  const { data, loading } = useLiveQuery(async () => {
    const [sessions, exercises] = await Promise.all([getSessions(), getAllExercises()]);
    return { sessions, exercises };
  }, []);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const byId = useMemo(
    () => new Map((data?.exercises ?? []).map((e) => [e.id, e])),
    [data?.exercises],
  );

  if (loading || !data) return <p className="muted">Loading…</p>;

  const completed = data.sessions.filter((s) => s.completedAt);
  const selected = completed.find((s) => s.id === selectedId) ?? completed[0];

  const summary =
    selected &&
    formatSessionSummary({
      date: selected.date,
      label: selected.label,
      durationMinutes: selected.durationMinutes ?? 0,
      estimatedKcal: selected.estimatedKcal ?? 0,
      exerciseNames: selected.exercises
        .map((se) => byId.get(se.exerciseId)?.name)
        .filter(Boolean) as string[],
    });

  return (
    <div className="page stack">
      <section className="hero-panel">
        <p className="eyebrow">Log</p>
        <h1>Workout history</h1>
        <p className="lede">Past sessions stay on this device. Re-copy MFP summaries anytime.</p>
      </section>

      {completed.length === 0 ? (
        <section className="panel empty">
          <p>No completed workouts yet.</p>
          <Link className="btn btn--primary" to="/workout">
            Start a workout
          </Link>
        </section>
      ) : (
        <>
          <section className="panel">
            <ul className="list">
              {completed.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className={`list-select ${selected?.id === s.id ? 'is-active' : ''}`}
                    onClick={() => setSelectedId(s.id)}
                  >
                    <strong>{s.label}</strong>
                    <span className="muted">
                      {s.date}
                      {s.durationMinutes != null ? ` · ${s.durationMinutes} min` : ''}
                      {s.estimatedKcal != null ? ` · ~${s.estimatedKcal} kcal` : ''}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {selected && (
            <section className="panel">
              <header className="panel__header">
                <h2>{selected.label}</h2>
                <p className="muted">{selected.date}</p>
              </header>
              <ul className="list">
                {selected.exercises.map((se) => (
                  <li key={se.exerciseId}>
                    <strong>{byId.get(se.exerciseId)?.name ?? se.exerciseId}</strong>
                    <span className="muted">
                      {se.sets.filter((x) => x.completed).length}/{se.sets.length} sets logged
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {selected && summary && (
            <MfpPanel
              compact
              summaryText={summary}
              durationMinutes={selected.durationMinutes}
              estimatedKcal={selected.estimatedKcal}
            />
          )}
        </>
      )}
    </div>
  );
}
