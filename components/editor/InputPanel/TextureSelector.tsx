import { BuildingSpecification } from '@/lib/editor/types/buildingSpec';
import { WALL_TEXTURES, WINDOW_TEXTURES } from '@/lib/editor/utils/textureLoader';
import { useBuildingSound } from '@/lib/editor/hooks/useBuildingSound';

interface TextureSelectorProps {
  spec: BuildingSpecification;
  onUpdate: (updates: Partial<BuildingSpecification>) => void;
}

export function TextureSelector({ spec, onUpdate }: TextureSelectorProps) {
  const { play: playSound } = useBuildingSound();

  const handleWallTextureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        onUpdate({ wallTexture: 'custom', customWallTexture: dataUrl });
        playSound('change_texture');
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
        playSound('change_texture');
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
              onClick={() => { onUpdate({ wallTexture: texture.name, customWallTexture: undefined }); playSound('change_texture'); }}
              className={`w-full px-5 py-2.5 rounded-full text-sm font-medium border-2 text-left transition-all duration-200 ease-out ${
                spec.wallTexture === texture.name && !spec.customWallTexture
                  ? 'bg-amber-500 border-amber-400 text-white shadow-[0_8px_25px_-5px_rgba(245,158,11,0.5)]'
                  : 'bg-gray-100 border-amber-400/60 text-amber-700 hover:bg-amber-500 hover:border-amber-400 hover:text-white hover:shadow-[0_8px_25px_-5px_rgba(245,158,11,0.5)] hover:-translate-y-0.5 active:translate-y-0'
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
                file:mr-4 file:py-2.5 file:px-5
                file:rounded-full file:border-2
                file:text-sm file:font-medium
                file:bg-gray-100 file:border-amber-400/60 file:text-amber-700
                hover:file:bg-amber-500 hover:file:border-amber-400 hover:file:text-white
                file:cursor-pointer file:transition-all file:duration-200
                file:shadow-md hover:file:shadow-[0_8px_25px_-5px_rgba(245,158,11,0.5)] hover:file:-translate-y-0.5"
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
              onClick={() => { onUpdate({ windowTexture: texture.name, customWindowTexture: undefined }); playSound('change_texture'); }}
              className={`w-full px-5 py-2.5 rounded-full text-sm font-medium border-2 text-left transition-all duration-200 ease-out ${
                spec.windowTexture === texture.name && !spec.customWindowTexture
                  ? 'bg-amber-500 border-amber-400 text-white shadow-[0_8px_25px_-5px_rgba(245,158,11,0.5)]'
                  : 'bg-gray-100 border-amber-400/60 text-amber-700 hover:bg-amber-500 hover:border-amber-400 hover:text-white hover:shadow-[0_8px_25px_-5px_rgba(245,158,11,0.5)] hover:-translate-y-0.5 active:translate-y-0'
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
                file:mr-4 file:py-2.5 file:px-5
                file:rounded-full file:border-2
                file:text-sm file:font-medium
                file:bg-gray-100 file:border-amber-400/60 file:text-amber-700
                hover:file:bg-amber-500 hover:file:border-amber-400 hover:file:text-white
                file:cursor-pointer file:transition-all file:duration-200
                file:shadow-md hover:file:shadow-[0_8px_25px_-5px_rgba(245,158,11,0.5)] hover:file:-translate-y-0.5"
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
