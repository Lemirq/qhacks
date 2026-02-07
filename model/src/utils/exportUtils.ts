import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import * as THREE from 'three';
import { BuildingSpecification, BuildingExportData } from '../types/buildingSpec';

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
