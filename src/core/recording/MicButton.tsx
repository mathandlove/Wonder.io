import { useRecording } from './RecordingContext';

// Custom events for recording lifecycle
export interface RecordingStartEvent extends CustomEvent {
  detail: {
    timestamp: number;
  };
}

export interface RecordingUpdateEvent extends CustomEvent {
  detail: {
    transcript: string;
    isInterim: boolean;
    timestamp: number;
  };
}

export interface RecordingCompleteEvent extends CustomEvent {
  detail: {
    transcript: string;
    timestamp: number;
  };
}

export default function MicButton() {
  const { start, stop, isRecording: checkIsRecording } = useRecording();

  const handlePointerDown = () => {
    if (!checkIsRecording()) {
      // Emit recording start event for external listeners (like SceneManager/PageFactory)
      const startEvent = new CustomEvent('recording:start', {
        detail: {
          timestamp: Date.now(),
        }
      });
      window.dispatchEvent(startEvent);

      start();
    }
  };

  const handlePointerUp = () => {
    if (checkIsRecording()) {
      stop();
      // RecordingContext will handle the completion and emit events internally
    }
  };

  return (
    <button
      className={`chat-record-button ${checkIsRecording() ? 'recording' : ''}`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp} // Stop if pointer leaves button while pressed
      aria-label={checkIsRecording() ? "Stop recording" : "Start recording"}
    >
      <div className="record-icon-mask" />
    </button>
  );
}