import { useMemo, useState, type FormEvent } from 'react';
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  deleteMeasurement,
  getMeasurements,
  saveMeasurement,
} from '../db/database';
import type { Measurement } from '../domain/types';
import { isValidDecimalInput, parseDecimal } from '../domain/units';
import { useLiveQuery } from '../hooks/useLiveQuery';

function DecimalInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label>
      {label}
      <input
        type="text"
        inputMode="decimal"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          if (isValidDecimalInput(e.target.value)) onChange(e.target.value);
        }}
      />
    </label>
  );
}

function newId() {
  return `meas-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function Measurements() {
  const { data: measurements = [], reload } = useLiveQuery(getMeasurements, []);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [weightKg, setWeightKg] = useState('');
  const [waistCm, setWaistCm] = useState('');
  const [hipsCm, setHipsCm] = useState('');
  const [bustCm, setBustCm] = useState('');
  const [thighCm, setThighCm] = useState('');
  const [armCm, setArmCm] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const chartData = useMemo(
    () =>
      measurements.map((m) => ({
        date: m.date,
        weight: m.weightKg,
        hips: m.hipsCm,
        waist: m.waistCm,
      })),
    [measurements],
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const entry: Measurement = {
      id: newId(),
      date,
      weightKg: parseDecimal(weightKg),
      waistCm: parseDecimal(waistCm),
      hipsCm: parseDecimal(hipsCm),
      bustCm: parseDecimal(bustCm),
      thighCm: parseDecimal(thighCm),
      armCm: parseDecimal(armCm),
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    if (
      entry.weightKg == null &&
      entry.waistCm == null &&
      entry.hipsCm == null &&
      entry.bustCm == null &&
      entry.thighCm == null &&
      entry.armCm == null
    ) {
      setError('Enter at least one measurement.');
      return;
    }
    await saveMeasurement(entry);
    setWeightKg('');
    setWaistCm('');
    setHipsCm('');
    setBustCm('');
    setThighCm('');
    setArmCm('');
    setNotes('');
    reload();
  }

  return (
    <div className="page stack">
      <section className="hero-panel">
        <p className="eyebrow">Progress</p>
        <h1>Body measurements</h1>
        <p className="lede">Track hips, waist, and weight locally — soft trends over time.</p>
      </section>

      <form className="panel form" onSubmit={onSubmit}>
        <h2>New entry</h2>
        <label>
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <div className="form-grid">
          <DecimalInput label="Weight (kg)" value={weightKg} onChange={setWeightKg} placeholder="72.5" />
          <DecimalInput label="Waist (cm)" value={waistCm} onChange={setWaistCm} placeholder="70.5" />
          <DecimalInput label="Hips (cm)" value={hipsCm} onChange={setHipsCm} placeholder="95.2" />
          <DecimalInput label="Bust / chest (cm)" value={bustCm} onChange={setBustCm} placeholder="88.0" />
          <DecimalInput label="Thigh (cm)" value={thighCm} onChange={setThighCm} placeholder="55.5" />
          <DecimalInput label="Arm (cm)" value={armCm} onChange={setArmCm} placeholder="28.5" />
        </div>
        <label>
          Notes
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" className="btn btn--primary">
          Save measurement
        </button>
      </form>

      <section className="panel">
        <header className="panel__header">
          <h2>Trends</h2>
        </header>
        {chartData.length < 2 ? (
          <p className="empty">Add at least two entries to see a trend chart.</p>
        ) : (
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="date" tick={{ fill: '#9aa3b2', fontSize: 12 }} />
                <YAxis tick={{ fill: '#9aa3b2', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    background: '#12151c',
                    border: '1px solid #5bcefa55',
                    borderRadius: 8,
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="hips" stroke="#f5a9b8" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="waist" stroke="#5bcefa" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="weight" stroke="#ffffff" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="panel">
        <header className="panel__header">
          <h2>History</h2>
        </header>
        {measurements.length === 0 ? (
          <p className="empty">No measurements yet.</p>
        ) : (
          <ul className="list">
            {[...measurements].reverse().map((m) => (
              <li key={m.id} className="list__row">
                <div>
                  <strong>{m.date}</strong>
                  <span className="muted">
                    {[
                      m.weightKg != null && `${m.weightKg} kg`,
                      m.hipsCm != null && `hips ${m.hipsCm}`,
                      m.waistCm != null && `waist ${m.waistCm}`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={async () => {
                    await deleteMeasurement(m.id);
                    reload();
                  }}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
