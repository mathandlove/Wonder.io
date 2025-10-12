/**
 * MicButton - Pure presentational button for recording
 * No business logic - just renders UI and fires callbacks
 */

interface MicButtonProps {
  isRecording: boolean;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
}

export default function MicButton({ isRecording, onStart, onStop, disabled = false }: MicButtonProps) {
  return (
    <button
      className={`chat-record-button ${isRecording ? 'recording' : ''}`}
      onClick={isRecording ? onStop : onStart}
      disabled={disabled}
      aria-label={isRecording ? "Stop recording" : "Start recording"}
    >
      <div className="record-icon-mask" />
    </button>
  );
}