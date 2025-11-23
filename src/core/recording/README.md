# Recording System

Clean and simple speech-to-text recording implementation using OpenAI GPT-4o Transcribe.

## Overview

The recording system consists of three main parts:

1. **RecordingOrchestrator** ([RecordingOrchestrator.ts](./RecordingOrchestrator.ts)) - High-level API for recording and transcription
2. **useSTT Hook** ([hooks/useSTT.ts](./hooks/useSTT.ts)) - Low-level audio capture and WebSocket communication
3. **Backend Proxy** ([backend/src/whisper-proxy-single.ts](../../../backend/src/whisper-proxy-single.ts)) - WebSocket server that handles transcription via OpenAI

## Quick Start

```tsx
import { useRecordingOrchestrator } from '@core/recording/RecordingOrchestrator';

function MyComponent() {
  const recording = useRecordingOrchestrator({
    onTranscript: (text) => {
      console.log('Got transcript:', text);
    },
    onError: (error) => {
      console.error('Recording error:', error);
    },
  });

  return (
    <div>
      <button onClick={recording.start}>Start</button>
      <button onClick={recording.stop}>Stop</button>
      <p>State: {recording.state}</p>
      <p>Transcript: {recording.transcript}</p>
    </div>
  );
}
```

## Recording Flow

```
User clicks Start
    ↓
Microphone captures audio
    ↓
Audio streams to backend via WebSocket
    ↓
User clicks Stop
    ↓
Backend transcribes complete audio via OpenAI GPT-4o Transcribe
    ↓
Final transcript sent back to frontend
    ↓
onTranscript callback invoked
    ↓
Recording returns to idle state
```

## API Reference

### `useRecordingOrchestrator(callbacks?)`

Main hook for recording functionality.

**Parameters:**
- `callbacks` (optional):
  - `onTranscript?: (text: string) => void` - Called when transcription completes
  - `onError?: (error: string) => void` - Called on error
  - `onAutoStop?: () => void` - Called when recording auto-stops due to silence

**Returns:**
```typescript
{
  start: () => Promise<void>;    // Start recording
  stop: () => void;               // Stop recording and transcribe
  state: RecordingState;          // 'idle' | 'recording' | 'processing' | 'error'
  transcript: string;             // Final transcript text
  partial: string;                // Partial transcript (during recording)
  error?: string;                 // Error message if state is 'error'
  audioLevel: number;             // Current audio level (0-1) for visualization
}
```

## Features

- ✅ **Simple API** - Single hook, easy to use
- ✅ **Clean state management** - Clear recording states
- ✅ **Auto-stop on silence** - Configurable silence detection (20s default)
- ✅ **Audio visualization** - Real-time audio level monitoring
- ✅ **Error handling** - Comprehensive error reporting
- ✅ **TypeScript** - Full type safety

## Configuration

The system is configured via environment variables in the backend:

```bash
# Backend (.env)
OPENAI_API_KEY=your-api-key
ALLOWED_ORIGIN=http://localhost:5173
DEBUG_PLAYBACK=false      # Set to 'true' to hear recorded audio
DEBUG_SAVE_CHUNKS=false   # Set to 'true' to save audio files
```

Frontend configuration is in [hooks/useSTT.ts](./hooks/useSTT.ts):

```typescript
const CONFIG = {
  WS_URL: 'ws://localhost:3001/api/stt/socket',
  SAMPLE_RATE: 16000,                    // 16kHz audio
  SILENCE_THRESHOLD: 0.005,              // Audio level threshold
  SILENCE_DURATION_MS: 20000,            // Auto-stop after 20s silence
  BUFFER_SIZE: 4096,                     // AudioWorklet buffer size
};
```

## Example

See [RecordingOrchestrator.example.tsx](./RecordingOrchestrator.example.tsx) for a complete working example.

## Architecture

### Frontend (Browser)
```
useRecordingOrchestrator (High-level API)
    ↓
useSTT (Audio capture + WebSocket)
    ↓
AudioWorklet (Audio processing)
    ↓
WebSocket (Send audio chunks)
```

### Backend (Node.js)
```
WebSocket Server
    ↓
Buffer audio chunks
    ↓
On finalize: Convert PCM → WAV
    ↓
OpenAI GPT-4o Transcribe API
    ↓
Send transcript back to frontend
```

## Debugging

Enable debug logging by setting localStorage:

```javascript
// In browser console
localStorage.debug = 'recording:*';
```

Enable backend audio playback (macOS only):

```bash
# In backend .env
DEBUG_PLAYBACK=true
DEBUG_SAVE_CHUNKS=true
```

This will:
- Play recorded audio after transcription (using `afplay`)
- Save audio files to `backend/debug-audio/latest-recording.wav`

## Browser Compatibility

- ✅ Chrome/Edge (recommended)
- ✅ Safari
- ✅ Firefox
- ⚠️ Requires HTTPS in production (for microphone access)
- ⚠️ Requires microphone permissions

## Troubleshooting

**Microphone not working?**
- Check browser permissions (chrome://settings/content/microphone)
- Ensure no other app is using the microphone
- Try refreshing the page

**No transcript received?**
- Check backend is running on port 3001
- Verify OPENAI_API_KEY is set
- Check browser console for WebSocket errors
- Check backend logs for transcription errors

**Audio is silent?**
- Check microphone input level in system settings
- Try speaking louder
- Check if microphone is muted in system settings

## Migration from Old System

If you're migrating from RecordPanelOrchestrator:

**Before:**
```tsx
const recording = useRecording();
await Recording.start();
Recording.stop();
```

**After:**
```tsx
const recording = useRecordingOrchestrator({
  onTranscript: (text) => { /* handle transcript */ }
});
await recording.start();
recording.stop();
```

Key differences:
- No need for separate `Recording` API
- State management is built-in
- Callbacks are cleaner (no ref management needed)
- Transcript is available in hook return value
