import { BuildingSpecification } from '../../types/buildingSpec';
import { WALL_TEXTURES } from '../../utils/textureLoader';

interface TextureSelectorProps {
  spec: BuildingSpecification;
  onUpdate: (updates: Partial<BuildingSpecification>) => void;
}

export function TextureSelector({ spec, onUpdate }: TextureSelectorProps) {
  const handleWallTextureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        onUpdate({ wallTexture: 'custom', customWallTexture: dataUrl });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">Textures</h3>

      {/* Wall Texture */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Wall Texture
        </label>
        <div className="grid grid-cols-2 gap-2">
          {WALL_TEXTURES.map((texture) => (
            <button
              key={texture.name}
              onClick={() => onUpdate({ wallTexture: texture.name, customWallTexture: undefined })}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                spec.wallTexture === texture.name && !spec.customWallTexture
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {texture.displayName}
            </button>
          ))}
        </div>

        <div className="mt-2">
          <label className="block">
            <span className="sr-only">Upload wall texture</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleWallTextureUpload}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
          </label>
          {spec.customWallTexture && (
            <p className="mt-1 text-xs text-green-600">Custom texture loaded</p>
          )}
        </div>
      </div>
    </div>
  );
}
