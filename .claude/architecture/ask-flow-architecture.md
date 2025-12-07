# Ask Button Flow Architecture

This document explains the complete flow from when a user clicks "Ask" in the RecordPanel through to the AI response page being built and displayed.

## File Overview

| File | Purpose |
|------|---------|
| `src/core/recording/RecordPanel.tsx` | UI component with Ask/Hint/Answer buttons |
| `src/core/navigation/events/navigationBus.ts` | Event bus for UI → Machine communication |
| `src/core/navigation/machine/navigationMachine.ts` | XState machine orchestrating the entire flow |
| `src/core/navigation/sceneFactoryFunctions.ts` | Pure functions to create Scene objects |
| `src/core/navigation/navigationStore.ts` | Zustand store managing navigation graph |
| `src/core/navigation/navigationHelpers.ts` | Convenience wrappers around store actions |
| `src/core/navigation/navigationGraphBuilder.ts` | Converts Scenes → Nodes for the graph |
| `src/core/ai/AIOrchestrator.ts` | AI service calls and response scene creation |
| `src/core/recording/RecordingOrchestrator.ts` | Audio recording and transcription |

---

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER CLICKS "ASK"                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  RecordPanel.tsx (line 124-128)                                             │
│  ─────────────────────────────                                              │
│  handleAskClick() → navigationBus.emit({ type: 'ASK_BUTTON_CLICKED' })      │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  navigationBus.ts                                                           │
│  ────────────────                                                           │
│  Simple pub-sub event broker. Single subscriber (the machine interpreter).  │
│  Routes event to navigationMachine.                                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  navigationMachine.ts (line 943-969)                                        │
│  ───────────────────────────────────                                        │
│  ASK_BUTTON_CLICKED handler checks metadata.useClues:                       │
│                                                                             │
│  ┌─ useClues=true ──► askClue state (show clue selection panel)             │
│  │                         │                                                │
│  │                         ▼                                                │
│  │                    CLUE_SELECTED event                                   │
│  │                         │                                                │
│  └─ useClues=false ──┬─────┘                                                │
│                      ▼                                                      │
│               askRecording state                                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  navigationMachine.ts - askRecording entry (line 1142-1184)                 │
│  ──────────────────────────────────────────────────────────                 │
│  Executes 'createRecordingScene' action (line 424-484):                     │
│                                                                             │
│  1. Generate recordingId                                                    │
│  2. Get current scene context (background, characters, conversationId)      │
│  3. Call createRecordingScene() factory                                     │
│  4. Call insertSceneNodes() to add to graph                                 │
│  5. Call advance('forward') to navigate to new scene                        │
│  6. Update phase to 'input-recording'                                       │
│  7. Start recording via RecordingOrchestratorAPI                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  sceneFactoryFunctions.ts - createRecordingScene() (line 37-69)             │
│  ──────────────────────────────────────────────────────────────             │
│  Pure function that creates a CharacterScene object:                        │
│  {                                                                          │
│    type: "character",                                                       │
│    sceneId: "recording-{timestamp}-{random}",                               │
│    text: "Test words",           // Placeholder, replaced by transcript     │
│    speaker: "left",              // User speaking                           │
│    recordingId,                  // Links to recording session              │
│    conversationId,               // Preserves AI context                    │
│    "left-character": inherited,                                             │
│    "right-character": inherited,                                            │
│    background: inherited,                                                   │
│    phase: "basic"                // Initial phase                           │
│  }                                                                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  navigationStore.ts - insertSceneNodes() (line 181-290)                     │
│  ──────────────────────────────────────────────────────                     │
│  1. Generate sceneId if not present                                         │
│  2. Call expandSceneToNodes(scene) to convert Scene → Node[]                │
│  3. Wire up prev/next pointers                                              │
│  4. Update graph.byId, graph.order, graph.sceneRegistry                     │
│  5. Emit lifecycle events                                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  navigationGraphBuilder.ts - expandSceneToNodes() (line 100-126)            │
│  ───────────────────────────────────────────────────────────────            │
│  Converts Scene to Node(s) based on scene type:                             │
│  - 'character' → single node with createSimpleNode()                        │
│  - 'image' → single node (may have caption phase)                           │
│  - 'fail-dance' / 'success-dance' → single node                             │
│                                                                             │
│  Node contains: id, sceneId, stateKey, scene reference, phase, prev/next    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  USER RECORDS QUESTION                                                      │
│  ─────────────────────                                                      │
│  RecordingOrchestrator captures audio                                       │
│  User clicks Stop → RECORDING_STOPPED event                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  navigationMachine.ts - askRecording → askProcessing (line 1156-1174)       │
│  ────────────────────────────────────────────────────────────────────       │
│  RECORDING_STOPPED handler:                                                 │
│  1. Call RecordingOrchestratorAPI.stopRecordingAndTranscribe()              │
│  2. Update phase to 'input-processing'                                      │
│  3. Transition to askProcessing state                                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  navigationMachine.ts - askProcessing (line 1191-1213)                      │
│  ─────────────────────────────────────────────────────                      │
│  Waits for RECORDING_TRANSCRIBED event from RecordingOrchestrator           │
│  On receipt:                                                                │
│  1. 'storeTranscriptInScene' action saves transcript to scene.questionText  │
│  2. 'setUnlockAnswerButton' enables Answer button                           │
│  3. Transition to askWaitingForAI state                                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  navigationMachine.ts - askWaitingForAI (line 1219-1285)                    │
│  ──────────────────────────────────────────────────────                     │
│  Entry: Update phase to 'ai-waiting'                                        │
│                                                                             │
│  Invokes 'callAI' actor with input:                                         │
│  {                                                                          │
│    questionText: scene.questionText,                                        │
│    conversationId: scene.conversationId                                     │
│  }                                                                          │
│                                                                             │
│  onDone → executes 'createAIResponseScene' action                           │
│  onError → returns to dialogueInput state                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  navigationMachine.ts - actors.callAI (line 62-66)                          │
│  ─────────────────────────────────────────────────                          │
│  XState actor wrapping callAIService():                                     │
│  callAI: fromPromise(async ({ input }) => {                                 │
│    return await callAIService(input);                                       │
│  })                                                                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  AIOrchestrator.ts - callAIService() (line 220-307)                         │
│  ─────────────────────────────────────────────────                          │
│  1. Validate questionText and conversationId                                │
│  2. Get conversation metadata (characterDescription)                        │
│  3. Get conversation history from storage                                   │
│  4. Check for selectedClue → prepend to question if present                 │
│  5. Add user message to history                                             │
│  6. Call AI backend with full context                                       │
│  7. Add assistant response to history                                       │
│  8. Return { responseText, conversationId }                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  navigationMachine.ts - createAIResponseScene action (line 330-368)         │
│  ──────────────────────────────────────────────────────────────────         │
│  Extracts responseText and conversationId from actor output                 │
│  Delegates to createAndInsertAIResponseScene() in AIOrchestrator            │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  AIOrchestrator.ts - createAndInsertAIResponseScene() (line 328-390)        │
│  ───────────────────────────────────────────────────────────────────        │
│  SYNCHRONOUS function:                                                      │
│                                                                             │
│  1. Get current node context (background, characters)                       │
│  2. Get monologue setting from metadata                                     │
│  3. Call createAIResponseScene() factory                                    │
│  4. Update current node phase: 'ai-waiting' → 'basic'                       │
│  5. Call insertSceneNodes() to add AI response to graph                     │
│  6. Call advanceNavigation('forward') to show new scene                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  sceneFactoryFunctions.ts - createAIResponseScene() (line 89-123)           │
│  ────────────────────────────────────────────────────────────────           │
│  Pure function that creates CharacterScene:                                 │
│  {                                                                          │
│    type: "character",                                                       │
│    sceneId: "ai-response-{timestamp}-{random}",                             │
│    text: responseText,           // AI's response                           │
│    speaker: monologue ? "left" : "right",                                   │
│    conversationId,               // Preserves context                       │
│    "left-character": inherited,                                             │
│    "right-character": inherited,                                            │
│    background: inherited,                                                   │
│    phase: "input",               // Shows input UI immediately              │
│    phaseSteps: ["input"]                                                    │
│  }                                                                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  NEW AI RESPONSE PAGE DISPLAYED                                             │
│  ──────────────────────────────                                             │
│  - AI response text shown in dialogue bubble                                │
│  - RecordPanel shows Ask/Hint/Answer buttons (phase: 'input')               │
│  - User can ask follow-up questions                                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## State Machine States (Ask Flow)

```
dialogueInput
    │
    ├── ASK_BUTTON_CLICKED (useClues=true)
    │   └── askClue ──► CLUE_SELECTED ──┐
    │                                   │
    ├── ASK_BUTTON_CLICKED (useClues=false)
    │   └───────────────────────────────┤
    │                                   ▼
    │                            askRecording
    │                                   │
    │                           RECORDING_STOPPED
    │                                   │
    │                                   ▼
    │                            askProcessing
    │                                   │
    │                         RECORDING_TRANSCRIBED
    │                                   │
    │                                   ▼
    │                          askWaitingForAI
    │                                   │
    │                    ┌──────────────┴──────────────┐
    │                    │                             │
    │              onDone (success)              onError (failure)
    │                    │                             │
    │                    ▼                             │
    │         createAIResponseScene                    │
    │         → navigating state                       │
    │         → route back to dialogueInput            │
    │                                                  │
    └──────────────────────────────────────────────────┘
```

---

## Key Data Structures

### Scene (from story.json or created dynamically)
```typescript
interface CharacterScene {
  type: "character";
  sceneId: string;
  text: string;
  speaker: "left" | "right";
  "left-character"?: string;
  "right-character"?: string;
  background?: string;
  conversationId?: string;      // Links to conversation metadata
  recordingId?: string;         // Links to recording session
  questionText?: string;        // User's transcribed question
  answerText?: string;          // User's transcribed answer
  phase?: string;               // Current phase (basic, input, etc.)
  phaseSteps?: string[];        // Available phases
}
```

### Node (internal navigation representation)
```typescript
interface Node {
  id: string;                   // Unique node ID
  sceneId: string;              // Reference to scene
  scene: Scene;                 // The actual scene data
  stateKey: string;             // "dialogue:basic", "image:caption", etc.
  sceneState?: string;          // Additional state info
  phase?: string;               // Current phase
  prevId: string | null;        // Previous node in sequence
  nextId: string | null;        // Next node in sequence
  status?: 'active' | 'locked'; // Navigation status
}
```

### Conversation Metadata (from story.json)
```typescript
interface ConversationMetadata {
  conversationId: string;
  characterDescription: string;  // AI character persona
  questText?: string;            // Quest objective
  hint?: string;                 // Hint text
  successAnswer?: string;        // Expected answer
  useClues?: boolean;            // Whether clue selection is required
  monologue?: boolean;           // If true, user talks to themselves
}
```

---

## Key Functions Quick Reference

### Scene Creation (sceneFactoryFunctions.ts)
| Function | Purpose |
|----------|---------|
| `createRecordingScene()` | Creates scene for user's question recording |
| `createAIResponseScene()` | Creates scene for AI's response |
| `createFailDanceScene()` | Creates wrong answer animation scene |
| `createSuccessDanceScene()` | Creates correct answer animation scene |

### Navigation Operations (navigationHelpers.ts)
| Function | Purpose |
|----------|---------|
| `getCurrentNode()` | Get current node with full metadata |
| `getCurrentNodeId()` | Get current node ID |
| `insertSceneNodes()` | Add scene to navigation graph |
| `advanceNavigation()` | Move forward/backward in graph |
| `deleteNode()` | Remove node from graph |

### AI Operations (AIOrchestrator.ts)
| Function | Purpose |
|----------|---------|
| `callAIService()` | Send question to AI, get response |
| `createAndInsertAIResponseScene()` | Create and insert AI response scene |
| `getConversationMetadata()` | Get character/quest metadata |
| `getConversationHistory()` | Get conversation message history |
| `setSelectedClue()` | Store selected clue for AI context |

### Graph Operations (navigationStore.ts)
| Action | Purpose |
|--------|---------|
| `setScenes()` | Initialize graph from story.json |
| `insertSceneNodes()` | Add scene, convert to nodes, wire pointers |
| `updateNodePhase()` | Change phase on a node |
| `advance()` | Navigate forward/backward |

---

## Common Debugging Points

### 1. Ask button not responding
- Check: `navigationBus` has a subscriber (navigationInterpreter)
- Check: Machine is in `dialogueInput` state
- Check: Current scene has valid `conversationId`

### 2. Recording scene not created
- Check: `createRecordingScene` action completes
- Check: `insertSceneNodes` returns valid nodeId
- Check: `advance('forward')` executes

### 3. AI response not appearing
- Check: `RECORDING_TRANSCRIBED` event received
- Check: `callAIService` completes without error
- Check: `createAndInsertAIResponseScene` executes
- Check: Console for "AI service completed successfully" log

### 4. Wrong background/characters on new scene
- Check: `getCurrentNode()` returns expected scene
- Check: Scene has `background`, `left-character`, `right-character`
- Note: Recording scene inherits from previous; AI response inherits from recording

### 5. Phase not updating
- Check: `updateNodePhase()` called with correct nodeId
- Check: RecordPanel is subscribed to `useNavigationStore`
- Check: `selectCurrentNode` selector working

---

## Related Documentation

- [Navigation Store README](../README.md)
- [Quick Reference](../QUICK_REFERENCE.md)
- [XState Quick Start](../../docs/QUICK_START_XSTATE.md)
- [Conversation ID Guide](../../docs/CONVERSATION_ID_GUIDE.md)
