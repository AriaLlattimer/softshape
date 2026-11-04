import { useEffect, useRef, useState, type FormEvent } from 'react';
import { HeightField } from '../components/HeightField';
import { MfpPanel } from '../components/MfpPanel';
import { WeightField } from '../components/WeightField';
import {
  clearAllUserData,
  exportAllData,
  getProfile,
  importAllData,
  regeneratePlanFromProfile,
  saveProfile,
} from '../db/database';
import {
  ACTIVITY_OPTIONS,
  EQUIPMENT_OPTIONS,
  type ActivityLevel,
  type Equipment,
  type ExportPayload,
  type Profile,
} from '../domain/types';
import { formatHrtBadge } from '../domain/hrt';
import { useLiveQuery } from '../hooks/useLiveQuery';
import {
  fetchSyncStatus,
  isLikelyLanClient,
  lanAccessUrl,
  pullFromLan,
  pushToLan,
  type SyncStatus,
} from '../sync/lanSync';

export function Settings() {
  const { data: profile, reload } = useLiveQuery(getProfile, []);
  const fileRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<Profile | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [syncBusy, setSyncBusy] = useState(false);

  useEffect(() => {
    if (profile) setDraft({ ...profile, equipmentAvailable: [...profile.equipmentAvailable] });
  }, [profile]);

  useEffect(() => {
    let cancelled = false;
    fetchSyncStatus().then((s) => {
      if (!cancelled) setSyncStatus(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function toggleEquipment(eq: Equipment) {
    if (!draft) return;
    const has = draft.equipmentAvailable.includes(eq);
    setDraft({
      ...draft,
      equipmentAvailable: has
        ? draft.equipmentAvailable.filter((e) => e !== eq)
        : [...draft.equipmentAvailable, eq],
    });
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!draft) return;
    setError(null);
    if (draft.weightKg == null || draft.weightKg < 30 || draft.weightKg > 300) {
      setError('Enter a realistic weight in kg (decimals OK, e.g. 72.5).');
      return;
    }
    if (draft.heightCm != null && (draft.heightCm < 100 || draft.heightCm > 250)) {
      setError('Height looks off — check cm or ft/in values.');
      return;
    }
    if (draft.equipmentAvailable.length === 0) {
      setError('Select at least one equipment option.');
      return;
    }
    const next: Profile = {
      ...draft,
      equipmentAvailable: draft.equipmentAvailable.includes('bodyweight')
        ? draft.equipmentAvailable
        : (['bodyweight', ...draft.equipmentAvailable] as Equipment[]),
      updatedAt: new Date().toISOString(),
    };
    await saveProfile(next);
    await regeneratePlanFromProfile();
    setMessage('Profile saved and plan refreshed for upcoming sessions.');
    reload();
  }

  async function onExport() {
    const payload = await exportAllData();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `softshape-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage('Backup downloaded.');
  }

  async function onImportFile(file: File, mode: 'replace' | 'merge') {
    setError(null);
    try {
      const text = await file.text();
      const payload = JSON.parse(text) as ExportPayload;
      if (!payload || typeof payload !== 'object' || !('schemaVersion' in payload)) {
        throw new Error('Unrecognized backup file.');
      }
      await importAllData(payload, mode);
      setMessage(mode === 'replace' ? 'Data replaced from backup.' : 'Data merged from backup.');
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    }
  }

  if (!draft) return <p className="muted">Loading…</p>;

  return (
    <div className="page stack">
      <section className="hero-panel">
        <p className="eyebrow">{formatHrtBadge(draft.hrtStartDate)}</p>
        <h1>Settings & data</h1>
        <p className="lede">Edit profile, refresh your plan, and back up offline.</p>
      </section>

      <form className="panel form" onSubmit={save}>
        <h2>Profile</h2>
        <WeightField
          valueKg={draft.weightKg}
          onChangeKg={(kg) => setDraft({ ...draft, weightKg: kg ?? draft.weightKg })}
          required
        />
        <HeightField
          valueCm={draft.heightCm}
          onChangeCm={(cm) => setDraft({ ...draft, heightCm: cm })}
        />
        <label>
          Activity level
          <select
            value={draft.activityLevel}
            onChange={(e) =>
              setDraft({ ...draft, activityLevel: e.target.value as ActivityLevel })
            }
          >
            {ACTIVITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          HRT start date
          <input
            type="date"
            value={draft.hrtStartDate}
            onChange={(e) => setDraft({ ...draft, hrtStartDate: e.target.value })}
          />
        </label>
        <label>
          Default rest (seconds)
          <input
            type="number"
            min={15}
            max={300}
            value={draft.defaultRestSeconds}
            onChange={(e) =>
              setDraft({ ...draft, defaultRestSeconds: Number(e.target.value) || 60 })
            }
          />
        </label>
        <fieldset>
          <legend>Equipment available</legend>
          <div className="chip-grid">
            {EQUIPMENT_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`chip ${draft.equipmentAvailable.includes(opt.value) ? 'is-on' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={draft.equipmentAvailable.includes(opt.value)}
                  onChange={() => toggleEquipment(opt.value)}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </fieldset>
        <label>
          Goals / notes
          <textarea
            rows={3}
            value={draft.goalsNotes ?? ''}
            onChange={(e) => setDraft({ ...draft, goalsNotes: e.target.value })}
            placeholder="e.g. grow glutes, wider hips, posture, less upper bulk"
          />
          <span className="field-hint">
            Saving refreshes your plan — keywords like glutes, hips, core, posture, mobility, or “no
            bulk” bias which days and exercises you get.
          </span>
        </label>
        {error && <p className="error">{error}</p>}
        {message && <p className="success">{message}</p>}
        <button type="submit" className="btn btn--primary">
          Save & refresh plan
        </button>
      </form>

      <MfpPanel />

      <section className="panel stack-sm">
        <header className="panel__header">
          <h2>Server</h2>
          <p className="muted">
            Start SoftShape from Wofi (“SoftShape”). Stop it here when you’re done so it isn’t
            left running in the background.
          </p>
        </header>
        <button
          type="button"
          className="btn btn--danger"
          onClick={async () => {
            if (!confirm('Stop SoftShape on this computer? Phone access will go offline until you start it again from Wofi.')) {
              return;
            }
            setError(null);
            try {
              await fetch('/api/server/stop', { method: 'POST' });
              setMessage('SoftShape is stopping…');
            } catch {
              setError('Could not reach the server (it may already be stopped).');
            }
          }}
        >
          Stop SoftShape server
        </button>
      </section>

      <section className="panel stack-sm">
        <header className="panel__header">
          <h2>Share between phone & desktop</h2>
          <p className="muted">
            While SoftShape is running on this computer (`npm run dev`), both devices on the same
            Wi‑Fi can push/pull the same data. Open the phone at{' '}
            <strong>{isLikelyLanClient() ? lanAccessUrl() : 'http://YOUR-PC-IP:5173'}</strong>.
          </p>
        </header>
        {syncStatus && (
          <p className="muted">
            {syncStatus.available
              ? syncStatus.hasData
                ? `Shared copy ready${syncStatus.exportedAt ? ` · updated ${new Date(syncStatus.exportedAt).toLocaleString()}` : ''}.`
                : 'No shared copy yet — push from the device that has your data.'
              : syncStatus.message}
          </p>
        )}
        <div className="row-actions">
          <button
            type="button"
            className="btn btn--primary"
            disabled={syncBusy}
            onClick={async () => {
              setError(null);
              setSyncBusy(true);
              try {
                const payload = await exportAllData();
                await pushToLan(payload);
                setSyncStatus(await fetchSyncStatus());
                setMessage('Pushed to Wi‑Fi share. On the other device, tap Pull.');
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Push failed');
              } finally {
                setSyncBusy(false);
              }
            }}
          >
            Push to Wi‑Fi share
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            disabled={syncBusy}
            onClick={async () => {
              setError(null);
              setSyncBusy(true);
              try {
                const payload = await pullFromLan();
                await importAllData(payload, 'replace');
                setSyncStatus(await fetchSyncStatus());
                setMessage('Pulled shared data onto this device.');
                reload();
                window.location.reload();
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Pull failed');
              } finally {
                setSyncBusy(false);
              }
            }}
          >
            Pull from Wi‑Fi share
          </button>
        </div>
      </section>

      <section className="panel stack-sm">
        <header className="panel__header">
          <h2>Backup file</h2>
          <p className="muted">
            Export JSON to back up or move data offline. Import to restore.
          </p>
        </header>
        <div className="row-actions">
          <button type="button" className="btn btn--primary" onClick={onExport}>
            Export JSON
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => {
              fileRef.current?.setAttribute('data-mode', 'merge');
              fileRef.current?.click();
            }}
          >
            Import (merge)
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => {
              fileRef.current?.setAttribute('data-mode', 'replace');
              fileRef.current?.click();
            }}
          >
            Import (replace)
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={async (e) => {
            const file = e.target.files?.[0];
            const mode = (e.target.getAttribute('data-mode') as 'replace' | 'merge') || 'merge';
            if (file) await onImportFile(file, mode);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          className="btn btn--danger"
          onClick={async () => {
            if (
              !confirm(
                'Clear all profile, sessions, and measurements? Seed exercises will be restored.',
              )
            ) {
              return;
            }
            await clearAllUserData();
            setMessage('All user data cleared.');
            reload();
            window.location.href = '/';
          }}
        >
          Clear all data
        </button>
      </section>
    </div>
  );
}
