import { useState } from 'react';
import * as THREE from 'three';
import { useBuildings } from '@/lib/editor/contexts/BuildingsContext';
import { exportMultiBuildingsToGLB, exportMultiBuildingsToJSON, copyMultiBuildingsToClipboard } from '@/lib/editor/utils/exportUtils';

interface ExportBarProps {
  sceneRef: React.MutableRefObject<THREE.Scene | null>;
}

export function ExportBar({ sceneRef }: ExportBarProps) {
  const { buildings } = useBuildings();
  const [exporting, setExporting] = useState(false);
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
            onClick={handleExportGLB}
            disabled={exporting}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 rounded-md font-medium text-sm transition-colors"
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
        </div>
      </div>
    </div>
  );
}
