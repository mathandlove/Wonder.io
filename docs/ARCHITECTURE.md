# Wonder.io 2.0 - Architecture Overview

## Table of Contents
1. [System Overview](#system-overview)
2. [Core Systems](#core-systems)
3. [Data Flow](#data-flow)
4. [Key Concepts](#key-concepts)
5. [Directory Structure](#directory-structure)

## System Overview

Wonder.io 2.0 is an interactive storytelling application that combines animated characters, voice recording, and AI-powered conversations to create an immersive learning experience for children.

### Technology Stack
- **Frontend**: React 19 + TypeScript
- **Animation**: Framer Motion
- **Styling**: Tailwind CSS 4.x
- **Build**: Vite 7.x
- **State Management**: React Context + Custom Hooks

### Architecture Pattern
The application follows a **layered orchestration pattern** with clear separation of concerns:

```
┌─────────────────────────────────────────┐
│         UI Layer (Components)           │
│  (Scenes, Characters, Backgrounds)      │
└─────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│    Orchestration Layer (Coordinators)   │
│  (NodeManager, ChatFlow, Recording)     │
└─────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│       Data Layer (Contexts & Stores)    │
│  (NavigationGraph, DialogueState, AI)   │
└─────────────────────────────────────────┘
```

## Core Systems

### 1. Navigation System ([NodeManager](src/core/navigation/NodeManager.tsx))
**Purpose**: Manages scene navigation using a doubly-linked node graph

**Key Concepts**:
- Each scene can have multiple "nodes" representing different states
- Navigation is pointer-based (prevId/nextId) for efficient insertions/deletions
- Frozen snapshots preserve data for animations during graph mutations

**Main Components**:
- [NavigationGraph](src/core/navigation/navigationGraphTypes.ts) - Core data structure
- [NodeManager](src/core/navigation/NodeManager.tsx) - Graph operations and navigation
- [SceneFactory](src/core/navigation/SceneFactory.tsx) - Creates scenes dynamically

**Example Node States**:
- `dialogue:basic` → `dialogue:quest-showing` → `dialogue:input-showInput`
- `image:hidden` → `image:showing`

### 2. Scene System ([types/scene.ts](src/core/types/scene.ts))
**Purpose**: Defines all scene types and their rendering

**Scene Types**:
- **CharacterScene**: Dialogue with left/right character panels
- **ImageScene**: Full-screen images with optional captions
- **FullScene**: Full-screen text displays
- **TextScene**: Narrator text
- **FailDanceScene**: Wrong answer animation
- **SuccessDanceScene**: Correct answer animation
- **CharacterFlowScene**: Sequential dialogue flow (flattened into CharacterScenes)

**Rendering**: [SceneRenderer](src/core/scenes/SceneRenderer.tsx) routes to appropriate component

### 3. Character Animation System
**Purpose**: Coordinates character entrance/exit animations across scenes

**Key Files**:
- [CharacterOrchestrator](src/features/characters/CharacterOrchestrator.tsx) - Main coordinator
- [CharacterPanel](src/features/characters/CharacterPanel.tsx) - Individual character renderer
- [CharacterAnimationContext](src/features/characters/CharacterAnimationContext.tsx) - Animation event bus

**Animation Flow**:
1. Character enters → entrance animation plays
2. Bubble appears (delayed by entrance duration)
3. Character speaks → jiggle animation
4. Character exits → exit animation plays

**Metadata Injection**: [injectPanelMetaFromFlows](src/features/characters/adapters/injectPanelMetaFromFlows.ts) preprocesses scenes to determine character transitions

### 4. Dialogue & Recording System
**Purpose**: Handles voice recording, speech-to-text, and AI chat

**Components**:
- [RecordingContext](src/core/recording/RecordingContext.tsx) - WebRTC audio capture
- [useSTT](src/core/recording/hooks/useSTT.ts) - Speech-to-text integration
- [RecordPanel](src/core/recording/RecordPanel.tsx) - UI for Ask/Answer buttons
- [ChatFlowOrchestrator](src/core/dialogue/ChatFlowOrchestrator.tsx) - Manages dialogue state machine

**State Flow**:
```
input-showInput → input-recording → input-processing
→ waiting-for-finalize → ai-waiting → (next scene)
```

### 5. AI Integration System
**Purpose**: Connects to backend AI for character responses

**Components**:
- [AIModule](src/features/ai/AIModule.tsx) - HTTP API client
- [AIMemoryStore](src/core/ai/AIMemoryStore.tsx) - Conversation history per character
- [AnswerValidationOrchestrator](src/core/dialogue/AnswerValidationOrchestrator.tsx) - Validates quest answers

**API Endpoint**: `http://localhost:3001/api/ai/chat`

### 6. Background System
**Purpose**: Manages background images with smooth transitions

**Components**:
- [BackgroundOrchestrator](src/features/background/BackgroundOrchestrator.tsx) - Renders backgrounds
- [buildBackgroundRanges](src/features/background/buildBackgroundRanges.ts) - Groups scenes by background
- [positionBackground](src/features/background/positionBackground.ts) - Calculates scroll positions

**Strategy**: Pre-calculates ranges of scenes sharing the same background for efficient rendering

### 7. Scroll Control System
**Purpose**: Manages scene scrolling with snap behavior and locks

**Key File**: [ScrollControl](src/core/scroll/ScrollControl.tsx)

**Features**:
- Snap scrolling (each scene = 100vh)
- Lock system (prevents scrolling when recording, etc.)
- Caption reveal (image scenes unlock after first scroll attempt)
- Focus management (keyboard accessibility)

## Data Flow

### Story Loading Flow
```
loadStory() → JSON parsed → injectPanelMetaFromFlows()
→ NodeManager.setScenes() → NavigationGraph built
→ Scenes rendered
```

### Recording Flow
```
User clicks "Ask" → RecordingContext starts WebRTC
→ Audio chunks → useSTT() → Transcript updates
→ Stop → Finalize → ChatFlowOrchestrator processes
→ AIModule.getResponse() → New scene created
→ NavigationGraph updated
```

### Navigation Flow
```
User scrolls/keys → ScrollControl detects
→ NodeManager.goNext/goPrev()
→ Graph pointers updated (currentId changes)
→ React re-renders → Orchestrators react
→ Animations triggered
```

## Key Concepts

### 1. Frozen Snapshots
**Problem**: Animations need stable data, but the navigation graph can be mutated during animations (scene deletion, insertion)

**Solution**: Create immutable snapshots ([FrozenNodeSnapshot](src/core/navigation/navigationGraphTypes.ts)) at transition start

**Usage**: Character animations read from frozen snapshots instead of live graph

### 2. Two-Phase Deletion
**Problem**: Can't delete nodes immediately during animations

**Solution**:
1. **Phase 1**: Mark node as `pendingRemoval` (immediate - navigation skips it)
2. **Phase 2**: Compact node from graph (deferred - after animation completes)

**Implementation**: [PendingNodeDeletion](src/core/navigation/navigationGraphTypes.ts) tracks deletion timers

### 3. State-Based Locking
**Problem**: Need to prevent scrolling during recording, AI wait, etc.

**Solution**: Each [DialogueState](src/core/dialogue/types.ts) has implicit lock flags:
- `input-recording` → lock forward/backward
- `answer-waiting` → lock forward/backward
- `quest-showing` → lock forward (must accept first)

**Implementation**: [ScrollControl](src/core/scroll/ScrollControl.tsx) checks current node's dialogue state

### 4. Panel Metadata System
**Problem**: Character entrance/exit animations need to know previous/next characters

**Solution**: [injectPanelMetaFromFlows](src/features/characters/adapters/injectPanelMetaFromFlows.ts) preprocesses scenes to add `meta.panelLeft` and `meta.panelRight` with:
- `character`: Current character
- `previousCharacter`: Previous scene's character
- `nextCharacter`: Next scene's character
- `newCharacter`: True if character is entering
- `aboutToSwap`: True if character will exit next scene

### 5. Scene vs Node
**Distinction**:
- **Scene**: Visual unit (one 100vh section) - defined in story JSON
- **Node**: Navigation unit (one scroll stop) - multiple nodes per scene for states

**Example**: A CharacterScene with quest has 3 nodes:
1. `dialogue:basic` (hidden panel)
2. `dialogue:quest-showing` (accept quest)
3. `dialogue:input-showInput` (ask questions)

But only 1 DOM element is rendered - the UI changes based on which node is current.

## Directory Structure

```
src/
├── app/                    # Application entry point
│   └── main.tsx           # React root, provider setup
├── core/                   # Core systems (navigation, dialogue, data)
│   ├── navigation/        # Node graph, SceneFactory
│   ├── dialogue/          # ChatFlow, validation orchestrators
│   ├── recording/         # Audio recording, STT
│   ├── scroll/            # Scroll control, debug panel
│   ├── scenes/            # SceneRenderer, orchestrators
│   ├── data/              # Story loading, metadata stores
│   ├── ai/                # AI memory context
│   ├── types/             # Core type definitions
│   └── uiLayout/          # UI overlay root
├── features/               # Feature modules (self-contained)
│   ├── characters/        # Character panels, animations
│   ├── chat/              # Chat bubbles, dialogue UI
│   ├── background/        # Background rendering
│   ├── caption/           # Image captions
│   ├── quest/             # Quest system
│   ├── scenes/            # Scene implementations
│   ├── ai/                # AI module HTTP client
│   └── flow-layout/       # Panel layout system
├── pages/                  # Top-level page components
│   └── StoryModeScroll.tsx # Main story page
├── types/                  # Centralized type definitions
│   └── index.ts           # All shared types
└── vite-env.d.ts          # Vite type augmentation
```

### Folder Conventions
- **core/**: Foundational systems used throughout the app
- **features/**: Self-contained feature modules (can be extracted)
- **pages/**: Top-level route components
- **types/**: Shared type definitions

## Next Steps

For detailed information about specific systems, see:
- [Navigation System](./NAVIGATION.md)
- [Character Animation System](./CHARACTERS.md)
- [Dialogue & Recording System](./DIALOGUE.md)
- [Type Definitions](./TYPES.md)
