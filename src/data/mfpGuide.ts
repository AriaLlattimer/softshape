export const MFP_GUIDE_STEPS = [
  {
    title: 'Open MyFitnessPal',
    body: 'Go to Diary → Exercise (or the Exercise tab in the app).',
  },
  {
    title: 'Use Cardio — not Strength — for calories',
    body: 'MFP only estimates calories for Cardio entries. Strength diary items track sets/reps but do not add calorie burn. Choose Cardio → Add Exercise.',
  },
  {
    title: 'Search Strength training',
    body: 'Search “Strength training” or “Weight lifting”, or create a custom cardio exercise like “Feminizing strength – glute focus”.',
  },
  {
    title: 'Enter duration & calories from SoftShape',
    body: 'Use this app’s session duration and MET-based calorie estimate (built to be in the same ballpark as typical MFP strength-training cardio entries). Estimates are approximate.',
  },
  {
    title: 'Optional: also log lifts',
    body: 'You can still log individual moves under Strength for history — they won’t change calories. SoftShape’s copy summary lists every exercise.',
  },
  {
    title: 'Save to today’s diary',
    body: 'Confirm so the workout adjusts your remaining calories for the day.',
  },
] as const;

export const MFP_URL = 'https://www.myfitnesspal.com/';
