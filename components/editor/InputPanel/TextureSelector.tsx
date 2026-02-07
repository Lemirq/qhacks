import { BuildingSpecification } from '@/lib/editor/types/buildingSpec';
import { WALL_TEXTURES, WINDOW_TEXTURES } from '@/lib/editor/utils/textureLoader';

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

  const handleWindowTextureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        onUpdate({ windowTexture: 'custom', customWindowTexture: dataUrl });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-gray-800 mb-2">Textures</h3>

      {/* Wall Texture */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Wall Texture
        </label>
        <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
          {WALL_TEXTURES.map((texture) => (
            <button
              key={texture.name}
              onClick={() => onUpdate({ wallTexture: texture.name, customWallTexture: undefined })}
              className={`w-full px-4 py-3 rounded-lg text-sm font-semibold transition-all shadow-sm text-left ${
                spec.wallTexture === texture.name && !spec.customWallTexture
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {texture.displayName}
            </button>
          ))}
        </div>

        <div className="mt-3">
          <label className="block">
            <span className="text-xs font-semibold text-gray-600 mb-2 block">Upload Custom Texture</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleWallTextureUpload}
              className="block w-full text-sm text-gray-600
                file:mr-4 file:py-3 file:px-5
                file:rounded-lg file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-600 file:text-white
                hover:file:bg-blue-700 file:cursor-pointer
                file:transition-colors file:shadow-sm"
            />
          </label>
          {spec.customWallTexture && (
            <p className="mt-2 text-xs font-semibold text-green-600 bg-green-50 px-3 py-2 rounded-lg">
              ✓ Custom texture loaded
            </p>
          )}
        </div>
      </div>

      {/* Window Texture */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Window Texture
        </label>
        <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
          {WINDOW_TEXTURES.map((texture) => (
            <button
              key={texture.name}
              onClick={() => onUpdate({ windowTexture: texture.name, customWindowTexture: undefined })}
              className={`w-full px-4 py-3 rounded-lg text-sm font-semibold transition-all shadow-sm text-left ${
                spec.windowTexture === texture.name && !spec.customWindowTexture
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {texture.displayName}
            </button>
          ))}
        </div>

        <div className="mt-3">
          <label className="block">
            <span className="text-xs font-semibold text-gray-600 mb-2 block">Upload Custom Texture</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleWindowTextureUpload}
              className="block w-full text-sm text-gray-600
                file:mr-4 file:py-3 file:px-5
                file:rounded-lg file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-600 file:text-white
                hover:file:bg-blue-700 file:cursor-pointer
                file:transition-colors file:shadow-sm"
            />
          </label>
          {spec.customWindowTexture && (
            <p className="mt-2 text-xs font-semibold text-green-600 bg-green-50 px-3 py-2 rounded-lg">
              ✓ Custom texture loaded
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
