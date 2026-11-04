import type { ExportPayload } from '../domain/types';

export interface SyncStatus {
  available: boolean;
  exportedAt?: string;
  hasData?: boolean;
  message?: string;
}

/** True when the page was opened via LAN IP (not localhost) — useful hint only. */
export function isLikelyLanClient(): boolean {
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return false;
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes('.local');
}

export function lanAccessUrl(): string {
  return `${window.location.protocol}//${window.location.host}`;
}

export async function fetchSyncStatus(): Promise<SyncStatus> {
  try {
    const res = await fetch('/api/sync');
    if (res.status === 404 || res.status === 204) {
      return {
        available: true,
        hasData: false,
        message: 'No shared copy yet — on your computer: Settings → Push to Wi‑Fi share.',
      };
    }
    if (!res.ok) {
      return { available: false, message: 'Could not reach sync endpoint. Is npm run dev running?' };
    }
    const data = (await res.json()) as ExportPayload;
    const hasProfile = Boolean(data.profile?.onboardingComplete);
    return {
      available: true,
      hasData: hasProfile,
      exportedAt: data.exportedAt,
      message: hasProfile
        ? undefined
        : 'Shared file is empty — push again from your computer after onboarding.',
    };
  } catch {
    return {
      available: false,
      message: 'Sync only works while SoftShape is running on your computer (npm run dev).',
    };
  }
}

export async function pushToLan(payload: ExportPayload): Promise<void> {
  if (!payload.profile?.onboardingComplete) {
    throw new Error('Finish onboarding on this device before pushing.');
  }
  const res = await fetch('/api/sync', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Push failed (${res.status})`);
  }
}

export async function pullFromLan(): Promise<ExportPayload> {
  const res = await fetch('/api/sync');
  if (res.status === 404) {
    throw new Error('Nothing shared yet. On your computer, open SoftShape → Settings → Push to Wi‑Fi share.');
  }
  if (!res.ok) {
    throw new Error(`Pull failed (${res.status})`);
  }
  const payload = (await res.json()) as ExportPayload;
  if (!payload?.profile?.onboardingComplete) {
    throw new Error(
      'Shared copy has no profile yet. On your computer, finish setup (or open SoftShape), then Settings → Push to Wi‑Fi share.',
    );
  }
  return payload;
}
