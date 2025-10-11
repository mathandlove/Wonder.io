/**
 * Hook for loading and managing story data from a JSON file.
 * Handles loading states, errors, and automatically flattens character-flow scenes.
 */
// src/hooks/useStory.ts
import { useEffect, useState } from "react";
import type { Story } from '@core/types/scene";
import { loadStory } from '@shared/data/loadStory";

export function useStory(url: string) {
  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    loadStory(url)
      .then((s) => {
        if (alive) setStory(s);
      })
      .catch((e) => {
        if (alive) setError(e as Error);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [url]);

  return { story, loading, error };
}