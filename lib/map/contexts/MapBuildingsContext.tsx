/**
 * MapBuildingsContext.tsx
 *
 * PURPOSE: Manages buildings placed on the Mapbox map
 *
 * KEY CONCEPTS:
 * - Buildings are stored with lat/lng coordinates (unlike editor which uses x/z meters)
 * - placementMode: when true, clicking on map places a building
 * - Each building has a unique ID, coordinates, rotation, and optional GLB data
 *
 * DEBUGGING:
 * - All state changes are logged to console with [MapBuildings] prefix
 * - Check console for building add/remove/update operations
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { BuildingSpecification } from '@/lib/editor/types/buildingSpec';

// Local default spec to avoid circular dependency issues during SSR
const DEFAULT_BUILDING_SPEC: BuildingSpecification = {
  width: 20,
  depth: 15,
  floorHeight: 3.5,
  numberOfFloors: 3,
  roofType: 'flat',
  roofHeight: 3,
  wallTexture: 'brick',
  roofTexture: 'shingle',
  windowTexture: 'glass',
  windowPattern: 'grid',
  windowRows: 4,
  windowWidth: 1.2,
  windowHeight: 1.8,
  doorWidth: 1.5,
  doorHeight: 2.4,
  doorPosition: 0.5,
};

// Building placed on the map with geographic coordinates
export interface MapBuilding {
  id: string;
  name: string;
  coordinates: {
    lng: number;
    lat: number;
  };
  altitude: number;        // meters above ground
  rotation: number;        // degrees
  scale: number;           // scale multiplier
  spec: BuildingSpecification;
  glbData?: ArrayBuffer;   // optional GLB binary data
  gltfPath?: string;       // path to GLTF model file (e.g., /models/building-123.gltf)
}

interface MapBuildingsContextType {
  // State
  buildings: MapBuilding[];
  selectedBuildingId: string | null;
  placementMode: boolean;

  // Building management
  addBuilding: (coordinates: { lng: number; lat: number }, spec?: BuildingSpecification, name?: string, gltfPath?: string) => string;
  removeBuilding: (id: string) => void;
  updateBuilding: (id: string, updates: Partial<Omit<MapBuilding, 'id'>>) => void;
  selectBuilding: (id: string | null) => void;

  // Placement mode
  setPlacementMode: (enabled: boolean) => void;
  togglePlacementMode: () => void;

  // Helpers
  getSelectedBuilding: () => MapBuilding | null;
  getBuildingById: (id: string) => MapBuilding | null;
}

const MapBuildingsContext = createContext<MapBuildingsContextType | undefined>(undefined);

interface MapBuildingsProviderProps {
  children: ReactNode;
}

export function MapBuildingsProvider({ children }: MapBuildingsProviderProps) {
  const [buildings, setBuildings] = useState<MapBuilding[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [placementMode, setPlacementModeState] = useState(false);

  // Add a new building at the specified coordinates
  const addBuilding = useCallback((
    coordinates: { lng: number; lat: number },
    spec?: BuildingSpecification,
    name?: string,
    gltfPath?: string
  ) => {
    const newId = `map-building-${Date.now()}`;
    const buildingNumber = buildings.length + 1;

    const newBuilding: MapBuilding = {
      id: newId,
      name: name || `Building ${buildingNumber}`,
      coordinates,
      altitude: 0,
      rotation: 0,
      scale: 1,
      spec: spec ? { ...spec } : { ...DEFAULT_BUILDING_SPEC },
      gltfPath,
    };

    console.log(`[MapBuildings] Adding building:`, {
      id: newId,
      coordinates,
      name: newBuilding.name,
      spec: newBuilding.spec,
      gltfPath: newBuilding.gltfPath,
    });

    setBuildings(prev => [...prev, newBuilding]);
    setSelectedBuildingId(newId);
    setPlacementModeState(false); // Exit placement mode after placing

    console.log(`[MapBuildings] Building added successfully. Total buildings: ${buildings.length + 1}`);

    return newId;
  }, [buildings.length]);

  // Remove a building by ID
  const removeBuilding = useCallback((id: string) => {
    console.log(`[MapBuildings] Removing building: ${id}`);

    setBuildings(prev => {
      const filtered = prev.filter(b => b.id !== id);
      console.log(`[MapBuildings] Buildings after removal: ${filtered.length}`);
      return filtered;
    });

    setSelectedBuildingId(prev => {
      if (prev === id) {
        console.log(`[MapBuildings] Deselecting removed building`);
        return null;
      }
      return prev;
    });
  }, []);

  // Update a building's properties
  const updateBuilding = useCallback((id: string, updates: Partial<Omit<MapBuilding, 'id'>>) => {
    console.log(`[MapBuildings] Updating building ${id}:`, updates);

    setBuildings(prev => prev.map(building => {
      if (building.id === id) {
        const updated = {
          ...building,
          ...updates,
          spec: updates.spec ? { ...building.spec, ...updates.spec } : building.spec,
        };
        console.log(`[MapBuildings] Building ${id} updated:`, updated);
        return updated;
      }
      return building;
    }));
  }, []);

  // Select a building
  const selectBuilding = useCallback((id: string | null) => {
    console.log(`[MapBuildings] Selecting building: ${id}`);
    setSelectedBuildingId(id);
  }, []);

  // Set placement mode
  const setPlacementMode = useCallback((enabled: boolean) => {
    console.log(`[MapBuildings] Placement mode: ${enabled ? 'ENABLED' : 'DISABLED'}`);
    setPlacementModeState(enabled);
    if (enabled) {
      setSelectedBuildingId(null); // Deselect when entering placement mode
    }
  }, []);

  // Toggle placement mode
  const togglePlacementMode = useCallback(() => {
    setPlacementModeState(prev => {
      const newState = !prev;
      console.log(`[MapBuildings] Placement mode toggled: ${newState ? 'ENABLED' : 'DISABLED'}`);
      if (newState) {
        setSelectedBuildingId(null);
      }
      return newState;
    });
  }, []);

  // Get the currently selected building
  const getSelectedBuilding = useCallback(() => {
    if (!selectedBuildingId) return null;
    return buildings.find(b => b.id === selectedBuildingId) || null;
  }, [buildings, selectedBuildingId]);

  // Get a building by ID
  const getBuildingById = useCallback((id: string) => {
    return buildings.find(b => b.id === id) || null;
  }, [buildings]);

  const value: MapBuildingsContextType = {
    buildings,
    selectedBuildingId,
    placementMode,
    addBuilding,
    removeBuilding,
    updateBuilding,
    selectBuilding,
    setPlacementMode,
    togglePlacementMode,
    getSelectedBuilding,
    getBuildingById,
  };

  return (
    <MapBuildingsContext.Provider value={value}>
      {children}
    </MapBuildingsContext.Provider>
  );
}

export function useMapBuildings() {
  const context = useContext(MapBuildingsContext);
  if (!context) {
    throw new Error('useMapBuildings must be used within a MapBuildingsProvider');
  }
  return context;
}

// Export for optional use without provider (returns null if not in provider)
export function useMapBuildingsOptional() {
  return useContext(MapBuildingsContext);
}
