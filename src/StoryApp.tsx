import React from 'react';
import StoryEngine from './components/StoryEngine';

const StoryApp: React.FC = () => {
  return (
    <div className="story-app">
      <StoryEngine storyPath="/stories/gingerbread.bundle/story.json" />
    </div>
  );
};

export default StoryApp;