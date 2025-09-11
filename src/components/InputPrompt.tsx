import React, { useState, useRef, useCallback, useEffect } from 'react';

interface InputPromptProps {
  prompt: string;
  onSubmit: (input: string) => void;
  autoFocus?: boolean;
}

const InputPrompt: React.FC<InputPromptProps> = ({ prompt, onSubmit, autoFocus = true }) => {
  const [userInput, setUserInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to end of input when text updates during recording
  useEffect(() => {
    if (isRecording && inputRef.current) {
      // Set cursor to end of text
      const length = userInput.length;
      inputRef.current.setSelectionRange(length, length);
      inputRef.current.scrollLeft = inputRef.current.scrollWidth;
    }
  }, [userInput, isRecording]);

  const handleSubmit = () => {
    if (userInput.trim()) {
      onSubmit(userInput.trim());
      setUserInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && userInput.trim()) {
      handleSubmit();
    }
  };

  const startRecording = useCallback(() => {
    try {
      // Clear previous text when starting a new recording session
      setUserInput('');
      
      // Check if browser supports SpeechRecognition
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        alert('Speech recognition not supported in this browser');
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true; // Keep listening until manually stopped
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      recognition.onstart = () => {
        console.log('Speech recognition started');
        setIsRecording(true);
      };
      
      recognition.onresult = (event: any) => {
        let transcript = '';
        // Get all final results (accumulate everything from the entire session)
        for (let i = 0; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript + ' ';
          }
        }
        // Add interim results (current speaking)
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
        } else {
          alert(`Speech recognition error: ${event.error}`);
        }
      };
      
      recognition.onend = () => {
        console.log('Speech recognition ended');
        // Only stop if we manually stopped, otherwise restart
        if (recognitionRef.current === recognition) {
          try {
            recognition.start(); // Restart if we're still supposed to be recording
          } catch (error) {
            // If restart fails, we're done
            console.log('Could not restart recognition, stopping');
            setIsRecording(false);
            setRecognition(null);
            recognitionRef.current = null;
          }
        } else {
          setIsRecording(false);
          setRecognition(null);
        }
      };
      
      recognitionRef.current = recognition;
      setRecognition(recognition);
      recognition.start();
      
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      alert('Could not start speech recognition. Please try again.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null; // Clear the ref so onend won't restart
      setRecognition(null);
      setIsRecording(false);
      console.log('Speech recognition stopped manually');
    }
  }, []);

  const handleRecordClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="story-input-container">
      <div className="story-input-prompt">{prompt}</div>
      <div className="story-input-box">
        <input
          ref={inputRef}
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tap the Mic or Type..."
          autoFocus={autoFocus}
        />
        <button 
          className={`story-input-send-button ${userInput.trim() ? 'has-text' : ''}`}
          onClick={handleSubmit}
          disabled={!userInput.trim()}
          title="Send message"
        >
          <div className="send-icon-mask"></div>
        </button>
        <button 
          className={`story-input-record-button ${isRecording ? 'recording' : ''}`}
          onClick={handleRecordClick}
          title={isRecording ? 'Stop recording' : 'Start recording'}
        >
          <div className="record-icon-mask"></div>
        </button>
      </div>
    </div>
  );
};

export default InputPrompt;