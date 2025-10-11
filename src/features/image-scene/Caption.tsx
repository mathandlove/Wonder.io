import "./Caption.css";
import type { CaptionState } from "@core/scroll/useSceneOrchestrator";

type CaptionProps = {
  text: string;
  state: CaptionState;
  align?: "center" | "bottom";
};

export default function Caption({ text, state, align = 'bottom' }: CaptionProps) {
  // Map caption state to CSS class
  // hidden: no animation, invisible (below viewport)
  // showing: animate in (slide up with construction paper)
  // dismissed: animate out (slide up off screen) then stay hidden
  const stateClass =
    state === 'showing' ? 'caption--animate-in' :
    state === 'dismissed' ? 'caption--animate-out' :
    'caption--hidden';

  return (
    <div
      className={`caption ${stateClass} ${align === 'center' ? 'caption--center' : ''}`}
    >
      <p className="caption__text">{text}</p>
    </div>
  );
}
