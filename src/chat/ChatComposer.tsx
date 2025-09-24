import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useDialogue } from './ChatDialogueContext';
import NextButton from '../components/ui/NextButton';
import { Toast, useToast } from '../components/ui/Toast';
import './Chat.css';

interface ChatComposerProps {
  disabled: boolean;
  questState: 'active' | 'complete' | 'failed';
  onNext: () => void;
}

export const ChatComposer: React.FC<ChatComposerProps> = ({
  disabled,
  questState,
  onNext
}) => {
  const { hideTurnBanner, waiting, submitPlayerUtterance } = useDialogue();
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  const { toast, hideToast } = useToast();

  const startRecording = useCallback(() => {
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        alert('Speech recognition not supported in this browser');
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false; // Changed to false for single utterance
      recognition.interimResults = false; // Changed to false for final result only
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        console.log('Speech recognition started');
        setIsRecording(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript + ' ';
          }
        }
        const finalTranscript = transcript.trim();
        if (finalTranscript) {
          // Submit directly without showing in input field
          submitPlayerUtterance(finalTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        if (event.error === 'not-allowed') {
          alert('Microphone access denied. Please allow microphone access and try again.');
        }
      };

      recognition.onend = () => {
        console.log('Speech recognition ended');
        setIsRecording(false);
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;
      recognition.start();

    } catch (error) {
      console.error('Error starting speech recognition:', error);
      alert('Could not start speech recognition. Please try again.');
    }
  }, [submitPlayerUtterance]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setIsRecording(false);
      console.log('Speech recognition stopped manually');
    }
  }, []);

  const handleRecordClick = () => {
    if (disabled || waiting) return;
    hideTurnBanner(); // Hide banner when user clicks microphone
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleHintClick = () => {
    if (disabled || waiting) return;
    // TODO: Implement hint functionality
    console.log('Hint button clicked');
  };


  return (
    <div className="chat-composer-container">
      <div className="simplified-chat-rail">
        <button
          className={`chat-hint-button ${waiting ? 'waiting' : ''}`}
          onClick={handleHintClick}
          disabled={disabled || waiting}
          title="Get a hint"
        >
          <div className="hint-icon-mask"></div>
        </button>

        <button
          className={`chat-record-button ${isRecording ? 'recording' : ''} ${waiting ? 'waiting' : ''}`}
          onClick={handleRecordClick}
          disabled={disabled || waiting}
          title={isRecording ? 'Stop recording' : 'Start recording'}
        >
          <div className="record-icon-mask"></div>
        </button>

        <NextButton
          locked={questState !== 'complete'}
          onClick={onNext}
        />
      </div>

      {/* Accessibility hint for locked state */}
      <p id="next-hint" className="visually-hidden">Finish the quest to continue.</p>

      {/* Toast notifications */}
      <Toast
        message={toast.message}
        visible={toast.visible}
        onHide={hideToast}
      />
    </div>
  );
};