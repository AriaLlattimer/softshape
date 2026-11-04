import type { Equipment, Exercise, FocusTag } from '../domain/types';

/** Dev uses Vite proxy; production hits wger directly (may need CORS). */
const WGER_BASE = import.meta.env.DEV ? '/api/wger' : 'https://wger.de/api/v2';

export interface WgerSearchResult {
  id: number;
  name: string;
  description: string;
  muscles: string[];
  equipment: string[];
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function mapEquipment(names: string[]): Equipment[] {
  const joined = names.join(' ').toLowerCase();
  const out = new Set<Equipment>();
  if (!names.length || /body.?weight|none|no equipment/.test(joined)) out.add('bodyweight');
  if (/dumbbell/.test(joined)) out.add('dumbbells');
  if (/barbell|olympic/.test(joined)) out.add('barbell');
  if (/cable|pulley/.test(joined)) out.add('cable');
  if (/machine|sled|smith/.test(joined)) out.add('machine');
  if (/band|elastic/.test(joined)) out.add('bands');
  if (/kettle/.test(joined)) out.add('kettlebell');
  if (out.size === 0) out.add('bodyweight');
  return [...out];
}

function mapFocus(name: string, muscles: string[]): FocusTag[] {
  const text = `${name} ${muscles.join(' ')}`.toLowerCase();
  const tags = new Set<FocusTag>();
  if (/glute|butt/.test(text)) tags.add('glutes');
  if (/hip|abduct|adduct/.test(text)) tags.add('hips');
  if (/core|abs|oblique|transverse/.test(text)) tags.add('core');
  if (/quad|hamstring|leg|calf|thigh/.test(text)) tags.add('legs');
  if (/back|posture|scap|rear delt|trap/.test(text)) tags.add('posture');
  if (/shoulder|chest|bicep|tricep|arm|press/.test(text)) tags.add('upper-light');
  if (/stretch|mobility|yoga/.test(text)) tags.add('mobility');
  if (tags.size === 0) tags.add('legs');
  return [...tags];
}

interface WgerTranslation {
  id: number;
  name: string;
  description: string;
  exercise: number;
  language: number;
}

interface WgerExerciseInfo {
  id: number;
  name?: string;
  description?: string;
  muscles?: { name?: string; name_en?: string }[];
  equipment?: { name?: string }[];
  translations?: { language: number; name: string; description: string }[];
}

async function fetchEnglishTranslations(
  signal?: AbortSignal,
): Promise<WgerTranslation[]> {
  const pages: WgerTranslation[] = [];
  // Pull a few pages — enough for useful search without downloading everything every time
  for (let offset = 0; offset < 400; offset += 100) {
    const url = `${WGER_BASE}/exercise-translation/?language=2&limit=100&offset=${offset}`;
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`wger request failed (${res.status})`);
    const data = (await res.json()) as { results?: WgerTranslation[]; next?: string | null };
    pages.push(...(data.results ?? []));
    if (!data.next) break;
  }
  return pages;
}

async function enrichInfo(
  exerciseId: number,
  signal?: AbortSignal,
): Promise<Pick<WgerSearchResult, 'muscles' | 'equipment'>> {
  try {
    const res = await fetch(`${WGER_BASE}/exerciseinfo/${exerciseId}/`, { signal });
    if (!res.ok) return { muscles: [], equipment: [] };
    const info = (await res.json()) as WgerExerciseInfo;
    return {
      muscles: (info.muscles ?? []).map((m) => m.name_en || m.name || '').filter(Boolean),
      equipment: (info.equipment ?? []).map((e) => e.name || '').filter(Boolean),
    };
  } catch {
    return { muscles: [], equipment: [] };
  }
}

/** Search wger English translations (client-side filter). Handles offline/CORS via caller. */
export async function searchWger(
  query: string,
  signal?: AbortSignal,
): Promise<WgerSearchResult[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const translations = await fetchEnglishTranslations(signal);
  const matched = translations
    .filter((t) => t.name.toLowerCase().includes(q))
    .sort((a, b) => {
      const aStarts = a.name.toLowerCase().startsWith(q) ? 0 : 1;
      const bStarts = b.name.toLowerCase().startsWith(q) ? 0 : 1;
      return aStarts - bStarts || a.name.localeCompare(b.name);
    })
    .slice(0, 12);

  const enriched = await Promise.all(
    matched.map(async (t) => {
      const extra = await enrichInfo(t.exercise, signal);
      return {
        id: t.exercise,
        name: t.name,
        description: stripHtml(t.description || ''),
        muscles: extra.muscles,
        equipment: extra.equipment,
      } satisfies WgerSearchResult;
    }),
  );

  return enriched;
}

export function wgerToExercise(result: WgerSearchResult, extraInstructions?: string[]): Exercise {
  const steps =
    extraInstructions && extraInstructions.length > 0
      ? extraInstructions
      : result.description
        ? result.description
            .split(/(?<=\.)\s+/)
            .map((s) => s.trim())
            .filter(Boolean)
            .slice(0, 8)
        : [
            'Review form carefully before loading. Add your own steps if this description is thin.',
          ];

  return {
    id: `wger-${result.id}`,
    name: result.name,
    focus: mapFocus(result.name, result.muscles),
    equipment: mapEquipment(result.equipment),
    cue: steps[0]?.slice(0, 120) || 'Move with control.',
    instructions: steps,
    why: 'Imported from wger — tag and use if it fits your feminizing focus (glutes, hips, core, posture).',
    restSeconds: 60,
    met: 3.5,
    source: 'wger',
    wgerId: result.id,
    createdAt: new Date().toISOString(),
  };
}

export function duckDuckGoSearchUrl(query: string): string {
  return `https://duckduckgo.com/?q=${encodeURIComponent(`${query} exercise form how to`)}`;
}
