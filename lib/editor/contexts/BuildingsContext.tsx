import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { BuildingInstance, BuildingSpecification, BuildingId } from '@/lib/editor/types/buildingSpec';
import { DEFAULT_BUILDING_SPEC } from '@/lib/editor/types/buildingSpec';

interface BuildingsContextType {
  buildings: BuildingInstance[];
  selectedBuildingId: BuildingId | null;
  placementMode: boolean;

  // Building management
  addBuilding: (position: { x: number; y: number; z: number }, spec?: Partial<BuildingSpecification>) => BuildingId;
  removeBuilding: (id: BuildingId) => void;
  updateBuilding: (id: BuildingId, updates: Partial<BuildingSpecification>) => void;
  selectBuilding: (id: BuildingId | null) => void;

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
  const [placementMode, setPlacementMode] = useState(false);

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

  const selectBuilding = useCallback((id: BuildingId | null) => {
    setSelectedBuildingId(id);
    setPlacementMode(false);
  }, []);

  const getSelectedBuilding = useCallback(() => {
    if (!selectedBuildingId) return null;
    return buildings.find(b => b.id === selectedBuildingId) || null;
  }, [buildings, selectedBuildingId]);

  const value: BuildingsContextType = {
    buildings,
    selectedBuildingId,
    placementMode,
    addBuilding,
    removeBuilding,
    updateBuilding,
    selectBuilding,
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
