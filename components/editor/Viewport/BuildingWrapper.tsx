import { useRef } from 'react';
import * as THREE from 'three';
import { Building } from './Building';
import { SelectionIndicator } from './SelectionIndicator';
import type { BuildingInstance } from '@/lib/editor/types/buildingSpec';
import { useBuildings } from '@/lib/editor/contexts/BuildingsContext';

interface BuildingWrapperProps {
  building: BuildingInstance;
  isSelected: boolean;
  onSelect: () => void;
}

export function BuildingWrapper({ building, isSelected, onSelect }: BuildingWrapperProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { placementMode, addBuilding } = useBuildings();

  const handleClick = (e: any) => {
    e.stopPropagation();

    if (placementMode) {
      // In placement mode, stack a new building on top of this one
      const buildingHeight = building.spec.floorHeight * building.spec.numberOfFloors;
      const newY = building.position.y + buildingHeight;
      addBuilding({
        x: building.position.x,
        y: newY,
        z: building.position.z
      });
    } else {
      onSelect();
    }
  };

  return (
    <group
      ref={groupRef}
      position={[building.position.x, building.position.y, building.position.z]}
      rotation={[0, building.rotation, 0]}
      onClick={handleClick}
    >
      <Building spec={building.spec} />
      {isSelected && <SelectionIndicator spec={building.spec} />}
    </group>
  );
}
