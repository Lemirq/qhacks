'use client';

import { useRef } from 'react';
import * as THREE from 'three';
import { useBuildingSpec } from './hooks/useBuildingSpec';
import { InputPanel } from './components/InputPanel/InputPanel';
import { Scene } from './components/Viewport/Scene';
import { ExportBar } from './components/Export/ExportBar';

function App() {
  const { spec, updateSpec, resetSpec } = useBuildingSpec();
  const buildingRef = useRef<THREE.Group | null>(null);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-gray-100">
      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Input Panel - Left Side */}
        <div className="w-[30%] min-w-[320px] max-w-[500px]">
          <InputPanel spec={spec} onUpdate={updateSpec} onReset={resetSpec} />
        </div>

        {/* 3D Viewport - Right Side */}
        <div className="flex-1">
          <Scene buildingSpec={spec} buildingRef={buildingRef} />
        </div>
      </div>

      {/* Export Bar - Bottom */}
      <ExportBar spec={spec} buildingRef={buildingRef} />
    </div>
  );
}

export default App;
