import { BuildingSpecification } from '@/lib/editor/types/buildingSpec';

interface BlueprintUploaderProps {
  spec: BuildingSpecification;
  onUpdate: (updates: Partial<BuildingSpecification>) => void;
}

export function BlueprintUploader({ spec, onUpdate }: BlueprintUploaderProps) {
  const handleBlueprintUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        onUpdate({ blueprintImage: dataUrl });
      };
      reader.readAsDataURL(file);
    }
  };

  const clearBlueprint = () => {
    onUpdate({ blueprintImage: undefined, footprint: undefined });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">Blueprint</h3>

      <div>
        <label className="block">
          <span className="text-sm font-medium text-gray-700 mb-2 block">
            Upload Floor Plan
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={handleBlueprintUpload}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-green-50 file:text-green-700
              hover:file:bg-green-100"
          />
        </label>
      </div>

      {spec.blueprintImage && (
        <div className="space-y-2">
          <div className="border border-gray-300 rounded-md overflow-hidden">
            <img
              src={spec.blueprintImage}
              alt="Blueprint"
              className="w-full h-32 object-contain bg-gray-50"
            />
          </div>
          <button
            onClick={clearBlueprint}
            className="w-full px-3 py-2 bg-red-50 text-red-700 rounded-md text-sm font-medium hover:bg-red-100"
          >
            Clear Blueprint
          </button>
          <p className="text-xs text-gray-500">
            Note: Polygon tracing feature coming soon. For now, use the dimension sliders.
          </p>
        </div>
      )}
    </div>
  );
}
