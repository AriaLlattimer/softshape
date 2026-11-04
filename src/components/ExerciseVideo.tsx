import { useEffect, useState, type FormEvent } from 'react';
import {
  parseYoutubeId,
  youtubeEmbedUrl,
  youtubeFormSearchUrl,
} from '../domain/video';

interface Props {
  exerciseId: string;
  exerciseName: string;
  /** Optional curated / saved YouTube URL or 11-char id */
  videoUrl?: string;
  /** Persist a pasted URL into the local catalog */
  onSaveVideoUrl?: (exerciseId: string, videoUrl: string) => Promise<void> | void;
}

export function ExerciseVideo({
  exerciseId,
  exerciseName,
  videoUrl,
  onSaveVideoUrl,
}: Props) {
  const [activeUrl, setActiveUrl] = useState(videoUrl);
  const [paste, setPaste] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setActiveUrl(videoUrl);
  }, [videoUrl]);

  const videoId = parseYoutubeId(activeUrl);
  const searchUrl = youtubeFormSearchUrl(exerciseName);

  async function applyPaste(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const id = parseYoutubeId(paste);
    if (!id) {
      setError('Paste a full YouTube link (or 11-character video id).');
      return;
    }
    const normalized = `https://www.youtube.com/watch?v=${id}`;
    setActiveUrl(normalized);
    setPaste('');
    if (onSaveVideoUrl) {
      setSaving(true);
      try {
        await onSaveVideoUrl(exerciseId, normalized);
      } catch {
        setError('Could not save video link locally.');
      } finally {
        setSaving(false);
      }
    }
  }

  return (
    <div className="exercise-video">
      <div className="exercise-video__header">
        <strong>Form video</strong>
        <span className="muted">Plays in-app · needs internet</span>
      </div>

      {videoId ? (
        <div className="exercise-video__frame">
          <iframe
            title={`${exerciseName} form video`}
            src={youtubeEmbedUrl(videoId)}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      ) : (
        <div className="exercise-video__placeholder">
          <p>
            No embedded demo yet for <strong>{exerciseName}</strong>. Paste a YouTube link below to
            watch it here without leaving SoftShape.
          </p>
        </div>
      )}

      <form className="exercise-video__paste" onSubmit={applyPaste}>
        <label>
          {videoId ? 'Swap video (YouTube URL)' : 'Paste YouTube URL to embed'}
          <input
            type="url"
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=…"
          />
        </label>
        <button type="submit" className="btn btn--primary" disabled={saving || !paste.trim()}>
          {saving ? 'Saving…' : videoId ? 'Embed this instead' : 'Embed in app'}
        </button>
      </form>
      {error && <p className="error">{error}</p>}

      {!videoId && (
        <p className="field-hint">
          Tip: open{' '}
          <a href={searchUrl} target="_blank" rel="noreferrer">
            YouTube search
          </a>{' '}
          only to copy a link, then paste it above so it plays inside the app.
        </p>
      )}
    </div>
  );
}
