/**
 * Routes scene objects to their appropriate view components.
 * Handles lazy loading, error boundaries, and unknown scene types.
 */
// src/components/SceneRenderer.tsx
import React, { Suspense } from "react";
import type { ComponentType } from "react";
import type { Scene } from '@core/types/scene';
import { sceneRegistry, type SceneProps } from '@features/scenes/registry';

// Small error boundary so a broken scene doesn't crash the whole run
class SceneErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; message?: string }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(err: unknown) {
    return { hasError: true, message: (err as Error)?.message };
  }
  componentDidCatch(err: unknown) {
    console.error("Scene render error:", err);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ff6b6b",
          color: "white",
          padding: "16px",
          borderRadius: 8,
        }}>
          <h2>Something went wrong rendering this scene{this.state.message ? `: ${this.state.message}` : ""}</h2>
        </div>
      );
    }
    return this.props.children;
  }
}

export type SceneRendererProps = {
  scene: Scene;
  nodeId?: string;
  sceneIndex?: number;
  onComplete?: () => void;
};

export const SceneRenderer = React.memo(function SceneRenderer({ scene, nodeId, sceneIndex, onComplete }: SceneRendererProps) {
  const Comp = sceneRegistry[scene.type] as ComponentType<SceneProps> | undefined;

  if (!Comp) {
    if (import.meta.env.DEV) {
      console.warn(`Unknown scene type: ${scene.type}`);
    }
    return (
      <div style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#ff6b6b",
        color: "white",
        padding: "16px",
        borderRadius: 8,
      }}>
        <h2>Unknown scene type: {scene.type}</h2>
      </div>
    );
  }

  return (
    <SceneErrorBoundary>
      <Suspense fallback={<div style={{ padding: 16 }}>Loading…</div>}>
        <Comp scene={scene} nodeId={nodeId} sceneIndex={sceneIndex} onComplete={onComplete} />
      </Suspense>
    </SceneErrorBoundary>
  );
});