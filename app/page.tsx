'use client';

import { useState } from 'react';
import ThreeMap from '@/components/ThreeMap';
import { Landmark, SlidersHorizontal, Building2, TrafficCone, Leaf, FileText, PlayCircle, Clock, Settings, MapPin, Copy, X, Plus, Trash2 } from 'lucide-react';

interface PlacedBuilding {
  id: string;
  modelPath: string;
  position: { x: number; y: number; z: number };
  lat: number;
  lng: number;
}

export default function Home() {
  const [clickedCoordinate, setClickedCoordinate] = useState<{
    lat: number;
    lng: number;
    worldX: number;
    worldY: number;
    worldZ: number;
  } | null>(null);

  const [placedBuildings, setPlacedBuildings] = useState<PlacedBuilding[]>([]);
  const [isPlacementMode, setIsPlacementMode] = useState(false);

  const handleMapClick = (coordinate: {
    lat: number;
    lng: number;
    worldX: number;
    worldY: number;
    worldZ: number;
  } | null) => {
    if (coordinate) {
      if (isPlacementMode) {
        // Place a building at the clicked location
        const newBuilding: PlacedBuilding = {
          id: `building-${Date.now()}`,
          modelPath: '/let_me_sleeeeeeep/let_me_sleeeeeeep.gltf',
          position: { x: coordinate.worldX, y: coordinate.worldY, z: coordinate.worldZ },
          lat: coordinate.lat,
          lng: coordinate.lng,
        };
        setPlacedBuildings([...placedBuildings, newBuilding]);
        setIsPlacementMode(false); // Exit placement mode after placing
      } else {
        // Just show the coordinate
        setClickedCoordinate(coordinate);
      }
    }
  };

  const removeBuilding = (id: string) => {
    setPlacedBuildings(placedBuildings.filter(b => b.id !== id));
  };

  return (
    <div className="relative min-h-screen w-full bg-slate-100 text-slate-800 overflow-hidden">
      {/* MAP BACKGROUND (3D Simulation) */}
      <div className="absolute inset-0 z-0">
        <ThreeMap
          className="w-full h-full"
          onCoordinateClick={handleMapClick}
          placedBuildings={placedBuildings}
        />
        {/* Map gradient overlay for better UI contrast */}
        <div className="absolute inset-0 map-gradient pointer-events-none"></div>

        {/* Placement Mode Indicator */}
        {isPlacementMode && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 glass border-accent-blue px-6 py-3 rounded-lg shadow-lg z-50 pointer-events-none">
            <p className="text-sm font-black text-accent-blue uppercase tracking-tight">
              Click on the map to place building
            </p>
          </div>
        )}
      </div>

      {/* SIDEBARS CONTAINER */}
      <div className="absolute inset-0 z-40 pointer-events-none">
        {/* LEFT SIDEBAR: LAYERS & PROJECTS */}
        <aside className="absolute left-6 top-6 bottom-32 w-72 pointer-events-auto flex flex-col gap-3 sidebar-transition">
          {/* Municipal Branding */}
          <div className="flex-none glass rounded-lg p-4 shadow-sm border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-accent-blue rounded flex items-center justify-center">
                <Landmark className="text-white" size={14} />
              </div>
              <span className="text-sm font-black tracking-tight text-slate-900 uppercase">Municipal Planning Authority</span>
            </div>
          </div>

          {/* Geospatial Layers Panel */}
          <div className="flex-1 glass rounded-lg p-4 flex flex-col overflow-hidden shadow-sm border-slate-200">
            <div className="flex items-center justify-between mb-5">
              <h3 className="ui-label">Geospatial Layers</h3>
              <button className="p-1 hover:bg-slate-100 rounded transition-colors text-slate-400">
                <SlidersHorizontal size={18} />
              </button>
            </div>

            {/* Layer List */}
            <div className="space-y-2 overflow-y-auto custom-scrollbar pr-1">
              {/* Proposed Structural Layer - Active */}
              <div className="p-2.5 rounded-md border border-slate-200 bg-white group cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded bg-slate-50 border border-slate-100 flex items-center justify-center text-accent-blue">
                    <Building2 size={14} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] font-bold text-slate-900">Proposed Structural</p>
                    <p className="text-[9px] text-slate-500">Count: 08 active</p>
                  </div>
                  <div className="flex items-center">
                    <input type="checkbox" defaultChecked className="accent-accent-blue h-3.5 w-3.5" />
                  </div>
                </div>
              </div>

              {/* Infrastructure Zones Layer */}
              <div className="p-2.5 rounded-md border border-slate-100 hover:border-slate-200 bg-white/50 transition-all cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-accent-blue transition-colors">
                    <TrafficCone size={14} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] font-bold text-slate-800">Infrastructure Zones</p>
                    <p className="text-[9px] text-slate-500">Public Utility</p>
                  </div>
                  <div className="flex items-center">
                    <input type="checkbox" className="accent-accent-blue h-3.5 w-3.5" />
                  </div>
                </div>
              </div>

              {/* Ecological Impact Layer */}
              <div className="p-2.5 rounded-md border border-slate-100 hover:border-slate-200 bg-white/50 transition-all cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-accent-blue transition-colors">
                    <Leaf size={14} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] font-bold text-slate-800">Ecological Impact</p>
                    <p className="text-[9px] text-slate-500">CO2 Heatmap</p>
                  </div>
                  <div className="flex items-center">
                    <input type="checkbox" className="accent-accent-blue h-3.5 w-3.5" />
                  </div>
                </div>
              </div>
            </div>

            {/* District Zoning Summary */}
            <div className="mt-8">
              <h3 className="ui-label mb-3">District Zoning Summary</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <span className="font-medium text-slate-600 uppercase">Princess St. Central</span>
                    <span className="text-accent-blue font-bold">NOMINAL</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-sm h-1.5">
                    <div className="bg-accent-blue h-1.5 rounded-sm w-[85%]"></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <span className="font-medium text-slate-600 uppercase">Portsmouth District</span>
                    <span className="text-amber-700 font-bold">WARNING</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-sm h-1.5">
                    <div className="bg-amber-600 h-1.5 rounded-sm w-[40%]"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Coordinate Finder */}
            <div className="mt-8 pt-6 border-t border-slate-200">
              {!clickedCoordinate ? (
                <div className="flex items-center gap-2 text-slate-500 text-[10px]">
                  <MapPin size={14} className="text-slate-400" />
                  <span className="uppercase tracking-wider">Click anywhere on the map to see coordinates</span>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-accent-blue" />
                      <h3 className="ui-label">Clicked Coordinate</h3>
                    </div>
                    <button
                      onClick={() => setClickedCoordinate(null)}
                      className="p-1 hover:bg-slate-100 rounded transition-colors text-slate-400"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="bg-slate-50 rounded-md p-2.5 border border-slate-200">
                      <p className="text-[9px] font-bold text-slate-500 uppercase mb-1.5">Geographic</p>
                      <div className="space-y-1 text-[10px]">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Latitude</span>
                          <span className="font-bold text-slate-900">{clickedCoordinate.lat.toFixed(6)}°</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Longitude</span>
                          <span className="font-bold text-slate-900">{clickedCoordinate.lng.toFixed(6)}°</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-md p-2.5 border border-slate-200">
                      <p className="text-[9px] font-bold text-slate-500 uppercase mb-1.5">World</p>
                      <div className="space-y-1 text-[10px]">
                        <div className="flex justify-between">
                          <span className="text-slate-600">X</span>
                          <span className="font-bold text-slate-900">{clickedCoordinate.worldX.toFixed(2)}m</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Y</span>
                          <span className="font-bold text-slate-900">{clickedCoordinate.worldY.toFixed(2)}m</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Z</span>
                          <span className="font-bold text-slate-900">{clickedCoordinate.worldZ.toFixed(2)}m</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${clickedCoordinate.lat.toFixed(6)}, ${clickedCoordinate.lng.toFixed(6)}`);
                      }}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white border border-slate-200 hover:border-accent-blue hover:bg-blue-50 rounded text-[10px] font-bold text-slate-700 hover:text-accent-blue transition-colors uppercase tracking-wider"
                    >
                      <Copy size={12} />
                      Copy Coordinates
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* RIGHT SIDEBAR: METRIC ANALYSIS */}
        <aside className="absolute right-6 top-6 bottom-32 w-80 pointer-events-auto sidebar-transition">
          <div className="glass rounded-lg p-5 shadow-md h-full border-slate-200 overflow-y-auto custom-scrollbar">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="text-slate-400" size={20} />
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Metric Analysis</h2>
              </div>
              <button className="text-[10px] font-black text-accent-blue border border-accent-blue px-2 py-0.5 rounded hover:bg-blue-50 transition-colors">
                EXPORT CSV
              </button>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 gap-3 mb-6">
              <div className="bg-slate-50 rounded-md p-3 border border-slate-200">
                <p className="ui-label mb-1">CO2 Displacement</p>
                <p className="text-lg font-bold text-slate-900 font-serif">
                  142.08 <span className="text-[10px] text-slate-500 font-sans uppercase ml-1">Tonnes / PA</span>
                </p>
              </div>
              <div className="bg-slate-50 rounded-md p-3 border border-slate-200">
                <p className="ui-label mb-1">Acoustic Profile</p>
                <p className="text-lg font-bold text-rose-700 font-serif">
                  64.2 <span className="text-[10px] text-slate-500 font-sans uppercase ml-1">Decibels</span>
                </p>
              </div>
            </div>

            {/* Detailed Metrics */}
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                <span className="text-slate-500 uppercase font-medium">Maximum Elevation</span>
                <span className="font-bold text-slate-900">42.50 m</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                <span className="text-slate-500 uppercase font-medium">Structural Material</span>
                <span className="font-bold text-slate-900 uppercase">Concrete B40</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                <span className="text-slate-500 uppercase font-medium">Footprint Area</span>
                <span className="font-bold text-slate-900">12,400 m²</span>
              </div>

              {/* Traffic Flow Chart */}
              <div className="pt-4">
                <p className="ui-label mb-4">Traffic Flow Projection</p>
                <div className="h-24 flex items-end justify-between gap-1">
                  <div className="w-full bg-slate-200 h-[40%]"></div>
                  <div className="w-full bg-slate-300 h-[60%]"></div>
                  <div className="w-full bg-slate-400 h-[80%]"></div>
                  <div className="w-full bg-accent-blue h-[100%]"></div>
                  <div className="w-full bg-slate-400 h-[75%]"></div>
                  <div className="w-full bg-slate-300 h-[50%]"></div>
                  <div className="w-full bg-slate-200 h-[30%]"></div>
                </div>
                <div className="flex justify-between text-[8px] text-slate-400 mt-2 font-bold">
                  <span>0800 HRS</span>
                  <span>1200 HRS</span>
                  <span>1700 HRS</span>
                  <span>2200 HRS</span>
                </div>
              </div>

              {/* Building Placement */}
              <div className="pt-6 mt-6 border-t border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="ui-label">Building Placement</h3>
                  <button
                    onClick={() => setIsPlacementMode(!isPlacementMode)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider transition-colors ${
                      isPlacementMode
                        ? 'bg-accent-blue text-white'
                        : 'bg-white border border-accent-blue text-accent-blue hover:bg-blue-50'
                    }`}
                  >
                    <Plus size={12} />
                    {isPlacementMode ? 'Cancel' : 'Place'}
                  </button>
                </div>

                <div className="bg-slate-50 rounded-md p-3 border border-slate-200">
                  <p className="text-[9px] font-bold text-slate-500 uppercase mb-2">Model: Let Me Sleep Building</p>

                  {placedBuildings.length === 0 ? (
                    <p className="text-[10px] text-slate-500 text-center py-4">
                      No buildings placed yet
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                      {placedBuildings.map((building) => (
                        <div
                          key={building.id}
                          className="flex items-center justify-between bg-white rounded p-2 border border-slate-200"
                        >
                          <div className="flex-1">
                            <p className="text-[10px] font-bold text-slate-900">
                              {building.lat.toFixed(5)}°, {building.lng.toFixed(5)}°
                            </p>
                            <p className="text-[8px] text-slate-500">
                              X: {building.position.x.toFixed(1)}m, Z: {building.position.z.toFixed(1)}m
                            </p>
                          </div>
                          <button
                            onClick={() => removeBuilding(building.id)}
                            className="p-1 hover:bg-red-50 rounded transition-colors text-slate-400 hover:text-red-600"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Ground Adjustment Controls */}
              <div className="pt-6 mt-6 border-t border-slate-100">
                <p className="ui-label mb-3">Ground Adjustment Controls</p>
                <div className="bg-slate-50 rounded-md p-3 border border-slate-200">
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px] text-slate-600 mb-3">
                    <div className="flex justify-between">
                      <span className="font-medium">← →</span>
                      <span>Move X</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">+ -</span>
                      <span>Scale All</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">↑ ↓</span>
                      <span>Move Z</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">W/S</span>
                      <span>Scale X</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">PgUp/Dn</span>
                      <span>Move Y</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">A/D</span>
                      <span>Scale Z</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Q/E</span>
                      <span>Rotate Y</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">R</span>
                      <span>Reset All</span>
                    </div>
                  </div>
                  <div className="text-[9px] text-amber-700 bg-amber-50 px-2 py-1.5 rounded border border-amber-200">
                    <span className="font-bold">Shift + Key:</span> Bigger steps
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* FIXED BOTTOM PANEL: INTEGRATED TIMELINE */}
      <div className="absolute bottom-0 left-0 right-0 z-50 glass border-t border-slate-300 px-8 py-4 flex items-center gap-10 shadow-lg">
        {/* Simulation Controls */}
        <div className="flex items-center gap-4 shrink-0 border-r border-slate-200 pr-10">
          <button className="w-10 h-10 rounded bg-accent-blue flex items-center justify-center text-white hover:bg-slate-900 transition-colors shadow-sm">
            <PlayCircle size={20} />
          </button>
          <div>
            <p className="text-xs font-black text-slate-900 uppercase tracking-tight font-serif">Simulation Core</p>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Phase: Site Preparation</p>
          </div>
        </div>

        {/* Timeline Slider */}
        <div className="flex-1 flex flex-col gap-3">
          <div className="relative h-1.5 w-full bg-slate-200 rounded-sm cursor-pointer">
            <div className="absolute left-0 top-0 h-full w-[25%] bg-accent-blue rounded-sm transition-all"></div>
            <div className="absolute left-[25%] top-1/2 -translate-y-1/2 w-4 h-4 rounded-sm bg-white border border-slate-400 shadow-sm"></div>
          </div>
          <div className="flex justify-between px-0.5 text-[9px] text-slate-500 font-black uppercase">
            <span className="text-accent-blue">Fiscal Q1 2025</span>
            <span>Q2 2025</span>
            <span>Q3 2025</span>
            <span>Q4 2025</span>
            <span>Projected 2026</span>
            <span>Projected 2027</span>
          </div>
        </div>

        {/* Timestamp & Settings */}
        <div className="flex items-center gap-4 shrink-0 border-l border-slate-200 pl-10">
          <div className="flex flex-col items-end">
            <span className="ui-label mb-1">Active Timestamp</span>
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded border border-slate-200">
              <Clock className="text-slate-400" size={14} />
              <span className="text-[10px] font-black text-slate-700 uppercase">
                {new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <button className="p-1.5 bg-white border border-slate-200 rounded text-slate-500 hover:text-slate-900 transition-colors">
              <Settings size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
