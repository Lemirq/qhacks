import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import * as THREE from 'three';
import { BuildingSpecification, BuildingExportData, BuildingInstance, MultiBuildingExportData } from '@/lib/editor/types/buildingSpec';

/**
 * Export building as GLTF (text-based JSON format)
 * Optimized for Mapbox - no textures, geometry only
 */
export function exportToGLTF(buildingGroup: THREE.Group, filename: string = 'building.gltf'): Promise<string> {
  return new Promise((resolve, reject) => {
    const exporter = new GLTFExporter();

    // Clone the group to avoid modifying the original
    const clonedGroup = buildingGroup.clone();

    // Remove textures and simplify materials for Mapbox
    clonedGroup.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        // Replace material with simple untextured material
        const originalMaterial = object.material as THREE.Material;
        object.material = new THREE.MeshStandardMaterial({
          color: (originalMaterial as any).color || 0xcccccc,
          flatShading: false,
          metalness: 0,
          roughness: 1,
        });
      }
    });

    exporter.parse(
      clonedGroup,
      (result) => {
        // result is a JSON object for GLTF
        const gltfString = JSON.stringify(result, null, 2);
        const blob = new Blob([gltfString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        // Trigger download
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        resolve(gltfString);
      },
      (error) => {
        console.error('Export failed:', error);
        reject(error);
      },
      {
        binary: false, // GLTF (JSON) format
        onlyVisible: true,
        truncateDrawRange: true,
        maxTextureSize: 0, // No textures
      }
    );
  });
}

/**
 * Export building as GLB (binary format) - for download/backup
 */
export function exportToGLB(buildingGroup: THREE.Group, filename: string = 'building.glb'): Promise<void> {
  return new Promise((resolve, reject) => {
    const exporter = new GLTFExporter();

    exporter.parse(
      buildingGroup,
      (result) => {
        // result is an ArrayBuffer for GLB
        const blob = new Blob([result as ArrayBuffer], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);

        // Trigger download
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        resolve();
      },
      (error) => {
        console.error('Export failed:', error);
        reject(error);
      },
      { binary: true } // GLB format
    );
  });
}

/**
 * Save building GLTF to server for use in map
 */
export async function saveGLTFToServer(
  buildingGroup: THREE.Group,
  buildingId: string
): Promise<string> {
  console.log('[ExportUtils] Saving GLTF to server:', buildingId);

  const exporter = new GLTFExporter();

  return new Promise((resolve, reject) => {
    // Clone and simplify for Mapbox (no textures)
    const clonedGroup = buildingGroup.clone();
    clonedGroup.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        const originalMaterial = object.material as THREE.Material;
        object.material = new THREE.MeshStandardMaterial({
          color: (originalMaterial as any).color || 0xcccccc,
          flatShading: false,
          metalness: 0,
          roughness: 1,
        });
      }
    });

    exporter.parse(
      clonedGroup,
      async (result) => {
        try {
          const gltfString = JSON.stringify(result, null, 2);

          // Send to API route to save locally
          const response = await fetch('/api/models/save', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              buildingId,
              gltfData: gltfString,
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to save GLTF to server');
          }

          const data = await response.json();
          console.log('[ExportUtils] GLTF saved successfully:', data.filePath);
          resolve(data.filePath);
        } catch (error) {
          console.error('[ExportUtils] Error saving GLTF:', error);
          reject(error);
        }
      },
      (error) => {
        console.error('[ExportUtils] Export failed:', error);
        reject(error);
      },
      {
        binary: false,
        onlyVisible: true,
        truncateDrawRange: true,
        maxTextureSize: 0,
      }
    );
  });
}

/**
 * Export multiple buildings as GLTF (for Mapbox)
 */
export function exportMultiBuildingsToGLTF(scene: THREE.Scene, filename: string = 'buildings.gltf'): Promise<string> {
  return new Promise((resolve, reject) => {
    const exporter = new GLTFExporter();

    // Clone scene to avoid modifying original
    const clonedScene = new THREE.Scene();
    scene.children.forEach((child) => {
      if (child instanceof THREE.Group || child instanceof THREE.Mesh) {
        const clonedChild = child.clone();
        clonedChild.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            const originalMaterial = object.material as THREE.Material;
            object.material = new THREE.MeshStandardMaterial({
              color: (originalMaterial as any).color || 0xcccccc,
              flatShading: false,
              metalness: 0,
              roughness: 1,
            });
          }
        });
        clonedScene.add(clonedChild);
      }
    });

    exporter.parse(
      clonedScene,
      (result) => {
        const gltfString = JSON.stringify(result, null, 2);
        const blob = new Blob([gltfString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        resolve(gltfString);
      },
      (error) => {
        console.error('Multi-building export failed:', error);
        reject(error);
      },
      {
        binary: false,
        onlyVisible: true,
        truncateDrawRange: true,
        maxTextureSize: 0,
      }
    );
  });
}

// Multi-building GLB export (backup/download)
export function exportMultiBuildingsToGLB(scene: THREE.Scene, filename: string = 'buildings.glb'): Promise<void> {
  return new Promise((resolve, reject) => {
    const exporter = new GLTFExporter();

    exporter.parse(
      scene,
      (result) => {
        const blob = new Blob([result as ArrayBuffer], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        resolve();
      },
      (error) => {
        console.error('Multi-building export failed:', error);
        reject(error);
      },
      { binary: true }
    );
  });
}

export function exportToJSON(
  spec: BuildingSpecification,
  filename: string = 'building-spec.json'
): void {
  const exportData: BuildingExportData = {
    version: '1.0',
    building: spec,
    position: {
      longitude: null,
      latitude: null,
      altitude: 0,
      rotation: 0,
    },
    metadata: {
      createdAt: new Date().toISOString(),
    },
  };

  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Multi-building JSON export
export function exportMultiBuildingsToJSON(
  buildings: BuildingInstance[],
  filename: string = 'buildings-spec.json'
): void {
  const exportData: MultiBuildingExportData = {
    version: '2.0',
    buildings,
    metadata: {
      createdAt: new Date().toISOString(),
    },
  };

  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function copyToClipboard(spec: BuildingSpecification): Promise<void> {
  const exportData: BuildingExportData = {
    version: '1.0',
    building: spec,
    position: {
      longitude: null,
      latitude: null,
      altitude: 0,
      rotation: 0,
    },
    metadata: {
      createdAt: new Date().toISOString(),
    },
  };

  const json = JSON.stringify(exportData, null, 2);
  return navigator.clipboard.writeText(json);
}

// Multi-building clipboard copy
export function copyMultiBuildingsToClipboard(buildings: BuildingInstance[]): Promise<void> {
  const exportData: MultiBuildingExportData = {
    version: '2.0',
    buildings,
    metadata: {
      createdAt: new Date().toISOString(),
    },
  };

  const json = JSON.stringify(exportData, null, 2);
  return navigator.clipboard.writeText(json);
}

export function importFromJSON(jsonString: string): BuildingSpecification | null {
  try {
    const data: BuildingExportData = JSON.parse(jsonString);
    if (data.version === '1.0' && data.building) {
      return data.building;
    }
    return null;
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return null;
  }
}

// Multi-building JSON import
export function importMultiBuildingsFromJSON(jsonString: string): BuildingInstance[] | null {
  try {
    const data: MultiBuildingExportData = JSON.parse(jsonString);
    if (data.version === '2.0' && data.buildings) {
      return data.buildings;
    }
    return null;
  } catch (error) {
    console.error('Error parsing multi-building JSON:', error);
    return null;
  }
}
