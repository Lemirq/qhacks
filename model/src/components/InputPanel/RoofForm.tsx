import { BuildingSpecification, RoofType } from '../../types/buildingSpec';

interface RoofFormProps {
  spec: BuildingSpecification;
  onUpdate: (updates: Partial<BuildingSpecification>) => void;
}

const ROOF_TYPES: { value: RoofType; label: string }[] = [
  { value: 'flat', label: 'Flat' },
  { value: 'gabled', label: 'Gabled' },
  { value: 'hipped', label: 'Hipped' },
  { value: 'pyramid', label: 'Pyramid' },
];

export function RoofForm({ spec, onUpdate }: RoofFormProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">Roof</h3>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Roof Type
        </label>
        <div className="grid grid-cols-2 gap-2">
          {ROOF_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => onUpdate({ roofType: type.value })}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                spec.roofType === type.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {spec.roofType !== 'flat' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Roof Height (meters): {spec.roofHeight}
          </label>
          <input
            type="range"
            min="1"
            max="10"
            step="0.5"
            value={spec.roofHeight}
            onChange={(e) => onUpdate({ roofHeight: parseFloat(e.target.value) })}
            className="w-full"
          />
          <input
            type="number"
            min="1"
            max="10"
            step="0.5"
            value={spec.roofHeight}
            onChange={(e) => onUpdate({ roofHeight: parseFloat(e.target.value) })}
            className="mt-1 w-full px-3 py-1 border border-gray-300 rounded-md text-sm"
          />
        </div>
      )}
    </div>
  );
}
