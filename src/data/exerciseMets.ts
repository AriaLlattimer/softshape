/**
 * MET values aligned with Compendium of Physical Activities /
 * typical strength-training estimates (similar ballpark to MFP cardio
 * “Strength training” logging — rough, not lab-accurate).
 *
 * kcal ≈ MET × bodyWeightKg × hours
 */
export const EXERCISE_METS: Record<string, number> = {
  // Glute / hip emphasis
  'ex-glute-bridge': 4.0,
  'ex-single-leg-bridge': 4.3,
  'ex-hip-thrust': 5.0,
  'ex-donkey-kick': 3.8,
  'ex-fire-hydrant': 3.5,
  'ex-clam-shell': 3.3,
  'ex-lateral-band-walk': 4.0,
  'ex-cable-kickback': 4.0,
  'ex-frog-pump': 3.8,
  'ex-side-lying-leg-lift': 3.5,
  'ex-glute-kickback-band': 3.8,

  // Lower compounds
  'ex-romanian-deadlift': 5.5,
  'ex-sumo-squat': 5.0,
  'ex-goblet-squat': 5.0,
  'ex-bulgarian-split': 5.5,
  'ex-reverse-lunge': 5.0,
  'ex-curtsy-lunge': 4.8,
  'ex-step-up': 5.0,
  'ex-good-morning': 4.5,
  'ex-leg-press-glute': 5.0,
  'ex-abduction-machine': 3.8,
  'ex-calf-raise': 3.5,

  // Core / posture
  'ex-dead-bug': 3.3,
  'ex-bird-dog': 3.3,
  'ex-side-plank': 3.8,
  'ex-hollow-hold': 3.5,
  'ex-pallof': 3.5,
  'ex-face-pull': 3.5,
  'ex-band-pull-apart': 3.0,
  'ex-scapular-retraction': 2.8,
  'ex-light-row': 3.8,

  // Mobility
  'ex-cat-cow': 2.5,
  'ex-hip-flexor-stretch': 2.3,
  'ex-pigeon': 2.3,
  'ex-overhead-reach': 2.5,
};

export const DEFAULT_EXERCISE_MET = 3.5;
/** Light transition / setup between moves */
export const TRANSITION_MET = 2.0;
