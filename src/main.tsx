/**
 * Application entry point that renders the main story component.
 */
import React from 'react'
import ReactDOM from 'react-dom/client'
import StoryModeScrollV2 from './StoryModeScrollV2'
import { DialogueProvider } from "./context/DialogueContext"
import { NavigationProvider } from "./context/NavigationContext"


ReactDOM.createRoot(document.getElementById('root')!).render(
  // <React.StrictMode>
    <NavigationProvider initialIndex={0}>
      <DialogueProvider>
        <StoryModeScrollV2 />
      </DialogueProvider>
    </NavigationProvider>
  // </React.StrictMode>,
)