import { BuildingSpecification, WindowPattern, WindowShape } from '@/lib/editor/types/buildingSpec';
import { useBuildingSound } from '@/lib/editor/hooks/useBuildingSound';

interface WindowFormProps {
  spec: BuildingSpecification;
  onUpdate: (updates: Partial<BuildingSpecification>) => void;
}

const WINDOW_PATTERNS: { value: WindowPattern; label: string }[] = [
  { value: 'grid', label: 'Grid' },
  { value: 'ribbon', label: 'Ribbon' },
  { value: 'none', label: 'None' },
];

const WINDOW_SHAPES: { value: WindowShape; label: string; icon: string }[] = [
  { value: 'rectangular', label: 'Rectangle', icon: '▭' },
  { value: 'arched', label: 'Arched', icon: '⌂' },
  { value: 'circular', label: 'Circle', icon: '○' },
  { value: 'triangular', label: 'Triangle', icon: '△' },
];

export function WindowForm({ spec, onUpdate }: WindowFormProps) {
  const { play: playSound } = useBuildingSound();

  const handleWindowUpdate = (updates: Partial<BuildingSpecification>) => {
    onUpdate(updates);
    playSound('window_edit');
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-gray-800 mb-2">Windows</h3>

      <div className="space-y-3">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Window Pattern
        </label>
        <div className="space-y-2">
          {WINDOW_PATTERNS.map((pattern) => (
            <button
              key={pattern.value}
              onClick={() => handleWindowUpdate({ windowPattern: pattern.value })}
              className={`w-full px-5 py-2.5 rounded-full text-sm font-medium border-2 text-left transition-all duration-200 ease-out ${
                spec.windowPattern === pattern.value
                  ? 'bg-amber-200 border-amber-300 text-amber-700'
                  : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-amber-100 hover:border-amber-200 hover:text-amber-600'
              }`}
            >
              {pattern.label}
            </button>
          ))}
        </div>
      </div>

      {spec.windowPattern !== 'none' && (
        <>
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Window Shape
            </label>
            <div className="grid grid-cols-4 gap-2">
              {WINDOW_SHAPES.map((shape) => (
                <button
                  key={shape.value}
                  onClick={() => handleWindowUpdate({ windowShape: shape.value })}
                  className={`px-3 py-2.5 rounded-xl text-sm font-medium border-2 flex flex-col items-center gap-1 transition-all duration-200 ease-out ${
                    spec.windowShape === shape.value
                      ? 'bg-amber-200 border-amber-300 text-amber-700'
                      : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-amber-100 hover:border-amber-200 hover:text-amber-600'
                  }`}
                >
                  <span className="text-lg">{shape.icon}</span>
                  <span className="text-xs">{shape.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Windows per Floor: <span className="text-amber-600">{spec.windowRows}</span>
            </label>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={spec.windowRows}
              onChange={(e) => { onUpdate({ windowRows: parseInt(e.target.value) }); playSound('window_add'); }}
              className="w-full h-4 bg-gray-200 rounded-full appearance-none cursor-pointer accent-amber-400 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-12 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-400 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-amber-300 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Width: <span className="text-amber-600">{spec.windowWidth?.toFixed(1)}m</span>
              </label>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={spec.windowWidth || 1.2}
                onChange={(e) => handleWindowUpdate({ windowWidth: parseFloat(e.target.value) })}
                className="w-full h-4 bg-gray-200 rounded-full appearance-none cursor-pointer accent-amber-400 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-12 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-400 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-amber-300 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Height: <span className="text-amber-600">{spec.windowHeight?.toFixed(1)}m</span>
              </label>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={spec.windowHeight || 1.8}
                onChange={(e) => handleWindowUpdate({ windowHeight: parseFloat(e.target.value) })}
                className="w-full h-4 bg-gray-200 rounded-full appearance-none cursor-pointer accent-amber-400 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-12 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-400 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-amber-300 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing"
              />
            </div>
          </div>
        </>
      )}

      <div className="pt-6 mt-6 border-t-2 border-gray-200 space-y-6">
        <h3 className="text-xl font-bold text-gray-800 mb-3">Door</h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">
              Width: <span className="text-amber-600">{spec.doorWidth?.toFixed(1)}m</span>
            </label>
            <input
              type="range"
              min="0.8"
              max="3"
              step="0.1"
              value={spec.doorWidth || 1.5}
              onChange={(e) => handleWindowUpdate({ doorWidth: parseFloat(e.target.value) })}
              className="w-full h-4 bg-gray-200 rounded-full appearance-none cursor-pointer accent-amber-400 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-12 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-400 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-amber-300 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">
              Height: <span className="text-amber-600">{spec.doorHeight?.toFixed(1)}m</span>
            </label>
            <input
              type="range"
              min="1.8"
              max="3.5"
              step="0.1"
              value={spec.doorHeight || 2.4}
              onChange={(e) => handleWindowUpdate({ doorHeight: parseFloat(e.target.value) })}
              className="w-full h-4 bg-gray-200 rounded-full appearance-none cursor-pointer accent-amber-400 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-12 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-400 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-amber-300 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing"
            />
          </div>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-semibold text-gray-700">
            Position: <span className="text-amber-600">{((spec.doorPosition || 0.5) * 100).toFixed(0)}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={spec.doorPosition || 0.5}
            onChange={(e) => handleWindowUpdate({ doorPosition: parseFloat(e.target.value) })}
            className="w-full h-4 bg-gray-200 rounded-full appearance-none cursor-pointer accent-amber-400 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-12 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-400 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-amber-300 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing"
          />
          <p className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
            Slide to move door around the building perimeter
          </p>
        </div>
      </div>
    </div>
  );
}
