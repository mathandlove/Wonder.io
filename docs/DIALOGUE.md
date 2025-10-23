# Dialogue & Recording System

## Overview

The Dialogue & Recording System handles voice input, speech-to-text, AI chat, and answer validation. It creates interactive learning experiences where children can ask questions and complete quests through voice interaction.

## Architecture

```
User speaks into microphone
        ↓
RecordingContext (WebRTC audio)
        ↓
useSTT Hook (Speech-to-Text)
        ↓
Transcript updates scene state
        ↓
ChatFlowOrchestrator detects ai-waiting
        ↓
AIModule calls backend
        ↓
Response → New scene created
        ↓
NavigationGraph updated
```

## Key Components

### 1. RecordingContext

Location: [src/core/recording/RecordingContext.tsx](../src/core/recording/RecordingContext.tsx)

**Responsibilities**:
- WebRTC audio capture via `getUserMedia()`
- Audio level monitoring for visual feedback
- Recording state management

**API**:
```typescript
const { state, startRecording, stopRecording } = useRecording();

// State interface
interface RecordingState {
  isRecording: boolean;
  audioLevel: number;      // 0-100 for visualizer
  transcript: string;      // Live STT results
  isFinal: boolean;        // True when STT finalized
}
```

**Audio Capture**:
```typescript
async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    }
  });

  // Create MediaRecorder
  mediaRecorder = new MediaRecorder(stream, {
    mimeType: 'audio/webm;codecs=opus'
  });

  // Capture audio chunks
  mediaRecorder.ondataavailable = (event) => {
    audioChunks.push(event.data);
  };

  mediaRecorder.start(100); // Capture every 100ms
}
```

**Audio Level Monitoring**:
```typescript
// Analyze audio stream for volume visualization
const analyzeAudio = () => {
  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(dataArray);

  // Calculate average volume
  const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
  const audioLevel = (average / 255) * 100;

  setRecordingState(prev => ({ ...prev, audioLevel }));

  requestAnimationFrame(analyzeAudio);
};
```

### 2. useSTT Hook

Location: [src/core/recording/hooks/useSTT.ts](../src/core/recording/hooks/useSTT.ts)

**Responsibilities**:
- Send audio to speech-to-text service
- Handle interim and final transcripts
- Update scene state with results

**API**:
```typescript
const { sendAudioForSTT, isProcessing } = useSTT();

// Send audio blob
await sendAudioForSTT(audioBlob, {
  onInterim: (text) => {
    // Partial transcription (real-time)
    updateTranscript(text, false);
  },
  onFinal: (text) => {
    // Final transcription
    updateTranscript(text, true);
  },
  onError: (error) => {
    // Handle error
    showError(error.message);
  }
});
```

**Integration**:
```typescript
// RecordPanelOrchestrator.tsx
const handleStop = async () => {
  const audioBlob = await recording.stopRecording();

  // Transition to processing state
  nodeManager.updateNodeState(currentNodeId, {
    type: 'dialogue',
    state: 'input-processing'
  });

  // Send to STT
  await stt.sendAudioForSTT(audioBlob, {
    onFinal: (text) => {
      // Update node with final transcript
      nodeManager.updateNodeState(currentNodeId, {
        type: 'dialogue',
        state: 'waiting-for-finalize',
        questionText: text
      });
    }
  });
};
```

### 3. RecordPanel

Location: [src/core/recording/RecordPanel.tsx](../src/core/recording/RecordPanel.tsx)

**Pure presentational component** that displays:
- Quest text
- Ask/Hint/Answer buttons
- Recording visualizer
- Answer feedback (correct/incorrect)

**Props**:
```typescript
interface RecordPanelProps {
  disabled: boolean;
  questState: 'active' | 'complete' | 'failed';
  dialogueState: DialogueState;
  questText?: string;
  answerText?: string;
  onNext: () => void;
  onRecordStop: () => void;
  onAskClick?: () => void;
  onAnswerWrongVideoComplete?: () => void;
  onAnswerRightVideoComplete?: () => void;
}
```

**Visual States** (based on `dialogueState`):
- `basic`: Hidden below screen
- `quest-showing`: Centered with Accept button
- `input-showInput`: Bottom-anchored, Ask/Hint/Answer visible
- `input-recording`: Stop button, visualizer active
- `input-processing`: Processing indicator
- `answer-waiting`: Centered, golden glow, stamp animation
- `answer-right`: Green glow, happy seal
- `answer-wrong`: Red glow, angry seal

### 4. RecordPanelOrchestrator

Location: [src/core/recording/RecordPanelOrchestrator.tsx](../src/core/recording/RecordPanelOrchestrator.tsx)

**Responsibilities**:
- Orchestrate recording lifecycle
- Manage dialogue state transitions
- Handle quest acceptance
- Coordinate with NodeManager

**State Machine**:
```typescript
quest-showing
    ↓ (accept quest)
input-showInput
    ↓ (click Ask)
input-recording
    ↓ (click Stop)
input-processing
    ↓ (STT complete)
waiting-for-finalize
    ↓ (final transcript)
ai-waiting
    ↓ (AI response ready)
(next scene)
```

**Event Handlers**:
```typescript
const handleAcceptQuest = () => {
  nodeManager.updateNodeState(currentNodeId, {
    type: 'dialogue',
    state: 'input-showInput'
  });
};

const handleAskClick = async () => {
  // Start recording
  await recording.startRecording();

  nodeManager.updateNodeState(currentNodeId, {
    type: 'dialogue',
    state: 'input-recording'
  });
};

const handleRecordStop = async () => {
  const audioBlob = await recording.stopRecording();

  nodeManager.updateNodeState(currentNodeId, {
    type: 'dialogue',
    state: 'input-processing'
  });

  // Send to STT (handled by useSTT hook)
};
```

### 5. ChatFlowOrchestrator

Location: [src/core/dialogue/ChatFlowOrchestrator.tsx](../src/core/dialogue/ChatFlowOrchestrator.tsx)

**Responsibilities**:
- Observe scene state for `ai-waiting`
- Process user questions
- Call AI backend
- Create response scenes
- Insert into navigation graph

**Auto-Trigger Logic**:
```typescript
// ChatFlowOrchestratorComponent.tsx
useEffect(() => {
  const isAiWaiting = dialogueState === 'ai-waiting';

  if (isAiWaiting && questionText && questionText.trim()) {
    // Only process once per recording
    if (recordingId !== processingRecordingId) {
      setProcessingRecordingId(recordingId);

      // Process transcript
      chatFlow.processTranscript(questionText, recordingId)
        .then(() => {
          setProcessingRecordingId(null);
        })
        .catch((error) => {
          console.error('Error processing transcript:', error);
          setProcessingRecordingId(null);
        });
    }
  }
}, [dialogueState, questionText, recordingId]);
```

**Process Flow**:
```typescript
async function processTranscript(questionText: string, recordingId: string) {
  // 1. Get AI response
  const response = await aiModule.getResponse({
    text: questionText,
    conversationHistory: aiMemory.getHistory(flowId),
    context: {
      characterDescription: flowMetadata.characterDescription
    }
  });

  // 2. Store conversation history
  aiMemory.addUserMessage(flowId, questionText);
  aiMemory.addAssistantMessage(flowId, response.text);

  // 3. Create response scene
  const responseScene = sceneFactory.createCharacterScene({
    text: response.text,
    speaker: currentScene.speaker,
    flowId: currentScene.flowId
  });

  // 4. Insert after current
  nodeManager.insertSceneAfterCurrent(responseScene);

  // 5. Navigate to it
  nodeManager.goNext();
}
```

### 6. AIModule

Location: [src/features/ai/AIModule.tsx](../src/features/ai/AIModule.tsx)

**Responsibilities**:
- HTTP client for AI backend
- Request/response formatting
- Error handling

**API**:
```typescript
const { getResponse, isProcessing, lastError } = useAIModule();

const response = await getResponse({
  text: 'Why is the sky blue?',
  conversationHistory: [
    { role: 'user', content: 'Hello!' },
    { role: 'assistant', content: 'Hi there!' }
  ],
  context: {
    characterDescription: 'A friendly science teacher who loves explaining things simply.'
  }
});

// Response
{
  text: 'The sky is blue because...',
  success: true,
  error: undefined
}
```

**HTTP Request**:
```typescript
const response = await fetch('http://localhost:3001/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    question: input.text,
    characterDescription: input.context.characterDescription,
    conversationHistory: input.conversationHistory
  })
});
```

### 7. AIMemoryStore

Location: [src/core/ai/AIMemoryStore.tsx](../src/core/ai/AIMemoryStore.tsx)

**Responsibilities**:
- Store conversation history per flowId
- Provide context for AI requests
- Trim old messages (keep last N)

**API**:
```typescript
const aiMemory = useAIMemory();

// Add messages
aiMemory.addUserMessage(flowId, 'What is gravity?');
aiMemory.addAssistantMessage(flowId, 'Gravity is a force that...');

// Get history
const messages = aiMemory.getHistory(flowId);
// [
//   { role: 'user', content: 'What is gravity?', timestamp: ... },
//   { role: 'assistant', content: 'Gravity is a force that...', timestamp: ... }
// ]

// Clear history
aiMemory.clearHistory(flowId);
```

**Storage Structure**:
```typescript
{
  [flowId]: {
    flowId: string,
    messages: ConversationMessage[],
    characterDescription?: string
  }
}
```

### 8. AnswerValidationOrchestrator

Location: [src/core/dialogue/AnswerValidationOrchestrator.tsx](../src/core/dialogue/AnswerValidationOrchestrator.tsx)

**Responsibilities**:
- Watch for `answer-waiting` state
- Validate answer against successAnswer
- Create success/fail dance scenes
- Update quest state

**Validation Logic**:
```typescript
import { validateAnswer } from './validateAnswer';

const isCorrect = validateAnswer(
  userAnswer: 'cookies',
  successAnswer: 'cookies'
);
// Returns true if match (case-insensitive, fuzzy match)
```

**Scene Creation**:
```typescript
if (isCorrect) {
  // Create success dance scene
  const successScene = sceneFactory.createSuccessDanceScene({
    character: currentScene.speaker,
    answerText: answerText
  });

  // Mark quest as complete
  nodeManager.updateQuestState('complete');

  nodeManager.insertSceneAfterCurrent(successScene);
} else {
  // Create fail dance scene
  const failScene = sceneFactory.createFailDanceScene({
    character: currentScene.speaker,
    answerText: answerText
  });

  nodeManager.insertSceneAfterCurrent(failScene);
}
```

## Dialogue State Machine

Location: [src/core/dialogue/types.ts](../src/core/dialogue/types.ts)

```
basic (hidden)
    ↓
quest-showing (offer quest)
    ↓ (accept)
input-showInput (Ask/Answer buttons)
    ↓ (click Ask)
input-recording (recording question)
    ↓ (stop)
input-processing (STT processing)
    ↓
waiting-for-finalize (STT finalized)
    ↓
ai-waiting (waiting for AI)
    ↓ (AI response ready)
[new scene inserted]
    ↓
basic (continue story)
```

**Answer Flow**:
```
input-showInput
    ↓ (click Answer - quest complete)
record-answer
    ↓ (stop)
answer-processing
    ↓
waiting-for-answer-finalize
    ↓
answer-waiting (validate)
    ↓
answer-right OR answer-wrong
    ↓
success-dance OR fail-dance
    ↓
(continue or retry)
```

## Audio Visualization

Location: [src/core/recording/AudioVisualizer.tsx](../src/core/recording/AudioVisualizer.tsx)

**Modes**:
1. **listening**: Animated waves synced to audio level
2. **processing**: Static "Processing..." text

**Usage**:
```typescript
<AudioVisualizer
  audioLevel={recordingState.audioLevel}
  className="bubble-variant"
  mode="listening"
/>
```

**CSS Animation**:
```css
.wave {
  animation: wave 1s ease-in-out infinite;
  height: calc(10px + audioLevel * 0.5px);
}

@keyframes wave {
  0%, 100% { transform: scaleY(1); }
  50% { transform: scaleY(1.5); }
}
```

## Flow Metadata

Location: [src/core/data/FlowMetadataStore.tsx](../src/core/data/FlowMetadataStore.tsx)

**Purpose**: Store per-flow metadata (character description, success answer)

**Structure**:
```typescript
{
  [flowId]: {
    characterDescription: 'A wise wizard who teaches magic',
    successAnswer: 'abraca dabra',
    ...other metadata
  }
}
```

**Usage**:
```typescript
const flowMetadata = useFlowMetadata();

// Get metadata
const meta = flowMetadata.getFlowMetadata(flowId);

// Set metadata (during story load)
flowMetadata.setFlowMetadata(flowId, {
  characterDescription: '...',
  successAnswer: '...'
});
```

## Common Patterns

### Start Recording
```typescript
const handleAskClick = async () => {
  await recording.startRecording();
  nodeManager.updateNodeState(currentNodeId, {
    type: 'dialogue',
    state: 'input-recording'
  });
};
```

### Stop Recording & Process
```typescript
const handleStop = async () => {
  const audioBlob = await recording.stopRecording();

  nodeManager.updateNodeState(currentNodeId, {
    type: 'dialogue',
    state: 'input-processing'
  });

  await stt.sendAudioForSTT(audioBlob, {
    onFinal: (text) => {
      nodeManager.updateNodeState(currentNodeId, {
        type: 'dialogue',
        state: 'waiting-for-finalize',
        questionText: text
      });
    }
  });
};
```

### Trigger AI Response
```typescript
// ChatFlowOrchestrator auto-detects ai-waiting state
useEffect(() => {
  if (dialogueState === 'ai-waiting' && questionText) {
    processTranscript(questionText, recordingId);
  }
}, [dialogueState, questionText, recordingId]);
```

### Validate Answer
```typescript
useEffect(() => {
  if (dialogueState === 'answer-waiting' && answerText) {
    const isCorrect = validateAnswer(answerText, successAnswer);

    if (isCorrect) {
      createSuccessScene();
    } else {
      createFailScene();
    }
  }
}, [dialogueState, answerText]);
```

## Debugging

### Enable Recording Logs
```typescript
// RecordingContext.tsx
console.log('[Recording]', {
  isRecording,
  audioLevel,
  transcript,
  isFinal
});
```

### Enable STT Logs
```typescript
// useSTT.ts
console.log('[STT] Sending audio:', audioBlob.size, 'bytes');
console.log('[STT] Interim:', text);
console.log('[STT] Final:', text);
```

### Enable ChatFlow Logs
```typescript
// ChatFlowOrchestrator.tsx
console.log('[ChatFlow] Processing:', {
  questionText,
  recordingId,
  flowId
});
console.log('[ChatFlow] AI Response:', response.text);
```

## Common Issues

### Issue: Recording doesn't start
**Cause**: Missing microphone permission
**Fix**: Check browser console, request permission explicitly

### Issue: Transcript empty
**Cause**: STT service not running or network error
**Fix**: Check backend logs, verify API endpoint

### Issue: AI doesn't respond
**Cause**: ChatFlowOrchestrator not detecting ai-waiting state
**Fix**: Check scene state transitions, verify dialogueState = 'ai-waiting'

### Issue: Answer validation fails
**Cause**: Fuzzy matching too strict or successAnswer undefined
**Fix**: Check FlowMetadata for flowId, adjust validateAnswer logic

## Best Practices

1. **Always check permissions** before starting recording
2. **Show visual feedback** during all states (visualizer, processing indicator)
3. **Handle errors gracefully** (STT failure, AI timeout, network error)
4. **Provide retry mechanisms** for failed recordings
5. **Clear conversation history** when appropriate (new flow, reset)
6. **Validate inputs** before sending to AI (non-empty, reasonable length)
7. **Log state transitions** for debugging

## Future Enhancements

1. **Offline mode** with local STT
2. **Multi-language support**
3. **Voice activity detection** (auto-stop when silent)
4. **Transcript editing** before sending to AI
5. **Audio playback** for AI responses (TTS)
6. **Conversation export** for review/analysis
