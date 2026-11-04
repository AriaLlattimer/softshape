import { useState, type FormEvent } from 'react';
import { ExerciseDetail } from '../components/ExerciseDetail';
import { addExercise, getAllExercises } from '../db/database';
import {
  duckDuckGoSearchUrl,
  searchWger,
  wgerToExercise,
  type WgerSearchResult,
} from '../discover/wger';
import type { Exercise } from '../domain/types';
import { useLiveQuery } from '../hooks/useLiveQuery';

export function Discover() {
  const { data: local = [], reload } = useLiveQuery(getAllExercises, []);
  const [query, setQuery] = useState('glute bridge');
  const [results, setResults] = useState<WgerSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualName, setManualName] = useState('');
  const [manualSteps, setManualSteps] = useState('');
  const [manualWhy, setManualWhy] = useState('');
  const [manualVideo, setManualVideo] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus(null);
    setLoading(true);
    try {
      const found = await searchWger(query);
      setResults(found);
      if (found.length === 0) {
        setStatus('No structured results — try Search the web, then add manually.');
      }
    } catch {
      setError(
        'Could not reach the exercise database (offline or blocked). Use Search the web or add manually — your local catalog still works.',
      );
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  async function importResult(result: WgerSearchResult) {
    const existing = local.find((e) => e.wgerId === result.id || e.id === `wger-${result.id}`);
    if (existing) {
      setStatus(`“${result.name}” is already in your catalog.`);
      return;
    }
    const exercise = wgerToExercise(result);
    if (!result.description.trim()) {
      setStatus('This result has a thin description — edit instructions after import if needed.');
    }
    await addExercise(exercise);
    reload();
    setStatus(`Added “${result.name}” to your local catalog.`);
  }

  async function addManual(e: FormEvent) {
    e.preventDefault();
    if (!manualName.trim()) return;
    const instructions = manualSteps
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    const exercise: Exercise = {
      id: `custom-${Date.now()}`,
      name: manualName.trim(),
      focus: ['glutes'],
      equipment: ['bodyweight'],
      cue: instructions[0]?.slice(0, 100) || 'Move with control.',
      instructions:
        instructions.length > 0
          ? instructions
          : ['Add your own form steps after researching this movement.'],
      why:
        manualWhy.trim() ||
        'Custom exercise — use it if it supports your feminizing lower-body or posture goals.',
      restSeconds: 60,
      met: 3.5,
      videoUrl: manualVideo.trim() || undefined,
      source: 'custom',
      createdAt: new Date().toISOString(),
    };
    await addExercise(exercise);
    setManualName('');
    setManualSteps('');
    setManualWhy('');
    setManualVideo('');
    reload();
    setStatus(`Added “${exercise.name}”.`);
  }

  const customOrImported = local.filter((e) => e.source !== 'seed');

  return (
    <div className="page stack">
      <section className="hero-panel">
        <p className="eyebrow">Optional · online</p>
        <h1>Discover exercises</h1>
        <p className="lede">
          Search when you want new ideas. Nothing is auto-added — you choose what joins your local
          catalog. Core training works fully offline.
        </p>
      </section>

      <form className="panel form" onSubmit={onSearch}>
        <h2>Find exercises online</h2>
        <label>
          Search
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. hip thrust, clamshell"
          />
        </label>
        <div className="row-actions">
          <button type="submit" className="btn btn--primary" disabled={loading}>
            {loading ? 'Searching…' : 'Search database'}
          </button>
          <a
            className="btn btn--ghost"
            href={duckDuckGoSearchUrl(query)}
            target="_blank"
            rel="noreferrer"
          >
            Search the web
          </a>
        </div>
        {error && <p className="error">{error}</p>}
        {status && <p className="success">{status}</p>}
      </form>

      {results.length > 0 && (
        <section className="panel stack-sm">
          <header className="panel__header">
            <h2>Results</h2>
            <p className="muted">Review instructions, then add to your local catalog.</p>
          </header>
          {results.map((r) => {
            const preview = wgerToExercise(r);
            return (
              <div key={r.id} className="discover-card">
                <ExerciseDetail exercise={preview} />
                <button type="button" className="btn btn--primary" onClick={() => importResult(r)}>
                  Add to my catalog
                </button>
              </div>
            );
          })}
        </section>
      )}

      <form className="panel form" onSubmit={addManual}>
        <h2>Add manually</h2>
        <p className="muted">
          After researching form on the web, save the move here with your own how-to steps.
        </p>
        <label>
          Name
          <input value={manualName} onChange={(e) => setManualName(e.target.value)} required />
        </label>
        <label>
          How-to (one step per line)
          <textarea
            rows={4}
            value={manualSteps}
            onChange={(e) => setManualSteps(e.target.value)}
            placeholder={'Set up...\nPerform the move...\nBreathing / tempo...'}
          />
        </label>
        <label>
          Why this helps (optional)
          <input value={manualWhy} onChange={(e) => setManualWhy(e.target.value)} />
        </label>
        <label>
          YouTube form video URL (optional)
          <input
            value={manualVideo}
            onChange={(e) => setManualVideo(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=…"
          />
          <span className="field-hint">Paste a YouTube link to embed form demo in the app.</span>
        </label>
        <button type="submit" className="btn btn--primary">
          Save custom exercise
        </button>
      </form>

      <section className="panel">
        <header className="panel__header">
          <h2>Imported & custom</h2>
        </header>
        {customOrImported.length === 0 ? (
          <p className="empty">Nothing imported yet — your seed catalog is ready offline.</p>
        ) : (
          <div className="stack-sm">
            {customOrImported.map((ex) => (
              <ExerciseDetail key={ex.id} exercise={ex} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
