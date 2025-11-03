# State Management Architecture

**Last Updated**: 2025-01-03
**Status**: Current Architecture (Post-Migration)

## Overview

Wonder.io uses a **layered state management architecture** that separates concerns between orchestration (XState), data storage (Zustand), and view rendering (React).

This document describes the **current architecture** after the flowId → conversationId migration and XState AI integration.

---

## Architecture Layers

```
┌─────────────────────────────────────────────────────────┐
│ Layer 1: React Components (View Layer)                  │
│ - Render UI based on state                              │
│ - Emit events (user interactions)                       │
│ - NO business logic                                     │
│ Files: src/pages/, src/features/, src/core/*/components│
└─────────────────────────────────────────────────────────┘
                       ↓ subscribes via hooks
                       ↑ emits events
┌─────────────────────────────────────────────────────────┐
│ Layer 2: Zustand Stores (Data Layer)                    │
│ - navigationStore: Graph, nodes, current position       │
│ - Atomic updates, efficient selectors                   │
│ Files: src/core/navigation/navigationStore.ts           │
└─────────────────────────────────────────────────────────┘
                       ↑ mutations
                       ↓ reads
┌─────────────────────────────────────────────────────────┐
│ Layer 3: XState Machine (Orchestration Layer)           │
│ - Owns flow control and state transitions               │
│ - Invokes services (AI, validation, story loading)      │
│ - Updates stores via actions                            │
│ Files: src/core/navigation/machine/navigationMachine.ts │
└─────────────────────────────────────────────────────────┘
```

---

## State Management Patterns

### Pattern 1: Event-Driven Communication

**Rule**: React components never call store methods directly. They emit events to XState.

**Example - Recording Flow**:
```typescript
// ✅ CORRECT: React emits event
function RecordPanel() {
  const handleStopRecording = () => {
    navigationBus.emit({
      type: 'RECORDING_PROCESSED',
      transcript: finalText,
      recordingId: activeRecordingId
    });
  };
}

// ❌ WRONG: React mutates store directly
function RecordPanel() {
  const handleStopRecording = () => {
    useNavigationStore.getState().updateSceneTextByRecordingId(id, text); // DON'T DO THIS
  };
}
```

**Why**: Unidirectional data flow ensures single source of truth (XState).

---

### Pattern 2: XState Actors for Async Operations

**Rule**: Async operations (AI calls, API fetches) are XState actors, not React hooks.

**Example - AI Processing**:
```typescript
// ✅ CORRECT: XState actor
const callAIService = fromPromise(async ({ input }) => {
  const metadata = getConversationMetadata(input.conversationId);
  return await callAI({
    questionText: input.questionText,
    characterDescription: metadata.characterDescription,
    conversationHistory: []
  });
});

// In machine:
askWaitingForAI: {
  invoke: {
    src: 'callAI',
    input: () => ({ questionText, conversationId }),
    onDone: { target: 'route', actions: 'createAIResponseScene' },
    onError: { target: 'dialogueInput' } // Clean error recovery
  }
}

// ❌ WRONG: React useEffect watches phase and calls AI
useEffect(() => {
  if (phase === 'ai-waiting') {
    callAI(); // Creates infinite loop on error!
  }
}, [phase]);
```

**Why**: XState provides built-in error handling, timeout support, and prevents race conditions.

---

### Pattern 3: XState Actions Mutate Stores

**Rule**: All store mutations go through XState actions, not React event handlers.

**Example - Storing Transcript**:
```typescript
// ✅ CORRECT: XState action
actions: {
  storeTranscriptInScene: ({ event }) => {
    if (event.type !== 'RECORDING_PROCESSED') return;

    useNavigationStore.getState().updateCurrentSceneProperties({
      text: event.transcript,
      questionText: event.transcript
    });
  }
}

// State definition:
RECORDING_PROCESSED: {
  actions: ['storeTranscriptInScene'],
  target: 'askWaitingForAI'
}

// ❌ WRONG: React mutates on event
function RecordPanel() {
  useEffect(() => {
    if (!isRecording && transcript) {
      useNavigationStore.getState().updateCurrentSceneProperties({ text: transcript });
    }
  }, [isRecording, transcript]);
}
```

**Why**: Centralizes all mutations in XState, making state changes predictable and debuggable.

---

## Conversation Context Architecture

### Terminology: conversationId (not flowId)

**Why the rename?**
- "flow" was overloaded: `character-flow` (JSON type), `flowSequence` (animation flag), `flowId` (metadata reference)
- `conversationId` clearly indicates: "This scene is part of a conversation with a character"

### Conversation Metadata Storage

**Module-level storage** (current implementation):
```typescript
// navigationMachine.ts
let currentConversationMetadata: ConversationMetadataMap = {};

export function getConversationMetadata(conversationId: string | undefined) {
  if (!conversationId) return undefined;
  return currentConversationMetadata[conversationId];
}
```

**Populated on story load**:
```typescript
// loadStory.ts
const conversationId = `conv-${flowCounter++}`; // "conv-0", "conv-1", etc.

conversationMetadata[conversationId] = {
  characterDescription: "Ms. Baker is a friendly baker...",
  successAnswer: "The king stole the cookie",
  questText: "Find out what happened"
};
```

**Used by AI service**:
```typescript
// callAIService actor
const metadata = getConversationMetadata(input.conversationId);
const response = await callAI({
  questionText: input.questionText,
  characterDescription: metadata.characterDescription, // ← Critical for AI context
  conversationHistory: []
});
```

### Conversation Context Inheritance

**Key Principle**: Dynamically created scenes must inherit `conversationId` from parent scene.

**Example - Recording Scene Creation**:
```typescript
// navigationMachine.ts - handleAskButtonClicked action
const scene = getCurrentNode()?.scene;
const conversationId = scene?.conversationId; // Extract from parent

const newScene = createRecordingScene(
  recordingId,
  conversationId, // ← Pass to factory
  background,
  leftChar,
  rightChar
);

// Result: Recording scene has conversationId → AI can lookup characterDescription
```

**Without inheritance** (old bug):
```typescript
// ❌ OLD CODE (broken):
const newScene = createRecordingScene(recordingId, background, leftChar, rightChar);
// newScene.conversationId = undefined
// AI lookup fails → "Character description is required" error
```

---

## AI Processing Flow (Detailed)

### Complete Flow from User Question to AI Response

```
1. User clicks "Ask" button
   └─→ Event: ASK_BUTTON_CLICKED
       └─→ XState: handleAskButtonClicked action
           ├─ Recording.start()
           ├─ Create recording scene (WITH conversationId)
           ├─ Insert scene into graph
           └─ Navigate to recording scene

2. User speaks, recording stops
   └─→ React: RecordPanelOrchestrator gets transcript
       └─→ Event: RECORDING_PROCESSED { transcript, recordingId }
           └─→ XState: storeTranscriptInScene action
               ├─ Updates scene.text = transcript
               ├─ Updates scene.questionText = transcript
               └─ Transition to askWaitingForAI state

3. XState invokes AI actor
   └─→ XState: askWaitingForAI.invoke.callAI
       ├─ Extract conversationId from scene
       ├─ Lookup characterDescription from metadata
       ├─ Call AI backend via aiService.callAI()
       └─ On success: onDone
           ├─ Action: createAIResponseScene
           ├─ Create scene with AI response text
           ├─ Insert scene into graph
           └─ Navigate to AI response scene

4. User sees AI response
   └─→ React: Renders new scene from navigationStore
```

### Error Handling

**On AI failure**:
```typescript
askWaitingForAI: {
  invoke: {
    src: 'callAI',
    onError: {
      target: 'dialogueInput', // Return to input state
      actions: [
        ({ event }) => console.error('AI failed:', event.error),
        () => updateCurrentPhase('input') // Reset phase for retry
      ]
    }
  }
}
```

**Result**: User can click Ask again to retry. No infinite loop.

---

## Data Ownership Rules

### ✅ XState Owns:
- **Flow state**: Which state are we in? (askProcessing, askWaitingForAI, etc.)
- **Orchestration logic**: When to call AI, when to create scenes, when to navigate
- **Store mutations**: All updates to navigationStore go through XState actions
- **Async operations**: AI calls, story loading, validation services

### ✅ Zustand (navigationStore) Owns:
- **Graph structure**: Nodes, connections, order
- **Current position**: Which node is active
- **Scene data**: Scene objects with their properties
- **History**: Navigation history, lifecycle events

### ✅ React Owns:
- **UI rendering**: Display scenes, characters, dialogue
- **User interactions**: Button clicks, scroll events
- **Local UI state**: Hover states, animation flags, temporary UI feedback
- **Recording state**: Microphone access, audio processing (via RecordingProvider)

### ❌ React Does NOT Own:
- ❌ Business logic (AI calling, validation, scene creation)
- ❌ Navigation flow (when to advance, when to create scenes)
- ❌ Store mutations (updating graph, modifying scenes)

---

## Testing Patterns

### Unit Testing XState Actions

```typescript
// Test storeTranscriptInScene action
test('storeTranscriptInScene updates scene properties', () => {
  const mockStore = createMockNavigationStore();
  const event = { type: 'RECORDING_PROCESSED', transcript: 'Test' };

  storeTranscriptInScene({ event });

  expect(mockStore.updateCurrentSceneProperties).toHaveBeenCalledWith({
    text: 'Test',
    questionText: 'Test'
  });
});
```

### Testing AI Service (Pure Function)

```typescript
// Test callAI service
test('callAI returns response on success', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ response: 'AI response text' })
  });

  const result = await callAI({
    questionText: 'What happened?',
    characterDescription: 'A friendly baker',
    conversationHistory: []
  });

  expect(result.success).toBe(true);
  expect(result.text).toBe('AI response text');
});
```

### Integration Testing (XState Machine)

```typescript
// Test full AI flow
test('askWaitingForAI invokes AI and creates response scene', async () => {
  const actor = createActor(navigationMachine);
  actor.start();

  // Setup: Navigate to askWaitingForAI state
  actor.send({ type: 'RECORDING_PROCESSED', transcript: 'Test' });

  // Wait for AI service to complete
  await waitFor(() => {
    expect(actor.getSnapshot().value).toEqual({ scene: 'route' });
  });

  // Verify response scene was created
  const nodes = getNavigationStore().graph.order;
  const lastNode = nodes[nodes.length - 1];
  expect(lastNode.scene.text).toContain('AI response');
});
```

---

## Migration Notes

### From Old Architecture (Pre-2025-01-03)

**What changed**:
1. `flowId` → `conversationId` (terminology)
2. AI processing moved from React (ChatFlowOrchestrator) to XState (callAI actor)
3. Transcript storage moved from React to XState (storeTranscriptInScene action)
4. Recording scene creation now passes conversationId

**Backwards compatibility**:
- `FlowMetadataStore.tsx` exports legacy names (`FlowMetadataProvider`, `useFlowMetadata`)
- `ChatFlowOrchestrator.tsx` still works (uses legacy event path)
- Can be removed once all features migrated to XState

**Deprecation timeline**:
- ✅ Phase 1 (Complete): XState AI integration
- 🔄 Phase 2 (In Progress): Migrate remaining orchestrators
- 📅 Phase 3 (Future): Remove React orchestrators entirely

---

## Common Patterns & Examples

### Adding a New Async Operation

**Example: Add answer validation**

1. Create service function:
```typescript
// src/features/validation/validationService.ts
export async function validateAnswer(input: {
  answerText: string;
  expectedAnswer: string;
}): Promise<{ isCorrect: boolean; feedback: string }> {
  // Pure function - no React dependencies
  const similarity = calculateSimilarity(input.answerText, input.expectedAnswer);
  return {
    isCorrect: similarity > 0.8,
    feedback: similarity > 0.8 ? 'Correct!' : 'Try again'
  };
}
```

2. Create XState actor:
```typescript
// navigationMachine.ts
const validateAnswerService = fromPromise(async ({ input }) => {
  const metadata = getConversationMetadata(input.conversationId);
  return await validateAnswer({
    answerText: input.answerText,
    expectedAnswer: metadata.successAnswer
  });
});

// Register in machine
actors: {
  loadStory: loadStoryService,
  callAI: callAIService,
  validateAnswer: validateAnswerService, // ← Add here
}
```

3. Invoke from state:
```typescript
answerWaiting: {
  invoke: {
    src: 'validateAnswer',
    input: () => ({
      answerText: getCurrentNode()?.scene?.answerText,
      conversationId: getCurrentNode()?.scene?.conversationId
    }),
    onDone: [
      {
        guard: ({ event }) => event.output.isCorrect,
        target: 'answerRight'
      },
      {
        target: 'answerWrong'
      }
    ],
    onError: {
      target: 'answerWaiting',
      actions: 'handleValidationError'
    }
  }
}
```

### Adding New Metadata to Conversations

**Example: Add character mood**

1. Update type:
```typescript
// FlowMetadataStore.tsx
export interface ConversationMetadata {
  characterDescription?: string;
  successAnswer: string;
  questText?: string;
  mood?: 'happy' | 'sad' | 'angry'; // ← Add new field
}
```

2. Populate in story:
```json
// story.json
{
  "type": "character-flow",
  "flow": [
    {
      "type": "input",
      "CharacterDescription": "Ms. Baker is friendly...",
      "Mood": "worried"
    }
  ]
}
```

3. Use in AI service:
```typescript
// callAIService actor
const metadata = getConversationMetadata(input.conversationId);
const response = await callAI({
  questionText: input.questionText,
  characterDescription: metadata.characterDescription,
  mood: metadata.mood, // ← Use new field
  conversationHistory: []
});
```

---

## Troubleshooting

### "Character description is required" Error

**Cause**: Scene missing `conversationId`, so AI service can't lookup metadata.

**Fix**: Ensure dynamically created scenes inherit conversationId:
```typescript
const conversationId = getCurrentNode()?.scene?.conversationId;
const newScene = createRecordingScene(recordingId, conversationId, ...);
```

### Infinite Loop in AI Processing

**Cause**: React useEffect watching phase and calling AI, error causes re-render.

**Fix**: Use XState actor invocation instead:
```typescript
// ✅ Use invoke pattern
askWaitingForAI: {
  invoke: {
    src: 'callAI',
    onError: { target: 'dialogueInput' } // Exits state on error
  }
}
```

### Store Updates Not Reflecting in UI

**Cause**: React component not subscribed to correct Zustand selector.

**Fix**: Use selector-based subscription:
```typescript
// ❌ WRONG: Re-renders on any store change
const store = useNavigationStore();

// ✅ CORRECT: Only re-renders when currentNode changes
const currentNode = useNavigationStore(state => state.getCurrentNode());
```

---

## References

- [XState Documentation](https://xstate.js.org/docs/)
- [Zustand Documentation](https://docs.pmnd.rs/zustand)
- [Navigation Machine Source](../src/core/navigation/machine/navigationMachine.ts)
- [AI Service Source](../src/features/ai/aiService.ts)
- [Recording Flow Diagram](./RECORDING_FLOW.md)

---

**Questions?** Check existing documentation or ask in team chat. When in doubt, follow the patterns above.
