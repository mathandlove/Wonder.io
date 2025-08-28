import React from 'react';

interface StoryPanelProps {
  title: string;
  content: string;
  isVisible: boolean;
}

const StoryPanel: React.FC<StoryPanelProps> = ({ title, content, isVisible }) => {
  if (!isVisible) return null;

  return (
    <div 
      className="m-4 p-4 bg-gray-700 rounded-lg shadow-md flex-1 overflow-y-auto"
      role="region"
      aria-label="Story content"
      aria-live="polite"
      aria-atomic="true"
    >
      <h2 className="text-lg font-bold mb-2 text-white">
        {title}
      </h2>
      <p className="text-sm text-gray-300 leading-relaxed">
        {content}
      </p>
    </div>
  );
};

export default StoryPanel;