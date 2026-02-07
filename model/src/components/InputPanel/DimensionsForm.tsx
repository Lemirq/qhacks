import { BuildingSpecification } from '../../types/buildingSpec';

interface DimensionsFormProps {
  spec: BuildingSpecification;
  onUpdate: (updates: Partial<BuildingSpecification>) => void;
}

export function DimensionsForm({ spec, onUpdate }: DimensionsFormProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">Dimensions</h3>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Width (meters): {spec.width}
        </label>
        <input
          type="range"
          min="5"
          max="50"
          step="0.5"
          value={spec.width}
          onChange={(e) => onUpdate({ width: parseFloat(e.target.value) })}
          className="w-full"
        />
        <input
          type="number"
          min="5"
          max="50"
          step="0.5"
          value={spec.width}
          onChange={(e) => onUpdate({ width: parseFloat(e.target.value) })}
          className="mt-1 w-full px-3 py-1 border border-gray-300 rounded-md text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Depth (meters): {spec.depth}
        </label>
        <input
          type="range"
          min="5"
          max="50"
          step="0.5"
          value={spec.depth}
          onChange={(e) => onUpdate({ depth: parseFloat(e.target.value) })}
          className="w-full"
        />
        <input
          type="number"
          min="5"
          max="50"
          step="0.5"
          value={spec.depth}
          onChange={(e) => onUpdate({ depth: parseFloat(e.target.value) })}
          className="mt-1 w-full px-3 py-1 border border-gray-300 rounded-md text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Number of Floors: {spec.numberOfFloors}
        </label>
        <input
          type="range"
          min="1"
          max="20"
          step="1"
          value={spec.numberOfFloors}
          onChange={(e) => onUpdate({ numberOfFloors: parseInt(e.target.value) })}
          className="w-full"
        />
        <input
          type="number"
          min="1"
          max="20"
          step="1"
          value={spec.numberOfFloors}
          onChange={(e) => onUpdate({ numberOfFloors: parseInt(e.target.value) })}
          className="mt-1 w-full px-3 py-1 border border-gray-300 rounded-md text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Floor Height (meters): {spec.floorHeight}
        </label>
        <input
          type="range"
          min="2.5"
          max="6"
          step="0.1"
          value={spec.floorHeight}
          onChange={(e) => onUpdate({ floorHeight: parseFloat(e.target.value) })}
          className="w-full"
        />
        <input
          type="number"
          min="2.5"
          max="6"
          step="0.1"
          value={spec.floorHeight}
          onChange={(e) => onUpdate({ floorHeight: parseFloat(e.target.value) })}
          className="mt-1 w-full px-3 py-1 border border-gray-300 rounded-md text-sm"
        />
      </div>

      <div className="pt-2 border-t border-gray-200">
        <p className="text-sm text-gray-600">
          Total Height: <span className="font-semibold">{(spec.numberOfFloors * spec.floorHeight).toFixed(1)}m</span>
        </p>
      </div>
    </div>
  );
}
