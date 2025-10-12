import "./Caption.css";
import type { ImageState } from "@core/dialogue/types";

type CaptionProps = {
  text: string;
  state: ImageState;
  align?: "center" | "bottom";
};

export default function Caption({ text, state, align = 'bottom' }: CaptionProps) {
  // Map ImageState to CSS class
  // hidden: no animation, invisible (below viewport)
  // showing: animate in (slide up with construction paper), stays visible
  const stateClass =
    state === 'showing' ? 'caption--animate-in' :
    'caption--hidden';

  return (
    <div
      className={`caption ${stateClass} ${align === 'center' ? 'caption--center' : ''}`}
    >
      <p className="caption__text">{text}</p>
    </div>
  );
}
