import { useState } from 'react';
import { useRouter } from 'next/navigation';
import * as THREE from 'three';
import { useBuildings } from '@/lib/editor/contexts/BuildingsContext';
import { exportMultiBuildingsToGLB, exportMultiBuildingsToJSON, copyMultiBuildingsToClipboard, exportToMap } from '@/lib/editor/utils/exportUtils';

interface ExportBarProps {
  sceneRef: React.MutableRefObject<THREE.Scene | null>;
}

export function ExportBar({ sceneRef }: ExportBarProps) {
  const { buildings } = useBuildings();
  const router = useRouter();
  const [exporting, setExporting] = useState(false);
  const [exportingToMap, setExportingToMap] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const handleExportToMap = async () => {
    if (!sceneRef.current) {
      alert('Scene not ready for export');
      return;
    }

    if (buildings.length === 0) {
      alert('No buildings to export. Create a building first!');
      return;
    }

    setExportingToMap(true);
    try {
      const { id } = await exportToMap(sceneRef.current, 'custom-building');
      // Navigate to map with the building ID
      router.push(`/map?buildingId=${id}`);
    } catch (error) {
      console.error('Export to map failed:', error);
      alert('Failed to export to map. Check console for details.');
      setExportingToMap(false);
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

        <div className="flex items-center gap-4">
          <button
            onClick={handleExportGLB}
            disabled={exporting}
            className="px-5 py-2.5 rounded-full font-medium text-sm border-2 bg-gray-700/80 border-blue-400/60 text-blue-300 hover:bg-blue-500 hover:border-blue-400 hover:text-white hover:shadow-[0_8px_25px_-5px_rgba(59,130,246,0.35)] hover:-translate-y-0.5 active:translate-y-0 disabled:bg-gray-700 disabled:border-gray-600 disabled:text-gray-500 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none transition-all duration-200 ease-out"
          >
            {exporting ? 'Exporting...' : 'Download GLB'}
          </button>

          <button
            onClick={handleExportJSON}
            className="px-5 py-2.5 rounded-full font-medium text-sm border-2 bg-gray-700/80 border-emerald-400/60 text-emerald-300 hover:bg-emerald-500 hover:border-emerald-400 hover:text-white hover:shadow-[0_8px_25px_-5px_rgba(16,185,129,0.35)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 ease-out"
          >
            Download JSON
          </button>

          <button
            onClick={handleCopyJSON}
            className="px-5 py-2.5 rounded-full font-medium text-sm border-2 bg-gray-700/80 border-violet-400/60 text-violet-300 hover:bg-violet-500 hover:border-violet-400 hover:text-white hover:shadow-[0_8px_25px_-5px_rgba(139,92,246,0.35)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 ease-out"
          >
            {copied ? 'Copied!' : 'Copy JSON'}
          </button>

          <div className="w-px h-8 bg-gray-600" />

          <button
            onClick={handleExportToMap}
            disabled={exportingToMap}
            className="px-5 py-2.5 rounded-full font-medium text-sm border-2 bg-gradient-to-r from-orange-500 to-amber-500 border-orange-400 text-white hover:from-orange-600 hover:to-amber-600 hover:shadow-[0_8px_25px_-5px_rgba(249,115,22,0.5)] hover:-translate-y-0.5 active:translate-y-0 disabled:from-gray-600 disabled:to-gray-600 disabled:border-gray-500 disabled:text-gray-400 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none transition-all duration-200 ease-out"
          >
            {exportingToMap ? 'Exporting...' : 'Export to Map →'}
          </button>
        </div>
      </div>
    </div>
  );
}
