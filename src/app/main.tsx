/**
 * Application entry point that renders the main story component.
 */
import ReactDOM from 'react-dom/client'
import StoryModeScroll from '../pages/StoryModeScroll'
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
            <StoryModeScroll />
          </ChatDialogueProvider>
        </RecordingProvider>
      </DialogueProvider>
    </NavigationProvider>
  // </React.StrictMode>,
)