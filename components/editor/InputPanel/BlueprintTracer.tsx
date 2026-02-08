import { useRef, useEffect, useState } from 'react';

interface Point {
  x: number;
  y: number;
}

interface BlueprintTracerProps {
  blueprintImage: string;
  onFootprintComplete: (footprint: Array<[number, number]>) => void;
}

export function BlueprintTracer({ blueprintImage, onFootprintComplete }: BlueprintTracerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [hoveredPoint, setHoveredPoint] = useState<Point | null>(null);
  const [scale, setScale] = useState(1);

  // Load and draw blueprint image
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // Set canvas size to match container while maintaining aspect ratio
      const maxWidth = 600;
      const maxHeight = 400;
      const imgAspect = img.width / img.height;

      let canvasWidth = maxWidth;
      let canvasHeight = maxWidth / imgAspect;

      if (canvasHeight > maxHeight) {
        canvasHeight = maxHeight;
        canvasWidth = maxHeight * imgAspect;
      }

      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      // Calculate scale factor for coordinate conversion
      setScale(img.width / canvasWidth);

      imageRef.current = img;
      drawCanvas();
    };
    img.src = blueprintImage;
  }, [blueprintImage]);

  // Redraw canvas when points change
  useEffect(() => {
    drawCanvas();
  }, [points, hoveredPoint]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and draw blueprint
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Draw traced polygon
    if (points.length > 0) {
      ctx.strokeStyle = '#10b981';
      ctx.fillStyle = 'rgba(16, 185, 129, 0.1)';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);

      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }

      // Draw line to hovered point or close polygon
      if (hoveredPoint) {
        ctx.lineTo(hoveredPoint.x, hoveredPoint.y);
      } else if (points.length > 2) {
        ctx.closePath();
        ctx.fill();
      }

      ctx.stroke();

      // Draw points
      points.forEach((point, index) => {
        ctx.fillStyle = index === 0 ? '#ef4444' : '#10b981';
        ctx.beginPath();
        ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
        ctx.fill();

        // Draw white border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicking near the first point to close polygon
    if (points.length > 2) {
      const firstPoint = points[0];
      const distance = Math.sqrt(
        Math.pow(x - firstPoint.x, 2) + Math.pow(y - firstPoint.y, 2)
      );

      if (distance < 12) {
        completeFootprint();
        return;
      }
    }

    // Add new point
    setPoints([...points, { x, y }]);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (points.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setHoveredPoint({ x, y });
  };

  const handleCanvasMouseLeave = () => {
    setHoveredPoint(null);
  };

  const completeFootprint = () => {
    if (points.length < 3) {
      alert('You need at least 3 points to create a building footprint');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Convert canvas coordinates to building coordinates
    // Center the footprint around (0, 0) and scale appropriately
    const centerX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
    const centerY = points.reduce((sum, p) => sum + p.y, 0) / points.length;

    // Scale to meters (assuming 1 pixel = 0.1 meters in real world)
    const metersPerPixel = 0.1 * scale;

    const footprint: Array<[number, number]> = points.map(p => [
      (p.x - centerX) * metersPerPixel,
      -(p.y - centerY) * metersPerPixel  // Flip Y for Three.js coordinate system
    ]);

    onFootprintComplete(footprint);
    setPoints([]);
    setHoveredPoint(null);
  };

  const handleReset = () => {
    setPoints([]);
    setHoveredPoint(null);
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-amber-300 rounded-xl overflow-hidden bg-gray-50 shadow-sm">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          onMouseMove={handleCanvasMouseMove}
          onMouseLeave={handleCanvasMouseLeave}
          className="cursor-crosshair w-full"
          style={{ display: 'block' }}
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={completeFootprint}
          disabled={points.length < 3}
          className="flex-1 px-5 py-2.5 rounded-full font-medium text-sm border-2 bg-gray-100 border-emerald-400/60 text-emerald-700 hover:bg-emerald-500 hover:border-emerald-400 hover:text-white hover:shadow-[0_8px_25px_-5px_rgba(16,185,129,0.35)] hover:-translate-y-0.5 active:translate-y-0 disabled:bg-gray-100 disabled:border-gray-300 disabled:text-gray-500 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none transition-all duration-200 ease-out"
        >
          Complete Building ({points.length} points)
        </button>
        <button
          onClick={handleReset}
          disabled={points.length === 0}
          className="px-5 py-2.5 rounded-full font-medium text-sm border-2 bg-gray-100 border-gray-400/60 text-gray-700 hover:bg-gray-500 hover:border-gray-400 hover:text-white hover:shadow-[0_8px_25px_-5px_rgba(107,114,128,0.35)] hover:-translate-y-0.5 active:translate-y-0 disabled:bg-gray-100 disabled:border-gray-300 disabled:text-gray-500 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none transition-all duration-200 ease-out"
        >
          Reset
        </button>
      </div>

      <div className="text-sm text-gray-700 bg-white border-2 border-gray-200 rounded-lg p-4 space-y-2 shadow-sm">
        <p className="flex items-start gap-2">
          <span className="text-amber-600 font-bold">•</span>
          <span>Click to add corners of the building</span>
        </p>
        <p className="flex items-start gap-2">
          <span className="text-amber-600 font-bold">•</span>
          <span>Click the first point (red) or press "Complete" when done</span>
        </p>
        <p className="flex items-start gap-2">
          <span className="text-amber-600 font-bold">•</span>
          <span>Need at least 3 points to create a building</span>
        </p>
      </div>
    </div>
  );
}
