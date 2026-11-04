import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { HeightField } from '../components/HeightField';
import { WeightField } from '../components/WeightField';
import { importAllData, regeneratePlanFromProfile, saveProfile } from '../db/database';
import {
  ACTIVITY_OPTIONS,
  EQUIPMENT_OPTIONS,
  type ActivityLevel,
  type Equipment,
  type Profile,
} from '../domain/types';
import {
  fetchSyncStatus,
  pullFromLan,
  type SyncStatus,
} from '../sync/lanSync';

export function Onboarding() {
  const navigate = useNavigate();
  const [weightKg, setWeightKg] = useState<number | undefined>(70);
  const [heightCm, setHeightCm] = useState<number | undefined>(undefined);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('light');
  const [hrtStartDate, setHrtStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [equipment, setEquipment] = useState<Equipment[]>(['bodyweight', 'yoga-mat']);
  const [goalsNotes, setGoalsNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);

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
    setEquipment((prev) =>
      prev.includes(eq) ? prev.filter((e) => e !== eq) : [...prev, eq],
    );
  }

  async function loadFromComputer() {
    setError(null);
    setPulling(true);
    try {
      const payload = await pullFromLan();
      await importAllData(payload, 'replace');
      window.location.href = '/';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load shared data');
      setSyncStatus(await fetchSyncStatus());
    } finally {
      setPulling(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (weightKg == null || weightKg < 30 || weightKg > 300) {
      setError('Enter a realistic weight in kg (decimals OK, e.g. 72.5).');
      return;
    }
    if (equipment.length === 0) {
      setError('Select at least one equipment option (bodyweight is fine).');
      return;
    }
    if (heightCm != null && (heightCm < 100 || heightCm > 250)) {
      setError('Height looks off — check cm or ft/in values.');
      return;
    }
    setSaving(true);
    try {
      const profile: Profile = {
        id: 'me',
        weightKg,
        heightCm,
        activityLevel,
        hrtStartDate,
        goalsNotes: goalsNotes.trim() || undefined,
        equipmentAvailable: equipment.includes('bodyweight')
          ? equipment
          : (['bodyweight', ...equipment] as Equipment[]),
        defaultRestSeconds: 60,
        onboardingComplete: true,
        updatedAt: new Date().toISOString(),
      };
      await saveProfile(profile);
      await regeneratePlanFromProfile();
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save profile');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="onboarding">
      <div className="onboarding__hero">
        <p className="eyebrow">Welcome</p>
        <h1>SoftShape</h1>
        <p className="lede">
          A calm, local-first tracker for feminizing lower-body training while on MTF HRT.
        </p>
      </div>

      <section className="panel stack-sm">
        <header className="panel__header">
          <h2>Already set up on your computer?</h2>
          <p className="muted">
            Phone browsers start empty. Load the shared copy from your PC (same Wi‑Fi, SoftShape
            running with <code>npm run dev</code>).
          </p>
        </header>
        {syncStatus?.hasData ? (
          <p className="success">Shared data found — you can load it now.</p>
        ) : (
          <ol className="mfp-steps">
            <li>
              <strong>On your computer</strong>
              <span>Open SoftShape → Settings → Push to Wi‑Fi share</span>
            </li>
            <li>
              <strong>Then here on your phone</strong>
              <span>Tap the button below (or refresh this page first)</span>
            </li>
          </ol>
        )}
        <button
          type="button"
          className="btn btn--primary"
          disabled={pulling}
          onClick={loadFromComputer}
        >
          {pulling ? 'Loading…' : 'Load shared data from computer'}
        </button>
        {syncStatus && !syncStatus.hasData && syncStatus.message && (
          <p className="muted">{syncStatus.message}</p>
        )}
      </section>

      <form className="panel form" onSubmit={onSubmit}>
        <h2>Or start fresh on this phone</h2>

        <WeightField valueKg={weightKg} onChangeKg={setWeightKg} required />

        <HeightField valueCm={heightCm} onChangeCm={setHeightCm} />

        <fieldset>
          <legend>Activity level</legend>
          <div className="choice-grid">
            {ACTIVITY_OPTIONS.map((opt) => (
              <label key={opt.value} className="choice">
                <input
                  type="radio"
                  name="activity"
                  checked={activityLevel === opt.value}
                  onChange={() => setActivityLevel(opt.value)}
                />
                <span>
                  <strong>{opt.label}</strong>
                  <small>{opt.hint}</small>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <label>
          HRT start date
          <input
            type="date"
            value={hrtStartDate}
            onChange={(e) => setHrtStartDate(e.target.value)}
            required
          />
        </label>

        <fieldset>
          <legend>Equipment you have</legend>
          <div className="chip-grid">
            {EQUIPMENT_OPTIONS.map((opt) => (
              <label key={opt.value} className={`chip ${equipment.includes(opt.value) ? 'is-on' : ''}`}>
                <input
                  type="checkbox"
                  checked={equipment.includes(opt.value)}
                  onChange={() => toggleEquipment(opt.value)}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </fieldset>

        <label>
          Goals / notes (optional)
          <textarea
            rows={3}
            value={goalsNotes}
            onChange={(e) => setGoalsNotes(e.target.value)}
            placeholder="e.g. grow glutes, wider hips, better posture, soften shoulders — these shape your plan"
          />
        </label>

        {error && <p className="error">{error}</p>}

        <button type="submit" className="btn btn--primary" disabled={saving}>
          {saving ? 'Saving…' : 'Build my plan'}
        </button>
      </form>
    </div>
  );
}
