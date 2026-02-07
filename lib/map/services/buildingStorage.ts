/**
 * buildingStorage.ts
 *
 * PURPOSE: Manages saving and loading buildings between the editor and map
 *
 * KEY CONCEPTS:
 * - Uses localStorage to persist buildings
 * - Buildings saved from editor can be placed on map
 * - Supports multiple saved building templates
 *
 * DEBUGGING:
 * - All operations logged with [BuildingStorage] prefix
 * - Check localStorage key: 'qhacks-saved-buildings'
 */

import type { BuildingSpecification, BuildingInstance } from '@/lib/editor/types/buildingSpec';

// A saved building template (from the editor)
export interface SavedBuildingTemplate {
  id: string;
  name: string;
  spec: BuildingSpecification;
  savedAt: string;
  thumbnail?: string; // Optional base64 thumbnail
  gltfPath?: string; // Path to saved GLTF model (e.g., /models/building-123.gltf)
}

const STORAGE_KEY = 'qhacks-saved-buildings';

/**
 * Get all saved building templates from localStorage
 */
export function getSavedBuildings(): SavedBuildingTemplate[] {
  if (typeof window === 'undefined') return [];

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      console.log('[BuildingStorage] No saved buildings found');
      return [];
    }

    const buildings = JSON.parse(data) as SavedBuildingTemplate[];
    console.log(`[BuildingStorage] Loaded ${buildings.length} saved buildings`);
    return buildings;
  } catch (error) {
    console.error('[BuildingStorage] Error loading buildings:', error);
    return [];
  }
}

/**
 * Save a building template from the editor
 */
export function saveBuildingTemplate(
  name: string,
  spec: BuildingSpecification,
  thumbnail?: string
): SavedBuildingTemplate {
  const template: SavedBuildingTemplate = {
    id: `template-${Date.now()}`,
    name,
    spec,
    savedAt: new Date().toISOString(),
    thumbnail,
  };

  const existing = getSavedBuildings();
  const updated = [...existing, template];

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    console.log(`[BuildingStorage] Saved building template: ${template.id}`, {
      name: template.name,
      floors: spec.numberOfFloors,
      dimensions: `${spec.width}x${spec.depth}m`,
    });
  } catch (error) {
    console.error('[BuildingStorage] Error saving building:', error);
  }

  return template;
}

/**
 * Save multiple buildings from the editor
 */
export function saveBuildingsFromEditor(buildings: BuildingInstance[]): SavedBuildingTemplate[] {
  const templates: SavedBuildingTemplate[] = buildings.map(building => ({
    id: `template-${Date.now()}-${building.id}`,
    name: building.name,
    spec: building.spec,
    savedAt: new Date().toISOString(),
    gltfPath: building.gltfPath, // Preserve the GLTF path from editor export
  }));

  const existing = getSavedBuildings();
  const updated = [...existing, ...templates];

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    console.log(`[BuildingStorage] Saved ${templates.length} building templates`);
    templates.forEach(t => {
      console.log(`  - ${t.name}: ${t.gltfPath || 'no GLTF'}`);
    });
  } catch (error) {
    console.error('[BuildingStorage] Error saving buildings:', error);
  }

  return templates;
}

/**
 * Delete a saved building template
 */
export function deleteBuildingTemplate(id: string): void {
  const existing = getSavedBuildings();
  const updated = existing.filter(b => b.id !== id);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    console.log(`[BuildingStorage] Deleted building template: ${id}`);
  } catch (error) {
    console.error('[BuildingStorage] Error deleting building:', error);
  }
}

/**
 * Clear all saved building templates
 */
export function clearAllBuildingTemplates(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('[BuildingStorage] Cleared all building templates');
  } catch (error) {
    console.error('[BuildingStorage] Error clearing buildings:', error);
  }
}

/**
 * Clean up building templates without GLTF files
 * Removes old entries that don't have 3D models associated
 */
export function cleanupTemplatesWithoutModels(): number {
  try {
    const existing = getSavedBuildings();
    const validTemplates = existing.filter(t => t.gltfPath);
    const removedCount = existing.length - validTemplates.length;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(validTemplates));
    console.log(`[BuildingStorage] Cleaned up ${removedCount} templates without models`);
    console.log(`[BuildingStorage] Remaining templates: ${validTemplates.length}`);

    return removedCount;
  } catch (error) {
    console.error('[BuildingStorage] Error cleaning up templates:', error);
    return 0;
  }
}

/**
 * Get a specific building template by ID
 */
export function getBuildingTemplateById(id: string): SavedBuildingTemplate | null {
  const buildings = getSavedBuildings();
  return buildings.find(b => b.id === id) || null;
}

/**
 * Get the most recently saved building template
 */
export function getLatestBuildingTemplate(): SavedBuildingTemplate | null {
  const buildings = getSavedBuildings();
  if (buildings.length === 0) return null;

  // Sort by savedAt descending and return the first one
  const sorted = [...buildings].sort((a, b) =>
    new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  );

  console.log(`[BuildingStorage] Latest building: ${sorted[0].name}`);
  return sorted[0];
}
