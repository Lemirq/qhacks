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
              className={`w-full px-5 py-2.5 rounded-full text-sm font-medium border-2 text-left transition-all duration-200 ease-out ${
                spec.roofType === type.value
                  ? 'bg-amber-200 border-amber-300 text-amber-700'
                  : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-amber-100 hover:border-amber-200 hover:text-amber-600'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {spec.roofType !== 'flat' && (
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">
            Roof Height (meters): <span className="text-amber-600">{spec.roofHeight}</span>
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="1"
              max="10"
              step="0.5"
              value={spec.roofHeight}
              onChange={(e) => onUpdate({ roofHeight: parseFloat(e.target.value) })}
              className="flex-4 h-4 bg-gray-200 rounded-full appearance-none cursor-pointer accent-amber-400 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-12 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-400 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-amber-300 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing"
            />
            <input
              type="number"
              min="1"
              max="10"
              step="0.5"
              value={spec.roofHeight}
              onChange={(e) => onUpdate({ roofHeight: parseFloat(e.target.value) })}
              className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg text-sm text-center focus:border-amber-400 focus:outline-none transition-colors duration-200"
            />
          </div>
        </div>
      )}
    </div>
  );
}
