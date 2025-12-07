/**
 * Application entry point that renders the main story component.
 */
import ReactDOM from 'react-dom/client'
import StoryModeScroll from '../pages/StoryModeScroll'
import { DialogueProvider } from '@core/dialogue/DialogueContext'
import { ChatDialogueProvider } from '@features/chat/context/ChatDialogueContext'
import { ClueStoreProvider } from '@core/data/ClueStore'
import { RecordingProvider } from '@core/recording/RecordingOrchestrator'
import { startNavigationService } from '@core/navigation/machine/navigationInterpreter'
import { start as startQueue, setExecutor } from '@core/navigation/queue/navigationQueue'
import { executeCommand } from '@core/navigation/commands/commandExecutor'
import { OrientationGate } from '../components/OrientationGate'
import './global.css'

// Initialize the navigation system
// 1. Set up the command queue with the executor
setExecutor(executeCommand);

// 2. Start the queue processing
startQueue();

// 3. Start the navigation state machine service
// This initializes the XState machine and enables the Stately inspector in development
startNavigationService();

ReactDOM.createRoot(document.getElementById('root')!).render(
  // <React.StrictMode>
  <OrientationGate>
    <DialogueProvider>
      <RecordingProvider>
        <ClueStoreProvider>
          <ChatDialogueProvider>
            <StoryModeScroll />
          </ChatDialogueProvider>
        </ClueStoreProvider>
      </RecordingProvider>
    </DialogueProvider>
  </OrientationGate>
  // </React.StrictMode>,
)