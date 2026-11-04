import { estimateExerciseKcal, formatKcal } from '../domain/calories';
import { estimateExerciseSeconds, formatDuration, formatExerciseTiming } from '../domain/timing';
import type { Exercise, PlannedExercise } from '../domain/types';
import { updateExerciseVideoUrl } from '../db/database';
import { ExerciseVideo } from './ExerciseVideo';

interface Props {
  exercise: Exercise;
  planned?: PlannedExercise;
  weightKg?: number;
  defaultOpen?: boolean;
  onVideoSaved?: () => void;
}

export function ExerciseDetail({
  exercise,
  planned,
  weightKg,
  defaultOpen = false,
  onVideoSaved,
}: Props) {
  const kcal =
    planned && weightKg != null
      ? estimateExerciseKcal(weightKg, planned, exercise)
      : null;

  return (
    <details className="exercise-detail" open={defaultOpen}>
      <summary>
        <span className="exercise-detail__name">{exercise.name}</span>
        <span className="exercise-detail__cue">{exercise.cue}</span>
        {planned && (
          <span className="exercise-detail__time">
            {formatDuration(estimateExerciseSeconds(planned, exercise))}
            {kcal != null ? ` · ${formatKcal(kcal)}` : ''}
          </span>
        )}
      </summary>
      <div className="exercise-detail__body">
        <p className="why">
          <strong>Why this helps</strong>
          <span>{exercise.why}</span>
        </p>
        {planned && (
          <p className="timing-callout">
            <strong>Time & energy guide</strong>
            <span>
              {formatExerciseTiming(planned, exercise)}
              {kcal != null
                ? ` · ${formatKcal(kcal)} at your body weight (MET ${exercise.met ?? 3.5})`
                : ''}{' '}
              — estimate for MFP-style logging, not lab-accurate
            </span>
          </p>
        )}
        <ExerciseVideo
          exerciseId={exercise.id}
          exerciseName={exercise.name}
          videoUrl={exercise.videoUrl}
          onSaveVideoUrl={async (id, url) => {
            await updateExerciseVideoUrl(id, url);
            onVideoSaved?.();
          }}
        />
        <div>
          <strong>How to</strong>
          <ol>
            {exercise.instructions.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>
        {exercise.avoid && exercise.avoid.length > 0 && (
          <div>
            <strong>Watch out for</strong>
            <ul>
              {exercise.avoid.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </div>
        )}
        <p className="meta-line">
          Equipment: {exercise.equipment.join(', ')} · Rest ~{exercise.restSeconds}s between sets
          {exercise.met != null ? ` · MET ${exercise.met}` : ''}
        </p>
      </div>
    </details>
  );
}
