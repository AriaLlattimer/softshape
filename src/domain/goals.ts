import type { FocusTag } from './types';

export interface GoalBias {
  /** Focus tags ranked by how strongly the notes mention them. */
  priorities: FocusTag[];
  /** Human-readable themes detected from notes. */
  themes: string[];
  /** Keyword hits used for soft-matching exercise names/why text. */
  keywords: string[];
  /** Prefer lighter upper-body / avoid bulk cues. */
  softenUpper: boolean;
  /** Prefer mobility / recovery-leaning days. */
  preferMobility: boolean;
}

interface Rule {
  theme: string;
  focuses: FocusTag[];
  patterns: RegExp[];
  softenUpper?: boolean;
  preferMobility?: boolean;
}

const RULES: Rule[] = [
  {
    theme: 'glute growth',
    focuses: ['glutes'],
    patterns: [/glute/i, /booty/i, /butt/i, /shelf/i, /peach/i],
  },
  {
    theme: 'hip width / shape',
    focuses: ['hips', 'glutes'],
    patterns: [/hip/i, /hourglass/i, /wider hips/i, /hip dip/i],
  },
  {
    theme: 'leg sculpt',
    focuses: ['legs', 'glutes'],
    patterns: [/thigh/i, /leg(?! day)/i, /quad/i, /hamstring/i, /calf/i],
  },
  {
    theme: 'core / waist',
    focuses: ['core'],
    patterns: [/core/i, /waist/i, /abs/i, /midsection/i, /cinch/i],
  },
  {
    theme: 'posture',
    focuses: ['posture', 'upper-light'],
    patterns: [/posture/i, /shoulder/i, /upper back/i, /desk/i, /slouch/i],
  },
  {
    theme: 'mobility',
    focuses: ['mobility', 'hips'],
    patterns: [/mobil/i, /flexib/i, /stretch/i, /sore/i, /stiff/i],
    preferMobility: true,
  },
  {
    theme: 'soften upper body',
    focuses: ['posture', 'upper-light', 'glutes'],
    patterns: [/soften shoulder/i, /less bulk/i, /not bulk/i, /no bulk/i, /feminine upper/i, /slim shoulder/i],
    softenUpper: true,
  },
  {
    theme: 'feminizing shape',
    focuses: ['glutes', 'hips', 'core'],
    patterns: [/femin/i, /curves?/i, /shape/i, /silhouette/i],
  },
];

const DEFAULT_PRIORITIES: FocusTag[] = ['glutes', 'hips', 'legs', 'core', 'posture', 'mobility', 'upper-light'];

/**
 * Parse free-text goals/notes into focus bias for the plan generator.
 * Keyword-based and fully offline — not an AI interpretation.
 */
export function parseGoalsNotes(notes: string | undefined | null): GoalBias {
  const text = (notes ?? '').trim();
  if (!text) {
    return {
      priorities: [...DEFAULT_PRIORITIES],
      themes: [],
      keywords: [],
      softenUpper: false,
      preferMobility: false,
    };
  }

  const focusScore = new Map<FocusTag, number>();
  const themes: string[] = [];
  const keywords: string[] = [];
  let softenUpper = false;
  let preferMobility = false;

  for (const rule of RULES) {
    const hit = rule.patterns.find((p) => p.test(text));
    if (!hit) continue;
    themes.push(rule.theme);
    const match = text.match(hit);
    if (match?.[0]) keywords.push(match[0].toLowerCase());
    for (const f of rule.focuses) {
      focusScore.set(f, (focusScore.get(f) ?? 0) + 2);
    }
    if (rule.softenUpper) softenUpper = true;
    if (rule.preferMobility) preferMobility = true;
  }

  // Also boost any focus tag mentioned by name
  for (const tag of DEFAULT_PRIORITIES) {
    if (new RegExp(tag.replace('-', '[-\\s]?'), 'i').test(text)) {
      focusScore.set(tag, (focusScore.get(tag) ?? 0) + 1);
      if (!keywords.includes(tag)) keywords.push(tag);
    }
  }

  const ranked = [...focusScore.entries()].sort((a, b) => b[1] - a[1]).map(([tag]) => tag);
  const priorities = [
    ...ranked,
    ...DEFAULT_PRIORITIES.filter((t) => !ranked.includes(t)),
  ];

  return {
    priorities,
    themes: [...new Set(themes)],
    keywords: [...new Set(keywords)],
    softenUpper,
    preferMobility,
  };
}

export function describeGoalBias(bias: GoalBias): string | null {
  if (bias.themes.length === 0) return null;
  return bias.themes.slice(0, 3).join(' · ');
}
