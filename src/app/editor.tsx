/**
 * Hotspot Image Editor Entry Point
 *
 * This is a separate application for annotating images with hotspot regions.
 * Used to mark clues, points of interest, or interactive areas on story images.
 */
import ReactDOM from 'react-dom/client'
import EditorApp from '../pages/EditorApp'
import './global.css'

ReactDOM.createRoot(document.getElementById('editor-root')!).render(
  <EditorApp />
)
