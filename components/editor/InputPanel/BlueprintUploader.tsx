import { useState } from 'react';
import { useBuildings } from '@/lib/editor/contexts/BuildingsContext';
import { BlueprintTracer } from './BlueprintTracer';
import { DEFAULT_BUILDING_SPEC } from '@/lib/editor/types/buildingSpec';

export function BlueprintUploader() {
  const { addBuilding } = useBuildings();
  const [blueprintImage, setBlueprintImage] = useState<string | null>(null);
  const [tracedBuildingsCount, setTracedBuildingsCount] = useState(0);

  const handleBlueprintUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setBlueprintImage(dataUrl);
        setTracedBuildingsCount(0);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFootprintComplete = (footprint: Array<[number, number]>) => {
    // Create a new building with the traced footprint
    // Position it at the center of the traced shape
    const centerX = footprint.reduce((sum, p) => sum + p[0], 0) / footprint.length;
    const centerZ = footprint.reduce((sum, p) => sum + p[1], 0) / footprint.length;

    // Offset footprint to be relative to building position (centered at origin)
    const relativeFootprint: Array<[number, number]> = footprint.map(p => [
      p[0] - centerX,
      p[1] - centerZ
    ]);

    // Create building with footprint at the calculated position
    addBuilding({ x: centerX, z: centerZ }, {
      footprint: relativeFootprint,
      blueprintImage: blueprintImage || undefined,
    });

    setTracedBuildingsCount(prev => prev + 1);
  };

  const clearBlueprint = () => {
    setBlueprintImage(null);
    setTracedBuildingsCount(0);
  };

  return (
    <div className="space-y-5">
      <h3 className="text-xl font-bold text-gray-800 mb-2">Blueprint Tracer</h3>

      <div>
        <label className="block">
          <span className="text-sm font-semibold text-gray-700 mb-3 block">
            Upload Floor Plan
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={handleBlueprintUpload}
            className="block w-full text-sm text-gray-600
              file:mr-4 file:py-3 file:px-5
              file:rounded-lg file:border-0
              file:text-sm file:font-semibold
              file:bg-green-600 file:text-white
              hover:file:bg-green-700 file:cursor-pointer
              file:transition-colors file:shadow-sm"
          />
        </label>
      </div>

      {blueprintImage && (
        <div className="space-y-4">
          <BlueprintTracer
            blueprintImage={blueprintImage}
            onFootprintComplete={handleFootprintComplete}
          />

          {tracedBuildingsCount > 0 && (
            <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4 shadow-sm">
              <p className="text-sm font-semibold text-green-800">
                ✓ {tracedBuildingsCount} building{tracedBuildingsCount > 1 ? 's' : ''} traced
              </p>
            </div>
          )}

          <button
            onClick={clearBlueprint}
            className="w-full px-4 py-3 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors shadow-sm"
          >
            Clear Blueprint
          </button>
        </div>
      )}

      {!blueprintImage && (
        <div className="text-sm text-gray-600 bg-white border-2 border-blue-200 p-4 rounded-lg shadow-sm">
          <p className="font-bold mb-3 text-blue-800">How to use:</p>
          <ul className="space-y-2 list-disc list-inside text-gray-700">
            <li>Upload a blueprint image</li>
            <li>Click to trace building outlines</li>
            <li>Each traced shape creates a new building</li>
          </ul>
        </div>
      )}
    </div>
  );
}
