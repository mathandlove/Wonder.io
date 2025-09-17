import React from 'react';
import './SnapScroll.css';

interface FlowItem {
  side?: 'left' | 'right';
  text?: string;
  waiting?: boolean;
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

interface SnapScrollProps {
  storyContent: StoryContentItem[];
}

const SnapScroll: React.FC<SnapScrollProps> = ({ storyContent }) => {
  // Flatten flow items into individual scenes
  const flattenedScenes: Array<{
    sceneIndex: number;
    flowIndex?: number;
    scene: StoryContentItem;
    flowItem?: FlowItem;
    isFlowItem: boolean;
  }> = [];

  storyContent.forEach((scene, sceneIndex) => {
    if (scene.flow && scene.flow.length > 0) {
      // Add each flow item as a separate scene
      scene.flow.forEach((flowItem, flowIndex) => {
        flattenedScenes.push({
          sceneIndex,
          flowIndex,
          scene,
          flowItem,
          isFlowItem: true
        });
      });
    } else {
      // Regular scene without flow
      flattenedScenes.push({
        sceneIndex,
        scene,
        isFlowItem: false
      });
    }
  });

  return (
    <div className="snap-scroll-container">
      {flattenedScenes.map((item, index) => (
        <div key={index} className="snap-scroll-section">
          <div className="snap-scroll-content">
            <h2>
              Scene {item.sceneIndex + 1}
              {item.isFlowItem && ` - Flow ${(item.flowIndex || 0) + 1}`}
            </h2>

            <p><strong>Type:</strong> {item.scene.type}</p>

            {item.scene.background && (
              <p><strong>Background:</strong> {item.scene.background}</p>
            )}

            {item.scene.image && (
              <p><strong>Image:</strong> {item.scene.image}</p>
            )}

            {(item.scene['left-character'] || item.scene.leftCharacter) && (
              <p><strong>Left Character:</strong> {item.scene['left-character'] || item.scene.leftCharacter}</p>
            )}

            {(item.scene['right-character'] || item.scene.rightCharacter) && (
              <p><strong>Right Character:</strong> {item.scene['right-character'] || item.scene.rightCharacter}</p>
            )}

            {item.isFlowItem && item.flowItem && (
              <>
                {item.flowItem.waiting ? (
                  <div className="waiting-state">
                    <p><strong>⏳ WAITING STATE</strong></p>
                    <p>User interaction required</p>
                  </div>
                ) : (
                  <>
                    {item.flowItem.side && (
                      <p><strong>Speaker Side:</strong> {item.flowItem.side}</p>
                    )}
                    {item.flowItem.text && (
                      <p><strong>Text:</strong> {item.flowItem.text}</p>
                    )}
                  </>
                )}
              </>
            )}

            {!item.isFlowItem && (
              <>
                {item.scene.speaker && <p><strong>Speaker:</strong> {item.scene.speaker}</p>}
                {item.scene.text && <p><strong>Text:</strong> {item.scene.text}</p>}
                {item.scene.lvl1 && <p><strong>Title Level 1:</strong> {item.scene.lvl1}</p>}
                {item.scene.lvl2 && <p><strong>Title Level 2:</strong> {item.scene.lvl2}</p>}
                {item.scene.author && <p><strong>Author:</strong> {item.scene.author}</p>}
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default SnapScroll;