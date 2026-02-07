import { useState } from 'react';
import * as THREE from 'three';
import { BuildingSpecification } from '../../types/buildingSpec';
import { exportToGLB, exportToJSON, copyToClipboard } from '../../utils/exportUtils';

interface ExportBarProps {
  spec: BuildingSpecification;
  buildingRef: React.MutableRefObject<THREE.Group | null>;
}

export function ExportBar({ spec, buildingRef }: ExportBarProps) {
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleExportGLB = async () => {
    if (!buildingRef.current) {
      alert('Building not ready for export');
      return;
    }

    setExporting(true);
    try {
      await exportToGLB(buildingRef.current);
      alert('Building exported as GLB successfully!');
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export GLB. Check console for details.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportJSON = () => {
    exportToJSON(spec);
  };

  const handleCopyJSON = async () => {
    try {
      await copyToClipboard(spec);
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
