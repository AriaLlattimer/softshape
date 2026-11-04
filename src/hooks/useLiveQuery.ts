import { useEffect, useState } from 'react';

/** Minimal live query helper for Dexie promises. */
export function useLiveQuery<T>(
  queryFn: () => Promise<T>,
  deps: unknown[] = [],
  initial?: T,
): { data: T | undefined; loading: boolean; error: Error | null; reload: () => void } {
  const [data, setData] = useState<T | undefined>(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    queryFn()
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  return {
    data,
    loading,
    error,
    reload: () => setTick((t) => t + 1),
  };
}
