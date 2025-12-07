# Debug Package Migration Guide

This guide explains how to migrate from `console.log` statements to the new `debug` package with feature-flag logging.

## ✅ Setup Complete

The following has already been set up:

1. **`debug` package installed** - npm package for namespace-based logging
2. **Debug utility created** - [`src/utils/createDebug.ts`](src/utils/createDebug.ts)
3. **ESLint rule added** - Warns on direct `console.log` usage (allows `console.error`)
4. **Example migration** - [`src/core/recording/RecordingAPI.ts`](src/core/recording/RecordingAPI.ts) has been migrated

## 🎯 How to Use Debug in Browser

### Enable All Wonder.io Logs
```javascript
localStorage.debug = 'wonder:*'
// Then refresh the page
```

### Enable Specific Namespaces
```javascript
// Only recording and AI logs
localStorage.debug = 'wonder:recording:*,wonder:ai:*'

// All except noisy transcript updates
localStorage.debug = 'wonder:*,-wonder:recording:transcripts'

// Quick access via window.__debug utility
__debug.enableAll()      // Enable everything
__debug.recommended()    // Recommended defaults (excludes noisy logs)
__debug.show()          // Show current configuration
```

## 📝 Migration Pattern

### Before
```typescript
console.log('[RecordPanelOrchestrator] 📤 Emitting event:', event);
console.warn('[RecordPanelOrchestrator] ⚠️ Empty transcript');
console.error('[RecordPanelOrchestrator] ❌ Recording failed:', error);
```

### After
```typescript
import { createDebugger } from '@/utils/createDebug';  // or relative path

const debug = createDebugger('recording:orchestrator');

debug.log('📤 Emitting event:', event);
debug.log('⚠️ Empty transcript');          // Warnings become debug.log
debug.error('❌ Recording failed:', error); // Errors stay as debug.error
```

## 🗂️ Namespace Convention

Use hierarchical namespaces that match your module structure:

```
wonder:navigation:machine     - XState machine transitions
wonder:navigation:store       - Zustand store updates
wonder:navigation:graph       - Graph operations
wonder:navigation:events      - Event bus emissions
wonder:ai:orchestrator        - AI orchestration logic
wonder:ai:service             - AI API calls
wonder:recording:orchestrator - Recording flow
wonder:recording:api          - Recording API lifecycle
wonder:recording:transcripts  - Real-time transcript updates (can be noisy!)
wonder:scenes:renderer        - Scene rendering
wonder:dialogue:chatflow      - Chat flow logic
```

## 🔄 Migration Priority (By File Size)

### High Priority (Most console.logs)
1. **navigationMachine.ts** - 82 occurrences → `wonder:navigation:machine`
2. **AIOrchestrator.ts** - 31 occurrences → `wonder:ai:orchestrator`
3. **RecordPanelOrchestrator.tsx** - 26 occurrences → `wonder:recording:orchestrator`
4. **useSTT.ts** - 39 occurrences → `wonder:recording:transcripts`

### Medium Priority
5. **ChatFlowOrchestrator.tsx** - `wonder:dialogue:chatflow`
6. **navigationStore.ts** - `wonder:navigation:store`
7. **aiService.ts** - `wonder:ai:service`

### Low Priority (Fewer logs)
8. Remaining scene files - `wonder:scenes:*`
9. Background/character files - `wonder:background`, `wonder:characters`

## 🛠️ Step-by-Step Migration Process

### 1. Choose a File
Start with smaller files first (like RecordingAPI.ts - already done!)

### 2. Add Import and Create Debugger
```typescript
import { createDebugger } from '../../utils/createDebug';  // Adjust path as needed

const debug = createDebugger('module:submodule');  // Choose appropriate namespace
```

### 3. Replace Console Statements
- `console.log('[ModuleName]...)` → `debug.log(...)`  // Remove the [ModuleName] prefix
- `console.warn('[ModuleName]...)` → `debug.log(...)`  // Warnings become regular logs
- `console.error('[ModuleName]...)` → `debug.error(...)` // Errors stay as errors
- `console.info('[ModuleName]...)` → `debug.log(...)`

### 4. Special Cases

**Emoji logging:**
```typescript
// Before
console.log('[Module] 📤 Event emitted')

// After
debug.event('📤', 'Event emitted')
// OR just
debug.log('📤 Event emitted')
```

**Grouped logging:**
```typescript
// Before
console.group('[Module] Processing');
console.log('Step 1');
console.log('Step 2');
console.groupEnd();

// After
debug.group('Processing', () => {
  console.log('Step 1');
  console.log('Step 2');
});
```

### 5. Test
```bash
# In browser console
localStorage.debug = 'wonder:*'
# Refresh and verify logs appear
```

## 📊 Progress Tracking

**Status: 4 / 31 files migrated**

### ✅ Migrated
- [x] `src/utils/createDebug.ts` (new file)
- [x] `src/core/recording/RecordingAPI.ts` (3 statements)
- [x] `eslint.config.js` (ESLint rule added)

### ⏳ To Do (309 total console statements)
- [ ] `src/core/navigation/machine/navigationMachine.ts` (82)
- [ ] `src/core/recording/hooks/useSTT.ts` (39)
- [ ] `src/core/ai/AIOrchestrator.ts` (31)
- [ ] `src/core/recording/RecordPanelOrchestrator.tsx` (26)
- [ ] `src/core/navigation/commands/commandExecutor.ts` (17)
- [ ] `src/core/navigation/devtools/navigationLogger.ts` (8) - May need special handling
- [ ] ... (24 more files)

## 💡 Tips

1. **Use Regex Find/Replace in VS Code:**
   - Find: `console\.log\('\[ModuleName\] `
   - Replace: `debug.log('`

2. **Keep emojis!** They make logs easier to scan visually

3. **Don't forget to remove the module prefix** - the namespace already identifies the module

4. **Error logs are important** - Use `debug.error()` so they always show

5. **Test as you go** - Enable the namespace in browser and verify logs work

## 🚀 Next Steps

1. Migrate one file at a time, starting with smaller files
2. Test each file after migration
3. Commit incrementally (e.g., "feat: migrate RecordingAPI to debug package")
4. Use the browser console `__debug` utility to control log output while developing

## 📚 Reference

- **Debug package docs**: https://www.npmjs.com/package/debug
- **Utility location**: [`src/utils/createDebug.ts`](src/utils/createDebug.ts)
- **ESLint config**: [`eslint.config.js`](eslint.config.js)
