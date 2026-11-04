import { useState } from 'react';
import { MFP_GUIDE_STEPS, MFP_URL } from '../data/mfpGuide';

interface Props {
  summaryText?: string;
  durationMinutes?: number;
  estimatedKcal?: number;
  compact?: boolean;
}

export function MfpPanel({ summaryText, durationMinutes, estimatedKcal, compact }: Props) {
  const [copied, setCopied] = useState(false);

  async function copySummary() {
    if (!summaryText) return;
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="panel mfp-panel">
      <header className="panel__header">
        <h2>Log in MyFitnessPal</h2>
        <p className="muted">
          This app doesn’t sync automatically — copy the numbers into MFP so your calorie budget stays accurate.
        </p>
      </header>

      {(durationMinutes != null || estimatedKcal != null) && (
        <div className="mfp-stats">
          {durationMinutes != null && (
            <div>
              <span className="mfp-stats__label">Duration</span>
              <strong>{durationMinutes} min</strong>
            </div>
          )}
          {estimatedKcal != null && (
            <div>
              <span className="mfp-stats__label">Est. calories</span>
              <strong>~{estimatedKcal} kcal</strong>
            </div>
          )}
        </div>
      )}

      {summaryText && (
        <div className="mfp-actions">
          <button type="button" className="btn btn--primary" onClick={copySummary}>
            {copied ? 'Copied' : 'Copy session summary'}
          </button>
          <a className="btn btn--ghost" href={MFP_URL} target="_blank" rel="noreferrer">
            Open MyFitnessPal
          </a>
        </div>
      )}

      {!compact && (
        <ol className="mfp-steps">
          {MFP_GUIDE_STEPS.map((step) => (
            <li key={step.title}>
              <strong>{step.title}</strong>
              <span>{step.body}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
