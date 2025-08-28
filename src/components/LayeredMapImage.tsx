import React, { useState, useRef, useEffect } from 'react';

interface LayeredMapImageProps {
  whiteMapImage?: string;
  coloredMapImage?: string;
  outlineMapImage?: string;
  mapAlt: string;
  className?: string;
  style?: React.CSSProperties;
  onLoad?: (dimensions: { width: number; height: number }) => void;
}

const LayeredMapImage: React.FC<LayeredMapImageProps> = ({
  whiteMapImage = '/cityMap.png',
  coloredMapImage = '/cityMapColored.png', 
  outlineMapImage = '/cityMap-outline.png',
  mapAlt,
  className = '',
  style = {},
  onLoad
}) => {
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const baseImageRef = useRef<HTMLImageElement>(null);

  const handleBaseImageLoad = () => {
    if (baseImageRef.current) {
      const dimensions = {
        width: baseImageRef.current.offsetWidth,
        height: baseImageRef.current.offsetHeight
      };
      setImageDimensions(dimensions);
      if (onLoad) {
        onLoad(dimensions);
      }
    }
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block', maxHeight: '100vh', maxWidth: '100%' }}>
      {/* Layer 1: Colored image as base */}
      <img
        ref={baseImageRef}
        src={coloredMapImage}
        alt={mapAlt}
        className={className}
        style={{
          ...style,
          display: 'block',
          maxWidth: '100%',
          maxHeight: '100vh',
          height: 'auto',
          width: 'auto',
          objectFit: 'contain'
        }}
        onLoad={handleBaseImageLoad}
        draggable={false}
      />
      
      {/* Layer 2: Pure white overlay */}
      {imageDimensions.width > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'white',
            pointerEvents: 'none',
            zIndex: 1
          }}
        />
      )}
      
      {/* Layer 3: Outline image (top layer) - positioned absolutely over base */}
      {imageDimensions.width > 0 && (
        <img
          src={outlineMapImage}
          alt=""
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            objectPosition: 'center',
            pointerEvents: 'none',
            zIndex: 2
          }}
          draggable={false}
        />
      )}
    </div>
  );
};

export default LayeredMapImage;