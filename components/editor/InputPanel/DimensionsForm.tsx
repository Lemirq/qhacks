import { BuildingSpecification } from '@/lib/editor/types/buildingSpec';

interface DimensionsFormProps {
  spec: BuildingSpecification;
  onUpdate: (updates: Partial<BuildingSpecification>) => void;
}

export function DimensionsForm({ spec, onUpdate }: DimensionsFormProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-gray-800 mb-2">Dimensions</h3>

      <div className="space-y-3">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Width (meters): <span className="text-blue-600">{spec.width}</span>
        </label>
        <input
          type="range"
          min="5"
          max="50"
          step="0.5"
          value={spec.width}
          onChange={(e) => onUpdate({ width: parseFloat(e.target.value) })}
          className="w-full h-2.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-blue-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-400 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-all"
        />
        <input
          type="number"
          min="5"
          max="50"
          step="0.5"
          value={spec.width}
          onChange={(e) => onUpdate({ width: parseFloat(e.target.value) })}
          className="mt-2 w-full px-4 py-2.5 border-2 border-gray-300 rounded-full text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
        />
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Depth (meters): <span className="text-blue-600">{spec.depth}</span>
        </label>
        <input
          type="range"
          min="5"
          max="50"
          step="0.5"
          value={spec.depth}
          onChange={(e) => onUpdate({ depth: parseFloat(e.target.value) })}
          className="w-full h-2.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-blue-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-400 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-all"
        />
        <input
          type="number"
          min="5"
          max="50"
          step="0.5"
          value={spec.depth}
          onChange={(e) => onUpdate({ depth: parseFloat(e.target.value) })}
          className="mt-2 w-full px-4 py-2.5 border-2 border-gray-300 rounded-full text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
        />
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Number of Floors: <span className="text-blue-600">{spec.numberOfFloors}</span>
        </label>
        <input
          type="range"
          min="1"
          max="20"
          step="1"
          value={spec.numberOfFloors}
          onChange={(e) => onUpdate({ numberOfFloors: parseInt(e.target.value) })}
          className="w-full h-2.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-blue-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-400 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-all"
        />
        <input
          type="number"
          min="1"
          max="20"
          step="1"
          value={spec.numberOfFloors}
          onChange={(e) => onUpdate({ numberOfFloors: parseInt(e.target.value) })}
          className="mt-2 w-full px-4 py-2.5 border-2 border-gray-300 rounded-full text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
        />
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Floor Height (meters): <span className="text-blue-600">{spec.floorHeight}</span>
        </label>
        <input
          type="range"
          min="2.5"
          max="6"
          step="0.1"
          value={spec.floorHeight}
          onChange={(e) => onUpdate({ floorHeight: parseFloat(e.target.value) })}
          className="w-full h-2.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-blue-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-400 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-all"
        />
        <input
          type="number"
          min="2.5"
          max="6"
          step="0.1"
          value={spec.floorHeight}
          onChange={(e) => onUpdate({ floorHeight: parseFloat(e.target.value) })}
          className="mt-2 w-full px-4 py-2.5 border-2 border-gray-300 rounded-full text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
        />
      </div>

      <div className="pt-4 mt-6 border-t-2 border-gray-200">
        <p className="text-base text-gray-700 bg-blue-50 px-4 py-3 rounded-lg">
          Total Height: <span className="font-bold text-blue-700">{(spec.numberOfFloors * spec.floorHeight).toFixed(1)}m</span>
        </p>
      </div>
    </div>
  );
}
