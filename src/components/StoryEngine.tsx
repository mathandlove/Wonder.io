import React, { useState, useEffect } from 'react';
import TitleScene from './TitleScene';
import TextScene from './TextScene';
import LeoFlowbar from './LeoFlowbar';
import './StoryEngine.css';

interface FlowItem {
  kind: string;
  text?: string;
  src?: string;
  alt?: string;
  prompt?: string;
  choices?: string[];
}

interface StoryScene {
  id?: string;
  type: string;
  text?: string | Record<string, string>;
  author?: string;
  character?: string;
  flow?: FlowItem[];
  // Additional scene properties can be added here as needed
}

interface Story {
  title: string;
  storyId: string;
  scenes: StoryScene[];
}

interface StoryEngineProps {
  storyPath: string;
}

const StoryEngine: React.FC<StoryEngineProps> = ({ storyPath }) => {
  const [story, setStory] = useState<Story | null>(null);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load story data
  useEffect(() => {
    const loadStory = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(storyPath);
        if (!response.ok) {
          throw new Error(`Failed to load story: ${response.statusText}`);
        }
        
        const storyData: Story = await response.json();
        
        // Keep scenes as-is, no processing needed
        const processedScenes = storyData.scenes;
        
        setStory({ ...storyData, scenes: processedScenes });
        setCurrentSceneIndex(0);
        
      } catch (err) {
        console.error('Error loading story:', err);
        setError(err instanceof Error ? err.message : 'Failed to load story');
      } finally {
        setLoading(false);
      }
    };

    loadStory();
  }, [storyPath]);

  const handleSceneComplete = () => {
    if (story && currentSceneIndex < story.scenes.length - 1) {
      setCurrentSceneIndex(prev => prev + 1);
    } else {
      console.log('Story complete!');
      // Could emit an event or call a callback here
    }
  };

  const renderScene = (scene: StoryScene) => {
    switch (scene.type) {
      case 'title':
        return (
          <TitleScene
            key={scene.id}
            text={scene.text || ''}
            author={scene.author}
            onComplete={handleSceneComplete}
          />
        );
      
      case 'text':
        return (
          <TextScene
            key={scene.id}
            text={typeof scene.text === 'string' ? scene.text : ''}
            character={scene.character}
            storyPath={storyPath}
            onComplete={handleSceneComplete}
          />
        );
      
      case 'blank':
        return (
          <div 
            key={scene.id}
            className="h-screen bg-gray-50"
          >
            {/* Empty space for debugging */}
          </div>
        );

      case 'character-flow':
        return (
          <LeoFlowbar
            key={scene.id}
            character={scene.character}
            flow={scene.flow || []}
            storyPath={storyPath}
            onComplete={handleSceneComplete}
          />
        );
      
      default:
        return (
          <div 
            key={scene.id}
            className="min-h-screen flex items-center justify-center bg-gray-100"
            onClick={handleSceneComplete}
          >
            <div className="text-center p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Scene Type: {scene.type}
              </h2>
              <p className="text-gray-600">
                {scene.text || 'Scene content would be rendered here'}
              </p>
              <p className="text-sm text-gray-500 mt-4">
                Tap to continue
              </p>
            </div>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-amber-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-900 mx-auto mb-4"></div>
          <p className="text-amber-800 text-lg">Loading story...</p>
        </div>
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center p-8">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-red-800 mb-2">Error Loading Story</h2>
          <p className="text-red-600">{error || 'Unknown error occurred'}</p>
        </div>
      </div>
    );
  }

  const currentScene = story.scenes[currentSceneIndex];
  if (!currentScene) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-green-50">
        <div className="text-center p-8">
          <div className="text-green-600 text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-green-800 mb-2">Story Complete!</h2>
          <p className="text-green-600">You have reached the end of "{story.title}"</p>
        </div>
      </div>
    );
  }

  return (
    <div className="story-engine">
      {/* Story progress indicator */}
      <div className="fixed top-4 right-4 z-50 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg">
        <span className="text-sm font-medium text-gray-700">
          {currentSceneIndex + 1} / {story.scenes.length}
        </span>
      </div>

      {/* Render all scenes for scrolling webtoon effect */}
      <div className="story-container">
        {story.scenes.map((scene, index) => (
          <div key={`${scene.id}-${index}`}>
            {renderScene(scene)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default StoryEngine;