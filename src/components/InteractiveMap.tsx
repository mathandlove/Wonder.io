import React, { useState, useRef, useEffect } from 'react';
import LassoSelection from './LassoSelection';
import LayeredMapImage from './LayeredMapImage';

interface Hotspot {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  description: string;
}

interface InteractiveMapProps {
  mapImage: string;
  mapAlt: string;
  hotspots: Hotspot[];
  coloredMapImage?: string;
  activeTool?: string | null;
  onHotspotCreated?: (hotspot: any) => void;
  onHotspotHover?: (hotspotId: string | null) => void;
  hoveredHotspot?: string | null;
}

const InteractiveMap: React.FC<InteractiveMapProps> = ({ 
  mapImage, 
  mapAlt, 
  hotspots, 
  coloredMapImage = '/cityMapColored.png',
  activeTool,
  onHotspotCreated,
  onHotspotHover,
  hoveredHotspot
}) => {
  const [hotspotStates, setHotspotStates] = useState<Map<string, 'none' | 'colored' | 'glimmer'>>(new Map());
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateDimensions = () => {
      if (imgRef.current) {
        setImageDimensions({
          width: imgRef.current.offsetWidth,
          height: imgRef.current.offsetHeight
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const handleHotspotClick = (hotspot: Hotspot) => {
    setHotspotStates(prev => {
      const newMap = new Map(prev);
      const currentState = newMap.get(hotspot.id) || 'none';
      
      // Cycle through states: none → colored → glimmer → none
      let nextState: 'none' | 'colored' | 'glimmer';
      switch (currentState) {
        case 'none':
          nextState = 'colored';
          break;
        case 'colored':
          nextState = 'glimmer';
          break;
        case 'glimmer':
          nextState = 'none';
          break;
        default:
          nextState = 'colored';
      }
      
      console.log(`Hotspot ${hotspot.id}: ${currentState} → ${nextState}`);
      newMap.set(hotspot.id, nextState);
      
      return newMap;
    });
  };

  const handleKeyDown = (event: React.KeyboardEvent, hotspot: Hotspot) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleHotspotClick(hotspot);
    }
  };

  const handleLassoComplete = (points: { x: number; y: number }[]) => {
    console.log('Lasso selection completed with points:', points);
    // Here you can add logic to determine what's inside the selection
  };


  return (
    <div className={`w-full h-full flex items-center justify-center ${activeTool === 'lasso' ? 'cursor-crosshair' : ''}`}>
      <div ref={containerRef} className="relative inline-block">
        
        {/* Layered map images */}
        <LayeredMapImage
          whiteMapImage={mapImage}
          coloredMapImage={coloredMapImage}
          outlineMapImage="/cityMap-outline.png"
          mapAlt={mapAlt}
          onLoad={(dimensions) => {
            setImageDimensions(dimensions);
          }}
        />
        
        
        {/* Overlay sections - colored and glimmer */}
        {hotspots.map((hotspot) => {
          const state = hotspotStates.get(hotspot.id) || 'none';
          
          if (state !== 'none') {
            console.log(`Rendering hotspot ${hotspot.id} in ${state} state`);
          }
          
          // Always render hotspots regardless of state
          // if (state === 'none') return null;
          
          // Create clipPath from lasso points if available, otherwise fallback to rectangle
          let clipPathValue = '';
          if (hotspot.points && hotspot.points.length > 0 && containerRef.current) {
            // Convert pixel coordinates to percentages for clipPath using container dimensions
            const containerWidth = containerRef.current.offsetWidth;
            const containerHeight = containerRef.current.offsetHeight;
            const polygonPoints = hotspot.points.map(point => 
              `${(point.x / containerWidth) * 100}% ${(point.y / containerHeight) * 100}%`
            ).join(', ');
            clipPathValue = `polygon(${polygonPoints})`;
          } else {
            // Fallback to rectangle if no points available
            clipPathValue = `polygon(${hotspot.x}% ${hotspot.y}%, ${hotspot.x + hotspot.width}% ${hotspot.y}%, ${hotspot.x + hotspot.width}% ${hotspot.y + hotspot.height}%, ${hotspot.x}% ${hotspot.y + hotspot.height}%)`;
          }
          
          return (
            <div
              key={`overlay-${hotspot.id}`}
              className="absolute pointer-events-none"
              style={{
                left: `0px`,
                top: `0px`,
                width: `${imageDimensions.width}px`,
                height: `${imageDimensions.height}px`,
                zIndex: 10,
                clipPath: clipPathValue,
              }}
            >
              {state === 'colored' && (
                <img 
                  src={coloredMapImage}
                  alt=""
                  className="absolute"
                  draggable={false}
                  style={{
                    left: `0px`,
                    top: `0px`,
                    width: `${imageDimensions.width}px`,
                    height: `${imageDimensions.height}px`,
                    objectFit: 'contain',
                  }}
                />
              )}
              {state === 'glimmer' && (
                <div
                  className="absolute"
                  style={{
                    left: `0px`,
                    top: `0px`,
                    width: `${imageDimensions.width}px`,
                    height: `${imageDimensions.height}px`,
                    background: `linear-gradient(25deg, transparent 0%, transparent 37.5%, gold 50%, transparent 62.5%, transparent 100%)`,
                    backgroundSize: '300% 300%',
                    animation: 'diagonal-sweep 3s ease-in-out infinite',
                  }}
                />
              )}
            </div>
          );
        })}

        {/* Config Highlights - Show hotspot outlines when config tool is active */}
        {(activeTool === 'config-highlights' || activeTool === 'lasso') && imageDimensions.width > 0 && (
          <svg
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: imageDimensions.width,
              height: imageDimensions.height,
              zIndex: 50,
              pointerEvents: 'auto'
            }}
          >
            {hotspots.map((hotspot) => {
              if (!hotspot.points || hotspot.points.length === 0) return null;
              
              const pathData = hotspot.points.map((point, index) => 
                `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
              ).join(' ') + ' Z';
              
              const isHovered = hoveredHotspot === hotspot.id;
              
              return (
                <path
                  key={hotspot.id}
                  d={pathData}
                  fill={isHovered ? "rgba(34, 197, 94, 0.2)" : "rgba(59, 130, 246, 0.2)"}
                  stroke={isHovered ? "#22c55e" : "#3b82f6"}
                  strokeWidth="2"
                  strokeDasharray="5,5"
                  opacity="0.8"
                  style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                  onMouseEnter={(e) => {
                    e.stopPropagation();
                    onHotspotHover?.(hotspot.id);
                  }}
                  onMouseLeave={(e) => {
                    e.stopPropagation();
                    onHotspotHover?.(null);
                  }}
                />
              );
            })}
          </svg>
        )}

        {/* Lasso Selection Tool - positioned on top layer - only active when explicitly requested */}
        {activeTool === 'lasso' && (
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 100, pointerEvents: 'auto' }}>
            <LassoSelection
              isActive={true}
              containerRef={containerRef}
              onSelectionComplete={handleLassoComplete}
              onHotspotCreated={onHotspotCreated}
              hotspots={hotspots}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default InteractiveMap;