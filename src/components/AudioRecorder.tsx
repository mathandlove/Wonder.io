import React, { useState, useRef } from 'react';
import './AudioRecorder.css';

interface AudioRecorderProps {
  onTranscription: (transcription: string) => void;
  characterName?: string;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ onTranscription, characterName = 'Leo' }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcription, setTranscription] = useState<string>('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  console.log('🎯 AudioRecorder component rendered for:', characterName);

  const startRecording = async () => {
    console.log('🎤 Start recording button clicked');
    try {
      console.log('📱 Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('✅ Microphone access granted');
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        console.log('📊 Audio data available:', event.data.size, 'bytes');
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log('⏹️ Recording stopped');
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        console.log('🎵 Audio blob created:', blob.size, 'bytes');
        setAudioBlob(blob);
        transcribeAudio(blob);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
        console.log('🔇 Microphone released');
      };

      mediaRecorder.start();
      setIsRecording(true);
      console.log('🔴 Recording started');
    } catch (error) {
      console.error('❌ Error accessing microphone:', error);
      alert('Unable to access microphone. Please check your browser permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');
      formData.append('model', 'whisper-1');

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.statusText}`);
      }

      const result = await response.json();
      const transcribedText = result.text || '';
      
      setTranscription(transcribedText);
      onTranscription(transcribedText);
    } catch (error) {
      console.error('Transcription error:', error);
      alert('Transcription failed. Please try again.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const playAudio = () => {
    if (audioBlob) {
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.play();
    }
  };

  const resetRecording = () => {
    setAudioBlob(null);
    setTranscription('');
    setIsTranscribing(false);
  };

  const testClick = () => {
    console.log('🧪 Test button clicked - basic click events working!');
    alert('Click test successful!');
  };

  return (
    <div className="audio-recorder">
      <div className="audio-recorder-header">
        <span className="character-prompt">What would {characterName} say?</span>
      </div>
      
      <div className="audio-controls">
        <button 
          className="record-btn" 
          onClick={testClick}
          style={{ marginRight: '8px', background: '#FF9800' }}
        >
          🧪 Test Click
        </button>
        
        {!audioBlob && !isRecording && (
          <button 
            className="record-btn" 
            onClick={startRecording}
            disabled={isTranscribing}
          >
            🎤 Record
          </button>
        )}
        
        {isRecording && (
          <button 
            className="stop-btn recording" 
            onClick={stopRecording}
          >
            ⏹️ Stop Recording
          </button>
        )}
        
        {audioBlob && (
          <div className="audio-playback">
            <button className="play-btn" onClick={playAudio}>
              ▶️ Play
            </button>
            <button className="reset-btn" onClick={resetRecording}>
              🔄 Record Again
            </button>
          </div>
        )}
      </div>
      
      {isTranscribing && (
        <div className="transcribing">
          <div className="spinner"></div>
          <span>Transcribing audio...</span>
        </div>
      )}
      
      {transcription && (
        <div className="transcription-result">
          <div className="transcription-label">Transcription:</div>
          <div className="transcription-text">{transcription}</div>
        </div>
      )}
    </div>
  );
};

export default AudioRecorder;