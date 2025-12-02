# Claude Code Context Documentation

This directory contains documentation and configuration files to help Claude Code understand the Wonder.io 2.0 project architecture and patterns.

---

## Project Documentation

- **[Project README](./PROJECT-README.md)** - Complete project overview, quick start, and development guide
  - Project structure and file organization
  - All scene types and their features
  - Development workflow and debugging
  - Dependencies and configuration
  - Common issues and troubleshooting

---

## Architecture Documentation

### State Management & Navigation

- **[Ask Flow Architecture](./architecture/ask-flow-architecture.md)** - Complete flow diagram from Ask button click to AI response page
  - File-by-file breakdown of all components involved
  - Visual ASCII flow diagrams showing the complete data path
  - State machine state transitions
  - Key data structures (Scene, Node, ConversationMetadata)
  - Quick reference tables for all functions
  - Common debugging points and troubleshooting guide

  **When to reference:** Debugging Ask/Answer button issues, understanding how pages are built, tracing event flow, scene creation problems

- **[Ask State Flow Architecture](./architecture/ask-state-flow-architecture.md)** - Comprehensive guide to the xState-based ask flow pattern
  - Event-driven architecture principles
  - State machine flow (dialogueInput → askRecording → askProcessing → askWaitingForAI)
  - Orchestrator responsibilities vs machine responsibilities
  - AI integration pattern with module-level storage
  - Phase management and type safety
  - Migration guide for converting other flows

  **When to reference:** Working on dialogue flows, recording systems, AI integration, or any feature involving state machines

---

## Key Architectural Principles

### 1. xState as Single Source of Truth
The navigation state machine ([src/core/navigation/machine/navigationMachine.ts](../src/core/navigation/machine/navigationMachine.ts)) controls all state transitions. Business logic lives in ONE place.

### 2. Event-Driven Communication
All state changes happen through events via the [navigationBus](../src/core/navigation/events/navigationBus.ts). This creates unidirectional data flow:
```
User Action → Orchestrator (setup) → Event → Machine (decision) → Store (mutation) → UI
```

### 3. Orchestrators Handle Setup, Not State Logic
Orchestrators perform complex multi-step operations (creating scenes, starting hardware), then emit events to let the machine decide what happens next.

### 4. Strict Type Safety for Phases
All phase names use the strict `Phase` type ([src/core/navigation/navigationGraphTypes.ts](../src/core/navigation/navigationGraphTypes.ts)) to prevent bugs.

---

## Quick Reference

### Adding a New Feature with State Machine

1. **Define states** in [navigationMachine.ts](../src/core/navigation/machine/navigationMachine.ts)
2. **Define events** in [types.ts](../src/core/navigation/machine/types.ts)
3. **Create orchestrator** for complex setup (if needed)
4. **Emit events** instead of calling state updates directly
5. **Use actors** for async operations

See [Ask State Flow Architecture](./architecture/ask-state-flow-architecture.md#migration-guide) for detailed migration guide.

---

## Project Structure

```
Wonder.io-2.0/
├── .claude/                          # Claude Code context
│   ├── architecture/                 # Architecture documentation
│   │   ├── ask-flow-architecture.md        # Ask button → AI response flow
│   │   └── ask-state-flow-architecture.md  # xState patterns guide
│   ├── settings.local.json          # Claude Code settings
│   └── README.md                    # This file
├── src/
│   ├── core/
│   │   ├── ai/                      # AI integration
│   │   │   └── AIOrchestrator.ts   # AI service + module storage
│   │   ├── dialogue/                # Dialogue orchestration
│   │   │   └── ChatFlowOrchestrator.tsx
│   │   ├── navigation/              # Navigation system
│   │   │   ├── machine/             # xState machine
│   │   │   │   ├── navigationMachine.ts   # State machine definition
│   │   │   │   ├── types.ts                # Event types
│   │   │   │   └── navigationInterpreter.ts
│   │   │   ├── navigationStore.ts   # Zustand store
│   │   │   ├── navigationHelpers.ts # Navigation utilities
│   │   │   └── navigationGraphTypes.ts  # Phase types
│   │   └── recording/               # Recording system
│   │       ├── RecordPanelOrchestrator.tsx  # Recording setup
│   │       └── RecordPanel.tsx
│   └── features/                    # Feature modules
└── public/
    └── stories/                     # Story content
```

---

## Common Patterns

### Emitting Events
```typescript
import * as navigationBus from '@core/navigation/events/navigationBus';

navigationBus.emit({
  type: 'RECORDING_STARTED',
  recordingId: 'rec-123',
  nodeId: 'node-456'
});
```

### Reading Phase
```typescript
import { useNavigationStore } from '@core/navigation/navigationStore';

// In React component
const phase = useNavigationStore(state => state.getCurrentPhase());

// In xState guard/action
const phase = useNavigationStore.getState().getCurrentPhase();
```

### Creating Scenes
```typescript
import { createRecordingScene } from '@core/navigation/sceneFactoryFunctions';
import { insertSceneNodes, advanceNavigation } from '@core/navigation/navigationHelpers';

const scene = createRecordingScene(recordingId, conversationId, ...);
const newNodeId = insertSceneNodes(currentNodeId, scene);
advanceNavigation('forward');
```

---

## File Naming Conventions

- **`*Machine.ts`** - xState state machine definitions
- **`*Orchestrator.tsx`** - Complex setup coordinators
- **`*Store.ts`** - Zustand stores
- **`*Types.ts`** - TypeScript type definitions
- **`*Service.ts`** - Pure async service functions

---

## Additional Resources

- [xState Documentation](https://xstate.js.org/docs/)
- [Zustand Documentation](https://github.com/pmndrs/zustand)

---

**Maintained by:** Development Team
**Last Updated:** January 2025
