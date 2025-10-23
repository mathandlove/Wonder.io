/**
 * Application entry point that renders the main story component.
 */
import ReactDOM from 'react-dom/client'
import StoryModeScroll from '../pages/StoryModeScroll'
import { DialogueProvider } from '@core/dialogue/DialogueContext'
import { ChatDialogueProvider } from '@features/chat/context/ChatDialogueContext'
import { RecordingProvider } from '@core/recording/RecordingContext'
import './global.css'


ReactDOM.createRoot(document.getElementById('root')!).render(
  // <React.StrictMode>
  <DialogueProvider>
    <RecordingProvider>
      <ChatDialogueProvider>
        <StoryModeScroll />
      </ChatDialogueProvider>
    </RecordingProvider>
  </DialogueProvider>
  // </React.StrictMode>,
)