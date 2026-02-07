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
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Width: {spec.windowWidth?.toFixed(1)}m
              </label>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={spec.windowWidth || 1.2}
                onChange={(e) => onUpdate({ windowWidth: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Height: {spec.windowHeight?.toFixed(1)}m
              </label>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={spec.windowHeight || 1.8}
                onChange={(e) => onUpdate({ windowHeight: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>
          </div>
        </>
      )}

      <div className="pt-4 border-t border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Door</h3>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Width: {spec.doorWidth?.toFixed(1)}m
            </label>
            <input
              type="range"
              min="0.8"
              max="3"
              step="0.1"
              value={spec.doorWidth || 1.5}
              onChange={(e) => onUpdate({ doorWidth: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Height: {spec.doorHeight?.toFixed(1)}m
            </label>
            <input
              type="range"
              min="1.8"
              max="3.5"
              step="0.1"
              value={spec.doorHeight || 2.4}
              onChange={(e) => onUpdate({ doorHeight: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>
        </div>

        <div className="mt-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Position: {((spec.doorPosition || 0.5) * 100).toFixed(0)}%
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={spec.doorPosition || 0.5}
            onChange={(e) => onUpdate({ doorPosition: parseFloat(e.target.value) })}
            className="w-full"
          />
          <p className="text-xs text-gray-500 mt-1">
            Slide to move door around the building perimeter
          </p>
        </div>
      </div>
    </div>
  );
}
