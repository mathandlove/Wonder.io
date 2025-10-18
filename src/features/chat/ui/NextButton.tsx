// React import not needed with JSX transform

type Props = {
  locked: boolean;
  onClick: () => void;
  onRecordStop?: () => void; // Handler for stopping recording
  label?: string; // "Answer" or "Next" - defaults to "Next" for backwards compatibility
  disabled?: boolean; // Additional disabled state (e.g., during AI waiting)
  isRecording?: boolean; // Visual state for recording (transforms button to Stop)
};

export default function NextButton({ locked, onClick, onRecordStop, label = "Next", disabled = false, isRecording = false }: Props) {
  return (
    <button
      className={`next-btn ${locked ? "locked" : "enabled"} ${disabled ? "disabled" : ""} ${isRecording ? "recording-active" : ""}`}
      onClick={() => {
        // When recording, clicking stops the recording
        if (isRecording && onRecordStop) {
          onRecordStop();
          return;
        }

        if (locked) {
          // fire a small toast/nudge instead of advancing
          document.dispatchEvent(new CustomEvent("toast", { detail: "Finish the quest to continue." }));
          return;
        }
        if (disabled) {
          return; // Do nothing when disabled
        }
        onClick();
      }}
      aria-disabled={locked || disabled || undefined}
      aria-describedby={locked ? "next-hint" : undefined}
      title={isRecording ? "Stop recording" : undefined}
    >
      {locked ? (
        <>
          <span className="next-label-background">{label.toUpperCase()}</span>
          <img src="/VisualAssets/lock.png" alt="" className="lock-image-overlay" aria-hidden />
        </>
      ) : isRecording ? (
        <>
          <img className="button-icon" src="/VisualAssets/recordIcon.svg" alt="" />
          <div className="stop-square" />
          <span className="button-text">Stop</span>
        </>
      ) : (
        <>
          <img className="button-icon" src="/VisualAssets/recordIcon.svg" alt="" />
          <span className="button-text">{label}</span>
        </>
      )}
    </button>
  );
}