import React from "react";

type Props = {
  locked: boolean;
  onClick: () => void;
  label?: string; // "Answer" or "Next" - defaults to "Next" for backwards compatibility
};

export default function NextButton({ locked, onClick, label = "Next" }: Props) {
  return (
    <button
      className={`next-btn ${locked ? "locked" : "enabled"}`}
      onClick={(e) => {
        if (locked) {
          // fire a small toast/nudge instead of advancing
          document.dispatchEvent(new CustomEvent("toast", { detail: "Finish the quest to continue." }));
          return;
        }
        onClick();
      }}
      aria-disabled={locked || undefined}
      aria-describedby={locked ? "next-hint" : undefined}
    >
      {locked ? (
        <>
          <span className="next-label-background">{label.toUpperCase()}</span>
          <img src="/VisualAssets/lock.png" alt="" className="lock-image-overlay" aria-hidden />
        </>
      ) : (
        <span className="next-label-text">{label}</span>
      )}
    </button>
  );
}