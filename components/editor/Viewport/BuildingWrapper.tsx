import { useRef } from 'react';
import * as THREE from 'three';
import { Building } from './Building';
import { SelectionIndicator } from './SelectionIndicator';
import type { BuildingInstance } from '@/lib/editor/types/buildingSpec';

interface BuildingWrapperProps {
  building: BuildingInstance;
  isSelected: boolean;
  onSelect: () => void;
}

export function BuildingWrapper({ building, isSelected, onSelect }: BuildingWrapperProps) {
  const groupRef = useRef<THREE.Group>(null);

  const handleClick = (e: any) => {
    e.stopPropagation();
    onSelect();
  };

  return (
    <group
      ref={groupRef}
      position={[building.position.x, 0, building.position.z]}
      rotation={[0, building.rotation, 0]}
      onClick={handleClick}
      userData={{ buildingId: building.id }}
    >
      <Building spec={building.spec} />
      {isSelected && <SelectionIndicator spec={building.spec} />}
    </group>
  );
}
