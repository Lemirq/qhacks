import { BuildingSpecification } from '../../types/buildingSpec';
import { DimensionsForm } from './DimensionsForm';
import { RoofForm } from './RoofForm';
import { TextureSelector } from './TextureSelector';
import { WindowForm } from './WindowForm';
import { BlueprintUploader } from './BlueprintUploader';

interface InputPanelProps {
  spec: BuildingSpecification;
  onUpdate: (updates: Partial<BuildingSpecification>) => void;
  onReset: () => void;
}

export function InputPanel({ spec, onUpdate, onReset }: InputPanelProps) {
  return (
    <div className="w-full h-full bg-white border-r border-gray-200 overflow-y-auto">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Building Designer</h2>
          <button
            onClick={onReset}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            Reset
          </button>
        </div>

        <div className="space-y-6">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <DimensionsForm spec={spec} onUpdate={onUpdate} />
          </div>

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <RoofForm spec={spec} onUpdate={onUpdate} />
          </div>

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <TextureSelector spec={spec} onUpdate={onUpdate} />
          </div>

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <WindowForm spec={spec} onUpdate={onUpdate} />
          </div>

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <BlueprintUploader spec={spec} onUpdate={onUpdate} />
          </div>
        </div>
      </div>
    </div>
  );
}
