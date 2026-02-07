import { BuildingId } from '@/lib/editor/types/buildingSpec';

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
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-gray-800 mb-4">Position</h3>

        <div className="space-y-4">
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              X Position: <span className="text-amber-600">{position.x.toFixed(1)}m</span>
            </label>
            <input
              type="range"
              min="-100"
              max="100"
              step="0.5"
              value={position.x}
              onChange={(e) => onPositionChange({ x: parseFloat(e.target.value) })}
              className="w-full h-2.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-amber-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-500 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-amber-400 [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(245,158,11,0.5)] [&::-webkit-slider-thumb]:transition-all"
            />
            <input
              type="number"
              min="-100"
              max="100"
              step="0.5"
              value={position.x}
              onChange={(e) => onPositionChange({ x: parseFloat(e.target.value) })}
              className="mt-2 w-full px-4 py-2.5 border-2 border-gray-300 rounded-full text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:shadow-[0_0_15px_rgba(245,158,11,0.2)] transition-all duration-200"
            />
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Z Position: <span className="text-amber-600">{position.z.toFixed(1)}m</span>
            </label>
            <input
              type="range"
              min="-100"
              max="100"
              step="0.5"
              value={position.z}
              onChange={(e) => onPositionChange({ z: parseFloat(e.target.value) })}
              className="w-full h-2.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-amber-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-500 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-amber-400 [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(245,158,11,0.5)] [&::-webkit-slider-thumb]:transition-all"
            />
            <input
              type="number"
              min="-100"
              max="100"
              step="0.5"
              value={position.z}
              onChange={(e) => onPositionChange({ z: parseFloat(e.target.value) })}
              className="mt-2 w-full px-4 py-2.5 border-2 border-gray-300 rounded-full text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:shadow-[0_0_15px_rgba(245,158,11,0.2)] transition-all duration-200"
            />
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
            onChange={(e) => onRotationChange(parseFloat(e.target.value))}
            className="w-full h-2.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-amber-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-500 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-amber-400 [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(245,158,11,0.5)] [&::-webkit-slider-thumb]:transition-all"
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
              className="flex-1 px-3 py-2 rounded-full text-xs font-medium border-2 bg-gray-100 border-amber-400/60 text-amber-700 hover:bg-amber-500 hover:border-amber-400 hover:text-white hover:shadow-[0_4px_15px_-3px_rgba(245,158,11,0.5)] transition-all duration-200 ease-out"
            >
              0°
            </button>
            <button
              onClick={() => onRotationChange(Math.PI / 2)}
              className="flex-1 px-3 py-2 rounded-full text-xs font-medium border-2 bg-gray-100 border-amber-400/60 text-amber-700 hover:bg-amber-500 hover:border-amber-400 hover:text-white hover:shadow-[0_4px_15px_-3px_rgba(245,158,11,0.5)] transition-all duration-200 ease-out"
            >
              90°
            </button>
            <button
              onClick={() => onRotationChange(Math.PI)}
              className="flex-1 px-3 py-2 rounded-full text-xs font-medium border-2 bg-gray-100 border-amber-400/60 text-amber-700 hover:bg-amber-500 hover:border-amber-400 hover:text-white hover:shadow-[0_4px_15px_-3px_rgba(245,158,11,0.5)] transition-all duration-200 ease-out"
            >
              180°
            </button>
            <button
              onClick={() => onRotationChange(3 * Math.PI / 2)}
              className="flex-1 px-3 py-2 rounded-full text-xs font-medium border-2 bg-gray-100 border-amber-400/60 text-amber-700 hover:bg-amber-500 hover:border-amber-400 hover:text-white hover:shadow-[0_4px_15px_-3px_rgba(245,158,11,0.5)] transition-all duration-200 ease-out"
            >
              270°
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
