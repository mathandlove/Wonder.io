import React, { useState, useEffect } from 'react';
import App from './App';
import StoryApp from './StoryApp';
import ModeNav from './components/ModeNav';

type AppMode = 'map' | 'story';

const AppContainer: React.FC = () => {
  const [mode, setMode] = useState<AppMode>('map');

  // Initialize mode from URL parameter or localStorage
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlMode = urlParams.get('mode') as AppMode;
    const savedMode = localStorage.getItem('app-mode') as AppMode;
    
    const initialMode = urlMode || savedMode || 'map';
    setMode(initialMode);
  }, []);

  const handleModeChange = (newMode: AppMode) => {
    setMode(newMode);
    localStorage.setItem('app-mode', newMode);
    
    // Update URL without page refresh
    const url = new URL(window.location.href);
    url.searchParams.set('mode', newMode);
    window.history.replaceState({}, '', url.toString());
  };

  return (
    <div className="app-container">
      
      <ModeNav currentMode={mode} onModeChange={handleModeChange} />
      
      {mode === 'story' ? <StoryApp /> : <App />}
    </div>
  );
};

export default AppContainer;