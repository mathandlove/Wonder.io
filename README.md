# Wonder.io 2.0

An interactive storytelling application for children featuring animated characters, voice interaction, and AI-powered conversations.

---

## 📚 Documentation

All project documentation has been moved to the **[`.claude/`](.claude/)** directory for better organization and Claude Code integration.

### Quick Links

- **[Complete Project README](.claude/PROJECT-README.md)** - Full project overview, quick start, setup, and development guide
- **[Architecture Documentation](.claude/architecture/)** - State machine patterns and system design
- **[Ask State Flow Architecture](.claude/architecture/ask-state-flow-architecture.md)** - xState-based dialogue flow reference implementation

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

The app will be available at `http://localhost:5173`

---

## 🏗️ Architecture Overview

Wonder.io 2.0 uses an **event-driven state machine architecture** powered by xState:

```
User Action → Orchestrator (setup) → Event → Machine (decision) → Store (mutation) → UI
```

### Key Principles

1. **xState as Single Source of Truth** - All state transitions managed by [navigationMachine.ts](src/core/navigation/machine/navigationMachine.ts)
2. **Event-Driven Communication** - Components communicate through the [navigationBus](src/core/navigation/events/navigationBus.ts)
3. **Orchestrators for Setup** - Complex operations coordinated by orchestrators, then handed to machine
4. **Strict Type Safety** - All phases and events are strictly typed

See [.claude/README.md](.claude/README.md) for complete architectural documentation.

---

## 📁 Project Structure

```
Wonder.io-2.0/
├── .claude/                      # Documentation & Claude Code context
│   ├── PROJECT-README.md        # Complete project documentation
│   ├── architecture/            # Architecture guides
│   └── README.md               # Documentation index
├── src/
│   ├── core/                   # Core systems
│   │   ├── ai/                # AI integration with module-level storage
│   │   ├── navigation/        # Navigation graph & state machine
│   │   ├── dialogue/          # Chat flow orchestration
│   │   ├── recording/         # Audio capture & STT
│   │   └── scenes/            # Scene rendering
│   ├── features/              # Feature modules
│   └── types/                 # Centralized type definitions
└── public/
    └── stories/               # Story content bundles
```

---

## 🎯 Core Systems

| System | Purpose | Key Files |
|--------|---------|-----------|
| **Navigation Machine** | State-driven navigation flow | [navigationMachine.ts](src/core/navigation/machine/navigationMachine.ts) |
| **AI Orchestrator** | AI service + conversation memory | [AIOrchestrator.ts](src/core/ai/AIOrchestrator.ts) |
| **Recording** | Voice capture with STT | [RecordPanelOrchestrator.tsx](src/core/recording/RecordPanelOrchestrator.tsx) |
| **Characters** | Character animations & panels | [CharacterOrchestrator.tsx](src/features/characters/CharacterOrchestrator.tsx) |

---

## 🔑 Key Concepts

### State Machine Flow

The ask flow demonstrates the architecture:

```
dialogueInput → askRecording → askProcessing → askWaitingForAI → navigating
```

Each state handles specific user interactions and automatically transitions based on events.

See [Ask State Flow Architecture](.claude/architecture/ask-state-flow-architecture.md) for the complete reference implementation.

### Event-Driven Design

```typescript
// Orchestrator emits event after complex setup
navigationBus.emit({ type: 'RECORDING_STARTED', recordingId, nodeId });

// Machine receives event and transitions state
on: { RECORDING_STARTED: { target: 'askRecording' } }

// Store updates, UI reacts
const phase = useNavigationStore(state => state.getCurrentPhase());
```

### Module-Level Storage

AI integration uses module-level storage (outside React context) so xState actors can access conversation history:

```typescript
// Store metadata on story load
setConversationMetadata(flowMetadata);

// Access from anywhere (including xState actors)
const metadata = getConversationMetadata(conversationId);
```

---

## 🧪 Development

### Debug Tools

- Press **`\`** to toggle the debug panel
- Shows current state, phase, navigation info

### Scripts

```bash
npm run dev         # Start dev server
npm run build       # Build for production
npm run lint        # Run ESLint with --fix
npm run preview     # Preview production build
```

---

## 📦 Tech Stack

- **React 19** - UI library
- **xState** - State machine management
- **Zustand** - Navigation store
- **Framer Motion** - Animations
- **Vite 7** - Build tool
- **TypeScript 5.8** - Type system
- **Tailwind CSS 4** - Styling

---

## 🌐 Backend Integration

AI responses powered by backend API at `http://localhost:3001/api/ai/chat`

See [PROJECT-README.md](.claude/PROJECT-README.md#backend-integration) for API details.

---

## 🐛 Debugging

Common issues and solutions are documented in [PROJECT-README.md](.claude/PROJECT-README.md#common-issues).

For state machine debugging:
- Enable xState DevTools in [navigationInterpreter.ts](src/core/navigation/machine/navigationInterpreter.ts)
- Check console for event logs: `[NavigationMachine] 📤 Emitting...`

---

## 🎓 Learning Resources

### For New Developers

1. Start with [PROJECT-README.md](.claude/PROJECT-README.md) - Complete project overview
2. Read [Ask State Flow Architecture](.claude/architecture/ask-state-flow-architecture.md) - Reference implementation
3. Follow the [Migration Guide](.claude/architecture/ask-state-flow-architecture.md#migration-guide) when adding new features

### For Claude Code

All documentation in [`.claude/`](.claude/) is optimized for Claude Code to reference when working on the project.

---

**Need more details?** → See [`.claude/PROJECT-README.md`](.claude/PROJECT-README.md) for the complete documentation.

**Working on state machines?** → See [`.claude/architecture/ask-state-flow-architecture.md`](.claude/architecture/ask-state-flow-architecture.md) for the reference pattern.
