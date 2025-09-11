import React, { useState, useRef, useCallback } from 'react';

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
      // Check if browser supports SpeechRecognition
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        alert('Speech recognition not supported in this browser');
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      recognition.onstart = () => {
        console.log('Speech recognition started');
        setIsRecording(true);
      };
      
      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setUserInput(transcript);
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
        setIsRecording(false);
        setRecognition(null);
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
      setIsRecording(false);
      console.log('Speech recognition stopped');
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
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your response..."
          autoFocus={autoFocus}
        />
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