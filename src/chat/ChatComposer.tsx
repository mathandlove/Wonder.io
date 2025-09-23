import React, { useState, useRef, useCallback, useEffect } from 'react';
import './Chat.css';

interface ChatComposerProps {
  disabled: boolean;
  onSubmit: (text: string) => void;
  suggestions?: string[];
}

export const ChatComposer: React.FC<ChatComposerProps> = ({
  disabled,
  onSubmit,
  suggestions
}) => {
  const [userInput, setUserInput] = useState("What's wrong Ms. Baker?");
  const [isRecording, setIsRecording] = useState(false);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const recognitionRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to end of input when text updates during recording
  useEffect(() => {
    if (isRecording && inputRef.current) {
      const length = userInput.length;
      inputRef.current.setSelectionRange(length, length);
      inputRef.current.scrollLeft = inputRef.current.scrollWidth;
    }
  }, [userInput, isRecording]);

  const handleSubmit = () => {
    if (userInput.trim() && !disabled) {
      onSubmit(userInput.trim());
      setUserInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && userInput.trim() && !disabled) {
      handleSubmit();
    }
  };

  const startRecording = useCallback(() => {
    try {
      setUserInput('');

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        alert('Speech recognition not supported in this browser');
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
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
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (!event.results[i].isFinal) {
            transcript += event.results[i][0].transcript;
          }
        }
        setUserInput(transcript.trim());
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
        if (recognitionRef.current === recognition) {
          try {
            recognition.start();
          } catch (error) {
            console.log('Could not restart recognition, stopping');
            setIsRecording(false);
            recognitionRef.current = null;
          }
        } else {
          setIsRecording(false);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();

    } catch (error) {
      console.error('Error starting speech recognition:', error);
      alert('Could not start speech recognition. Please try again.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setIsRecording(false);
      console.log('Speech recognition stopped manually');
    }
  }, []);

  const handleRecordClick = () => {
    if (disabled) return;
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleSuggestionClick = () => {
    setShowSuggestion(!showSuggestion);
  };


  return (
    <div className="chat-composer-container">
      <div className="composer-wrapper">
        <div className="chat-composer-box">
          <input
            ref={inputRef}
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type or speak..."
            disabled={disabled}
            className="composer-input"
          />
          <button
            className={`chat-send-button ${userInput.trim() ? 'has-text' : ''}`}
            onClick={handleSubmit}
            disabled={!userInput.trim() || disabled}
            title="Send message"
          >
            <div className="send-icon-mask"></div>
          </button>
        </div>
      </div>
      <button
        className={`chat-record-button ${isRecording ? 'recording' : ''}`}
        onClick={handleRecordClick}
        disabled={disabled}
        title={isRecording ? 'Stop recording' : 'Start recording'}
      >
        <div className="record-icon-mask"></div>
      </button>

      {/* Suggestions lightbulb */}
      {suggestions && suggestions.length > 0 && (
        <button
          className="chat-suggestion-button"
          onClick={handleSuggestionClick}
          disabled={disabled}
          title="Get suggestions"
        >
          💡
        </button>
      )}

      {/* Suggestion popup */}
      {showSuggestion && (
        <div className="chat-suggestion-popup">
          Why do you need help?
        </div>
      )}
    </div>
  );
};