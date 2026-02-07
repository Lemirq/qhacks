import { useBuildings } from '@/lib/editor/contexts/BuildingsContext';
import { DimensionsForm } from './DimensionsForm';
import { TextureSelector } from './TextureSelector';
import { WindowForm } from './WindowForm';
import { BlueprintUploader } from './BlueprintUploader';
import { BuildingList } from './BuildingList';
import { DEFAULT_BUILDING_SPEC } from '@/lib/editor/types/buildingSpec';

export function InputPanel() {
  const { getSelectedBuilding, updateBuilding } = useBuildings();
  const selectedBuilding = getSelectedBuilding();

  const handleUpdate = (updates: Partial<typeof DEFAULT_BUILDING_SPEC>) => {
    if (selectedBuilding) {
      updateBuilding(selectedBuilding.id, updates);
    }
  };

  const handleReset = () => {
    if (selectedBuilding) {
      updateBuilding(selectedBuilding.id, DEFAULT_BUILDING_SPEC);
    }
  };

  return (
    <div className="w-full h-full bg-white border-r border-gray-200 overflow-y-auto">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Building Designer</h2>
        </div>

        {/* Building List */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <BuildingList />
        </div>

        {selectedBuilding ? (
          <>
            <div className="flex items-center justify-between border-t pt-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedBuilding.name} Settings
              </h3>
              <button
                onClick={handleReset}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                Reset
              </button>
            </div>

            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <DimensionsForm spec={selectedBuilding.spec} onUpdate={handleUpdate} />
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <TextureSelector spec={selectedBuilding.spec} onUpdate={handleUpdate} />
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <WindowForm spec={selectedBuilding.spec} onUpdate={handleUpdate} />
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <BlueprintUploader spec={selectedBuilding.spec} onUpdate={handleUpdate} />
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No building selected</p>
            <p className="text-sm mt-2">Add a building to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}
