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
                  ? 'bg-amber-500 border-amber-400 text-white shadow-[0_8px_25px_-5px_rgba(245,158,11,0.5)]'
                  : 'bg-gray-100 border-amber-400/60 text-amber-700 hover:bg-amber-500 hover:border-amber-400 hover:text-white hover:shadow-[0_8px_25px_-5px_rgba(245,158,11,0.5)] hover:-translate-y-0.5 active:translate-y-0'
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
            Roof Height (meters): <span className="text-amber-600">{spec.roofHeight}</span>
          </label>
          <input
            type="range"
            min="1"
            max="10"
            step="0.5"
            value={spec.roofHeight}
            onChange={(e) => onUpdate({ roofHeight: parseFloat(e.target.value) })}
            className="w-full h-2.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-amber-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-500 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-amber-400 [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(245,158,11,0.5)] [&::-webkit-slider-thumb]:transition-all"
          />
          <input
            type="number"
            min="1"
            max="10"
            step="0.5"
            value={spec.roofHeight}
            onChange={(e) => onUpdate({ roofHeight: parseFloat(e.target.value) })}
            className="mt-2 w-full px-4 py-2.5 border-2 border-gray-300 rounded-full text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:shadow-[0_0_15px_rgba(245,158,11,0.2)] transition-all duration-200"
          />
        </div>
      )}
    </div>
  );
}
