# Wonder.io 2.0

An interactive storytelling application for children featuring animated characters, voice interaction, and AI-powered conversations.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run linter
npm run lint
```

## 📖 Documentation

### Core Documentation
- **[Architecture Overview](./docs/ARCHITECTURE.md)** - System design and high-level concepts
- **[Navigation System](./docs/NAVIGATION.md)** - Node-based navigation graph deep dive
- **[Character System](./docs/CHARACTERS.md)** - Character animations and panel management
- **[Dialogue System](./docs/DIALOGUE.md)** - Recording, STT, AI, and answer validation

### Type Reference
- **[Centralized Types](./src/types/index.ts)** - All type definitions in one place

## 🏗️ Architecture

Wonder.io 2.0 follows a **layered orchestration pattern**:

```
UI Layer (Components)
        ↓
Orchestration Layer (Coordinators)
        ↓
Data Layer (Contexts & Stores)
```

### Core Systems

| System | Purpose | Key Files |
|--------|---------|-----------|
| **Navigation** | Scene/state navigation using doubly-linked graph | [NodeManager.tsx](./src/core/navigation/NodeManager.tsx) |
| **Characters** | Character animations and panel rendering | [CharacterOrchestrator.tsx](./src/features/characters/CharacterOrchestrator.tsx) |
| **Dialogue** | Voice recording, STT, AI chat | [ChatFlowOrchestrator.tsx](./src/core/dialogue/ChatFlowOrchestrator.tsx) |
| **Scenes** | Scene types and rendering | [SceneRenderer.tsx](./src/core/scenes/SceneRenderer.tsx) |
| **Backgrounds** | Background rendering with transitions | [BackgroundOrchestrator.tsx](./src/features/background/BackgroundOrchestrator.tsx) |
| **Scroll** | Snap scrolling and lock system | [ScrollControl.tsx](./src/core/scroll/ScrollControl.tsx) |

## 📁 Project Structure

```
src/
├── app/              # Application entry point
├── core/             # Core systems (navigation, dialogue, data)
│   ├── navigation/   # Node graph management
│   ├── dialogue/     # Chat flow orchestration
│   ├── recording/    # Audio capture & STT
│   ├── scroll/       # Scroll control & locking
│   ├── scenes/       # Scene rendering
│   ├── data/         # Story loading & metadata
│   ├── ai/           # AI memory context
│   └── types/        # Core type definitions
├── features/         # Feature modules
│   ├── characters/   # Character panels & animations
│   ├── chat/         # Chat UI components
│   ├── background/   # Background rendering
│   ├── quest/        # Quest system
│   ├── ai/           # AI HTTP client
│   └── scenes/       # Scene implementations
├── pages/            # Top-level pages
├── types/            # Centralized type definitions
└── assets/           # Static assets
```

## 🔑 Key Concepts

### 1. Scenes vs Nodes
- **Scene**: A visual unit (100vh DOM element)
- **Node**: A navigation stop within a scene

Example: A character scene with quest has 3 nodes (basic, quest-showing, input-showInput) but renders as 1 DOM element.

### 2. Doubly-Linked Navigation Graph
- Nodes linked via `prevId`/`nextId` pointers
- O(1) insertion/deletion
- Stable IDs for React keys
- Two-phase deletion for animations

### 3. Frozen Snapshots
- Immutable node snapshots for animations
- Protects against graph mutations during transitions
- Used by CharacterOrchestrator for entrance/exit

### 4. State-Based Locking
- Dialogue states control scroll locks
- Examples: `input-recording` locks both directions, `quest-showing` locks forward
- Prevents navigation during recording/AI processing

### 5. Panel Metadata Injection
- Preprocesses scenes to determine character transitions
- Adds `meta.panelLeft/Right` with entrance/exit flags
- Used for animation coordination

## 🎨 Scene Types

| Type | Description | Features |
|------|-------------|----------|
| **character** | Dialogue with left/right character panels | Quest, input, voice recording |
| **image** | Full-screen image with optional caption | Caption reveal unlock |
| **full** | Full-screen text display | Story narration |
| **text** | Text with optional character | Simple dialogue |
| **success-dance** | Correct answer celebration | Happy character animation |
| **fail-dance** | Wrong answer feedback | Angry character animation |
| **character-flow** | Sequential dialogue flow | Flattened into character scenes |

## 🧭 Navigation Flow

```
User scrolls/keys
    ↓
ScrollControl detects input
    ↓
Check locks (recording? AI waiting?)
    ↓
NodeManager.goNext/goPrev()
    ↓
Update currentId pointer
    ↓
Create frozen snapshot
    ↓
Increment historyVersion
    ↓
React re-renders
    ↓
Orchestrators react to new state
    ↓
Animations triggered
```

## 🗣️ Recording Flow

```
Click "Ask" button
    ↓
RecordingContext starts WebRTC
    ↓
Audio → useSTT hook → Transcript updates
    ↓
Click "Stop"
    ↓
STT finalization
    ↓
ChatFlowOrchestrator detects ai-waiting
    ↓
AIModule calls backend
    ↓
Response scene created
    ↓
Insert into navigation graph
    ↓
Navigate to new scene
```

## 🎭 Character Animation Flow

```
Scene changes
    ↓
CharacterOrchestrator detects character change
    ↓
Entrance animation (1.6s)
    ↓
Speech bubble appears (delayed)
    ↓
Jiggle animation on speech
    ↓
Exit animation when character swaps
```

## 🧪 Development

### Debug Panel
Press `\` to toggle the debug panel showing:
- Current node & scene info
- Dialogue state
- Character positions
- Navigation graph stats

### Lint & Build
```bash
# Run ESLint
npm run lint

# Type check
npm run build  # Runs tsc -b before vite build
```

### Key Scripts
```bash
npm run dev         # Start dev server (Vite)
npm run build       # Build for production
npm run preview     # Preview production build
npm run lint        # Run ESLint with --fix
npm run cardboard   # Generate cardboard cutout images
```

## 🔧 Configuration

### Path Aliases
Defined in [tsconfig.app.json](./tsconfig.app.json):
```typescript
"@app/*": ["src/app/*"]
"@core/*": ["src/core/*"]
"@features/*": ["src/features/*"]
"@shared/*": ["src/shared/*"]
"@assets/*": ["src/assets/*"]
"@stories/*": ["public/stories/*"]
```

### TypeScript
- **Strict mode** enabled
- **noUnusedLocals** and **noUnusedParameters** enforced
- **Verbatim module syntax** for better tree-shaking

### ESLint
- TypeScript ESLint rules
- React hooks rules
- Unused imports auto-removal
- React refresh rules for HMR

## 📦 Dependencies

### Runtime
- **React 19** - UI library
- **Framer Motion** - Animation library
- **ulid** - Unique ID generation

### Build
- **Vite 7** - Build tool & dev server
- **TypeScript 5.8** - Type system
- **Tailwind CSS 4** - Styling
- **ESLint** - Linting

## 🌐 Backend Integration

The app connects to an AI backend for character responses:

**Endpoint**: `http://localhost:3001/api/ai/chat`

**Request**:
```json
{
  "question": "Why is the sky blue?",
  "characterDescription": "A friendly science teacher",
  "conversationHistory": [
    { "role": "user", "content": "Hello!" },
    { "role": "assistant", "content": "Hi there!" }
  ]
}
```

**Response**:
```json
{
  "response": "The sky is blue because..."
}
```

## 🎯 Best Practices

1. **Always use frozen snapshots** for animation data
2. **Use NodeManager API** for all navigation operations
3. **Inject panel metadata** before rendering
4. **Coordinate animations** via CharacterAnimationContext
5. **Handle recording errors** gracefully
6. **Import types from** [src/types/index.ts](./src/types/index.ts)
7. **Check locks** before navigation
8. **Two-phase deletion** for smooth animations

## 🐛 Common Issues

### Issue: Character doesn't appear
**Cause**: Missing sprite file
**Fix**: Check `/public/stories/[story].bundle/images/characters/[name].sticker.webp`

### Issue: Scroll locked
**Cause**: Scene in recording/waiting state
**Fix**: Check dialogue state, complete recording or wait for AI

### Issue: AI not responding
**Cause**: Backend not running or network error
**Fix**: Check backend logs, verify endpoint

### Issue: Types not found
**Cause**: Importing from old type files
**Fix**: Import from centralized [src/types/index.ts](./src/types/index.ts)

## 📝 Recent Changes (Cleanup Summary)

### ✅ Code Quality
- Fixed all 12 ESLint errors and warnings
- Removed unused variables and imports
- Fixed React Fast Refresh violations
- Separated contexts and hooks into proper files
- Fixed exhaustive-deps issues

### ✅ Type Consolidation
- Created centralized [src/types/index.ts](./src/types/index.ts)
- All types now in one location for easy reference
- Organized by category (scenes, navigation, dialogue, etc.)

### ✅ Documentation
- Created comprehensive [Architecture Overview](./docs/ARCHITECTURE.md)
- Added [Navigation System Deep Dive](./docs/NAVIGATION.md)
- Added [Character Animation Guide](./docs/CHARACTERS.md)
- Added [Dialogue & Recording Guide](./docs/DIALOGUE.md)
- All major systems documented with examples

## 🚧 Future Enhancements

1. **Multi-language support** for international audiences
2. **Offline mode** with local STT
3. **Advanced character poses** (happy, sad, angry)
4. **Conversation export** for review/analysis
5. **Audio playback** for AI responses (TTS)
6. **Save/load** navigation state
7. **Branching narratives** (choose-your-own-adventure)

---

**Need help?** Check the [docs](./docs/) or open an issue!
