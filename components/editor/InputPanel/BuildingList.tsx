import { useBuildings } from '@/lib/editor/contexts/BuildingsContext';

export function BuildingList() {
  const {
    buildings,
    selectedBuildingId,
    selectBuilding,
    removeBuilding,
    placementMode,
    setPlacementMode,
  } = useBuildings();

  const handleAddBuilding = () => {
    setPlacementMode(true);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Buildings</h3>
        <button
          onClick={handleAddBuilding}
          disabled={placementMode}
          className="px-5 py-2.5 rounded-full font-medium text-sm border-2 bg-gray-100 border-blue-400/60 text-blue-700 hover:bg-blue-500 hover:border-blue-400 hover:text-white hover:shadow-[0_8px_25px_-5px_rgba(59,130,246,0.35)] hover:-translate-y-0.5 active:translate-y-0 disabled:bg-gray-100 disabled:border-gray-300 disabled:text-gray-500 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none transition-all duration-200 ease-out"
        >
          {placementMode ? 'Click on Grid...' : '+ Add Building'}
        </button>
      </div>

      <div className="space-y-2 max-h-[200px] overflow-y-auto">
        {buildings.map((building) => (
          <div
            key={building.id}
            className={`
              p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ease-out
              ${selectedBuildingId === building.id
                ? 'border-blue-400 bg-blue-50 shadow-[0_4px_15px_-3px_rgba(59,130,246,0.25)]'
                : 'border-gray-200 bg-white hover:border-blue-400/60 hover:shadow-md'
              }
            `}
            onClick={() => selectBuilding(building.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="font-medium text-gray-900">{building.name}</div>
                <div className="text-xs text-gray-500 mt-1">
                  Position: ({building.position.x.toFixed(1)}, {building.position.y.toFixed(1)}, {building.position.z.toFixed(1)})
                </div>
                <div className="text-xs text-gray-500">
                  Size: {building.spec.width}m × {building.spec.depth}m × {building.spec.numberOfFloors} floors
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeBuilding(building.id);
                }}
                className="ml-2 p-2 rounded-full border-2 border-red-400/40 text-red-600 hover:bg-red-500 hover:border-red-400 hover:text-white transition-all duration-200 ease-out"
                title="Delete building"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {placementMode && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <svg
              className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <div className="flex-1">
              <p className="text-sm text-blue-900 font-medium">Placement Mode Active</p>
              <p className="text-xs text-blue-700 mt-1">
                Click anywhere on the grid to place the new building
              </p>
              <button
                onClick={() => setPlacementMode(false)}
                className="mt-2 px-3 py-1.5 rounded-full text-xs font-medium border-2 border-blue-400/60 text-blue-700 hover:bg-blue-500 hover:border-blue-400 hover:text-white transition-all duration-200 ease-out"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
