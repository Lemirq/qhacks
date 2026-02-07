import { BuildingSpecification, RoofType } from '@/lib/editor/types/buildingSpec';

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
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-gray-800 mb-2">Roof</h3>

      <div className="space-y-3">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Roof Type
        </label>
        <div className="space-y-2">
          {ROOF_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => onUpdate({ roofType: type.value })}
              className={`w-full px-4 py-3 rounded-lg text-sm font-semibold transition-all shadow-sm text-left ${
                spec.roofType === type.value
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {spec.roofType !== 'flat' && (
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Roof Height (meters): <span className="text-blue-600">{spec.roofHeight}</span>
          </label>
          <input
            type="range"
            min="1"
            max="10"
            step="0.5"
            value={spec.roofHeight}
            onChange={(e) => onUpdate({ roofHeight: parseFloat(e.target.value) })}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <input
            type="number"
            min="1"
            max="10"
            step="0.5"
            value={spec.roofHeight}
            onChange={(e) => onUpdate({ roofHeight: parseFloat(e.target.value) })}
            className="mt-2 w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
      )}
    </div>
  );
}
