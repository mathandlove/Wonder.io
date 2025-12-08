// React import not needed with JSX transform

type Props = {
  locked: boolean;
  onClick: () => void;
  onRecordStop?: () => void; // Handler for stopping recording
  label?: string; // "Answer" or "Next" - defaults to "Next" for backwards compatibility
  disabled?: boolean; // Additional disabled state (e.g., during AI waiting)
  isRecording?: boolean; // Visual state for recording (transforms button to Stop)
  isActuallyRecording?: boolean; // True when mic is actually recording (not just in recording state)
};

export default function NextButton({ locked, onClick, onRecordStop, label = "Next", disabled = false, isRecording = false, isActuallyRecording = true }: Props) {
  // When in recording state but not actually recording yet, disable stop
  const canStop = isRecording && isActuallyRecording;

  return (
    <button
      className={`next-btn ${locked ? "locked" : "enabled"} ${disabled ? "disabled" : ""} ${isRecording ? "recording-active" : ""} ${isRecording && !isActuallyRecording ? "disabled" : ""}`}
      onClick={() => {
        // When recording, clicking stops the recording (only if actually recording)
        if (isRecording && onRecordStop) {
          if (!isActuallyRecording) {
            return; // Don't allow stop until recording has actually started
          }
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
      aria-disabled={locked || disabled || (isRecording && !isActuallyRecording) || undefined}
      aria-describedby={locked ? "next-hint" : undefined}
      title={isRecording ? (canStop ? "Stop recording" : "Starting...") : undefined}
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