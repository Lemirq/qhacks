import { useMemo } from 'react';
import * as THREE from 'three';
import type { BuildingSpecification } from '@/lib/editor/types/buildingSpec';

interface SelectionIndicatorProps {
  spec: BuildingSpecification;
}

export function SelectionIndicator({ spec }: SelectionIndicatorProps) {
  const totalHeight = spec.floorHeight * spec.numberOfFloors + spec.roofHeight;

  const outlineGeometry = useMemo(() => {
    // Create a slightly larger box outline around the building
    const padding = 0.5;
    const width = spec.width + padding;
    const depth = spec.depth + padding;
    const height = totalHeight + padding;

    const edges = new THREE.EdgesGeometry(
      new THREE.BoxGeometry(width, height, depth)
    );
    return edges;
  }, [spec.width, spec.depth, totalHeight]);

  return (
    <lineSegments
      geometry={outlineGeometry}
      position={[0, totalHeight / 2, 0]}
    >
      <lineBasicMaterial color="#3b82f6" linewidth={2} />
    </lineSegments>
  );
}
