import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { BuildingInstance, BuildingSpecification, BuildingId } from '@/lib/editor/types/buildingSpec';
import { DEFAULT_BUILDING_SPEC } from '@/lib/editor/types/buildingSpec';

interface BuildingsContextType {
  buildings: BuildingInstance[];
  selectedBuildingId: BuildingId | null;
  selectedBuildingIds: BuildingId[];  // For multi-select (merge feature)
  placementMode: boolean;
  mergeMode: boolean;

  // Building management
  addBuilding: (position: { x: number; y: number; z: number }, spec?: Partial<BuildingSpecification>) => BuildingId;
  removeBuilding: (id: BuildingId) => void;
  updateBuilding: (id: BuildingId, updates: Partial<BuildingSpecification>) => void;
  updateBuildingRotation: (id: BuildingId, rotation: number) => void;
  selectBuilding: (id: BuildingId | null) => void;
  toggleBuildingSelection: (id: BuildingId) => void;  // For multi-select
  clearSelection: () => void;

  // Merge functionality
  setMergeMode: (enabled: boolean) => void;
  mergeBuildings: () => void;  // Merges selected buildings

  // Placement mode
  setPlacementMode: (enabled: boolean) => void;

  // Get selected building
  getSelectedBuilding: () => BuildingInstance | null;
}

const BuildingsContext = createContext<BuildingsContextType | undefined>(undefined);

interface BuildingsProviderProps {
  children: ReactNode;
}

export function BuildingsProvider({ children }: BuildingsProviderProps) {
  const [buildings, setBuildings] = useState<BuildingInstance[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<BuildingId | null>(null);
  const [selectedBuildingIds, setSelectedBuildingIds] = useState<BuildingId[]>([]);
  const [placementMode, setPlacementMode] = useState(false);
  const [mergeMode, setMergeMode] = useState(false);

  const addBuilding = useCallback((position: { x: number; y: number; z: number }, spec?: Partial<BuildingSpecification>) => {
    const newId = `building-${Date.now()}`;
    const buildingNumber = buildings.length + 1;

    const newBuilding: BuildingInstance = {
      id: newId,
      name: `Building ${buildingNumber}`,
      position,
      rotation: 0,
      spec: { ...DEFAULT_BUILDING_SPEC, ...spec },
    };

    setBuildings(prev => [...prev, newBuilding]);
    setSelectedBuildingId(newId);
    setPlacementMode(false);

    return newId;
  }, [buildings.length]);

  const removeBuilding = useCallback((id: BuildingId) => {
    setBuildings(prev => prev.filter(b => b.id !== id));
    setSelectedBuildingId(prev => {
      if (prev === id) {
        const remaining = buildings.filter(b => b.id !== id);
        return remaining.length > 0 ? remaining[0].id : null;
      }
      return prev;
    });
  }, [buildings]);

  const updateBuilding = useCallback((id: BuildingId, updates: Partial<BuildingSpecification>) => {
    setBuildings(prev => prev.map(building => {
      if (building.id === id) {
        const newSpec = { ...building.spec, ...updates };

        // Auto-calculate windowColumns from numberOfFloors if not explicitly set
        if (updates.numberOfFloors !== undefined && updates.windowColumns === undefined) {
          newSpec.windowColumns = newSpec.numberOfFloors;
        }

        return { ...building, spec: newSpec };
      }
      return building;
    }));
  }, []);

  const updateBuildingRotation = useCallback((id: BuildingId, rotation: number) => {
    setBuildings(prev => prev.map(building => {
      if (building.id === id) {
        return { ...building, rotation };
      }
      return building;
    }));
  }, []);

  const selectBuilding = useCallback((id: BuildingId | null) => {
    setSelectedBuildingId(id);
    setSelectedBuildingIds(id ? [id] : []);
    setPlacementMode(false);
    setMergeMode(false);
  }, []);

  const toggleBuildingSelection = useCallback((id: BuildingId) => {
    setSelectedBuildingIds(prev => {
      if (prev.includes(id)) {
        const newSelection = prev.filter(bid => bid !== id);
        // Update primary selection if needed
        if (selectedBuildingId === id) {
          setSelectedBuildingId(newSelection.length > 0 ? newSelection[0] : null);
        }
        return newSelection;
      } else {
        // Add to selection
        if (prev.length === 0) {
          setSelectedBuildingId(id);
        }
        return [...prev, id];
      }
    });
  }, [selectedBuildingId]);

  const clearSelection = useCallback(() => {
    setSelectedBuildingId(null);
    setSelectedBuildingIds([]);
    setMergeMode(false);
  }, []);

  const mergeBuildings = useCallback(() => {
    if (selectedBuildingIds.length < 2) return;

    // Get the first selected building (primary) - its properties will be inherited
    const primaryBuilding = buildings.find(b => b.id === selectedBuildingIds[0]);
    if (!primaryBuilding) return;

    // Get all other selected buildings
    const buildingsToMerge = buildings.filter(
      b => selectedBuildingIds.includes(b.id) && b.id !== primaryBuilding.id
    );

    if (buildingsToMerge.length === 0) return;

    // Calculate bounding box of all selected buildings
    let minX = primaryBuilding.position.x - primaryBuilding.spec.width / 2;
    let maxX = primaryBuilding.position.x + primaryBuilding.spec.width / 2;
    let minZ = primaryBuilding.position.z - primaryBuilding.spec.depth / 2;
    let maxZ = primaryBuilding.position.z + primaryBuilding.spec.depth / 2;
    let minY = primaryBuilding.position.y;
    let maxY = primaryBuilding.position.y + primaryBuilding.spec.floorHeight * primaryBuilding.spec.numberOfFloors;

    for (const building of buildingsToMerge) {
      minX = Math.min(minX, building.position.x - building.spec.width / 2);
      maxX = Math.max(maxX, building.position.x + building.spec.width / 2);
      minZ = Math.min(minZ, building.position.z - building.spec.depth / 2);
      maxZ = Math.max(maxZ, building.position.z + building.spec.depth / 2);
      minY = Math.min(minY, building.position.y);
      maxY = Math.max(maxY, building.position.y + building.spec.floorHeight * building.spec.numberOfFloors);
    }

    // Create merged building with combined dimensions and primary's properties
    const mergedWidth = maxX - minX;
    const mergedDepth = maxZ - minZ;
    const mergedHeight = maxY - minY;
    const mergedFloors = Math.round(mergedHeight / primaryBuilding.spec.floorHeight);

    const mergedBuilding: BuildingInstance = {
      id: `building-${Date.now()}`,
      name: `${primaryBuilding.name} (Merged)`,
      position: {
        x: (minX + maxX) / 2,
        y: minY,
        z: (minZ + maxZ) / 2,
      },
      rotation: primaryBuilding.rotation,
      spec: {
        ...primaryBuilding.spec,
        width: mergedWidth,
        depth: mergedDepth,
        numberOfFloors: mergedFloors,
      },
    };

    // Remove merged buildings and add the new merged one
    setBuildings(prev => {
      const filtered = prev.filter(b => !selectedBuildingIds.includes(b.id));
      return [...filtered, mergedBuilding];
    });

    // Select the new merged building
    setSelectedBuildingId(mergedBuilding.id);
    setSelectedBuildingIds([mergedBuilding.id]);
    setMergeMode(false);
  }, [buildings, selectedBuildingIds]);

  const getSelectedBuilding = useCallback(() => {
    if (!selectedBuildingId) return null;
    return buildings.find(b => b.id === selectedBuildingId) || null;
  }, [buildings, selectedBuildingId]);

  const value: BuildingsContextType = {
    buildings,
    selectedBuildingId,
    selectedBuildingIds,
    placementMode,
    mergeMode,
    addBuilding,
    removeBuilding,
    updateBuilding,
    updateBuildingRotation,
    selectBuilding,
    toggleBuildingSelection,
    clearSelection,
    setMergeMode,
    mergeBuildings,
    setPlacementMode,
    getSelectedBuilding,
  };

  return (
    <BuildingsContext.Provider value={value}>
      {children}
    </BuildingsContext.Provider>
  );
}

export function useBuildings() {
  const context = useContext(BuildingsContext);
  if (!context) {
    throw new Error('useBuildings must be used within a BuildingsProvider');
  }
  return context;
}
