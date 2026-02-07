import { BuildingSpecification, WindowPattern } from '../../types/buildingSpec';

interface WindowFormProps {
  spec: BuildingSpecification;
  onUpdate: (updates: Partial<BuildingSpecification>) => void;
}

const WINDOW_PATTERNS: { value: WindowPattern; label: string }[] = [
  { value: 'grid', label: 'Grid' },
  { value: 'ribbon', label: 'Ribbon' },
  { value: 'none', label: 'None' },
];

export function WindowForm({ spec, onUpdate }: WindowFormProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">Windows</h3>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Window Pattern
        </label>
        <div className="grid grid-cols-3 gap-2">
          {WINDOW_PATTERNS.map((pattern) => (
            <button
              key={pattern.value}
              onClick={() => onUpdate({ windowPattern: pattern.value })}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                spec.windowPattern === pattern.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {pattern.label}
            </button>
          ))}
        </div>
      </div>

      {spec.windowPattern !== 'none' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Windows per Floor: {spec.windowRows}
            </label>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={spec.windowRows}
              onChange={(e) => onUpdate({ windowRows: parseInt(e.target.value) })}
              className="w-full"
            />
            <input
              type="number"
              min="1"
              max="10"
              step="1"
              value={spec.windowRows}
              onChange={(e) => onUpdate({ windowRows: parseInt(e.target.value) })}
              className="mt-1 w-full px-3 py-1 border border-gray-300 rounded-md text-sm"
            />
          </div>

          <div className="pt-2 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Total Windows: <span className="font-semibold">
                {spec.windowPattern === 'grid'
                  ? spec.windowRows * spec.numberOfFloors * 2
                  : spec.windowRows * spec.numberOfFloors}
              </span>
            </p>
          </div>
        </>
      )}
    </div>
  );
}
