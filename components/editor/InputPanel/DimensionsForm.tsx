import { BuildingSpecification, BuildingId } from '@/lib/editor/types/buildingSpec';
import { useBuildings } from '@/lib/editor/contexts/BuildingsContext';
import { useCallback } from 'react';

interface DimensionsFormProps {
  spec: BuildingSpecification;
  onUpdate: (updates: Partial<BuildingSpecification>) => void;
  buildingId: BuildingId;
  rotation: number;
  onRotationChange: (rotation: number) => void;
}

export function DimensionsForm({ spec, onUpdate, buildingId, rotation, onRotationChange }: DimensionsFormProps) {
  const { buildings } = useBuildings();

  // Get current building
  const currentBuilding = buildings.find(b => b.id === buildingId);

  // Check if a dimension change would cause collision
  const getMaxDimension = useCallback((dimension: 'width' | 'depth'): number => {
    if (!currentBuilding) return 50;

    const currentX = currentBuilding.position.x;
    const currentY = currentBuilding.position.y;
    const currentZ = currentBuilding.position.z;
    const currentHeight = spec.floorHeight * spec.numberOfFloors;

    let maxAllowed = 50; // Default max

    for (const other of buildings) {
      if (other.id === buildingId) continue;

      const otherX = other.position.x;
      const otherY = other.position.y;
      const otherZ = other.position.z;
      const otherWidth = other.spec.width;
      const otherDepth = other.spec.depth;
      const otherHeight = other.spec.floorHeight * other.spec.numberOfFloors;

      // Check if buildings overlap vertically
      const verticalOverlap = !(currentY + currentHeight <= otherY || otherY + otherHeight <= currentY);
      if (!verticalOverlap) continue;

      if (dimension === 'width') {
        // Check Z overlap first
        const currentDepth = spec.depth;
        const zOverlap = !(currentZ + currentDepth / 2 <= otherZ - otherDepth / 2 ||
                          currentZ - currentDepth / 2 >= otherZ + otherDepth / 2);

        if (zOverlap) {
          // Calculate max width before collision
          const distX = Math.abs(currentX - otherX);
          const maxWidth = (distX - otherWidth / 2) * 2;
          if (maxWidth > 0 && maxWidth < maxAllowed) {
            maxAllowed = Math.max(5, maxWidth - 0.5); // Keep minimum of 5, subtract small buffer
          }
        }
      } else {
        // Check X overlap first
        const currentWidth = spec.width;
        const xOverlap = !(currentX + currentWidth / 2 <= otherX - otherWidth / 2 ||
                          currentX - currentWidth / 2 >= otherX + otherWidth / 2);

        if (xOverlap) {
          // Calculate max depth before collision
          const distZ = Math.abs(currentZ - otherZ);
          const maxDepth = (distZ - otherDepth / 2) * 2;
          if (maxDepth > 0 && maxDepth < maxAllowed) {
            maxAllowed = Math.max(5, maxDepth - 0.5); // Keep minimum of 5, subtract small buffer
          }
        }
      }
    }

    return maxAllowed;
  }, [buildings, buildingId, currentBuilding, spec.depth, spec.width, spec.floorHeight, spec.numberOfFloors]);

  // Check if there's a building stacked on top and calculate max height
  const getMaxHeight = useCallback((): { maxHeight: number; hasBuildingAbove: boolean } => {
    if (!currentBuilding) return { maxHeight: Infinity, hasBuildingAbove: false };

    const currentX = currentBuilding.position.x;
    const currentY = currentBuilding.position.y;
    const currentZ = currentBuilding.position.z;
    const currentWidth = spec.width;
    const currentDepth = spec.depth;

    let minBuildingAboveY = Infinity;

    for (const other of buildings) {
      if (other.id === buildingId) continue;

      const otherX = other.position.x;
      const otherY = other.position.y;
      const otherZ = other.position.z;
      const otherWidth = other.spec.width;
      const otherDepth = other.spec.depth;

      // Check if the other building is above this one (starts at or above current building's top)
      if (otherY <= currentY) continue;

      // Check if they overlap in XZ plane
      const xOverlap = !(currentX + currentWidth / 2 <= otherX - otherWidth / 2 ||
                        currentX - currentWidth / 2 >= otherX + otherWidth / 2);
      const zOverlap = !(currentZ + currentDepth / 2 <= otherZ - otherDepth / 2 ||
                        currentZ - currentDepth / 2 >= otherZ + otherDepth / 2);

      if (xOverlap && zOverlap && otherY < minBuildingAboveY) {
        minBuildingAboveY = otherY;
      }
    }

    const maxHeight = minBuildingAboveY - currentY;
    return { maxHeight, hasBuildingAbove: minBuildingAboveY !== Infinity };
  }, [buildings, buildingId, currentBuilding, spec.width, spec.depth]);

  const maxWidth = getMaxDimension('width');
  const maxDepth = getMaxDimension('depth');
  const { maxHeight, hasBuildingAbove } = getMaxHeight();

  // Calculate max floors based on current floor height
  const maxFloors = hasBuildingAbove ? Math.max(1, Math.floor(maxHeight / spec.floorHeight)) : 20;
  // Calculate max floor height based on current number of floors
  const maxFloorHeight = hasBuildingAbove ? Math.max(2.5, maxHeight / spec.numberOfFloors) : 6;

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-gray-800 mb-2">Dimensions</h3>

      <div className="space-y-3">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Width (meters): <span className="text-blue-600">{spec.width}</span>
          {maxWidth < 50 && <span className="text-orange-500 text-xs ml-2">(max: {maxWidth.toFixed(1)}m - collision limit)</span>}
        </label>
        <input
          type="range"
          min="5"
          max={maxWidth}
          step="0.5"
          value={Math.min(spec.width, maxWidth)}
          onChange={(e) => onUpdate({ width: parseFloat(e.target.value) })}
          className="w-full h-2.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-blue-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-400 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-all"
        />
        <input
          type="number"
          min="5"
          max={maxWidth}
          step="0.5"
          value={spec.width}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            onUpdate({ width: Math.min(val, maxWidth) });
          }}
          className="mt-2 w-full px-4 py-2.5 border-2 border-gray-300 rounded-full text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
        />
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Depth (meters): <span className="text-blue-600">{spec.depth}</span>
          {maxDepth < 50 && <span className="text-orange-500 text-xs ml-2">(max: {maxDepth.toFixed(1)}m - collision limit)</span>}
        </label>
        <input
          type="range"
          min="5"
          max={maxDepth}
          step="0.5"
          value={Math.min(spec.depth, maxDepth)}
          onChange={(e) => onUpdate({ depth: parseFloat(e.target.value) })}
          className="w-full h-2.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-blue-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-400 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-all"
        />
        <input
          type="number"
          min="5"
          max={maxDepth}
          step="0.5"
          value={spec.depth}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            onUpdate({ depth: Math.min(val, maxDepth) });
          }}
          className="mt-2 w-full px-4 py-2.5 border-2 border-gray-300 rounded-full text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
        />
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Number of Floors: <span className="text-blue-600">{spec.numberOfFloors}</span>
          {hasBuildingAbove && maxFloors < 20 && <span className="text-orange-500 text-xs ml-2">(max: {maxFloors} - building above)</span>}
        </label>
        <input
          type="range"
          min="1"
          max={maxFloors}
          step="1"
          value={Math.min(spec.numberOfFloors, maxFloors)}
          onChange={(e) => onUpdate({ numberOfFloors: parseInt(e.target.value) })}
          className="w-full h-2.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-blue-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-400 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-all"
        />
        <input
          type="number"
          min="1"
          max={maxFloors}
          step="1"
          value={spec.numberOfFloors}
          onChange={(e) => {
            const val = parseInt(e.target.value);
            onUpdate({ numberOfFloors: Math.min(val, maxFloors) });
          }}
          className="mt-2 w-full px-4 py-2.5 border-2 border-gray-300 rounded-full text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
        />
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Floor Height (meters): <span className="text-blue-600">{spec.floorHeight}</span>
          {hasBuildingAbove && maxFloorHeight < 6 && <span className="text-orange-500 text-xs ml-2">(max: {maxFloorHeight.toFixed(1)}m - building above)</span>}
        </label>
        <input
          type="range"
          min="2.5"
          max={maxFloorHeight}
          step="0.1"
          value={Math.min(spec.floorHeight, maxFloorHeight)}
          onChange={(e) => onUpdate({ floorHeight: parseFloat(e.target.value) })}
          className="w-full h-2.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-blue-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-400 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-all"
        />
        <input
          type="number"
          min="2.5"
          max={maxFloorHeight}
          step="0.1"
          value={spec.floorHeight}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            onUpdate({ floorHeight: Math.min(val, maxFloorHeight) });
          }}
          className="mt-2 w-full px-4 py-2.5 border-2 border-gray-300 rounded-full text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
        />
      </div>

      <div className="pt-6 mt-6 border-t-2 border-gray-200 space-y-6">
        <h3 className="text-xl font-bold text-gray-800 mb-2">Rotation</h3>

        <div className="space-y-3">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Horizontal Rotation: <span className="text-blue-600">{Math.round(rotation * (180 / Math.PI))}°</span>
          </label>
          <input
            type="range"
            min="0"
            max={2 * Math.PI}
            step={Math.PI / 36}
            value={rotation}
            onChange={(e) => onRotationChange(parseFloat(e.target.value))}
            className="w-full h-2.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-blue-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-400 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-all"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>0°</span>
            <span>90°</span>
            <span>180°</span>
            <span>270°</span>
            <span>360°</span>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => onRotationChange(0)}
              className="flex-1 px-3 py-2 rounded-full text-xs font-medium border-2 bg-gray-100 border-blue-400/60 text-blue-700 hover:bg-blue-500 hover:border-blue-400 hover:text-white transition-all duration-200 ease-out"
            >
              0°
            </button>
            <button
              onClick={() => onRotationChange(Math.PI / 2)}
              className="flex-1 px-3 py-2 rounded-full text-xs font-medium border-2 bg-gray-100 border-blue-400/60 text-blue-700 hover:bg-blue-500 hover:border-blue-400 hover:text-white transition-all duration-200 ease-out"
            >
              90°
            </button>
            <button
              onClick={() => onRotationChange(Math.PI)}
              className="flex-1 px-3 py-2 rounded-full text-xs font-medium border-2 bg-gray-100 border-blue-400/60 text-blue-700 hover:bg-blue-500 hover:border-blue-400 hover:text-white transition-all duration-200 ease-out"
            >
              180°
            </button>
            <button
              onClick={() => onRotationChange(3 * Math.PI / 2)}
              className="flex-1 px-3 py-2 rounded-full text-xs font-medium border-2 bg-gray-100 border-blue-400/60 text-blue-700 hover:bg-blue-500 hover:border-blue-400 hover:text-white transition-all duration-200 ease-out"
            >
              270°
            </button>
          </div>
        </div>
      </div>

      <div className="pt-4 mt-6 border-t-2 border-gray-200">
        <p className="text-base text-gray-700 bg-blue-50 px-4 py-3 rounded-lg">
          Total Height: <span className="font-bold text-blue-700">{(spec.numberOfFloors * spec.floorHeight).toFixed(1)}m</span>
        </p>
      </div>
    </div>
  );
}
