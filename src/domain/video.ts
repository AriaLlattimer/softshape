/** Extract a YouTube video id from common URL shapes. */
export function parseYoutubeId(urlOrId: string | undefined | null): string | null {
  if (!urlOrId) return null;
  const raw = urlOrId.trim();
  if (/^[\w-]{11}$/.test(raw)) return raw;

  try {
    const u = new URL(raw);
    if (u.hostname.includes('youtu.be')) {
      const id = u.pathname.split('/').filter(Boolean)[0];
      return id && /^[\w-]{11}$/.test(id) ? id : null;
    }
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v');
      if (v && /^[\w-]{11}$/.test(v)) return v;
      const embed = u.pathname.match(/\/embed\/([\w-]{11})/);
      if (embed) return embed[1];
      const shorts = u.pathname.match(/\/shorts\/([\w-]{11})/);
      if (shorts) return shorts[1];
    }
  } catch {
    return null;
  }
  return null;
}

export function youtubeEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`;
}

export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/** Open YouTube search for exercise form cues (works without a curated video id). */
export function youtubeFormSearchUrl(exerciseName: string): string {
  const q = `${exerciseName} exercise proper form`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
}
