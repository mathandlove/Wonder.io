# Clue System Architecture

This document describes how the clue system works in Wonder.io, including how clues flow from `clue-image` scenes to `character-flow` scenes.

## Overview

The clue system allows players to:
1. Discover clues in a `clue-image` scene (clicking on hotspots)
2. Reference those clues when asking questions or answering in a subsequent `character-flow` scene

## Key Components

### 1. ClueStore (`src/core/data/ClueStore.tsx`)

A React Context that stores the most recent set of clues. Only stores clues from the last `clue-image` scene (not accumulated).

```typescript
interface ClueData {
  hotspotName: string;  // Label matching hotspot JSON (e.g., "Hair", "Potion")
  description: string;  // Human-readable description
  image: string;        // Image name for thumbnails
  mapName?: string;     // Map/scene name for resolving paths (e.g., "insideBakery")
}
```

**Provider Location:** `src/app/main.tsx` - wraps the entire app

### 2. ClueImageScene (`src/core/scenes/clueImage/ClueImageScene.tsx`)

Where clues are discovered and saved to the store.

**Key behavior:**
- On mount, immediately saves ALL clues to ClueStore (lines 399-409)
- This happens regardless of whether the user has clicked on them
- When all clues are found, saves again (lines 456-466)

```typescript
// Auto-save on mount
const clueData = scene.clueDescriptions.map(desc => ({
  hotspotName: desc.hotspotName,
  description: desc.description,
  image: desc.image,
  mapName: mapName
}));
setClues(clueData);
```

### 3. RecordPanel (`src/core/recording/RecordPanel.tsx`)

The UI panel that displays clue selection when in `askClue` or `answerClue` phase.

**Key behavior:**
- Uses `useNavigationStore(selectCurrentNode)` for reactive state updates
- Reads `dialogueState` from `currentNode.phase`
- Shows `ClueSelectionPanel` when `dialogueState === 'askClue'` or `'answerClue'`

```typescript
const currentNode = useNavigationStore(selectCurrentNode);
const dialogueState = currentNode?.phase || 'basic';

const isAskClue = dialogueState === 'askClue';
const isAnswerClue = dialogueState === 'answerClue';
```

### 4. ClueSelectionPanel (`src/core/recording/ClueSelectionPanel.tsx`)

Renders a grid of clickable clue thumbnails. When a clue is selected, emits `CLUE_SELECTED` event.

### 5. Navigation Machine (`src/core/navigation/machine/navigationMachine.ts`)

Orchestrates the state transitions for clue selection.

**Key states:**
- `dialogueInput` - Normal input phase
- `askClue` - User selecting clue to ask about
- `answerClue` - User selecting clue for answer
- `askRecording` - Recording the question
- `answerRecording` - Recording the answer

### 6. AIOrchestrator (`src/core/ai/AIOrchestrator.ts`)

Stores the selected clue in memory until the user's question is received.

```typescript
let selectedClues: Record<string, { label: string; description: string }> = {};
```

## Data Flow

### Story JSON Structure

```json
{
  "type": "clue-image",
  "image": "insideBakery",
  "clueDescriptions": [
    {
      "hotspotName": "Hair",
      "description": "A bowl of human hair",
      "image": "hair",
      "dialog": "A bowl of hair. Why would a baker have a bowl of human hair?"
    }
  ]
}
```

```json
{
  "type": "character-flow",
  "useClues": true,
  "CharacterDescription": "bakerMom",
  "question": "Where did the cookie thief go?",
  "successAnswer": "Context: cookie crumbs...",
  "flow": [...]
}
```

### Flow Metadata

When a story is loaded (`src/core/data/loadStory.ts`), metadata is extracted and stored:

```typescript
flowMetadata[conversationId] = {
  characterDescription: scene.CharacterDescription,
  questText: scene.question,
  successAnswer: scene.successAnswer,
  incorrectAnswer: scene.incorrectAnswer,
  useClues: scene.useClues  // <-- Controls clue selection behavior
};
```

## Event Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     ClueImageScene                               │
│  1. On mount: setClues(allClueDescriptions)                     │
│  2. User finds clues by clicking hotspots                       │
│  3. When complete: CONTINUE event → next scene                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Character Flow Scene                           │
│  (RecordPanel visible, dialogueState = 'input')                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                    User clicks "Ask" button
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              Navigation Machine: ASK_BUTTON_CLICKED              │
│                                                                  │
│  Guard: metadata?.useClues === true ?                           │
│    YES → updateNodePhase(nodeId, 'askClue')                     │
│          target: #navigation.scene.route                        │
│    NO  → target: askRecording (skip clue selection)             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Route State (router)                          │
│                                                                  │
│  Guards evaluated in order:                                      │
│    1. isInput → dialogueInput                                   │
│    2. isQuestShowing → questShowing                             │
│    3. isAskClue → askClue  ← MATCHES                            │
│    4. isAnswerClue → answerClue                                 │
│    ...                                                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      askClue State                               │
│                                                                  │
│  RecordPanel re-renders (reactive to phase change)              │
│  Shows ClueSelectionPanel with clues from ClueStore             │
└─────────────────────────────────────────────────────────────────┘
                              │
                    User selects a clue
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              Navigation Machine: CLUE_SELECTED                   │
│                                                                  │
│  1. setSelectedClue(conversationId, label, description)         │
│  2. updateNodePhase(nodeId, 'input-recording')                  │
│  3. target: askRecording                                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   askRecording State                             │
│                                                                  │
│  Recording starts, clue context available in AIOrchestrator     │
└─────────────────────────────────────────────────────────────────┘
```

## Phase Values

Defined in `src/core/navigation/navigationGraphTypes.ts`:

| Phase | Description |
|-------|-------------|
| `basic` | Regular dialogue display |
| `input` | Waiting for user input |
| `input-basic` | Input phase, basic state |
| `askClue` | Selecting clue to ask about |
| `answerClue` | Selecting clue for answer |
| `input-recording` | Recording user's question |
| `record-answer` | Recording user's answer |
| `answer-waiting` | Waiting for answer validation |
| `answer-right` | Answer was correct |
| `answer-wrong` | Answer was incorrect |

## Guards in Navigation Machine

```typescript
guards: {
  isInput: () => phase === 'input' || phase === 'input-showInput',
  isAskClue: () => phase === 'askClue',
  isAnswerClue: () => phase === 'answerClue',
  // ... etc
}
```

## Important: Reactive State

The RecordPanel MUST use reactive selectors to respond to phase changes:

```typescript
// CORRECT - reactive, triggers re-render on changes
const currentNode = useNavigationStore(selectCurrentNode);

// WRONG - non-reactive, only reads once
const currentNode = getCurrentNode();  // from navigationHelpers.ts
```

The `navigationHelpers.ts` functions use `getState()` which is a one-time read. For components that need to respond to state changes, use `useNavigationStore(selector)`.

## File Locations Summary

| File | Purpose |
|------|---------|
| `src/core/data/ClueStore.tsx` | React Context for clue storage |
| `src/core/scenes/clueImage/ClueImageScene.tsx` | Clue discovery scene |
| `src/core/recording/RecordPanel.tsx` | Recording UI with clue selection |
| `src/core/recording/ClueSelectionPanel.tsx` | Clue thumbnail grid |
| `src/core/navigation/machine/navigationMachine.ts` | State machine for navigation |
| `src/core/ai/AIOrchestrator.ts` | Selected clue storage for AI context |
| `src/core/data/loadStory.ts` | Story parsing, metadata extraction |
| `src/core/data/FlowMetadataStore.tsx` | Flow metadata types |
