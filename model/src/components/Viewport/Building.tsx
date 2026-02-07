import { useMemo, forwardRef, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { BuildingSpecification } from '../../types/buildingSpec';
import {
  createBuildingBody,
  createFloorSeparators,
  createRoof,
  createWindows,
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

    // Create floor separators
    const floors = createFloorSeparators(spec);
    group.add(floors);

    // Create roof
    const roof = createRoof(spec);

    // Apply roof texture
    let roofTexture: THREE.Texture;
    if (spec.customRoofTexture) {
      roofTexture = loadTextureFromDataURL(spec.customRoofTexture);
    } else {
      const roofTexturePath = getTexturePath(spec.roofTexture, 'roof');
      roofTexture = loadTexture(roofTexturePath);
    }

    roofTexture.repeat.set(spec.width / 2, spec.depth / 2);

    if (roof.material instanceof THREE.Material) {
      (roof.material as THREE.MeshStandardMaterial).map = roofTexture;
      (roof.material as THREE.MeshStandardMaterial).needsUpdate = true;
    }

    group.add(roof);

    // Create windows
    const windows = createWindows(spec);
    group.add(windows);

    return group;
  }, [spec]);

  return <primitive object={buildingGroup} ref={groupRef} />;
});

Building.displayName = 'Building';
