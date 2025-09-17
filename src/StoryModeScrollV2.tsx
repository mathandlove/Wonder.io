import React, { useState, useEffect } from 'react';
import SnapScroll from './components/SnapScroll';

interface FlowItem {
  side?: 'left' | 'right';
  text?: string;
  waiting?: boolean;
  quest?: string;
  input?: string;
}

interface StoryContentItem {
  type: string;
  text?: string;
  speaker?: string;
  background?: string;
  'left-character'?: string;
  'right-character'?: string;
  leftCharacter?: string;
  rightCharacter?: string;
  showWaitingBubble?: boolean;
  image?: string;
  flow?: FlowItem[];
  lvl1?: string;
  lvl2?: string;
  author?: string;
}

const StoryModeScrollV2: React.FC = () => {
  const [storyContent, setStoryContent] = useState<StoryContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load story content from JSON and flatten flow items
  useEffect(() => {
    fetch('/stories/gingerbread.bundle/story.json')
      .then(response => response.json())
      .then(data => {
        const scenes = data.scenes || [];
        const flattenedContent: StoryContentItem[] = [];

        scenes.forEach((scene: any) => {
          if (scene.type === 'character-flow' && scene.flow) {
            // Flatten character-flow into individual scenes
            scene.flow.forEach((flowItem: any) => {
              if (flowItem.waiting) {
                // Waiting state gets its own scene
                flattenedContent.push({
                  type: 'waiting',
                  background: scene.background,
                  'left-character': scene['left-character'],
                  'right-character': scene['right-character']
                });
              } else if (flowItem.quest) {
                // Quest item gets its own scene
                flattenedContent.push({
                  type: 'quest',
                  text: flowItem.text,
                  background: scene.background,
                  'left-character': scene['left-character'],
                  'right-character': scene['right-character']
                });
              } else if (flowItem.input) {
                // Input prompt gets its own scene
                flattenedContent.push({
                  type: 'input',
                  text: flowItem.input,
                  background: scene.background,
                  'left-character': scene['left-character'],
                  'right-character': scene['right-character']
                });
              } else if (flowItem.text) {
                // Regular dialog gets its own scene
                flattenedContent.push({
                  type: 'character',
                  text: flowItem.text,
                  speaker: flowItem.side,
                  background: scene.background,
                  'left-character': scene['left-character'],
                  'right-character': scene['right-character']
                });
              }
            });
          } else {
            // Keep other scene types as-is
            flattenedContent.push(scene);
          }
        });

        console.log('📚 Loaded and flattened story with', flattenedContent.length, 'total scenes');
        setStoryContent(flattenedContent);
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Error loading story:', error);
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return (
      <div style={{ height: '100vh', width: '100vw', backgroundColor: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <h2>Loading story...</h2>
      </div>
    );
  }

  if (storyContent.length === 0) {
    return (
      <div style={{ height: '100vh', width: '100vw', backgroundColor: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <h2>No story content found</h2>
      </div>
    );
  }

  return <SnapScroll storyContent={storyContent} />;
};

export default StoryModeScrollV2;