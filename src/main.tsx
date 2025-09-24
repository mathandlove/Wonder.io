/**
 * Application entry point that renders the main story component.
 */
import React from 'react'
import ReactDOM from 'react-dom/client'
import StoryModeScrollV2 from './StoryModeScrollV2'
import { DialogueProvider as OldDialogueProvider } from "./context/DialogueContext"
import { DialogueProvider as NewDialogueProvider } from "./dialogue/DialogueContext"
import { NavigationProvider } from "./context/NavigationContext"
import { ChatDialogueProvider } from "./chat/ChatDialogueContext"


ReactDOM.createRoot(document.getElementById('root')!).render(
  // <React.StrictMode>
    <NavigationProvider initialIndex={3}>
      <OldDialogueProvider>
        <NewDialogueProvider>
          <ChatDialogueProvider>
            <StoryModeScrollV2 />
          </ChatDialogueProvider>
        </NewDialogueProvider>
      </OldDialogueProvider>
    </NavigationProvider>
  // </React.StrictMode>,
)