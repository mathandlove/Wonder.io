# Deepgram STT Testing Guide

## Setup Complete ✅

The Deepgram Speech-to-Text integration via WebSocket proxy has been successfully implemented!

## What Was Implemented

### Backend (Phase 1)
- ✅ **WebSocket Proxy** ([backend/src/deepgram-proxy.ts](backend/src/deepgram-proxy.ts))
  - Bidirectional bridge between client ↔ Deepgram
  - Normalizes Deepgram events into consistent format
  - Security: origin check, byte limits, 60s idle timeout
  - Heartbeat mechanism for connection stability

- ✅ **Backend Integration** ([backend/src/index.ts](backend/src/index.ts))
  - WebSocket server on `/api/stt/socket` endpoint
  - Coexists with existing Express routes
  - Running on port 3001

- ✅ **Configuration**
  - API key configured in `backend/.env`
  - Example config in `.env.example`

### Frontend (Phase 2 & 3)
- ✅ **useDeepgram Hook** ([src/core/recording/hooks/useDeepgram.ts](src/core/recording/hooks/useDeepgram.ts))
  - Vendor-agnostic STT interface
  - WebSocket client with auto-reconnect
  - Audio pipeline: Float32 → Int16 PCM → WebSocket
  - VAD-based auto-stop after 5s silence
  - Real-time partial + final transcript handling

- ✅ **RecordingContext Integration** ([src/core/recording/RecordingContext.tsx](src/core/recording/RecordingContext.tsx))
  - Feature flag: `USE_DEEPGRAM = true` (line 14)
  - Bridges Deepgram events to existing reducer
  - Zero breaking changes to RecordPanelOrchestrator
  - Maintains same event flow (INTERIM, FINAL, ACCUMULATE)

## Testing Instructions

### 1. Start the Backend (if not running)

```bash
cd backend
pnpm dev
```

Expected output:
```
🚀 Backend server running on port 3001
📊 API endpoints available at http://localhost:3001/api
🎤 WebSocket STT endpoint: ws://localhost:3001/api/stt/socket
```

### 2. Start the Frontend

```bash
# From project root
pnpm dev
```

### 3. Test Recording Flow

1. **Open the app** in your browser (Chrome recommended)
2. **Navigate to a scene** with the recording panel
3. **Click the microphone button** to start recording
4. **Speak clearly** - you should see:
   - 🟡 **Partial transcripts** appear in real-time (live captions)
   - 🟢 **Final transcripts** accumulate after pauses
   - 🔴 **Auto-stop** after 5 seconds of silence

### 4. Expected Behavior

| Event | What You Should See |
|-------|---------------------|
| Click mic | Recording starts immediately |
| Start speaking | Partial text appears in speech bubble |
| Pause briefly | Text becomes final, accumulates |
| Continue speaking | New partial text appears |
| 5s silence | Recording auto-stops |
| Click stop | Recording stops manually |

### 5. Check Browser Console

Look for these log messages:

```
[useDeepgram] Starting recording...
[useDeepgram] WebSocket connected
[useDeepgram] Partial: hello world
[useDeepgram] Final: hello world (confidence: 0.95)
[useDeepgram] Auto-stop: 5s silence detected
```

### 6. Check Backend Console

Look for these log messages:

```
🎤 [req_xxx] New STT connection from http://localhost:5173
✅ [req_xxx] Connected to Deepgram
🧹 [req_xxx] Cleanup: Client disconnected
```

## Troubleshooting

### "WebSocket connection failed"
- Ensure backend is running on port 3001
- Check `backend/.env` has valid `DEEPGRAM_API_KEY`
- Verify `ALLOWED_ORIGIN=http://localhost:5173`

### "Server not configured with Deepgram API key"
- Add your Deepgram API key to `backend/.env`
- Get one at: https://console.deepgram.com/

### No audio being captured
- Grant microphone permissions in browser
- Check browser console for permission errors
- Ensure no other apps are using the microphone

### Transcripts not appearing
- Check browser console for WebSocket errors
- Verify backend logs show "Connected to Deepgram"
- Try speaking more clearly/loudly

## Feature Flag

To switch back to Web Speech API (Chrome/Edge only):

```typescript
// src/core/recording/RecordingContext.tsx:14
const USE_DEEPGRAM = false; // Change to false
```

## Architecture Summary

```
Frontend (React)
  ↓ Audio (Int16 PCM)
  ↓ WebSocket (ws://localhost:3001/api/stt/socket)
Backend Proxy (Node.js)
  ↓ Forward audio
  ↓ WebSocket (wss://api.deepgram.com)
Deepgram API
  ↓ Return transcripts
  ↓
Backend Proxy
  ↓ Normalize events
  ↓
Frontend (useDeepgram)
  ↓ Dispatch events
  ↓
RecordingContext Reducer
  ↓ Update state
  ↓
RecordPanelOrchestrator
  ↓ Display in UI
```

## Next Steps

If everything works:
1. ✅ Test with various speech patterns
2. ✅ Test rapid start/stop cycles
3. ✅ Test network disconnects
4. ✅ Test with background noise
5. ✅ Compare quality vs Web Speech API

If issues occur:
1. Check browser console for errors
2. Check backend console for connection issues
3. Verify Deepgram API key is valid
4. Test with `curl` to backend health endpoint:
   ```bash
   curl http://localhost:3001/api/health
   ```

## Files Modified

### New Files
- `backend/src/deepgram-proxy.ts` - WebSocket proxy
- `src/core/recording/hooks/useDeepgram.ts` - Frontend hook
- `backend/.env` - Environment config

### Modified Files
- `backend/src/index.ts` - WebSocket server integration
- `src/core/recording/RecordingContext.tsx` - Deepgram integration
- `.env.example` - Documentation

## Configuration

### Backend Environment Variables
```bash
DEEPGRAM_API_KEY=your_key_here
PORT=3001
ALLOWED_ORIGIN=http://localhost:5173
```

### Deepgram Parameters (backend/src/deepgram-proxy.ts:41-50)
```typescript
model: 'nova-2'           // Latest model
language: 'en-US'         // English US
punctuate: true           // Auto punctuation
smart_format: true        // Smart formatting
interim_results: true     // Real-time partials
utterance_end_ms: 1000    // Utterance detection
vad_events: true          // Voice activity detection
endpointing: 300          // 300ms silence = end
```

---

**Implementation Status: COMPLETE** ✅

Ready for testing! 🚀
