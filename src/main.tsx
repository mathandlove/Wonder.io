/**
 * Application entry point that renders the main story component.
 */
import React from 'react'
import ReactDOM from 'react-dom/client'
import StoryModeScrollV2 from './StoryModeScrollV2'
import { DialogueProvider } from "./context/DialogueContext"
import { NavigationProvider } from "./context/NavigationContext"
import { ScrollGuardProvider } from "./context/ScrollGuardContext"
import { ChatDialogueProvider } from "./chat/ChatDialogueContext"


ReactDOM.createRoot(document.getElementById('root')!).render(
  // <React.StrictMode>
    <NavigationProvider initialIndex={3}>
      <DialogueProvider>
        <ScrollGuardProvider>
          <ChatDialogueProvider>
            <StoryModeScrollV2 />
          </ChatDialogueProvider>
        </ScrollGuardProvider>
      </DialogueProvider>
    </NavigationProvider>
  // </React.StrictMode>,
)