'use client';

import { useRef } from 'react';
import * as THREE from 'three';
import { BuildingsProvider } from './contexts/BuildingsContext';
import { InputPanel } from './components/InputPanel/InputPanel';
import { Scene } from './components/Viewport/Scene';
import { ExportBar } from './components/Export/ExportBar';

function App() {
  const sceneRef = useRef<THREE.Scene | null>(null);

  return (
    <BuildingsProvider>
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-gray-100">
        {/* Main content area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Input Panel - Left Side */}
          <div className="w-[30%] min-w-[320px] max-w-[500px]">
            <InputPanel />
          </div>

          {/* 3D Viewport - Right Side */}
          <div className="flex-1">
            <Scene sceneRef={sceneRef} />
          </div>
        </div>

        {/* Export Bar - Bottom */}
        <ExportBar sceneRef={sceneRef} />
      </div>
    </BuildingsProvider>
  );
}

export default App;
