/**
 * Application entry point that renders the main story component.
 */
import ReactDOM from 'react-dom/client'
import StoryModeScrollV2 from './StoryModeScrollV2'
import { DialogueProvider } from "./dialogue/DialogueContext"
import { NavigationProvider } from "./context/NavigationContext"
import { ChatDialogueProvider } from "./chat/ChatDialogueContext"
import { RecordingProvider } from "./recording/RecordingContext"


ReactDOM.createRoot(document.getElementById('root')!).render(
  // <React.StrictMode>
    <NavigationProvider initialIndex={3}>
      <DialogueProvider>
        <RecordingProvider>
          <ChatDialogueProvider>
            <StoryModeScrollV2 />
          </ChatDialogueProvider>
        </RecordingProvider>
      </DialogueProvider>
    </NavigationProvider>
  // </React.StrictMode>,
)