import { useMemo, forwardRef, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { BuildingSpecification } from '../../types/buildingSpec';
import {
  createBuildingBody,
  createWindows,
  createDoor,
} from '../../utils/geometryBuilders';
import { getTexturePath, loadTexture, loadTextureFromDataURL } from '../../utils/textureLoader';

interface BuildingProps {
  spec: BuildingSpecification;
}

export const Building = forwardRef<THREE.Group, BuildingProps>(({ spec }, ref) => {
  const groupRef = useRef<THREE.Group>(null);

  // Sync the ref with the internal ref
  useEffect(() => {
    if (ref && 'current' in ref) {
      ref.current = groupRef.current;
    }
  }, [ref]);

  const buildingGroup = useMemo(() => {
    const group = new THREE.Group();

    // Create building body
    const body = createBuildingBody(spec);

    // Apply wall texture
    let wallTexture: THREE.Texture;
    if (spec.customWallTexture) {
      wallTexture = loadTextureFromDataURL(spec.customWallTexture);
    } else {
      const wallTexturePath = getTexturePath(spec.wallTexture, 'wall');
      wallTexture = loadTexture(wallTexturePath);
    }

    const totalHeight = spec.floorHeight * spec.numberOfFloors;
    wallTexture.repeat.set(spec.width / 3, totalHeight / 3);

    if (body.material instanceof THREE.Material) {
      (body.material as THREE.MeshStandardMaterial).map = wallTexture;
      (body.material as THREE.MeshStandardMaterial).needsUpdate = true;
    }

    group.add(body);

    // Create windows
    const windows = createWindows(spec);
    group.add(windows);

    // Create door
    const door = createDoor(spec);
    group.add(door);

    return group;
  }, [spec]);

  return <primitive object={buildingGroup} ref={groupRef} />;
});

Building.displayName = 'Building';
