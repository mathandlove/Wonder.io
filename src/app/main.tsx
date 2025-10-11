/**
 * Application entry point that renders the main story component.
 */
import ReactDOM from 'react-dom/client'
import StoryModeScrollV2 from '@app/../pages/StoryModeScrollV2'
import { DialogueProvider } from '@core/dialogue/DialogueContext'
import { NavigationProvider } from '@core/navigation/NavigationContext'
import { ChatDialogueProvider } from '@features/chat/context/ChatDialogueContext'
import { RecordingProvider } from '@core/recording/RecordingContext'


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