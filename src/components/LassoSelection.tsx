import React, { useState, useEffect, useRef } from 'react';
import { selectionAPI } from '../services/api';

interface Point {
  x: number;
  y: number;
}

interface Selection {
  id: string;
  points: Point[];
  createdAt: string;
  mapId?: string;
}

interface Hotspot {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  description?: string;
  lassoSelectionId?: string;
  points?: Point[];
  createdAt: string;
  mapId?: string;
}

interface LassoSelectionProps {
  isActive: boolean;
  containerRef: React.RefObject<HTMLDivElement>;
  onSelectionComplete?: (points: Point[]) => void;
  onHotspotCreated?: (hotspot: any) => void;
  hotspots?: Hotspot[];
}

const LassoSelection: React.FC<LassoSelectionProps> = ({ 
  isActive, 
  containerRef,
  onSelectionComplete,
  onHotspotCreated,
  hotspots = []
}) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [points, setPoints] = useState<Point[]>([]);
  const [currentPoint, setCurrentPoint] = useState<Point | null>(null);
  const [error, setError] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const calculateBounds = (points: Point[]) => {
    if (points.length === 0) return { x: 0, y: 0, width: 10, height: 10 };
    
    const containerWidth = containerRef.current?.offsetWidth || 800;
    const containerHeight = containerRef.current?.offsetHeight || 600;
    
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    
    // Convert pixel coordinates to percentages
    const x = (minX / containerWidth) * 100;
    const y = (minY / containerHeight) * 100;
    const width = ((maxX - minX) / containerWidth) * 100;
    const height = ((maxY - minY) / containerHeight) * 100;
    
    return {
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
      width: Math.max(1, Math.min(100 - x, width)),
      height: Math.max(1, Math.min(100 - y, height))
    };
  };


  useEffect(() => {
    if (!isActive) {
      setIsDrawing(false);
      setPoints([]);
      setCurrentPoint(null);
    }
  }, [isActive]);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    
    const handleMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      const rect = container.getBoundingClientRect();
      const point = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
      console.log('Starting lasso at:', point);
      setIsDrawing(true);
      setPoints([point]);
      setCurrentPoint(point);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDrawing) return;
      
      const rect = container.getBoundingClientRect();
      const point = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
      
      setCurrentPoint(point);
      
      // Add point to path if moved enough distance
      if (points.length > 0) {
        const lastPoint = points[points.length - 1];
        const distance = Math.sqrt(
          Math.pow(point.x - lastPoint.x, 2) + 
          Math.pow(point.y - lastPoint.y, 2)
        );
        
        if (distance > 3) {
          setPoints(prev => [...prev, point]);
        }
      }
    };

    const handleMouseUp = async () => {
      console.log('Ending lasso with', points.length, 'points');
      if (isDrawing && points.length > 2) {
        const closedSelection = [...points, points[0]];
        
        try {
          // Save selection to backend
          const savedSelection = await selectionAPI.saveSelection(closedSelection);
          console.log('Selection saved with ID:', savedSelection.id);
          
          // Create a hotspot from the lasso selection
          if (onHotspotCreated && containerRef.current) {
            const bounds = calculateBounds(closedSelection);
            const hotspot = {
              id: `lasso-${savedSelection.id}`,
              x: bounds.x,
              y: bounds.y,
              width: bounds.width,
              height: bounds.height,
              label: `Selection ${savedSelection.id}`,
              description: `Lasso selection created on ${new Date().toLocaleDateString()}`,
              lassoSelectionId: savedSelection.id,
              points: closedSelection
            };
            onHotspotCreated(hotspot);
          }
          
          if (onSelectionComplete) {
            onSelectionComplete(closedSelection);
          }
        } catch (err) {
          console.error('Error saving selection:', err);
          setError('Failed to save selection');
        }
      }
      
      setIsDrawing(false);
      setPoints([]);
      setCurrentPoint(null);
    };

    container.addEventListener('mousedown', handleMouseDown, { passive: false });
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isActive, isDrawing, points, containerRef, onSelectionComplete]);

  const createPath = (pathPoints: Point[], isClosed: boolean = false) => {
    if (pathPoints.length < 2) return '';
    
    let path = `M ${pathPoints[0].x} ${pathPoints[0].y}`;
    for (let i = 1; i < pathPoints.length; i++) {
      path += ` L ${pathPoints[i].x} ${pathPoints[i].y}`;
    }
    
    if (isClosed) {
      path += ' Z';
    }
    
    return path;
  };

  if (!isActive) return null;

  return (
    <>
      {/* Status and error display */}
      {error && (
        <div className="absolute top-2 left-2 bg-black/80 text-white p-2 rounded text-xs z-50">
          <div className="text-red-300">⚠️ {error}</div>
        </div>
      )}
      
      {/* Hotspot count */}
      {hotspots.length > 0 && (
        <div className="absolute top-2 right-2 bg-green-600 text-white p-2 rounded text-xs z-50">
          {hotspots.length} hotspot{hotspots.length !== 1 ? 's' : ''}
        </div>
      )}
      
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full z-20 pointer-events-none"
        viewBox={`0 0 ${containerRef.current?.offsetWidth || 800} ${containerRef.current?.offsetHeight || 600}`}
      >
        {/* Hotspots with lasso paths */}
        {hotspots.filter(h => h.points && h.points.length > 0).map((hotspot) => (
          <g key={`hotspot-${hotspot.id}`}>
            <path
              d={createPath(hotspot.points!, true)}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2"
              strokeDasharray="5,5"
            />
            <path
              d={createPath(hotspot.points!, true)}
              fill="rgba(59, 130, 246, 0.1)"
              stroke="none"
            />
          </g>
        ))}
        
        {/* Current drawing path */}
        {isDrawing && points.length > 0 && (
          <>
            <path
              d={createPath(
                currentPoint ? [...points, currentPoint] : points,
                false
              )}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="3"
              strokeDasharray="8,4"
            />
            
            {/* Preview closing line */}
            {currentPoint && points.length > 2 && (
              <line
                x1={currentPoint.x}
                y1={currentPoint.y}
                x2={points[0].x}
                y2={points[0].y}
                stroke="rgba(59, 130, 246, 0.6)"
                strokeWidth="2"
                strokeDasharray="4,4"
              />
            )}
          </>
        )}
      </svg>
    </>
  );
};

export default LassoSelection;