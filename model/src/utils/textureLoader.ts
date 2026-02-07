import * as THREE from 'three';

export interface TextureInfo {
  name: string;
  displayName: string;
  path: string;
  category: 'wall' | 'roof' | 'ground' | 'window';
}

// Predefined textures
export const WALL_TEXTURES: TextureInfo[] = [
  { name: 'brick', displayName: 'Brick', path: '/textures/walls/brick.jpg', category: 'wall' },
  { name: 'concrete', displayName: 'Concrete', path: '/textures/walls/concrete.jpg', category: 'wall' },
  { name: 'glass-curtain', displayName: 'Glass Curtain', path: '/textures/walls/glass-curtain.jpg', category: 'wall' },
  { name: 'stucco', displayName: 'Stucco', path: '/textures/walls/stucco.jpg', category: 'wall' },
  { name: 'wood-panel', displayName: 'Wood Panel', path: '/textures/walls/wood-panel.jpg', category: 'wall' },
];

export const ROOF_TEXTURES: TextureInfo[] = [
  { name: 'shingle', displayName: 'Shingles', path: '/textures/roofs/shingle.jpg', category: 'roof' },
  { name: 'metal', displayName: 'Metal', path: '/textures/roofs/metal.jpg', category: 'roof' },
  { name: 'tile', displayName: 'Tile', path: '/textures/roofs/tile.jpg', category: 'roof' },
  { name: 'green-roof', displayName: 'Green Roof', path: '/textures/roofs/green-roof.jpg', category: 'roof' },
];

export const WINDOW_TEXTURES: TextureInfo[] = [
  { name: 'clear', displayName: 'Clear Glass', path: '', category: 'window' },
  { name: 'glass', displayName: 'Glass', path: '/textures/walls/glass.jpg', category: 'window' },
];

// Texture cache to avoid reloading
const textureCache = new Map<string, THREE.Texture>();

export function loadTexture(path: string): THREE.Texture {
  if (textureCache.has(path)) {
    return textureCache.get(path)!;
  }

  const loader = new THREE.TextureLoader();
  const texture = loader.load(
    path,
    (tex) => {
      // Texture loaded successfully
      console.log(`Texture loaded: ${path}`);
    },
    undefined,
    (error) => {
      console.error(`Error loading texture ${path}:`, error);
    }
  );

  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;

  textureCache.set(path, texture);
  return texture;
}

export function loadTextureFromDataURL(dataUrl: string): THREE.Texture {
  if (textureCache.has(dataUrl)) {
    return textureCache.get(dataUrl)!;
  }

  const loader = new THREE.TextureLoader();
  const texture = loader.load(dataUrl);

  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;

  textureCache.set(dataUrl, texture);
  return texture;
}

export function createMaterialWithTexture(
  texturePath: string,
  width: number,
  height: number,
  tileSize: number = 3
): THREE.MeshStandardMaterial {
  const texture = loadTexture(texturePath);
  texture.repeat.set(width / tileSize, height / tileSize);

  return new THREE.MeshStandardMaterial({
    map: texture,
  });
}

export function getTexturePath(textureName: string, category: 'wall' | 'roof' | 'window'): string {
  const textures = category === 'wall'
    ? WALL_TEXTURES
    : category === 'roof'
      ? ROOF_TEXTURES
      : WINDOW_TEXTURES;
  const textureInfo = textures.find(t => t.name === textureName);
  return textureInfo?.path || textures[0].path;
}
