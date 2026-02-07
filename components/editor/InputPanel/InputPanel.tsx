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
                className="px-5 py-2.5 rounded-full font-medium text-sm border-2 bg-gray-100 border-amber-400/60 text-amber-700 hover:bg-amber-500 hover:border-amber-400 hover:text-white hover:shadow-[0_8px_25px_-5px_rgba(245,158,11,0.35)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 ease-out"
              >
                Reset
              </button>
            </div>

            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl border-2 border-gray-200 shadow-sm">
                <DimensionsForm spec={selectedBuilding.spec} onUpdate={handleUpdate} buildingId={selectedBuilding.id} />
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
