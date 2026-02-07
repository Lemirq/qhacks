'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import * as THREE from 'three';
import { BuildingsProvider } from '@/lib/editor/contexts/BuildingsContext';
import { InputPanel } from '@/components/editor/InputPanel/InputPanel';
import { Scene } from '@/components/editor/Viewport/Scene';
import { ExportBar } from '@/components/editor/Export/ExportBar';

export default function BuildingEditorApp() {
  const sceneRef = useRef<THREE.Scene | null>(null);

  return (
    <BuildingsProvider>
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-gray-100">
        {/* Header */}
        <header className="bg-white shadow-sm z-10 px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">3D Building Editor</h1>
            <p className="text-xs text-gray-600">Create and customize 3D buildings</p>
          </div>
          <Link
            href="/"
            className="px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white text-sm rounded-lg transition-colors"
          >
            ← Back to Campus Map
          </Link>
        </header>

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
