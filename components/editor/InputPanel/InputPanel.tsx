import { useBuildings } from '@/lib/editor/contexts/BuildingsContext';
import { DimensionsForm } from './DimensionsForm';
import { TextureSelector } from './TextureSelector';
import { WindowForm } from './WindowForm';
import { RoofForm } from './RoofForm';
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
    <div className="w-full h-full bg-gradient-to-b from-gray-50 to-white border-r border-gray-200 overflow-y-auto">
      <div className="p-8 space-y-8">
        <div className="flex items-center justify-between pb-4 border-b-2 border-gray-200">
          <h2 className="text-3xl font-bold text-gray-900">Building Designer</h2>
        </div>

        {/* Blueprint Tracer */}
        <div className="bg-blue-50 p-6 rounded-xl border-2 border-blue-200 shadow-sm">
          <BlueprintUploader />
        </div>

        {/* Building List */}
        <div className="bg-white p-6 rounded-xl border-2 border-gray-200 shadow-sm">
          <BuildingList />
        </div>

        {selectedBuilding ? (
          <>
            <div className="flex items-center justify-between pt-6 pb-4 border-t-2 border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">
                {selectedBuilding.name} Settings
              </h3>
              <button
                onClick={handleReset}
                className="px-4 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Reset
              </button>
            </div>

            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl border-2 border-gray-200 shadow-sm">
                <DimensionsForm spec={selectedBuilding.spec} onUpdate={handleUpdate} />
              </div>

              <div className="bg-white p-6 rounded-xl border-2 border-gray-200 shadow-sm">
                <RoofForm spec={selectedBuilding.spec} onUpdate={handleUpdate} />
              </div>

              <div className="bg-white p-6 rounded-xl border-2 border-gray-200 shadow-sm">
                <TextureSelector spec={selectedBuilding.spec} onUpdate={handleUpdate} />
              </div>

              <div className="bg-white p-6 rounded-xl border-2 border-gray-200 shadow-sm">
                <WindowForm spec={selectedBuilding.spec} onUpdate={handleUpdate} />
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12 px-6 bg-white rounded-xl border-2 border-gray-200 shadow-sm">
            <p className="text-gray-600 text-lg">No building selected</p>
            <p className="text-sm text-gray-500 mt-3">Add a building to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}
