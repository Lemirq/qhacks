"use client";

import { useState, useEffect, Suspense, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import ThreeMap from "@/components/ThreeMap";
import {
  Landmark,
  SlidersHorizontal,
  Building2,
  TrafficCone,
  Leaf,
  FileText,
  PlayCircle,
  Clock,
  Settings,
  MapPin,
  Copy,
  X,
  Plus,
  Trash2,
  Upload,
  ChevronDown,
  Check,
  Volume2,
  Smile,
  Frown,
  Pause,
  ClipboardList,
  Map,
} from "lucide-react";
import { prefetchMapData } from "@/lib/prefetchMapData";
import {
  computeHappinessScore,
  isUnderConstruction,
  getConstructionProgress,
} from "@/lib/constructionNoise";
import EnvironmentalReportModal from "@/components/EnvironmentalReportModal";
import {
  BuildingPlacementForm,
  type BuildingPlacementDetails,
} from "@/components/BuildingPlacementForm";

interface PlacedBuilding {
  id: string;
  modelPath: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  lat: number;
  lng: number;
  timeline?: {
    zoneType?: string;
    startDate?: string;
    durationDays?: number;
  };
}

function MapPageContent() {
  const searchParams = useSearchParams();
  const [clickedCoordinate, setClickedCoordinate] = useState<{
    lat: number;
    lng: number;
    worldX: number;
    worldY: number;
    worldZ: number;
  } | null>(null);

  const [pendingPlacement, setPendingPlacement] = useState<{
    lat: number;
    lng: number;
    worldX: number;
    worldY: number;
    worldZ: number;
    ghostRotationY?: number;
  } | null>(null);

  const [timelineDate, setTimelineDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [isTimelinePlaying, setIsTimelinePlaying] = useState(false);

  const [placedBuildings, setPlacedBuildings] = useState<PlacedBuilding[]>([]);
  const [isPlacementMode, setIsPlacementMode] = useState(false);
  // Default scale now matches the calibrated building size (was 1.4, now scaled to 10)
  const [buildingScale, setBuildingScale] = useState({ x: 20, y: 20, z: 10 });
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(
    null,
  );

  // Custom model path from editor export
  const [customModelPath, setCustomModelPath] = useState<string | null>(null);
  const [importedBuildingName, setImportedBuildingName] = useState<
    string | null
  >(null);

  // Available buildings list
  interface AvailableBuilding {
    id: string;
    name: string;
    path: string;
    type: "default" | "custom";
  }
  const [availableBuildings, setAvailableBuildings] = useState<
    AvailableBuilding[]
  >([]);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [showBuildingSelector, setShowBuildingSelector] = useState(false);
  const [showNoiseRipple, setShowNoiseRipple] = useState(true);
  const [showZoningLayer, setShowZoningLayer] = useState(false);
  // Correct config for Kingston zoning layer (Official Plan)
  const [zoningOffset, setZoningOffset] = useState({ x: 0, z: 0 });
  const [zoningRotationY, setZoningRotationY] = useState(180);
  const [zoningFlipH, setZoningFlipH] = useState(true);
  const [showEnvironmentalReport, setShowEnvironmentalReport] = useState(false);
  const [debugOverlayVisible, setDebugOverlayVisible] = useState(false);
  const [dashboardVisible, setDashboardVisible] = useState(false);
  const panelsPortalRef = useRef<HTMLDivElement | null>(null);

  // Pre-fetch map data and available buildings on mount
  useEffect(() => {
    prefetchMapData();

    // Fetch available custom buildings
    async function fetchAvailableBuildings() {
      try {
        const response = await fetch("/api/editor/building");
        const data = await response.json();

        // Start with default buildings
        const buildings: AvailableBuilding[] = [
          {
            id: "default-sleep",
            name: "Let Me Sleep Building",
            path: "/let_me_sleeeeeeep/let_me_sleeeeeeep.gltf",
            type: "default",
          },
        ];

        // Add custom buildings from API
        if (data.buildings && Array.isArray(data.buildings)) {
          data.buildings.forEach(
            (b: { id: string; publicPath: string }, index: number) => {
              buildings.push({
                id: b.id,
                name: `Custom Building ${index + 1}`,
                path: b.publicPath,
                type: "custom",
              });
            },
          );
        }

        setAvailableBuildings(buildings);
      } catch (error) {
        console.error("Failed to fetch available buildings:", error);
        // Set default building as fallback
        setAvailableBuildings([
          {
            id: "default-sleep",
            name: "Let Me Sleep Building",
            path: "/let_me_sleeeeeeep/let_me_sleeeeeeep.gltf",
            type: "default",
          },
        ]);
      }
    }

    fetchAvailableBuildings();
  }, []);

  // Check for imported building from editor
  useEffect(() => {
    const buildingId = searchParams.get("buildingId");
    if (buildingId) {
      const modelPath = `/api/editor/building/${buildingId}`;
      setCustomModelPath(modelPath);
      setImportedBuildingName("Custom Building from Editor");
      setIsPlacementMode(true);
      // Update scale for custom buildings (default to 15x, user can adjust with slider)
      setBuildingScale({ x: 15, y: 15, z: 15 });
      console.log(`✅ Imported building from editor: ${modelPath}`);
    }
  }, [searchParams]);

  const handleMapClick = (
    coordinate: {
      lat: number;
      lng: number;
      worldX: number;
      worldY: number;
      worldZ: number;
      ghostRotationY?: number;
    } | null,
  ) => {
    if (coordinate) {
      if (isPlacementMode) {
        setPendingPlacement(coordinate);
      } else {
        setClickedCoordinate(coordinate);
      }
    }
  };

  const handlePlacementSubmit = (details: BuildingPlacementDetails) => {
    if (!pendingPlacement) return;

    let modelPath = customModelPath;
    if (!modelPath && availableBuildings.length > 0) {
      modelPath = availableBuildings[0].path;
    }
    if (!modelPath) {
      modelPath = "/let_me_sleeeeeeep/let_me_sleeeeeeep.gltf";
    }

    const newBuilding: PlacedBuilding = {
      id: `building-${Date.now()}`,
      modelPath,
      position: {
        x: pendingPlacement.worldX,
        y: pendingPlacement.worldY,
        z: pendingPlacement.worldZ,
      },
      rotation: { x: 0, y: pendingPlacement.ghostRotationY || 0, z: 0 },
      scale: { x: buildingScale.x, y: buildingScale.y, z: buildingScale.z },
      lat: pendingPlacement.lat,
      lng: pendingPlacement.lng,
      timeline: {
        zoneType: details.zoneType,
        startDate: details.startDate,
        durationDays: details.durationDays,
      },
    };
    setPlacedBuildings([...placedBuildings, newBuilding]);
    setPendingPlacement(null);
    setTimelineDate(details.startDate);
  };

  const clearImportedBuilding = () => {
    setCustomModelPath(null);
    setImportedBuildingName(null);
    setSelectedModelId(null);
    setIsPlacementMode(false);
    setBuildingScale({ x: 10, y: 10, z: 10 });
    // Clear the URL param
    window.history.replaceState({}, "", "/map");
  };

  const removeBuilding = (id: string) => {
    setPlacedBuildings(placedBuildings.filter((b) => b.id !== id));
    if (selectedBuildingId === id) {
      setSelectedBuildingId(null);
    }
  };

  const updateSelectedBuilding = (updates: Partial<PlacedBuilding>) => {
    if (!selectedBuildingId) return;
    setPlacedBuildings(
      placedBuildings.map((b) =>
        b.id === selectedBuildingId ? { ...b, ...updates } : b,
      ),
    );
  };

  const selectedBuilding = placedBuildings.find(
    (b) => b.id === selectedBuildingId,
  );

  // Buildings that are under construction (active) at the current timeline date
  const buildingsActiveAtTimeline = useMemo(() => {
    return placedBuildings.filter((b) => {
      if (!b.timeline?.startDate || b.timeline.durationDays == null)
        return true; // no timeline = always "active"
      return isUnderConstruction(
        b.timeline.startDate,
        b.timeline.durationDays,
        timelineDate,
      );
    });
  }, [placedBuildings, timelineDate]);

  // Timeline range from earliest start to latest end across all placed buildings
  const timelineRange = useMemo(() => {
    const now = new Date();
    const defaultMin = new Date(now);
    defaultMin.setMonth(now.getMonth() - 3);
    const defaultMax = new Date(now);
    defaultMax.setMonth(now.getMonth() + 6);
    if (placedBuildings.length === 0) {
      return { minDate: defaultMin, maxDate: defaultMax };
    }
    let minT = Infinity;
    let maxT = -Infinity;
    placedBuildings.forEach((b) => {
      if (b.timeline?.startDate && b.timeline.durationDays != null) {
        const start = new Date(b.timeline.startDate).getTime();
        const end = start + b.timeline.durationDays * 24 * 60 * 60 * 1000;
        minT = Math.min(minT, start);
        maxT = Math.max(maxT, end);
      }
    });
    if (minT === Infinity) minT = defaultMin.getTime();
    if (maxT === -Infinity) maxT = defaultMax.getTime();
    return { minDate: new Date(minT), maxDate: new Date(maxT) };
  }, [placedBuildings]);
  const minDateStr = timelineRange.minDate.toISOString().slice(0, 10);
  const maxDateStr = timelineRange.maxDate.toISOString().slice(0, 10);

  // Clamp timeline to range when range changes (e.g. after placing/removing buildings)
  useEffect(() => {
    setTimelineDate((d) => {
      if (d < minDateStr) return minDateStr;
      if (d > maxDateStr) return maxDateStr;
      return d;
    });
  }, [minDateStr, maxDateStr]);

  // Timeline play: advance by one week
  useEffect(() => {
    if (!isTimelinePlaying) return;
    const interval = setInterval(() => {
      setTimelineDate((d) => {
        const next = new Date(d);
        next.setDate(next.getDate() + 7);
        const nextStr = next.toISOString().slice(0, 10);
        if (nextStr > maxDateStr) return maxDateStr;
        return nextStr;
      });
    }, 800);
    return () => clearInterval(interval);
  }, [isTimelinePlaying, maxDateStr]);

  const {
    score: populationHappiness,
    avgDb,
    activeCount,
  } = computeHappinessScore(placedBuildings, timelineDate);

  // Calculate dynamic environmental metrics based on buildings active at current timeline date.
  // Metrics scale with construction progress (0→1) so CO2, energy, and water ramp up as the timeline advances.
  const buildingMetrics = useMemo(() => {
    if (buildingsActiveAtTimeline.length === 0) {
      return {
        co2Emissions: 0,
        energyConsumption: 0,
        waterUsage: 0,
        totalFootprint: 0,
        materialComplexity: "N/A",
        sustainabilityScore: 100,
      };
    }

    let totalCO2 = 0;
    let totalEnergy = 0;
    let totalWater = 0;
    let totalFootprint = 0;
    let complexityScore = 0;

    buildingsActiveAtTimeline.forEach((building) => {
      // Progress 0–1: no timeline = treat as fully complete (1)
      const progress =
        building.timeline?.startDate != null &&
        building.timeline?.durationDays != null
          ? getConstructionProgress(
              building.timeline.startDate,
              building.timeline.durationDays,
              timelineDate,
            )
          : 1;

      const footprint = building.scale.x * building.scale.z * 100;
      const height = building.scale.y * 3;

      // Footprint "completed so far" grows with progress
      totalFootprint += footprint * progress;

      const constructionCO2 = footprint * 0.5 * (1 + height / 30);
      const annualOperationalCO2 = footprint * 0.02 * (1 + height / 50);
      totalCO2 += progress * (constructionCO2 + annualOperationalCO2);

      const energyPerSqM = 180 + (height / 10) * 20;
      totalEnergy += progress * ((footprint * energyPerSqM) / 1000);

      const waterPerSqM = 8 + (height / 20) * 3;
      totalWater += progress * ((footprint * waterPerSqM * 365) / 1000);

      complexityScore += footprint > 2000 ? 3 : footprint > 1000 ? 2 : 1;
    });

    const avgComplexity = complexityScore / buildingsActiveAtTimeline.length;
    const materialComplexity =
      avgComplexity >= 2.5
        ? "High (Steel/Glass)"
        : avgComplexity >= 1.5
          ? "Medium (Concrete)"
          : "Low (Wood/Brick)";

    const impactFactor = totalCO2 / 100 + totalEnergy / 50 + totalWater / 500;
    const sustainabilityScore = Math.max(0, Math.min(100, 100 - impactFactor));

    return {
      co2Emissions: totalCO2,
      energyConsumption: totalEnergy,
      waterUsage: totalWater,
      totalFootprint,
      materialComplexity,
      sustainabilityScore,
    };
  }, [buildingsActiveAtTimeline, timelineDate]);

  // Keyboard controls for selected building
  useEffect(() => {
    if (!selectedBuildingId || !selectedBuilding) return;

    function handleKeyPress(event: KeyboardEvent) {
      // Don't interfere with browser shortcuts
      if (event.metaKey || event.ctrlKey) return;
      // Don't interfere with text inputs
      if ((event.target as HTMLElement).tagName === "INPUT") return;

      if (!selectedBuilding) return;

      const step = event.shiftKey ? 10 : 1;
      const rotationStep = event.shiftKey ? 15 : 5; // degrees
      const scaleStep = event.shiftKey ? -0.5 : 0.5;

      let updated = false;
      const newBuilding = { ...selectedBuilding };

      switch (event.key) {
        case "ArrowLeft":
          newBuilding.position.x -= step;
          updated = true;
          break;
        case "ArrowRight":
          newBuilding.position.x += step;
          updated = true;
          break;
        case "ArrowUp":
          newBuilding.position.z -= step;
          updated = true;
          break;
        case "ArrowDown":
          newBuilding.position.z += step;
          updated = true;
          break;
        case "PageUp":
          newBuilding.position.y += step;
          updated = true;
          break;
        case "PageDown":
          newBuilding.position.y -= step;
          updated = true;
          break;
        case "r":
        case "R":
          newBuilding.rotation.y += (rotationStep * Math.PI) / 180;
          updated = true;
          break;
        case "s":
          newBuilding.scale.x += scaleStep;
          newBuilding.scale.y += scaleStep;
          newBuilding.scale.z += scaleStep;
          updated = true;
          break;
        case "S":
          newBuilding.scale.x = Math.max(0.1, newBuilding.scale.x + scaleStep);
          newBuilding.scale.y = Math.max(0.1, newBuilding.scale.y + scaleStep);
          newBuilding.scale.z = Math.max(0.1, newBuilding.scale.z + scaleStep);
          updated = true;
          break;
        default:
          return;
      }

      if (updated) {
        setPlacedBuildings(
          placedBuildings.map((b) =>
            b.id === selectedBuildingId ? newBuilding : b,
          ),
        );
        event.preventDefault();
      }
    }

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [selectedBuildingId, selectedBuilding, placedBuildings]);

  return (
    <div className="relative min-h-screen w-full bg-slate-100 text-slate-800 overflow-hidden">
      {/* MAP BACKGROUND (3D Simulation) */}
      <div className="absolute inset-0 z-0">
        <ThreeMap
          className="w-full h-full"
          onCoordinateClick={handleMapClick}
          placedBuildings={placedBuildings}
          isPlacementMode={isPlacementMode}
          buildingScale={buildingScale}
          selectedBuildingId={selectedBuildingId}
          onBuildingSelect={setSelectedBuildingId}
          customModelPath={customModelPath}
          timelineDate={timelineDate}
          showNoiseRipple={showNoiseRipple}
          showZoningLayer={showZoningLayer}
          zoningOffset={zoningOffset}
          zoningRotationY={zoningRotationY}
          zoningFlipH={zoningFlipH}
          debugOverlayVisible={debugOverlayVisible}
          onDebugOverlayChange={setDebugOverlayVisible}
          dashboardVisible={dashboardVisible}
          onDashboardVisibleChange={setDashboardVisible}
          panelsPortalRef={panelsPortalRef}
        />
        {/* Map gradient overlay for better UI contrast */}
        <div className="absolute inset-0 map-gradient pointer-events-none"></div>

        {/* Placement Mode Indicator */}
        {isPlacementMode && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 glass border-accent-blue px-6 py-3 rounded-lg shadow-lg z-50 pointer-events-auto flex items-center gap-4">
            <div>
              <p className="text-sm font-black text-accent-blue uppercase tracking-tight">
                {customModelPath
                  ? "Place your custom building"
                  : "Click on the map to place building"}
              </p>
              {importedBuildingName && (
                <p className="text-xs text-slate-600 mt-1">
                  Model: {importedBuildingName}
                </p>
              )}
            </div>
            {customModelPath && (
              <button
                onClick={clearImportedBuilding}
                className="p-1.5 hover:bg-red-50 rounded-full transition-colors text-slate-400 hover:text-red-600"
                title="Cancel import"
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}

        {/* Imported Building Notification */}
        {customModelPath && !isPlacementMode && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 glass border-orange-400 bg-orange-50/90 px-6 py-3 rounded-lg shadow-lg z-50 pointer-events-auto flex items-center gap-4">
            <Upload size={18} className="text-orange-600" />
            <div>
              <p className="text-sm font-black text-orange-700 uppercase tracking-tight">
                Building imported from Editor
              </p>
              <p className="text-xs text-orange-600 mt-0.5">
                Click &apos;Place&apos; to position it on the map
              </p>
            </div>
            <button
              onClick={clearImportedBuilding}
              className="p-1.5 hover:bg-red-100 rounded-full transition-colors text-orange-400 hover:text-red-600"
              title="Discard import"
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>

      {/* OVERLAYS: panels and modals above sidebars (z-50) so they are visible */}
      <div className="absolute inset-0 z-50 pointer-events-none">
        <div
          ref={(el) => {
            panelsPortalRef.current = el;
          }}
          className="absolute inset-0"
          aria-hidden
        />
        {pendingPlacement && (
          <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-auto">
            <BuildingPlacementForm
              lat={pendingPlacement.lat}
              lng={pendingPlacement.lng}
              onSubmit={handlePlacementSubmit}
              onCancel={() => setPendingPlacement(null)}
            />
          </div>
        )}
        {showEnvironmentalReport && (
          <div className="absolute inset-0 z-30 pointer-events-auto">
            <EnvironmentalReportModal
              visible={showEnvironmentalReport}
              onClose={() => setShowEnvironmentalReport(false)}
              buildings={buildingsActiveAtTimeline}
              snapshot={{
                timelineDate,
                co2Emissions: buildingMetrics.co2Emissions,
                energyConsumption: buildingMetrics.energyConsumption,
                waterUsage: buildingMetrics.waterUsage,
                totalFootprint: buildingMetrics.totalFootprint,
                materialComplexity: buildingMetrics.materialComplexity,
                sustainabilityScore: buildingMetrics.sustainabilityScore,
                populationHappiness,
                avgDb,
                activeCount,
              }}
            />
          </div>
        )}
      </div>

      {/* SIDEBARS CONTAINER */}
      <div className="absolute inset-0 z-40 pointer-events-none">
        {/* LEFT SIDEBAR: LAYERS & PROJECTS */}
        <aside
          className={`absolute left-6 top-6 w-72 pointer-events-auto flex flex-col gap-3 sidebar-transition ${placedBuildings.length > 0 ? "bottom-32" : "bottom-6"}`}
        >
          {/* Municipal Branding */}

          {/* Geospatial Layers Panel */}
          <div className="flex-1 glass rounded-lg p-4 flex flex-col overflow-hidden shadow-sm border-slate-200">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3!xl lp-nav-logo">KingsView</span>
            </div>
            <div className="flex items-center justify-between mb-5">
              <h3 className="ui-label">Geospatial Layers</h3>
            </div>

            {/* Geospatial Layers: Noise Ripple + Zoning */}
            <div className="space-y-2 overflow-y-auto custom-scrollbar pr-1">
              <div
                className={`p-2.5 rounded-md border transition-all cursor-pointer group ${
                  showNoiseRipple
                    ? "border-slate-200 bg-white"
                    : "border-slate-100 hover:border-slate-200 bg-white/50"
                }`}
                onClick={() => setShowNoiseRipple(!showNoiseRipple)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded bg-slate-50 border border-slate-100 flex items-center justify-center transition-colors ${
                      showNoiseRipple
                        ? "text-accent-blue"
                        : "text-slate-400 group-hover:text-accent-blue"
                    }`}
                  >
                    <Volume2 size={14} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] font-bold text-slate-900">
                      Construction Noise (DB)
                    </p>
                    <p className="text-[9px] text-slate-500">
                      Ripple: {activeCount} active site
                      {activeCount !== 1 ? "s" : ""} · ~{avgDb} dB avg
                    </p>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={showNoiseRipple}
                      onChange={(e) => setShowNoiseRipple(e.target.checked)}
                      onClick={(e) => e.stopPropagation()}
                      className="accent-accent-blue h-3.5 w-3.5"
                    />
                  </div>
                </div>
              </div>

              <div
                className={`p-2.5 rounded-md border transition-all cursor-pointer group ${
                  showZoningLayer
                    ? "border-slate-200 bg-white"
                    : "border-slate-100 hover:border-slate-200 bg-white/50"
                }`}
                onClick={() => setShowZoningLayer(!showZoningLayer)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded bg-slate-50 border border-slate-100 flex items-center justify-center transition-colors ${
                      showZoningLayer
                        ? "text-accent-blue"
                        : "text-slate-400 group-hover:text-accent-blue"
                    }`}
                  >
                    <Map size={14} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] font-bold text-slate-900">
                      City Zoning
                    </p>
                    <p className="text-[9px] text-slate-500">
                      Official Plan · Land Use Designation
                    </p>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={showZoningLayer}
                      onChange={(e) => setShowZoningLayer(e.target.checked)}
                      onClick={(e) => e.stopPropagation()}
                      className="accent-accent-blue h-3.5 w-3.5"
                    />
                  </div>
                </div>
              </div>

              {/* Zoning alignment controls - commented out (correct config: flipH=true, rotationY=180) */}
              {/* {showZoningLayer && (
                <div
                  className="rounded-md border border-slate-200 bg-slate-50 p-3 space-y-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className="text-[9px] font-bold text-slate-600 uppercase">
                    Align Zone Position
                  </p>
                  <div className="space-y-2">
                    <div>
                      <label className="text-[9px] text-slate-500 block mb-0.5">X</label>
                      <input
                        type="number"
                        value={zoningOffset.x}
                        onChange={(e) =>
                          setZoningOffset((o) => ({
                            ...o,
                            x: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="w-full px-2 py-1 text-[10px] font-mono bg-white border border-slate-200 rounded"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-500 block mb-0.5">Z</label>
                      <input
                        type="number"
                        value={zoningOffset.z}
                        onChange={(e) =>
                          setZoningOffset((o) => ({
                            ...o,
                            z: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="w-full px-2 py-1 text-[10px] font-mono bg-white border border-slate-200 rounded"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-500 block mb-0.5">Rotation Y (°)</label>
                      <input
                        type="number"
                        value={zoningRotationY}
                        onChange={(e) =>
                          setZoningRotationY(parseFloat(e.target.value) || 0)
                        }
                        className="w-full px-2 py-1 text-[10px] font-mono bg-white border border-slate-200 rounded"
                      />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={zoningFlipH}
                        onChange={(e) => setZoningFlipH(e.target.checked)}
                        className="accent-accent-blue h-3.5 w-3.5"
                      />
                      <span className="text-[10px] font-medium text-slate-700">
                        Flip horizontally
                      </span>
                    </label>
                  </div>
                </div>
              )} */}
            </div>

            {/* Population Happiness Score */}
            <div className="mt-6">
              <h3 className="ui-label mb-3">Population Sentiment</h3>
              <div className="rounded-md p-3 border border-slate-200 bg-white">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-slate-600 uppercase">
                    Happy / Sad Score
                  </span>
                  {populationHappiness >= 50 ? (
                    <Smile size={16} className="text-emerald-500" />
                  ) : (
                    <Frown size={16} className="text-rose-500" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        populationHappiness >= 70
                          ? "bg-emerald-500"
                          : populationHappiness >= 40
                            ? "bg-amber-500"
                            : "bg-rose-500"
                      }`}
                      style={{ width: `${populationHappiness}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-slate-900 w-8">
                    {populationHappiness}/100
                  </span>
                </div>
                <p className="text-[9px] text-slate-500 mt-1.5">
                  Based on construction noise disturbance
                </p>
              </div>
            </div>

            {/* District Zoning Summary */}

            {/* Coordinate Finder */}
            <div className="mt-8 pt-6 border-t border-slate-200">
              {!clickedCoordinate ? (
                <div className="flex items-center gap-2 text-slate-500 text-[10px]">
                  <MapPin size={14} className="text-slate-400" />
                  <span className="uppercase tracking-wider">
                    Click anywhere on the map to see coordinates
                  </span>
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
                      <p className="text-[9px] font-bold text-slate-500 uppercase mb-1.5">
                        Geographic
                      </p>
                      <div className="space-y-1 text-[10px]">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Latitude</span>
                          <span className="font-bold text-slate-900">
                            {clickedCoordinate.lat.toFixed(6)}°
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Longitude</span>
                          <span className="font-bold text-slate-900">
                            {clickedCoordinate.lng.toFixed(6)}°
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-md p-2.5 border border-slate-200">
                      <p className="text-[9px] font-bold text-slate-500 uppercase mb-1.5">
                        World
                      </p>
                      <div className="space-y-1 text-[10px]">
                        <div className="flex justify-between">
                          <span className="text-slate-600">X</span>
                          <span className="font-bold text-slate-900">
                            {clickedCoordinate.worldX.toFixed(2)}m
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Y</span>
                          <span className="font-bold text-slate-900">
                            {clickedCoordinate.worldY.toFixed(2)}m
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Z</span>
                          <span className="font-bold text-slate-900">
                            {clickedCoordinate.worldZ.toFixed(2)}m
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `${clickedCoordinate.lat.toFixed(6)}, ${clickedCoordinate.lng.toFixed(6)}`,
                        );
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
        <aside
          className={`absolute right-6 top-6 w-80 pointer-events-auto sidebar-transition ${placedBuildings.length > 0 ? "bottom-32" : "bottom-6"}`}
        >
          <div className="glass rounded-lg p-5 shadow-md h-full border-slate-200 overflow-y-auto custom-scrollbar">
            {/* Traffic controls */}
            <div className="flex gap-2 mb-4 pb-4 border-b border-slate-100">
              <button
                type="button"
                onClick={() => setDebugOverlayVisible(!debugOverlayVisible)}
                className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg shadow text-xs font-medium transition-colors"
                title="Toggle debug overlay (F3)"
              >
                {debugOverlayVisible ? "Hide" : "Show"} Debug
              </button>
              <button
                type="button"
                onClick={() => setDashboardVisible(!dashboardVisible)}
                className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow text-xs font-medium transition-colors"
              >
                Analytics
              </button>
            </div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <FileText className="text-slate-400" size={20} />
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                    Metric Analysis
                  </h2>
                </div>
                <p className="text-[9px] text-slate-500 font-medium uppercase tracking-wider">
                  As of{" "}
                  {new Date(timelineDate).toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                  {buildingsActiveAtTimeline.length > 0 && (
                    <span className="ml-1">
                      · {buildingsActiveAtTimeline.length} active site
                      {buildingsActiveAtTimeline.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Key Environmental Metrics - Dynamic based on buildings active at current timeline date */}
            <div className="grid grid-cols-1 gap-3 mb-6">
              <div
                className={`rounded-md p-3 border ${buildingsActiveAtTimeline.length > 0 ? "bg-orange-50 border-orange-200" : "bg-slate-50 border-slate-200"}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Leaf
                    size={14}
                    className={
                      buildingsActiveAtTimeline.length > 0
                        ? "text-orange-600"
                        : "text-slate-400"
                    }
                  />
                  <p className="ui-label">CO2 Emissions</p>
                </div>
                <p
                  className={`text-lg font-bold font-serif ${buildingsActiveAtTimeline.length > 0 ? "text-orange-700" : "text-slate-400"}`}
                >
                  {buildingMetrics.co2Emissions.toFixed(1)}{" "}
                  <span className="text-[10px] text-slate-500 font-sans uppercase ml-1">
                    Tonnes / PA
                  </span>
                </p>
                <p className="text-[9px] text-slate-500 mt-1">
                  Ramps with construction progress over timeline
                </p>
              </div>
              <div
                className={`rounded-md p-3 border ${buildingsActiveAtTimeline.length > 0 ? "bg-blue-50 border-blue-200" : "bg-slate-50 border-slate-200"}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Settings
                    size={14}
                    className={
                      buildingsActiveAtTimeline.length > 0
                        ? "text-blue-600"
                        : "text-slate-400"
                    }
                  />
                  <p className="ui-label">Energy Consumption</p>
                </div>
                <p
                  className={`text-lg font-bold font-serif ${buildingsActiveAtTimeline.length > 0 ? "text-blue-700" : "text-slate-400"}`}
                >
                  {buildingMetrics.energyConsumption.toFixed(1)}{" "}
                  <span className="text-[10px] text-slate-500 font-sans uppercase ml-1">
                    MWh / PA
                  </span>
                </p>
                <p className="text-[9px] text-slate-500 mt-1">
                  Ramps with construction progress
                </p>
              </div>
              <div
                className={`rounded-md p-3 border ${buildingsActiveAtTimeline.length > 0 ? "bg-cyan-50 border-cyan-200" : "bg-slate-50 border-slate-200"}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <TrafficCone
                    size={14}
                    className={
                      buildingsActiveAtTimeline.length > 0
                        ? "text-cyan-600"
                        : "text-slate-400"
                    }
                  />
                  <p className="ui-label">Water Usage</p>
                </div>
                <p
                  className={`text-lg font-bold font-serif ${buildingsActiveAtTimeline.length > 0 ? "text-cyan-700" : "text-slate-400"}`}
                >
                  {buildingMetrics.waterUsage.toFixed(0)}{" "}
                  <span className="text-[10px] text-slate-500 font-sans uppercase ml-1">
                    m³ / PA
                  </span>
                </p>
                <p className="text-[9px] text-slate-500 mt-1">
                  Ramps with construction progress
                </p>
              </div>
            </div>

            {/* Environmental Impact Report Button - snapshot taken at time of generate */}
            <div className="space-y-4 text-xs">
              <div className="pt-6 mt-6 border-t border-slate-100">
                <button
                  onClick={() => setShowEnvironmentalReport(true)}
                  disabled={buildingsActiveAtTimeline.length === 0}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-black uppercase tracking-tight transition-all ${
                    buildingsActiveAtTimeline.length > 0
                      ? "bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg"
                      : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  <ClipboardList size={18} />
                  <span>Generate Impact Report</span>
                </button>
                <p className="text-[9px] text-slate-500 text-center mt-2">
                  {buildingsActiveAtTimeline.length === 0
                    ? "Move timeline to a date with active construction to generate a report"
                    : `Snapshot at current date · ${buildingsActiveAtTimeline.length} building${buildingsActiveAtTimeline.length !== 1 ? "s" : ""}`}
                </p>
              </div>

              {/* Building Placement */}
              <div className="pt-6 mt-6 border-t border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="ui-label">Building Placement</h3>
                </div>

                <div className="rounded-md p-3 border bg-slate-50 border-slate-200 space-y-3">
                  {/* Building Selector Dropdown */}
                  <div>
                    <p className="text-[9px] font-bold text-slate-500 uppercase mb-2">
                      Select Building Model
                    </p>
                    <div className="relative">
                      <button
                        onClick={() =>
                          setShowBuildingSelector(!showBuildingSelector)
                        }
                        className="w-full flex items-center justify-between px-3 py-2 bg-white border border-slate-200 rounded text-[10px] font-medium text-slate-700 hover:border-slate-300 transition-colors"
                      >
                        <span className="truncate">
                          {customModelPath
                            ? importedBuildingName ||
                              "Custom Building from Editor"
                            : selectedModelId
                              ? availableBuildings.find(
                                  (b) => b.id === selectedModelId,
                                )?.name || "Select a building..."
                              : "Select a building..."}
                        </span>
                        <ChevronDown
                          size={14}
                          className={`text-slate-400 transition-transform ${showBuildingSelector ? "rotate-180" : ""}`}
                        />
                      </button>

                      {showBuildingSelector && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-48 overflow-y-auto custom-scrollbar">
                          {/* Imported from Editor */}
                          {customModelPath && (
                            <button
                              onClick={() => {
                                setShowBuildingSelector(false);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-[10px] text-left hover:bg-orange-50 border-b border-slate-100"
                            >
                              <Upload size={12} className="text-orange-500" />
                              <span className="font-medium text-orange-700">
                                {importedBuildingName ||
                                  "Custom Building from Editor"}
                              </span>
                              <Check
                                size={12}
                                className="ml-auto text-orange-500"
                              />
                            </button>
                          )}

                          {/* Available Buildings */}
                          {availableBuildings.map((building) => (
                            <button
                              key={building.id}
                              onClick={() => {
                                setSelectedModelId(building.id);
                                setCustomModelPath(building.path);
                                setImportedBuildingName(building.name);
                                setShowBuildingSelector(false);
                              }}
                              className={`w-full flex items-center gap-2 px-3 py-2 text-[10px] text-left hover:bg-blue-50 transition-colors ${
                                selectedModelId === building.id &&
                                !customModelPath
                                  ? "bg-blue-50"
                                  : ""
                              }`}
                            >
                              <Building2
                                size={12}
                                className={
                                  building.type === "custom"
                                    ? "text-purple-500"
                                    : "text-slate-400"
                                }
                              />
                              <div className="flex-1 min-w-0">
                                <span className="font-medium text-slate-700 truncate block">
                                  {building.name}
                                </span>
                                <span className="text-[8px] text-slate-400 uppercase">
                                  {building.type}
                                </span>
                              </div>
                              {selectedModelId === building.id && (
                                <Check size={12} className="text-accent-blue" />
                              )}
                            </button>
                          ))}

                          {availableBuildings.length === 0 &&
                            !customModelPath && (
                              <p className="px-3 py-4 text-[10px] text-slate-400 text-center">
                                No buildings available
                              </p>
                            )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Place Button */}
                  <button
                    onClick={() => {
                      if (!selectedModelId && !customModelPath) {
                        // Auto-select first building if none selected
                        if (availableBuildings.length > 0) {
                          const first = availableBuildings[0];
                          setSelectedModelId(first.id);
                          setCustomModelPath(first.path);
                          setImportedBuildingName(first.name);
                        }
                      }
                      setIsPlacementMode(!isPlacementMode);
                    }}
                    disabled={
                      !selectedModelId &&
                      !customModelPath &&
                      availableBuildings.length === 0
                    }
                    className={`w-full flex items-center justify-center gap-1.5 px-2.5 py-2 rounded text-[10px] font-black uppercase tracking-wider transition-colors ${
                      isPlacementMode
                        ? "bg-accent-blue text-white"
                        : "bg-white border border-accent-blue text-accent-blue hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    }`}
                  >
                    <Plus size={12} />
                    {isPlacementMode ? "Cancel Placement" : "Place on Map"}
                  </button>

                  {/* Scale Multiplier */}
                  {(customModelPath || selectedModelId) && (
                    <div className="pt-3 border-t border-slate-200">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[9px] font-bold text-slate-600 uppercase">
                          Scale Multiplier
                        </label>
                        <span className="text-[10px] font-mono font-bold text-slate-700">
                          {buildingScale.x.toFixed(1)}x
                        </span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="30"
                        step="0.5"
                        value={buildingScale.x}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setBuildingScale({ x: val, y: val, z: val });
                        }}
                        className="w-full h-3 bg-slate-200 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-10 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-blue [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-300 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing"
                      />
                      <div className="flex justify-between text-[8px] text-slate-500 mt-1">
                        <span>1x</span>
                        <span>15x</span>
                        <span>30x</span>
                      </div>
                    </div>
                  )}

                  {/* Placed Buildings List */}
                  <div className="pt-3 border-t border-slate-200">
                    <p className="text-[9px] font-bold text-slate-500 uppercase mb-2">
                      Placed Buildings ({placedBuildings.length})
                    </p>
                    {placedBuildings.length === 0 ? (
                      <p className="text-[10px] text-slate-400 text-center py-3 bg-white rounded border border-dashed border-slate-200">
                        Click on map to place buildings
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                        {placedBuildings.map((building) => (
                          <div
                            key={building.id}
                            onClick={() => setSelectedBuildingId(building.id)}
                            className={`flex items-center justify-between bg-white rounded p-2 border cursor-pointer transition-all ${
                              selectedBuildingId === building.id
                                ? "border-accent-blue bg-blue-50"
                                : "border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <p
                                className={`text-[10px] font-bold truncate ${
                                  selectedBuildingId === building.id
                                    ? "text-accent-blue"
                                    : "text-slate-900"
                                }`}
                              >
                                {building.timeline?.zoneType
                                  ? `${building.timeline.zoneType} – ${building.lat.toFixed(4)}°`
                                  : `${building.lat.toFixed(5)}°, ${building.lng.toFixed(5)}°`}
                              </p>
                              <p className="text-[8px] text-slate-500">
                                {building.timeline?.durationDays
                                  ? `${building.timeline.durationDays} days`
                                  : `X: ${building.position.x.toFixed(1)}m, Z: ${building.position.z.toFixed(1)}m`}
                              </p>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeBuilding(building.id);
                              }}
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
              </div>

              {/* Selected Building Transform Controls */}
              {selectedBuilding && (
                <div className="pt-6 mt-6 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="ui-label text-accent-blue">
                      Selected Building Transform
                    </h3>
                    <button
                      onClick={() => setSelectedBuildingId(null)}
                      className="p-1 hover:bg-slate-100 rounded transition-colors text-slate-400"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div className="bg-blue-50 rounded-md p-3 border border-accent-blue space-y-3">
                    {/* Position Controls */}
                    <div>
                      <p className="text-[9px] font-bold text-slate-700 uppercase mb-2">
                        Position (Arrow Keys)
                      </p>
                      <div className="space-y-2.5 text-[10px]">
                        {/* X Position */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <label className="text-slate-600">X</label>
                            <input
                              type="number"
                              value={selectedBuilding.position.x.toFixed(1)}
                              onChange={(e) =>
                                updateSelectedBuilding({
                                  position: {
                                    ...selectedBuilding.position,
                                    x: parseFloat(e.target.value) || 0,
                                  },
                                })
                              }
                              className="w-20 px-2 py-1 text-[10px] font-mono text-slate-900 bg-white border border-slate-200 rounded text-right"
                              step="1"
                            />
                          </div>
                          <input
                            type="range"
                            min={selectedBuilding.position.x - 50}
                            max={selectedBuilding.position.x + 50}
                            step="0.5"
                            value={selectedBuilding.position.x}
                            onChange={(e) =>
                              updateSelectedBuilding({
                                position: {
                                  ...selectedBuilding.position,
                                  x: parseFloat(e.target.value),
                                },
                              })
                            }
                            className="w-full h-3 bg-slate-200 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-10 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-blue [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-300 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing"
                          />
                        </div>

                        {/* Y Position */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <label className="text-slate-600">Y</label>
                            <input
                              type="number"
                              value={selectedBuilding.position.y.toFixed(1)}
                              onChange={(e) =>
                                updateSelectedBuilding({
                                  position: {
                                    ...selectedBuilding.position,
                                    y: parseFloat(e.target.value) || 0,
                                  },
                                })
                              }
                              className="w-20 px-2 py-1 text-[10px] font-mono text-slate-900 bg-white border border-slate-200 rounded text-right"
                              step="1"
                            />
                          </div>
                          <input
                            type="range"
                            min={selectedBuilding.position.y - 20}
                            max={selectedBuilding.position.y + 20}
                            step="0.5"
                            value={selectedBuilding.position.y}
                            onChange={(e) =>
                              updateSelectedBuilding({
                                position: {
                                  ...selectedBuilding.position,
                                  y: parseFloat(e.target.value),
                                },
                              })
                            }
                            className="w-full h-3 bg-slate-200 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-10 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-blue [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-300 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing"
                          />
                        </div>

                        {/* Z Position */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <label className="text-slate-600">Z</label>
                            <input
                              type="number"
                              value={selectedBuilding.position.z.toFixed(1)}
                              onChange={(e) =>
                                updateSelectedBuilding({
                                  position: {
                                    ...selectedBuilding.position,
                                    z: parseFloat(e.target.value) || 0,
                                  },
                                })
                              }
                              className="w-20 px-2 py-1 text-[10px] font-mono text-slate-900 bg-white border border-slate-200 rounded text-right"
                              step="1"
                            />
                          </div>
                          <input
                            type="range"
                            min={selectedBuilding.position.z - 50}
                            max={selectedBuilding.position.z + 50}
                            step="0.5"
                            value={selectedBuilding.position.z}
                            onChange={(e) =>
                              updateSelectedBuilding({
                                position: {
                                  ...selectedBuilding.position,
                                  z: parseFloat(e.target.value),
                                },
                              })
                            }
                            className="w-full h-3 bg-slate-200 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-10 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-blue [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-300 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Rotation Controls */}
                    <div className="pt-2 border-t border-blue-200">
                      <p className="text-[9px] font-bold text-slate-700 uppercase mb-2">
                        Rotation (R Key)
                      </p>
                      <div className="space-y-2.5 text-[10px]">
                        {/* X Rotation */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <label className="text-slate-600">X (deg)</label>
                            <input
                              type="number"
                              value={(
                                (selectedBuilding.rotation.x * 180) /
                                Math.PI
                              ).toFixed(1)}
                              onChange={(e) =>
                                updateSelectedBuilding({
                                  rotation: {
                                    ...selectedBuilding.rotation,
                                    x:
                                      ((parseFloat(e.target.value) || 0) *
                                        Math.PI) /
                                      180,
                                  },
                                })
                              }
                              className="w-20 px-2 py-1 text-[10px] font-mono text-slate-900 bg-white border border-slate-200 rounded text-right"
                              step="5"
                            />
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="360"
                            step="5"
                            value={
                              (selectedBuilding.rotation.x * 180) / Math.PI
                            }
                            onChange={(e) =>
                              updateSelectedBuilding({
                                rotation: {
                                  ...selectedBuilding.rotation,
                                  x:
                                    (parseFloat(e.target.value) * Math.PI) /
                                    180,
                                },
                              })
                            }
                            className="w-full h-3 bg-slate-200 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-10 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-blue [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-300 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing"
                          />
                        </div>

                        {/* Y Rotation */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <label className="text-slate-600">Y (deg)</label>
                            <input
                              type="number"
                              value={(
                                (selectedBuilding.rotation.y * 180) /
                                Math.PI
                              ).toFixed(1)}
                              onChange={(e) =>
                                updateSelectedBuilding({
                                  rotation: {
                                    ...selectedBuilding.rotation,
                                    y:
                                      ((parseFloat(e.target.value) || 0) *
                                        Math.PI) /
                                      180,
                                  },
                                })
                              }
                              className="w-20 px-2 py-1 text-[10px] font-mono text-slate-900 bg-white border border-slate-200 rounded text-right"
                              step="5"
                            />
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="360"
                            step="5"
                            value={
                              (selectedBuilding.rotation.y * 180) / Math.PI
                            }
                            onChange={(e) =>
                              updateSelectedBuilding({
                                rotation: {
                                  ...selectedBuilding.rotation,
                                  y:
                                    (parseFloat(e.target.value) * Math.PI) /
                                    180,
                                },
                              })
                            }
                            className="w-full h-3 bg-slate-200 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-10 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-blue [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-300 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing"
                          />
                        </div>

                        {/* Z Rotation */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <label className="text-slate-600">Z (deg)</label>
                            <input
                              type="number"
                              value={(
                                (selectedBuilding.rotation.z * 180) /
                                Math.PI
                              ).toFixed(1)}
                              onChange={(e) =>
                                updateSelectedBuilding({
                                  rotation: {
                                    ...selectedBuilding.rotation,
                                    z:
                                      ((parseFloat(e.target.value) || 0) *
                                        Math.PI) /
                                      180,
                                  },
                                })
                              }
                              className="w-20 px-2 py-1 text-[10px] font-mono text-slate-900 bg-white border border-slate-200 rounded text-right"
                              step="5"
                            />
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="360"
                            step="5"
                            value={
                              (selectedBuilding.rotation.z * 180) / Math.PI
                            }
                            onChange={(e) =>
                              updateSelectedBuilding({
                                rotation: {
                                  ...selectedBuilding.rotation,
                                  z:
                                    (parseFloat(e.target.value) * Math.PI) /
                                    180,
                                },
                              })
                            }
                            className="w-full h-3 bg-slate-200 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-10 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-blue [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-300 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Scale Controls */}
                    <div className="pt-2 border-t border-blue-200">
                      <p className="text-[9px] font-bold text-slate-700 uppercase mb-2">
                        Scale (S Key)
                      </p>
                      <div className="space-y-2.5 text-[10px]">
                        {/* X Scale */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <label className="text-slate-600">X</label>
                            <input
                              type="number"
                              value={selectedBuilding.scale.x.toFixed(2)}
                              onChange={(e) =>
                                updateSelectedBuilding({
                                  scale: {
                                    ...selectedBuilding.scale,
                                    x: parseFloat(e.target.value) || 0,
                                  },
                                })
                              }
                              className="w-20 px-2 py-1 text-[10px] font-mono text-slate-900 bg-white border border-slate-200 rounded text-right"
                              step="0.5"
                            />
                          </div>
                          <input
                            type="range"
                            min="0.5"
                            max="30"
                            step="0.5"
                            value={selectedBuilding.scale.x}
                            onChange={(e) =>
                              updateSelectedBuilding({
                                scale: {
                                  ...selectedBuilding.scale,
                                  x: parseFloat(e.target.value),
                                },
                              })
                            }
                            className="w-full h-3 bg-slate-200 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-10 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-blue [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-300 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing"
                          />
                        </div>

                        {/* Y Scale */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <label className="text-slate-600">Y</label>
                            <input
                              type="number"
                              value={selectedBuilding.scale.y.toFixed(2)}
                              onChange={(e) =>
                                updateSelectedBuilding({
                                  scale: {
                                    ...selectedBuilding.scale,
                                    y: parseFloat(e.target.value) || 0,
                                  },
                                })
                              }
                              className="w-20 px-2 py-1 text-[10px] font-mono text-slate-900 bg-white border border-slate-200 rounded text-right"
                              step="0.5"
                            />
                          </div>
                          <input
                            type="range"
                            min="0.5"
                            max="30"
                            step="0.5"
                            value={selectedBuilding.scale.y}
                            onChange={(e) =>
                              updateSelectedBuilding({
                                scale: {
                                  ...selectedBuilding.scale,
                                  y: parseFloat(e.target.value),
                                },
                              })
                            }
                            className="w-full h-3 bg-slate-200 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-10 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-blue [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-300 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing"
                          />
                        </div>

                        {/* Z Scale */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <label className="text-slate-600">Z</label>
                            <input
                              type="number"
                              value={selectedBuilding.scale.z.toFixed(2)}
                              onChange={(e) =>
                                updateSelectedBuilding({
                                  scale: {
                                    ...selectedBuilding.scale,
                                    z: parseFloat(e.target.value) || 0,
                                  },
                                })
                              }
                              className="w-20 px-2 py-1 text-[10px] font-mono text-slate-900 bg-white border border-slate-200 rounded text-right"
                              step="0.5"
                            />
                          </div>
                          <input
                            type="range"
                            min="0.5"
                            max="30"
                            step="0.5"
                            value={selectedBuilding.scale.z}
                            onChange={(e) =>
                              updateSelectedBuilding({
                                scale: {
                                  ...selectedBuilding.scale,
                                  z: parseFloat(e.target.value),
                                },
                              })
                            }
                            className="w-full h-3 bg-slate-200 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-10 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-blue [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-300 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Keyboard Hints */}
                    <div className="pt-2 border-t border-blue-200 text-[9px] text-slate-600">
                      <p className="font-bold mb-1">Keyboard Controls:</p>
                      <div className="space-y-0.5">
                        <p>← → : Move X • ↑ ↓ : Move Z</p>
                        <p>PgUp/Dn : Move Y</p>
                        <p>R : Rotate Y • Shift+R : Rotate faster</p>
                        <p>S : Scale up • Shift+S : Scale down</p>
                      </div>
                    </div>

                    {/* Delete button */}
                    <div className="pt-2 border-t border-blue-200">
                      <button
                        onClick={() => removeBuilding(selectedBuilding.id)}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-50 border border-red-200 hover:bg-red-100 rounded text-[10px] font-bold text-red-700 transition-colors uppercase"
                      >
                        <Trash2 size={12} />
                        Delete Building
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* FIXED BOTTOM PANEL: INTEGRATED TIMELINE - only show when at least one building is placed */}
      {placedBuildings.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 z-50 glass border-t border-slate-300 px-8 py-4 flex items-center gap-10 shadow-lg">
          {/* Simulation Controls */}
          <div className="flex items-center gap-4 shrink-0 border-r border-slate-200 pr-10">
            <button
              onClick={() => setIsTimelinePlaying((p) => !p)}
              className={`w-10 h-10 rounded flex items-center justify-center transition-colors shadow-sm ${
                isTimelinePlaying
                  ? "bg-amber-500 text-white hover:bg-amber-600"
                  : "bg-accent-blue text-white hover:bg-slate-900"
              }`}
              title={isTimelinePlaying ? "Pause" : "Play timeline"}
            >
              {isTimelinePlaying ? (
                <Pause size={20} />
              ) : (
                <PlayCircle size={20} />
              )}
            </button>
            <div>
              <p className="text-xs font-black text-slate-900 uppercase tracking-tight font-serif">
                Construction Timeline
              </p>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                View building progress
              </p>
            </div>
          </div>

          {/* Timeline Slider - week-based, dynamic range */}
          <div className="flex-1 flex flex-col gap-3">
            {(() => {
              const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
              const minT = timelineRange.minDate.getTime();
              const maxT = timelineRange.maxDate.getTime();
              const rangeMs = maxT - minT || 1;
              const currentVal = new Date(timelineDate).getTime();
              const clampedVal = Math.max(minT, Math.min(maxT, currentVal));
              const pct = ((clampedVal - minT) / rangeMs) * 100;

              const weekCount = Math.ceil(rangeMs / WEEK_MS);
              const tickStep = Math.max(1, Math.floor(weekCount / 8));
              const ticks: { t: number; label: string }[] = [];
              for (let i = 0; i <= weekCount; i += tickStep) {
                const t = minT + i * WEEK_MS;
                if (t <= maxT) {
                  const d = new Date(t);
                  ticks.push({
                    t,
                    label: `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(2)}`,
                  });
                }
              }
              if (ticks[ticks.length - 1]?.t !== maxT) {
                const d = new Date(maxT);
                ticks.push({
                  t: maxT,
                  label: `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(2)}`,
                });
              }

              return (
                <>
                  <div className="relative">
                    <input
                      type="range"
                      min={minT}
                      max={maxT}
                      step={WEEK_MS}
                      value={clampedVal}
                      onChange={(e) => {
                        const t = parseInt(e.target.value, 10);
                        setTimelineDate(new Date(t).toISOString().slice(0, 10));
                      }}
                      className="w-full h-3 bg-slate-200 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-blue [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-300 [&::-webkit-slider-thumb]:cursor-grab"
                      style={{
                        background: `linear-gradient(to right, #003F7C 0%, #003F7C ${pct}%, #e2e8f0 ${pct}%, #e2e8f0 100%)`,
                      }}
                    />
                    <div className="absolute top-4 left-0 right-0 h-4 pointer-events-none">
                      {ticks.map(({ t, label }) => {
                        const tickPct = ((t - minT) / rangeMs) * 100;
                        return (
                          <span
                            key={t}
                            className="absolute text-[8px] text-slate-500 font-mono whitespace-nowrap"
                            style={{
                              left: `calc(${tickPct}% - 1px)`,
                              transform: "translateX(-50%)",
                            }}
                          >
                            {label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex justify-between px-0.5 text-[8px] text-slate-400 font-bold uppercase">
                    <span>Wk 1</span>
                    <span>Week {weekCount}</span>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Timestamp & Settings */}
          <div className="flex items-center gap-4 shrink-0 border-l border-slate-200 pl-10">
            <div className="flex flex-col items-end">
              <span className="ui-label mb-1">Active Timestamp</span>
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded border border-slate-200">
                <Clock className="text-slate-400" size={14} />
                <span className="text-[10px] font-black text-slate-700 uppercase">
                  {new Date(timelineDate)
                    .toLocaleDateString("en-US", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                    .toUpperCase()}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => {
                  const today = new Date().toISOString().slice(0, 10);
                  if (today >= minDateStr && today <= maxDateStr) {
                    setTimelineDate(today);
                  } else {
                    setTimelineDate(minDateStr);
                  }
                }}
                className="text-[9px] font-bold text-accent-blue border border-accent-blue px-2 py-1 rounded hover:bg-blue-50 transition-colors uppercase"
                title="Go to today, or start of project if today is outside range"
              >
                Today
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Wrap with Suspense for useSearchParams
export default function MapPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full bg-slate-100 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-accent-blue border-r-transparent mb-4" />
            <p className="text-slate-600">Loading map...</p>
          </div>
        </div>
      }
    >
      <MapPageContent />
    </Suspense>
  );
}
