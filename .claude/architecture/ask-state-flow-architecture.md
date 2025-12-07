# Ask State Flow Architecture

**Last Updated:** January 2025
**Status:** ✅ Implemented and Production-Ready

---

## Table of Contents
- [Overview](#overview)
- [Architectural Principles](#architectural-principles)
- [State Machine Flow](#state-machine-flow)
- [Event-Driven Communication](#event-driven-communication)
- [Orchestrator Responsibilities](#orchestrator-responsibilities)
- [AI Integration Pattern](#ai-integration-pattern)
- [Phase Management](#phase-management)
- [Code References](#code-references)
- [Migration Guide](#migration-guide)

---

## Overview

The **Ask State Flow** allows users to record questions during dialogue scenes, have those questions transcribed, send them to an AI service, and receive AI-generated responses. This flow represents a major architectural refactoring where business logic was moved from orchestrators into xState.

### Key Components

1. **navigationMachine** ([src/core/navigation/machine/navigationMachine.ts](../../src/core/navigation/machine/navigationMachine.ts)) - Central state coordinator
2. **RecordPanelOrchestrator** ([src/core/recording/RecordPanelOrchestrator.tsx](../../src/core/recording/RecordPanelOrchestrator.tsx)) - Handles complex recording setup
3. **AIOrchestrator** ([src/core/ai/AIOrchestrator.ts](../../src/core/ai/AIOrchestrator.ts)) - AI service integration
4. **ChatFlowOrchestrator** ([src/core/dialogue/ChatFlowOrchestrator.tsx](../../src/core/dialogue/ChatFlowOrchestrator.tsx)) - Legacy AI integration path
5. **navigationBus** ([src/core/navigation/events/navigationBus.ts](../../src/core/navigation/events/navigationBus.ts)) - Event communication system

---

## Architectural Principles

### 1. **xState as Single Source of Truth**

The navigation state machine controls all state transitions. Business logic lives in ONE place, not scattered across orchestrators.

```typescript
// ✅ Good: Machine decides when to transition
navigationMachine.transition(currentState, { type: 'RECORDING_STOPPED' });

// ❌ Bad: Orchestrator decides state transitions
updatePhase('input-processing'); // Don't do this directly
```

### 2. **Orchestrators Do Complex Setup, Not State Logic**

Orchestrators handle multi-step operations that require coordination (creating scenes, starting hardware), then emit events to let the machine decide what happens next.

```typescript
// ✅ Orchestrator's job: Complex setup
const handleRecordStart = async () => {
  await Recording.start();           // 1. Start hardware
  const scene = createRecordingScene(); // 2. Create scene
  insertSceneNodes(id, scene);       // 3. Insert into graph
  advanceNavigation('forward');      // 4. Navigate

  // 5. Emit event - let machine decide next state
  navigationBus.emit({ type: 'RECORDING_STARTED' });
};

// ❌ Don't do this in orchestrators:
updatePhase('input-recording');      // Machine should decide this
callAI(questionText);                // Machine should invoke AI
```

### 3. **Event-Driven Communication**

All communication between components happens through events. This creates unidirectional data flow and makes the system easier to understand and debug.

```
User Action → Orchestrator (setup) → Event → Machine (decision) → Store (mutation) → UI
```

### 4. **Immutable Phase Transitions**

Phases are managed by the state machine and stored in the navigation store. Components read phases but never mutate them directly (except orchestrators during complex setup flows where they must coordinate multiple steps).

---

## State Machine Flow

The ask flow consists of **4 main states** in the navigationMachine:

### State Diagram

```
dialogueInput → askRecording → askProcessing → askWaitingForAI → navigating
     ↑              ↓                ↓               ↓               ↓
     |        (recording)      (transcribing)   (AI call)    (show response)
     |              ↓                ↓               ↓               ↓
     └──────────────┴────────────────┴───────────────┴───────────────┘
                          (on error, return to input)
```

---

### 1. dialogueInput State

**Location:** [navigationMachine.ts:412-439](../../src/core/navigation/machine/navigationMachine.ts#L412-L439)

**Purpose:** Initial state when user can ask a question

**Behavior:**
- Shows "Ask" button in UI
- Blocks scroll-down navigation (user must interact)
- Allows scroll-up to go back
- Waits for user to click "Ask" button

**Phase:** `'input'` or `'input-showInput'`

**Event Handlers:**
```typescript
on: {
  SCROLL_DOWN_STEP: blocked,
  SCROLL_UP_STEP: → goPrev() → route,
  RECORDING_STARTED: → askRecording,
  RECORDING_FAILED: → stay in dialogueInput
}
```

**What Triggers It:**
User clicks "Ask" → RecordPanelOrchestrator.handleRecordStart() performs complex setup:

```typescript
// RecordPanelOrchestrator.tsx:384-462
const handleRecordStart = async () => {
  // 1. Start recording hardware FIRST (for responsiveness)
  await Recording.start();

  // 2. Update current node phase to 'basic'
  updateCurrentPhase('basic');

  // 3. Create new recording scene
  const newScene = createRecordingScene(recordingId, conversationId, ...);

  // 4. Insert scene into graph
  const newNodeId = insertSceneNodes(currentNodeId, newScene);

  // 5. Navigate to new scene
  advanceNavigation('forward');

  // 6. Update new scene to 'input-recording' phase
  updateNodePhase(newNodeId, 'input-recording');

  // 7. Emit event to machine
  navigationBus.emit({ type: 'RECORDING_STARTED', recordingId, nodeId: newNodeId });
};
```

**Key Insight:** The orchestrator does all the complex setup (8 steps!), then tells the machine "recording has started" via an event. The machine then transitions to `askRecording` state.

---

### 2. askRecording State

**Location:** [navigationMachine.ts:446-462](../../src/core/navigation/machine/navigationMachine.ts#L446-L462)

**Purpose:** User is actively recording audio

**Behavior:**
- Blocks ALL navigation (can't scroll during recording)
- Shows recording UI with waveform/animation
- Waits for user to stop recording

**Phase:** `'input-recording'`

**Event Handlers:**
```typescript
on: {
  SCROLL_DOWN_STEP: blocked,
  SCROLL_UP_STEP: blocked,
  RECORDING_STOPPED: → askProcessing
}
```

**What Triggers It:**
User clicks "Stop" button → RecordPanelOrchestrator.handleRecordStop() emits event:

```typescript
// RecordPanelOrchestrator.tsx:472-510
const handleRecordStop = () => {
  const node = getCurrentNode();
  const { phase } = node;

  if (phase === 'input-recording') {
    // Update scene with current transcript
    if (activeRecordingId && currentQuestionText) {
      updateSceneTextByRecordingId(activeRecordingId, currentQuestionText);
    }

    // Emit event to machine
    navigationBus.emit({
      type: 'RECORDING_STOPPED',
      nodeId: node.id,
      recordingType: 'question'
    });
  }

  // Actually stop the recording hardware
  Recording.stop();
};
```

---

### 3. askProcessing State

**Location:** [navigationMachine.ts:469-487](../../src/core/navigation/machine/navigationMachine.ts#L469-L487)

**Purpose:** Recording is being transcribed (speech-to-text)

**Behavior:**
- Shows "Processing..." UI
- Blocks all navigation
- Waits for backend to send transcript
- Stores transcript when received

**Phase:** `'input-processing'`

**Entry Actions:**
```typescript
entry: [
  () => console.log('⚙️  Transcribing audio'),
  () => useNavigationStore.getState().updateCurrentPhase('input-processing')
]
```

**Event Handlers:**
```typescript
on: {
  SCROLL_DOWN_STEP: blocked,
  SCROLL_UP_STEP: blocked,
  RECORDING_PROCESSED: {
    actions: ['storeTranscriptInScene'],
    target: 'askWaitingForAI'
  }
}
```

**What Triggers It:**
Backend completes transcription → RecordPanelOrchestrator detects it and emits event:

```typescript
// RecordPanelOrchestrator.tsx:318-326
if (phase === 'input-processing' && finalText) {
  navigationBus.emit({
    type: 'RECORDING_PROCESSED',
    transcript: finalText,
    recordingId: activeRecordingId
  });
}
```

**Machine Action:**
```typescript
// navigationMachine.ts:130-149
storeTranscriptInScene: ({ event }) => {
  if (event.type !== 'RECORDING_PROCESSED') return;

  const { transcript } = event;

  // Update current scene with transcript
  useNavigationStore.getState().updateCurrentSceneProperties({
    text: transcript,        // For speech bubble display
    questionText: transcript // For AI input
  });
}
```

---

### 4. askWaitingForAI State

**Location:** [navigationMachine.ts:493-551](../../src/core/navigation/machine/navigationMachine.ts#L493-L551)

**Purpose:** Call AI service and wait for response

**Behavior:**
- Shows loading spinner
- Blocks all navigation
- Invokes AI service as xState actor
- Creates and navigates to AI response scene when done

**Phase:** `'ai-waiting'`

**Entry Actions:**
```typescript
entry: [
  () => console.log('🤖 Invoking AI service'),
  () => useNavigationStore.getState().updateCurrentPhase('ai-waiting')
]
```

**Actor Invocation:**
```typescript
invoke: {
  id: 'callAI',
  src: 'callAI', // Defined as fromPromise(callAIService)
  input: () => {
    const scene = getCurrentNode()?.scene;
    return {
      questionText: scene?.questionText || '',
      conversationId: scene?.conversationId
    };
  },
  onDone: {
    target: '#navigation.scene.navigating',
    actions: ['createAIResponseScene']
  },
  onError: {
    target: 'dialogueInput',
    actions: [
      ({ event }) => console.error('❌ AI failed:', event.error),
      () => useNavigationStore.getState().updateCurrentPhase('input')
    ]
  }
}
```

**Event Handlers:**
```typescript
on: {
  SCROLL_DOWN_STEP: blocked,
  SCROLL_UP_STEP: blocked,
  // Legacy event handler for backward compatibility
  RECEIVED_AI_RESPONSE: {
    target: '#navigation.scene.route',
    actions: ['createAIResponseScene']
  }
}
```

**Machine Action - Create AI Response:**
```typescript
// navigationMachine.ts:155-193
createAIResponseScene: ({ event }) => {
  // Extract response from actor output or legacy event
  const { responseText, conversationId } = extractResponse(event);
  const currentNodeId = getCurrentNodeId();

  // Delegate to AIOrchestrator (synchronous operation)
  createAndInsertAIResponseScene({
    responseText,
    conversationId,
    currentNodeId
  });
  // Scene is now created, inserted, and navigated to!
}
```

**AIOrchestrator Implementation:**
```typescript
// AIOrchestrator.ts:253-299
export function createAndInsertAIResponseScene(input: CreateAIResponseInput): string | null {
  // 1. Get current scene context
  const currentNode = getCurrentNode();
  const scene = currentNode?.scene;

  // 2. Extract properties to inherit
  const currentBackground = scene?.background;
  const leftCharacter = scene?.['left-character'] || 'leo';
  const rightCharacter = scene?.['right-character'] || 'bakerMom';

  // 3. Create AI response scene
  const aiResponseScene = createAIResponseSceneFactory(
    input.responseText,
    input.conversationId,
    currentBackground,
    leftCharacter,
    rightCharacter
  );

  // 4. Update current node phase: 'ai-waiting' → 'basic'
  // This collapses the input UI before we navigate away
  useNavigationStore.getState().updateCurrentPhase('basic');

  // 5. Insert scene (SYNCHRONOUS)
  const newSceneId = insertSceneNodes(input.currentNodeId, aiResponseScene);

  // 6. Navigate forward (SYNCHRONOUS)
  advanceNavigation('forward');

  return newSceneId;
}
```

**Key Insight:** The AI call and response scene creation are handled entirely by the machine. The orchestrator is never involved in this part of the flow.

---

## Event-Driven Communication

All state transitions happen through the **navigationBus** event system.

### Events Used in Ask Flow

| Event | Emitted By | Payload | Purpose |
|-------|-----------|---------|---------|
| `RECORDING_STARTED` | RecordPanelOrchestrator | `{ recordingId, nodeId }` | Recording hardware started, scene created |
| `RECORDING_STOPPED` | RecordPanelOrchestrator | `{ nodeId, recordingType }` | User clicked stop button |
| `RECORDING_PROCESSED` | RecordPanelOrchestrator | `{ transcript, recordingId }` | Backend sent final transcript |
| `RECEIVED_AI_RESPONSE` | ChatFlowOrchestrator (legacy) | `{ responseText, conversationId }` | AI response ready |

### Event Flow Example

```typescript
// 1. User clicks "Ask" button
<button onClick={handleRecordStart}>Ask</button>

// 2. RecordPanelOrchestrator does complex setup
const handleRecordStart = async () => {
  await Recording.start();
  // ... setup steps ...
  navigationBus.emit({ type: 'RECORDING_STARTED' }); // ← Emit event
};

// 3. navigationBus delivers event to machine
navigationBus.emit = (event) => {
  navigationService.send(event); // xState receives it
};

// 4. Machine transitions state
navigationMachine.on({
  RECORDING_STARTED: {
    target: 'askRecording' // ← State transition
  }
});

// 5. UI reactively updates based on new state
const phase = useNavigationStore(state => state.getCurrentPhase());
// phase is now 'input-recording', UI shows recording UI
```

---

## Orchestrator Responsibilities

### What Orchestrators SHOULD Do

✅ **Complex Multi-Step Setup:**
```typescript
// Creating scenes with inherited context
const scene = createRecordingScene(recordingId, conversationId, ...);
insertSceneNodes(currentNodeId, scene);

// Starting hardware services
await Recording.start();

// Coordinating multiple operations
advanceNavigation('forward');
updateNodePhase(newNodeId, 'input-recording');
```

✅ **Emitting Events:**
```typescript
navigationBus.emit({ type: 'RECORDING_STARTED', recordingId, nodeId });
```

✅ **React to External Systems:**
```typescript
// Watching for transcript completion from backend
useEffect(() => {
  if (phase === 'input-processing' && finalTranscript) {
    navigationBus.emit({ type: 'RECORDING_PROCESSED', transcript: finalTranscript });
  }
}, [phase, finalTranscript]);
```

### What Orchestrators SHOULD NOT Do

❌ **State Transition Logic:**
```typescript
// Don't decide WHEN to transition states
if (recordingComplete && transcriptReady) {
  updatePhase('ai-waiting'); // ❌ Machine should decide this
}
```

❌ **Direct AI Calls (for ask flow):**
```typescript
// Don't call AI directly in ask flow
const response = await callAI(questionText); // ❌ Machine invokes AI actor
```

❌ **Navigation Decisions:**
```typescript
// Don't decide whether navigation should happen
if (phaseIsComplete) {
  advanceNavigation('forward'); // ❌ Machine should decide
}
```

**Exception:** During complex setup flows (like `handleRecordStart`), orchestrators DO call navigation functions, but only as part of the setup choreography. They still emit an event afterward to let the machine take over state management.

---

## AI Integration Pattern

### The Challenge

xState actors cannot access React context, but the AI service needs:
- Conversation history (previous messages)
- Character descriptions (system prompt)
- Per-conversation state

### The Solution: Module-Level Storage

**AIOrchestrator** ([src/core/ai/AIOrchestrator.ts](../../src/core/ai/AIOrchestrator.ts)) uses module-level variables that are accessible from anywhere:

```typescript
// Module-level storage (outside React context)
let currentConversationMetadata: ConversationMetadataMap = {};
let conversationHistories: Record<string, ConversationMessage[]> = {};

// Accessors
export function getConversationMetadata(conversationId: string) { ... }
export function getConversationHistory(conversationId: string) { ... }
export function addUserMessage(conversationId: string, content: string) { ... }
export function addAssistantMessage(conversationId: string, content: string) { ... }

// Core AI function (callable from xState actor)
export async function callAIService(input: AIServiceInput): Promise<AIServiceOutput> {
  // 1. Get metadata and history from module storage
  const metadata = getConversationMetadata(input.conversationId);
  const history = getConversationHistory(input.conversationId);

  // 2. Add user message to history
  addUserMessage(input.conversationId, input.questionText);

  // 3. Call AI service
  const response = await callAI({
    questionText: input.questionText,
    characterDescription: metadata.characterDescription,
    conversationHistory: history
  });

  // 4. Add assistant response to history
  addAssistantMessage(input.conversationId, response.text);

  return { responseText: response.text, conversationId: input.conversationId };
}
```

### Initialization Flow

```typescript
// 1. Story loads (navigationMachine.ts:118-120)
initializeStore: ({ event }) => {
  if (event.output?.flowMetadata) {
    setConversationMetadata(event.output.flowMetadata); // ← Store metadata
  }
  initializeStoreWithStory(event.output.fullStory);
}

// 2. AI actor can now access metadata
invoke: {
  src: fromPromise(async ({ input }) => {
    return await callAIService(input); // ← Uses module-level storage
  })
}
```

### Dual Storage Pattern (Temporary)

During transition, we maintain conversation history in TWO places:

1. **AIMemory (React Context)** - Used by ChatFlowOrchestrator (legacy)
2. **AIOrchestrator module storage** - Used by xState machine (new)

```typescript
// ChatFlowOrchestrator.tsx:96-100
if (conversationId) {
  aiMemory.addUserMessage(conversationId, input.text);           // React context
  addUserMessageToOrchestrator(conversationId, input.text);     // Module storage
}
```

**Future:** Remove React context storage once all flows use xState machine.

---

## Phase Management

### Phase Type System

All phases are strictly typed using the `Phase` type ([navigationGraphTypes.ts:54-79](../../src/core/navigation/navigationGraphTypes.ts#L54-L79)):

```typescript
export type Phase =
  // Ask flow phases
  | 'input'               // Initial: show Ask button
  | 'input-showInput'     // Input UI visible (alternative initial)
  | 'input-recording'     // User is recording
  | 'input-processing'    // Transcribing audio
  | 'ai-waiting'          // Waiting for AI response
  // Other phases...
  | 'basic'               // Default dialogue
  | 'quest-showing'       // Quest prompt
  | 'answer-right'        // Correct answer
  | 'answer-wrong';       // Incorrect answer
```

### Phase Lifecycle in Ask Flow

```
input → input-recording → input-processing → ai-waiting → basic
  ↑          ↓                  ↓               ↓           ↓
  |    (user recording)   (transcribing)   (AI call)  (completed)
  |          ↓                  ↓               ↓           ↓
  └──────────┴──────────────────┴───────────────┴───────────┘
```

### Reading Phases

```typescript
// In React components
const phase = useNavigationStore(state => state.getCurrentPhase());

// In xState guards
isInput: () => {
  const phase = useNavigationStore.getState().getCurrentPhase();
  return phase === 'input' || phase === 'input-showInput';
}

// In xState actions
entry: () => {
  const phase = useNavigationStore.getState().getCurrentPhase();
  console.log('Current phase:', phase);
}
```

### Updating Phases

**Only xState machine or orchestrators (during setup) should update phases:**

```typescript
// ✅ In xState machine entry action
entry: () => {
  useNavigationStore.getState().updateCurrentPhase('input-processing');
}

// ✅ In orchestrator during complex setup
const newNodeId = insertSceneNodes(currentNodeId, scene);
useNavigationStore.getState().updateNodePhase(newNodeId, 'input-recording');

// ❌ Don't do in UI components
const handleClick = () => {
  updateCurrentPhase('ai-waiting'); // ❌ Machine should control this
};
```

---

## Code References

### Primary Files

| File | Purpose | Lines of Interest |
|------|---------|------------------|
| [navigationMachine.ts](../../src/core/navigation/machine/navigationMachine.ts) | State machine definition | 412-551 (ask flow states) |
| [RecordPanelOrchestrator.tsx](../../src/core/recording/RecordPanelOrchestrator.tsx) | Recording setup orchestration | 384-462 (start), 472-510 (stop) |
| [AIOrchestrator.ts](../../src/core/ai/AIOrchestrator.ts) | AI service integration | 161-232 (callAIService), 253-299 (scene creation) |
| [ChatFlowOrchestrator.tsx](../../src/core/dialogue/ChatFlowOrchestrator.tsx) | Legacy AI integration | 80-143 (processUserInput) |
| [types.ts](../../src/core/navigation/machine/types.ts) | Event type definitions | 20-304 (all events) |
| [navigationGraphTypes.ts](../../src/core/navigation/navigationGraphTypes.ts) | Phase type definitions | 54-79 (Phase type) |

### Key Functions

**Navigation Machine:**
- `dialogueInput` state (line 412) - Initial ask state
- `askRecording` state (line 446) - Active recording
- `askProcessing` state (line 469) - Transcription
- `askWaitingForAI` state (line 493) - AI call
- `storeTranscriptInScene` action (line 130)
- `createAIResponseScene` action (line 155)

**RecordPanelOrchestrator:**
- `handleRecordStart` (line 384) - Ask button click
- `handleRecordStop` (line 472) - Stop button click

**AIOrchestrator:**
- `callAIService` (line 161) - Core AI function
- `createAndInsertAIResponseScene` (line 253) - Scene creation
- `setConversationMetadata` (line 49) - Initialize metadata
- `getConversationHistory` (line 65) - Get conversation context

---

## Migration Guide

### Converting Other Flows to This Pattern

Follow these steps to migrate another feature (e.g., answer validation flow) to the xState pattern:

#### Step 1: Define States

Identify all the states in your flow and add them to the machine:

```typescript
// navigationMachine.ts
states: {
  scene: {
    states: {
      // ... existing states ...

      // New answer flow states
      answerRecording: { ... },
      answerProcessing: { ... },
      answerValidating: { ... }
    }
  }
}
```

#### Step 2: Define Events

Add event types to [types.ts](../../src/core/navigation/machine/types.ts):

```typescript
export type AnswerRecordingStartedEvent = {
  type: 'ANSWER_RECORDING_STARTED';
  recordingId: string;
  nodeId: string;
};

export type NavigationEvent =
  | TranscriptReadyEvent
  | ... existing events ...
  | AnswerRecordingStartedEvent; // Add to union
```

#### Step 3: Move Logic to Machine

Take logic from orchestrators and convert to states/actions:

```typescript
// Before (in orchestrator):
const handleAnswerStop = () => {
  Recording.stop();
  updatePhase('answer-processing');        // ❌ Direct phase update
  const isCorrect = await validateAnswer(); // ❌ Business logic in orchestrator
  if (isCorrect) {
    updatePhase('answer-right');
  } else {
    updatePhase('answer-wrong');
  }
};

// After (in machine):
answerValidating: {
  invoke: {
    src: 'validateAnswer',
    input: ({ context }) => ({
      answerText: getCurrentNode()?.scene?.answerText,
      questData: context.questData
    }),
    onDone: [
      {
        guard: ({ event }) => event.output.isCorrect,
        target: 'answerRight'
      },
      {
        target: 'answerWrong'
      }
    ]
  }
}
```

#### Step 4: Emit Events from Orchestrator

Replace direct state mutations with event emissions:

```typescript
// Before:
updatePhase('answer-processing');

// After:
navigationBus.emit({
  type: 'ANSWER_RECORDING_STOPPED',
  nodeId: getCurrentNodeId()
});
```

#### Step 5: Add Actors for Async Operations

Move async operations to actors:

```typescript
actors: {
  validateAnswer: fromPromise(async ({ input }) => {
    return await answerValidationService(input);
  })
}
```

#### Step 6: Add Guards for Routing

Add guards to route to correct states:

```typescript
guards: {
  isAnswerRecording: () => {
    const phase = useNavigationStore.getState().getCurrentPhase();
    return phase === 'record-answer';
  }
}
```

---

## Best Practices

### DO ✅

1. **Emit events for all state transitions**
   ```typescript
   navigationBus.emit({ type: 'RECORDING_STARTED' });
   ```

2. **Use actors for async operations**
   ```typescript
   invoke: { src: 'callAI', onDone: { target: 'nextState' } }
   ```

3. **Store state in navigation store, not component state**
   ```typescript
   useNavigationStore.getState().updateCurrentPhase('input-processing');
   ```

4. **Use strict Phase types everywhere**
   ```typescript
   const phase: Phase = 'input-recording'; // ✅ Type-safe
   ```

5. **Let machine handle all state transitions**
   ```typescript
   on: { RECORDING_STOPPED: { target: 'askProcessing' } }
   ```

### DON'T ❌

1. **Don't put business logic in orchestrators**
   ```typescript
   // ❌ Don't decide state transitions in orchestrators
   if (transcriptReady && !errors) {
     updatePhase('ai-waiting');
   }
   ```

2. **Don't call navigation functions from UI components**
   ```typescript
   // ❌ Don't do this in onClick handlers
   <button onClick={() => advanceNavigation('forward')}>
   ```

3. **Don't use string literals for phases**
   ```typescript
   if (phase === 'input-recording') { } // ❌ Use Phase type
   ```

4. **Don't skip events**
   ```typescript
   // ❌ Don't mutate store directly
   updateCurrentPhase('ai-waiting');

   // ✅ Emit event, let machine update store
   navigationBus.emit({ type: 'RECORDING_PROCESSED' });
   ```

5. **Don't duplicate state**
   ```typescript
   // ❌ Don't store phase in component state
   const [phase, setPhase] = useState('input');

   // ✅ Read from navigation store
   const phase = useNavigationStore(state => state.getCurrentPhase());
   ```

---

## Debugging

### Viewing State Transitions

Enable xState logging:

```typescript
// navigationInterpreter.ts
const navigationService = interpret(navigationMachine, {
  devTools: true // ← Enable Redux DevTools integration
});
```

### Event Logging

All events are logged via navigationBus:

```typescript
// Look for these console logs:
[NavigationMachine] 📤 Emitting RECORDING_STARTED event
[NavigationMachine] 🎯 Entered askRecording state
[NavigationMachine] 🛑 Recording stopped → processing
```

### Common Issues

**Issue:** State doesn't transition after event
```typescript
// Check: Is event type correct?
navigationBus.emit({ type: 'RECORDING_STARTED' }); // ✅
navigationBus.emit({ type: 'RecordingStarted' }); // ❌ Wrong case

// Check: Is machine in correct parent state?
// Can only transition to askRecording from dialogueInput state
```

**Issue:** Phase updates don't reflect in UI
```typescript
// Check: Using store selector correctly?
const phase = useNavigationStore(state => state.getCurrentPhase()); // ✅
const phase = useNavigationStore.getState().getCurrentPhase(); // ❌ Not reactive
```

---

## Future Improvements

### Planned Enhancements

1. **Remove Dual Storage** - Eliminate React Context storage (AIMemory), use only module-level storage
2. **Remove Direct Navigation Calls** - Replace all `advanceNavigation()` calls with events
3. **Centralize All Phase Updates** - Only machine should call `updateCurrentPhase()`
4. **Add State Visualization** - Visual diagram generator from machine definition
5. **Add State Testing** - Unit tests for state transitions

### Migration Candidates

Other flows that should adopt this pattern:
- Answer recording and validation flow
- Quest acceptance flow
- Success/fail dance transitions
- Character enter/exit animations

---

## Questions?

If you're unsure whether to use this pattern for a new feature, ask:

1. **Does it involve multiple states?** → Yes → Use xState
2. **Does it require async operations?** → Yes → Use actors
3. **Does it need complex setup?** → Yes → Orchestrator + events
4. **Does it need to react to external systems?** → Yes → Orchestrator listens, emits events

When in doubt, follow the ask flow as a reference implementation.

---

**This documentation is maintained by the development team. Last reviewed: January 2025**
