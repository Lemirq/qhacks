import { BuildingId } from '@/lib/editor/types/buildingSpec';
import { useBuildingSound } from '@/lib/editor/hooks/useBuildingSound';

interface TransformFormProps {
  buildingId: BuildingId;
  position: { x: number; y: number; z: number };
  rotation: number;
  onPositionChange: (position: { x?: number; z?: number }) => void;
  onRotationChange: (rotation: number) => void;
}

export function TransformForm({
  position,
  rotation,
  onPositionChange,
  onRotationChange,
}: TransformFormProps) {
  const { play: playSound } = useBuildingSound();

  const handlePositionChange = (pos: { x?: number; z?: number }) => {
    onPositionChange(pos);
    playSound('move_object');
  };

  const handleRotationChange = (rot: number) => {
    onRotationChange(rot);
    playSound('rotate_object');
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-gray-800 mb-4">Position</h3>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">
              X Position: <span className="text-amber-600">{position.x.toFixed(1)}m</span>
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="-100"
                max="100"
                step="0.5"
                value={position.x}
                onChange={(e) => handlePositionChange({ x: parseFloat(e.target.value) })}
                className="flex-4 h-4 bg-gray-200 rounded-full appearance-none cursor-pointer accent-amber-400 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-12 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-400 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-amber-300 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing"
              />
              <input
                type="number"
                min="-100"
                max="100"
                step="0.5"
                value={position.x}
                onChange={(e) => handlePositionChange({ x: parseFloat(e.target.value) })}
                className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg text-sm text-center focus:border-amber-400 focus:outline-none transition-colors duration-200"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">
              Z Position: <span className="text-amber-600">{position.z.toFixed(1)}m</span>
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="-100"
                max="100"
                step="0.5"
                value={position.z}
                onChange={(e) => handlePositionChange({ z: parseFloat(e.target.value) })}
                className="flex-4 h-4 bg-gray-200 rounded-full appearance-none cursor-pointer accent-amber-400 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-12 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-400 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-amber-300 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing"
              />
              <input
                type="number"
                min="-100"
                max="100"
                step="0.5"
                value={position.z}
                onChange={(e) => handlePositionChange({ z: parseFloat(e.target.value) })}
                className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg text-sm text-center focus:border-amber-400 focus:outline-none transition-colors duration-200"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="pt-6 border-t-2 border-gray-200">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Rotation</h3>

        <div className="space-y-3">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Horizontal Rotation: <span className="text-amber-600">{Math.round(rotation * (180 / Math.PI))}°</span>
          </label>
          <input
            type="range"
            min="0"
            max={2 * Math.PI}
            step={Math.PI / 36}
            value={rotation}
            onChange={(e) => handleRotationChange(parseFloat(e.target.value))}
            className="w-full h-4 bg-gray-200 rounded-full appearance-none cursor-pointer accent-amber-400 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-12 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-400 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-amber-300 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing"
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
              onClick={() => handleRotationChange(0)}
              className="flex-1 px-3 py-2 rounded-full text-xs font-medium border-2 bg-amber-200 border-amber-300 text-amber-700 hover:bg-amber-300 hover:border-amber-400 transition-colors duration-200"
            >
              0°
            </button>
            <button
              onClick={() => handleRotationChange(Math.PI / 2)}
              className="flex-1 px-3 py-2 rounded-full text-xs font-medium border-2 bg-amber-200 border-amber-300 text-amber-700 hover:bg-amber-300 hover:border-amber-400 transition-colors duration-200"
            >
              90°
            </button>
            <button
              onClick={() => handleRotationChange(Math.PI)}
              className="flex-1 px-3 py-2 rounded-full text-xs font-medium border-2 bg-amber-200 border-amber-300 text-amber-700 hover:bg-amber-300 hover:border-amber-400 transition-colors duration-200"
            >
              180°
            </button>
            <button
              onClick={() => handleRotationChange(3 * Math.PI / 2)}
              className="flex-1 px-3 py-2 rounded-full text-xs font-medium border-2 bg-amber-200 border-amber-300 text-amber-700 hover:bg-amber-300 hover:border-amber-400 transition-colors duration-200"
            >
              270°
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
