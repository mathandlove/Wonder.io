import React from "react";
import type { SceneProps } from "../registry";
import type { CaptionScene as CaptionSceneType } from "../../types/scene";

export default function CaptionScene({ scene }: SceneProps<CaptionSceneType>) {
  // CaptionScene renders nothing - captions are handled by CaptionOrchestrator outside document flow
  // This scene just serves as a placeholder in the scroll flow for scene bus events
  return null;
}