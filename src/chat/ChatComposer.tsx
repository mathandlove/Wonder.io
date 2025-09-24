import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useDialogue } from './ChatDialogueContext';
import { useDialogue as useNewDialogue } from '../dialogue/DialogueContext';
import { usePageFactory } from '../components/PageFactory';
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
  const { beginRecording, updateRecording, endRecording } = useNewDialogue();
  const { createInteractiveBubblePage, addSceneAndNavigate } = usePageFactory();
  const [isRecording, setIsRecording] = useState(false);
  const [currentRecordingId, setCurrentRecordingId] = useState<string | null>(null);
  const [currentSceneId, setCurrentSceneId] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const { toast, hideToast } = useToast();

  const startRecording = useCallback(() => {
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        alert('Speech recognition not supported in this browser');
        return;
      }

      // Create a new interactive bubble scene and navigate to it
      console.log('[CHAT_COMPOSER_DEBUG] Creating new interactive bubble scene');
      const newScene = createInteractiveBubblePage();
      const sceneId = newScene.sceneId || 'default';
      console.log('[CHAT_COMPOSER_DEBUG] Created scene:', { sceneId, newScene });
      setCurrentSceneId(sceneId);

      // Add the scene and auto-scroll to it
      console.log('[CHAT_COMPOSER_DEBUG] Adding scene and navigating');
      addSceneAndNavigate(newScene);

      // Start recording with the new scene ID
      console.log('[CHAT_COMPOSER_DEBUG] Starting recording with sceneId:', sceneId);
      const recordingId = beginRecording(sceneId);
      console.log('[CHAT_COMPOSER_DEBUG] Recording started with ID:', recordingId);
      setCurrentRecordingId(recordingId);

      const recognition = new SpeechRecognition();
      recognition.continuous = true; // Allow continuous recording
      recognition.interimResults = true; // Show interim results
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        console.log('[CHAT_COMPOSER_DEBUG] Speech recognition started');
        setIsRecording(true);
      };

      recognition.onresult = (event: any) => {
        console.log('[CHAT_COMPOSER_DEBUG] Speech recognition result event:', event);
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          console.log('[CHAT_COMPOSER_DEBUG] Processing result:', {
            index: i,
            transcript,
            isFinal: event.results[i].isFinal,
            confidence: event.results[i][0].confidence
          });
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        console.log('[CHAT_COMPOSER_DEBUG] Processed transcripts:', {
          interimTranscript,
          finalTranscript,
          recordingId: recordingId  // Use the captured recordingId instead of state
        });

        // Update with interim results - use captured recordingId
        if (interimTranscript && recordingId) {
          console.log('[CHAT_COMPOSER_DEBUG] Updating interim transcript:', { recordingId, interimTranscript });
          updateRecording(recordingId, interimTranscript, { isInterim: true });
        }

        // Handle final transcript - use captured recordingId
        if (finalTranscript) {
          const trimmedFinal = finalTranscript.trim();
          console.log('[CHAT_COMPOSER_DEBUG] Final transcript received:', { recordingId, finalTranscript, trimmedFinal });
          if (trimmedFinal && recordingId) {
            endRecording(recordingId, trimmedFinal);
            // Also submit to old system for compatibility
            submitPlayerUtterance(trimmedFinal);
            setCurrentRecordingId(null);
            setIsRecording(false);
            recognition.stop();
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.error('[CHAT_COMPOSER_DEBUG] Speech recognition error:', event.error, 'Full event:', event);
        setIsRecording(false);
        setCurrentRecordingId(null);
        if (event.error === 'not-allowed') {
          alert('Microphone access denied. Please allow microphone access and try again.');
        }
      };

      recognition.onend = () => {
        console.log('[CHAT_COMPOSER_DEBUG] Speech recognition ended');
        setIsRecording(false);
        recognitionRef.current = null;
      };

      // Additional event handlers for debugging
      recognition.onnomatch = (event: any) => {
        console.log('[CHAT_COMPOSER_DEBUG] Speech recognition no match:', event);
      };

      recognition.onspeechstart = (event: any) => {
        console.log('[CHAT_COMPOSER_DEBUG] Speech detected, starting recognition');
      };

      recognition.onspeechend = (event: any) => {
        console.log('[CHAT_COMPOSER_DEBUG] Speech ended');
      };

      recognitionRef.current = recognition;
      recognition.start();

    } catch (error) {
      console.error('Error starting speech recognition:', error);
      alert('Could not start speech recognition. Please try again.');
    }
  }, [submitPlayerUtterance, createInteractiveBubblePage, addSceneAndNavigate, beginRecording, updateRecording, endRecording, currentRecordingId]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setIsRecording(false);
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