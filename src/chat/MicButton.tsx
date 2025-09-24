import React from "react";
import { Recording } from "../recording/RecordingAPI";
import { useRecording } from "../recording/RecordingContext";

export default function MicButton() {
  const { state } = useRecording();

  const handlePointerDown = () => {
    console.log('🔴 MIC BUTTON PRESSED - handlePointerDown called', {
      currentlyRecording: state.isRecording
    });
    if (!state.isRecording) {
      console.log('🎤 Calling Recording.start()');
      Recording.start();
    }
  };

  const handlePointerUp = () => {
    console.log('🔵 MIC BUTTON RELEASED - handlePointerUp called', {
      currentlyRecording: state.isRecording
    });
    if (state.isRecording) {
      console.log('🛑 Calling Recording.stop()');
      Recording.stop();
    }
  };

  const handlePointerLeave = () => {
    if (state.isRecording) {
      Recording.stop();
    }
  };

  return (
    <button
      className={`chat-record-button ${state.isRecording ? 'recording' : ''}`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      aria-label={state.isRecording ? "Stop recording" : "Start recording"}
    >
      <div className="record-icon-mask" />
    </button>
  );
}