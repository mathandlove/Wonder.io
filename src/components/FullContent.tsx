import React from 'react';

interface FullContentProps {
  title?: string;
  text: string;
}

const FullContent: React.FC<FullContentProps> = ({ title, text }) => {
  return (
    <div className="story-full-content">
      {title && <h2>{title}</h2>}
      <p>{text}</p>
    </div>
  );
};

export default FullContent;