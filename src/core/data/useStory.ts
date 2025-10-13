/**
 * Hook for loading and managing story data from a JSON file.
 * Handles loading states, errors, and automatically flattens character-flow scenes.
 */
// src/hooks/useStory.ts
import { useEffect, useState } from "react";
import type { Story } from '@core/types/scene';
import { loadStory } from '@core/data/loadStory';
import type { FlowMetadataMap } from '@core/data/FlowMetadataStore';

export function useStory(url: string) {
  const [story, setStory] = useState<Story | null>(null);
  const [flowMetadata, setFlowMetadata] = useState<FlowMetadataMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    loadStory(url)
      .then(({ story: s, flowMetadata: meta }) => {
        if (alive) {
          setStory(s);
          setFlowMetadata(meta);
        }
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

  return { story, flowMetadata, loading, error };
}