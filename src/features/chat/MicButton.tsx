import { useRef, useState } from "react";
import { useDialogue } from '@core/dialogue/DialogueContext';
import { usePageFactory } from "./orchestrators/PageFactory";

// Types for the Web Speech API
type SpeechRecognitionConstructor = new () => SpeechRecognitionInterface;

interface WindowWithSpeechRecognition extends Window {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}
interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  readonly [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognitionInterface {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

export default function MicButton() {
  const sttRef = useRef<SpeechRecognitionInterface | null>(null);
  const { beginRecording, updateRecording, endRecording } = useDialogue();
  const { createInteractiveBubblePage, addSceneAndNavigate } = usePageFactory();
  const [msgId, setMsgId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);


  const start = () => {
    try {
      const SpeechRecognition = (window as WindowWithSpeechRecognition).SpeechRecognition || (window as WindowWithSpeechRecognition).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        console.error('Speech recognition not supported');
        return;
      }

      // Create a new interactive bubble scene and navigate to it
      const newScene = createInteractiveBubblePage();
      const sceneId = newScene.sceneId || 'default';


      // Add the scene and auto-scroll to it
      addSceneAndNavigate(newScene);

      // Start recording with the new scene ID
      const id = beginRecording(sceneId);
      setMsgId(id);
      setIsRecording(true);

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        if (interimTranscript && id) {
          updateRecording(id, interimTranscript, { isInterim: true });
        }

        if (finalTranscript && id) {
          const trimmedFinal = finalTranscript.trim();
          if (trimmedFinal) {
            endRecording(id, trimmedFinal);
            setMsgId(null);
            setIsRecording(false);
            recognition.stop();
          }
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        setMsgId(null);
      };

      recognition.onend = () => {
        setIsRecording(false);
        if (msgId) {
          setMsgId(null);
        }
      };

      sttRef.current = recognition;
      recognition.start();
    } catch (error) {
      console.error('Failed to start recording:', error);
      setIsRecording(false);
    }
  };

  const stop = () => {
    if (sttRef.current) {
      sttRef.current.stop();
      sttRef.current = null;
    }
    setIsRecording(false);
  };

  const handlePointerDown = () => {
    if (!isRecording) {
      start();
    }
  };

  const handlePointerUp = () => {
    if (isRecording) {
      stop();
    }
  };

  return (
    <button
      className={`chat-record-button ${isRecording ? 'recording' : ''}`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp} // Stop if pointer leaves button while pressed
      aria-label={isRecording ? "Stop recording" : "Start recording"}
    >
      <div className="record-icon-mask" />
    </button>
  );
}