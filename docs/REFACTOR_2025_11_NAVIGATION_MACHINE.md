# Navigation Machine Refactoring - November 2025

**Date:** November 3, 2025
**Status:** ✅ Completed
**Type:** Architecture refactoring - Separation of Concerns

---

## Overview

This refactoring extracted complex business logic from the navigationMachine into dedicated orchestrators and services, following XState and event-driven architecture best practices.

**Before:** 790 lines, machine handled everything
**After:** 524 lines, machine handles state transitions only

---

## What Changed

### 1. ✅ AI Logic → AIOrchestrator

**Created:** [`src/core/ai/AIOrchestrator.ts`](../src/core/ai/AIOrchestrator.ts)

**Responsibilities:**
- `callAIService()` - Pure async AI call with error handling
- `getConversationMetadata()` / `setConversationMetadata()` - Metadata management
- `createAndInsertAIResponseScene()` - Scene creation orchestration

**Removed from machine:**
- ~58 lines of `callAIService` actor
- ~50 lines of `createAIResponseScene` action
- Module-level conversation metadata storage

**Pattern:**
```typescript
// Machine invokes pure service
invoke: {
  src: 'callAI',
  input: () => ({ questionText: '...', conversationId: '...' }),
  onDone: { actions: 'createAIResponseScene' }
}

// Action delegates to orchestrator
createAIResponseScene: ({ event }) => {
  createAndInsertAIResponseScene({ responseText, conversationId, ... });
}
```

---

### 2. ✅ Recording Logic → RecordPanelOrchestrator

**Modified:** [`src/core/recording/RecordPanelOrchestrator.tsx`](../src/core/recording/RecordPanelOrchestrator.tsx)

**Changes:**
- `handleRecordStart` now handles full flow (was just emitting event)
- Orchestrator does: start recording → create scene → insert → navigate → emit success
- Machine receives `RECORDING_STARTED` event AFTER orchestrator completes

**Removed from machine:**
- ~60 lines of `handleAskButtonClicked` action

**Pattern:**
```typescript
// Orchestrator handles complex flow
const handleRecordStart = async () => {
  await Recording.start();
  updateCurrentPhase('basic');
  const scene = createRecordingScene(...);
  insertSceneNodes(currentNodeId, scene);
  advanceNavigation('forward');

  // Then notify machine
  navigationBus.emit({ type: 'RECORDING_STARTED', recordingId, nodeId });
};

// Machine just transitions state
RECORDING_STARTED: { target: 'askRecording' }
```

---

### 3. ✅ Story Loading → Service Module

**Created:** [`src/core/data/services/loadStoryService.ts`](../src/core/data/services/loadStoryService.ts)

**Responsibilities:**
- `loadStoryService()` - Pure async story loading
- Graph building (full + minimal)
- Metadata extraction

**Removed from machine:**
- ~30 lines of inline `loadStoryService` definition

**Pattern:**
```typescript
// Pure service function
export async function loadStoryService(input: LoadStoryInput): Promise<LoadStoryOutput> {
  const { story, flowMetadata } = await loadStory(url);
  const fullGraph = buildNavigationGraph(story.scenes);
  return { fullStory, minimalGraph, initialNodeId, flowMetadata };
}

// Machine invokes it
actors: {
  loadStory: fromPromise(async ({ input }) => await loadStoryService(input))
}
```

---

### 4. ✅ Store Initialization → Helper Function

**Modified:** [`src/core/navigation/navigationHelpers.ts`](../src/core/navigation/navigationHelpers.ts)

**Added:**
- `initializeStoreWithStory()` - Encapsulates store init logic

**Removed from machine:**
- ~30 lines of inline initialization in `initializeStore` action

**Pattern:**
```typescript
// Helper function
export function initializeStoreWithStory(fullStory: Scene[], firstNodeId?: string): void {
  setScenes(fullStory);
  const targetNodeId = firstNodeId || store.graph.order[0];
  useNavigationStore.setState({ currentId: targetNodeId, ... });
}

// Machine action delegates
initializeStore: ({ event }) => {
  setConversationMetadata(event.output.flowMetadata);
  initializeStoreWithStory(event.output.fullStory);
}
```

---

### 5. ✅ Removed Legacy Code

**Removed:**
- `processAIRequest` action (unused, marked as legacy)
- Direct imports of deprecated functions
- Duplicate logic in machine actions

---

## Event Flow Changes

### Before (Anti-pattern)
```
User clicks Ask → Machine receives ASK_BUTTON_CLICKED
                → Machine action does EVERYTHING:
                  - Start recording
                  - Create scene
                  - Insert into graph
                  - Navigate
                  - Update phase
```

### After (Best Practice)
```
User clicks Ask → Orchestrator handles complex flow:
                  - Start recording
                  - Create scene
                  - Insert into graph
                  - Navigate
                  - Update phase
                → Orchestrator emits RECORDING_STARTED
                → Machine transitions state: dialogueInput → askRecording
```

---

## Architecture Benefits

### 1. **Separation of Concerns**
- Machine = State transitions and coordination
- Orchestrators = Complex business logic
- Services = Pure async operations

### 2. **Testability**
- Services are pure functions (easy to unit test)
- Orchestrators are React components (easy to integration test)
- Machine is declarative (easy to verify state transitions)

### 3. **Maintainability**
- Each module has single responsibility
- Business logic lives where it belongs
- Easier to find and modify code

### 4. **Event-Driven Architecture**
- Loose coupling between components
- Multiple listeners can react to events
- Easy to add middleware (logging, analytics)

### 5. **XState Best Practices**
- Actors for pure async operations
- Actions for simple state updates
- External orchestrators for complex flows

---

## Migration Checklist

If you need to add new functionality, follow this pattern:

### For Pure Async Operations (API calls, DB queries)
1. ✅ Create pure service function in appropriate module
2. ✅ Create XState actor using `fromPromise`
3. ✅ Invoke from machine state with `input` and `onDone`/`onError`

### For Complex UI Flows (multi-step with React state)
1. ✅ Create/update orchestrator component
2. ✅ Handle complex logic in orchestrator
3. ✅ Emit success/failure events to machine
4. ✅ Machine handles simple state transitions

### For Store Updates
1. ✅ Create helper function in navigationHelpers
2. ✅ Machine action delegates to helper
3. ✅ Keep action < 10 lines

---

## Files Modified

### Created
- ✅ `src/core/ai/AIOrchestrator.ts` (210 lines)
- ✅ `src/core/data/services/loadStoryService.ts` (67 lines)

### Modified
- ✅ `src/core/navigation/machine/navigationMachine.ts` (790 → 524 lines, -266)
- ✅ `src/core/recording/RecordPanelOrchestrator.tsx` (+80 lines in handleRecordStart)
- ✅ `src/core/navigation/navigationHelpers.ts` (+28 lines for initializeStoreWithStory)
- ✅ `src/core/navigation/machine/types.ts` (Updated event types)

### Net Change
- **Lines of code:** ~Net neutral (logic moved, not added)
- **Complexity:** Significantly reduced in machine
- **Maintainability:** Greatly improved

---

## Testing Checklist

After this refactoring, test these flows:

### Story Loading
- [ ] Story loads successfully on boot
- [ ] Error handling works (bad story ID)
- [ ] Retry works after error

### Ask Recording Flow
- [ ] Click Ask button → recording starts
- [ ] Scene is created and navigated to
- [ ] Phase transitions correctly
- [ ] Stop recording → transcript appears
- [ ] AI response is generated
- [ ] AI response scene is created

### Error Handling
- [ ] Recording fails gracefully
- [ ] AI call fails and returns to input
- [ ] Empty transcript is handled

### Navigation
- [ ] Scroll up/down works
- [ ] Input phase blocks scroll down
- [ ] Recording phase blocks all scroll

---

## Breaking Changes

### ⚠️ Import Changes

If you were importing these from navigationMachine:
```typescript
// ❌ OLD - Don't do this anymore
import { getConversationMetadata } from '@core/navigation/machine/navigationMachine';

// ✅ NEW - Import from AIOrchestrator
import { getConversationMetadata } from '@core/ai/AIOrchestrator';
```

### ⚠️ Event Changes

`RECORDING_STARTED` event structure changed:
```typescript
// ❌ OLD
type RecordingStartedEvent = {
  type: 'RECORDING_STARTED';
  nodeId: string;
  recordingType: 'question' | 'answer';
};

// ✅ NEW
type RecordingStartedEvent = {
  type: 'RECORDING_STARTED';
  recordingId: string;
  nodeId: string;
};
```

---

## Future Improvements

### Potential Next Steps

1. **Answer Recording Flow**
   - Apply same pattern to `handleAnswerClick`
   - Move logic from machine to RecordPanelOrchestrator

2. **Quest Validation Flow**
   - Move to dedicated QuestOrchestrator
   - Machine handles state transitions only

3. **Create AIMemoryOrchestrator**
   - Centralize conversation history management
   - Integrate with AIOrchestrator

4. **Add Telemetry Middleware**
   - Event bus already supports middleware
   - Add analytics tracking

---

## Questions?

1. **Full Architecture** → [ARCHITECTURE_STATE_MANAGEMENT.md](./ARCHITECTURE_STATE_MANAGEMENT.md)
2. **XState Quick Start** → [QUICK_START_XSTATE.md](./QUICK_START_XSTATE.md)
3. **Event-Driven Patterns** → This document, "Event Flow Changes" section

---

**Status:** ✅ Refactoring complete, ready for testing
