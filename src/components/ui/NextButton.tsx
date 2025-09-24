import React from "react";

type Props = {
  locked: boolean;
  onClick: () => void;
};

export default function NextButton({ locked, onClick }: Props) {
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
          <span className="next-label-background">NEXT</span>
          <img src="/VisualAssets/lock.png" alt="" className="lock-image-overlay" aria-hidden />
        </>
      ) : (
        <span className="arrow" aria-hidden>›</span>
      )}
    </button>
  );
}