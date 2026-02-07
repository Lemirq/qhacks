import { useState, useEffect } from 'react';
import * as THREE from 'three';
import { useBuildings } from '@/lib/editor/contexts/BuildingsContext';
import {
  exportMultiBuildingsToGLB,
  exportMultiBuildingsToGLTF,
  exportMultiBuildingsToJSON,
  copyMultiBuildingsToClipboard,
  saveGLTFToServer
} from '@/lib/editor/utils/exportUtils';
import { saveBuildingsFromEditor, getSavedBuildings, cleanupTemplatesWithoutModels } from '@/lib/map/services/buildingStorage';

interface ExportBarProps {
  sceneRef: React.MutableRefObject<THREE.Scene | null>;
}

export function ExportBar({ sceneRef }: ExportBarProps) {
  const { buildings } = useBuildings();
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savedToMap, setSavedToMap] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  // Load saved count on client-side only (only count those with models)
  useEffect(() => {
    const templatesWithModels = getSavedBuildings().filter(t => t.gltfPath);
    setSavedCount(templatesWithModels.length);
  }, []);

  const handleExportGLTF = async () => {
    if (!sceneRef.current) {
      alert('Scene not ready for export');
      return;
    }

    setExporting(true);
    try {
      await exportMultiBuildingsToGLTF(sceneRef.current);
      alert(`Successfully exported ${buildings.length} building${buildings.length > 1 ? 's' : ''} as GLTF!`);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export GLTF. Check console for details.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportGLB = async () => {
    if (!sceneRef.current) {
      alert('Scene not ready for export');
      return;
    }

    setExporting(true);
    try {
      await exportMultiBuildingsToGLB(sceneRef.current);
      alert(`Successfully exported ${buildings.length} building${buildings.length > 1 ? 's' : ''} as GLB!`);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export GLB. Check console for details.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportJSON = () => {
    exportMultiBuildingsToJSON(buildings);
  };

  const handleCopyJSON = async () => {
    try {
      await copyMultiBuildingsToClipboard(buildings);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
      alert('Failed to copy to clipboard');
    }
  };

  /**
   * Save buildings to localStorage for use on the map
   * Also exports each building as GLTF and saves to server
   *
   * KEY CONCEPT:
   * - Saves building specs to localStorage
   * - Exports each building as GLTF (no textures, optimized for Mapbox)
   * - Saves GLTF files to /public/models/ directory
   * - Stores GLTF file paths in building templates
   *
   * DEBUGGING:
   * - Check console for [BuildingStorage] logs
   * - Check localStorage key: 'qhacks-saved-buildings'
   * - Check /public/models/ directory for GLTF files
   */
  const handleSaveToMap = async () => {
    if (buildings.length === 0) {
      alert('No buildings to save');
      return;
    }

    if (!sceneRef.current) {
      alert('Scene not ready for export');
      return;
    }

    console.log('[ExportBar] Saving buildings to map storage:', buildings.length);
    setExporting(true);

    try {
      // Get all building groups from the scene
      // The buildingId is set on the group, not individual meshes
      const buildingGroups: { [key: string]: THREE.Group } = {};

      sceneRef.current.traverse((object) => {
        // Find groups with buildingId (these are the BuildingWrapper groups)
        if (object.userData.buildingId && object instanceof THREE.Group) {
          const buildingId = object.userData.buildingId;
          if (!buildingGroups[buildingId]) {
            // Clone the entire group with all its children (meshes, materials, etc.)
            const clonedGroup = object.clone(true);
            buildingGroups[buildingId] = clonedGroup;
            console.log(`[ExportBar] Found building group: ${buildingId} with ${clonedGroup.children.length} children`);
          }
        }
      });

      // Save each building as GLTF
      const buildingsWithGLTF = await Promise.all(
        buildings.map(async (building) => {
          try {
            const group = buildingGroups[building.id];
            if (group && group.children.length > 0) {
              console.log(`[ExportBar] Exporting GLTF for building: ${building.id}`);
              const gltfPath = await saveGLTFToServer(group, building.id);
              console.log(`[ExportBar] GLTF saved at: ${gltfPath}`);
              return { ...building, gltfPath };
            } else {
              console.warn(`[ExportBar] No geometry found for building: ${building.id}`);
              return building;
            }
          } catch (error) {
            console.error(`[ExportBar] Failed to export GLTF for ${building.id}:`, error);
            return building; // Save without GLTF path if export fails
          }
        })
      );

      // Save to localStorage with GLTF paths
      saveBuildingsFromEditor(buildingsWithGLTF);
      setSavedToMap(true);
      const templatesWithModels = getSavedBuildings().filter(t => t.gltfPath);
      setSavedCount(templatesWithModels.length);
      setTimeout(() => setSavedToMap(false), 2000);

      console.log('[ExportBar] Buildings saved successfully with GLTF models');
      alert(`Successfully saved ${buildings.length} building(s) with 3D models!`);
    } catch (error) {
      console.error('[ExportBar] Error saving buildings:', error);
      alert('Failed to save some buildings. Check console for details.');
    } finally {
      setExporting(false);
    }
  };

  /**
   * Clean up old saved buildings without GLTF models
   */
  const handleCleanup = () => {
    const removed = cleanupTemplatesWithoutModels();
    const templatesWithModels = getSavedBuildings().filter(t => t.gltfPath);
    setSavedCount(templatesWithModels.length);

    if (removed > 0) {
      alert(`Cleaned up ${removed} old building(s) without 3D models.\n${templatesWithModels.length} valid building(s) remaining.`);
    } else {
      alert('No cleanup needed. All saved buildings have 3D models.');
    }
  };

  return (
    <div className="w-full bg-gray-800 text-white p-4 border-t border-gray-700">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="text-sm">
          <span className="font-semibold">Export Options</span>
          <span className="ml-3 text-gray-400">
            {buildings.length} building{buildings.length > 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportGLTF}
            disabled={exporting}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 rounded-md font-medium text-sm transition-colors"
          >
            {exporting ? 'Exporting...' : 'Download GLTF'}
          </button>

          <button
            onClick={handleExportGLB}
            disabled={exporting}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 disabled:opacity-50 rounded-md font-medium text-sm transition-colors"
          >
            {exporting ? 'Exporting...' : 'Download GLB'}
          </button>

          <button
            onClick={handleExportJSON}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md font-medium text-sm transition-colors"
          >
            Download JSON
          </button>

          <button
            onClick={handleCopyJSON}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-md font-medium text-sm transition-colors"
          >
            {copied ? 'Copied!' : 'Copy JSON'}
          </button>

          {/* Divider */}
          <div className="w-px h-8 bg-gray-600" />

          {/* Save to Map button */}
          <button
            onClick={handleSaveToMap}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-md font-medium text-sm transition-colors"
          >
            {savedToMap ? 'Saved!' : 'Save to Map'}
          </button>

          {/* Show saved count */}
          {savedCount > 0 && (
            <span className="text-xs text-gray-400">
              ({savedCount} saved)
            </span>
          )}

          {/* Cleanup button */}
          <button
            onClick={handleCleanup}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-xs transition-colors"
            title="Remove old buildings without 3D models"
          >
            🧹 Cleanup
          </button>
        </div>
      </div>
    </div>
  );
}
