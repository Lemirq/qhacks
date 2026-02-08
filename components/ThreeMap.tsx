"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import * as turf from "@turf/turf";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OutlinePass } from "three/examples/jsm/postprocessing/OutlinePass.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";

// Scene management
import { createSceneManager, handleResize } from "@/lib/sceneManager";

// Rendering systems
import { fetchBuildings } from "@/lib/buildingData";
import { renderBuildings } from "@/lib/buildingRenderer";
import { renderRoads } from "@/lib/roadRenderer";
import { createGround } from "@/lib/environmentRenderer";

// Projection and camera
import { CityProjection } from "@/lib/projection";
import {
  setupControls,
  flyToLocation,
  updateTweens,
} from "@/lib/cameraController";

// Traffic simulation
import { RoadNetwork } from "@/lib/roadNetwork";
import { Pathfinder } from "@/lib/pathfinding";
import { Spawner, SpawnedCar } from "@/lib/spawning";

// Traffic infrastructure and physics
import { TrafficInfrastructureManager } from "@/lib/trafficInfrastructure";
import { VehiclePhysics } from "@/lib/vehiclePhysics";
import { VehicleBehaviorController } from "@/lib/traffic/vehicleBehavior";
import {
  SignalCoordinator,
  createSignalCoordinator,
} from "@/lib/traffic/signalCoordination";
import {
  CollisionSystem,
  createCollisionSystem,
} from "@/lib/traffic/collisionSystem";
import { ConfigurationManager } from "@/lib/simulationConfig";

// Rendering and performance
import {
  createEnhancedCarModel,
  updateTurnSignals,
  updateBrakeLights,
  EnhancedVehicleMesh,
} from "@/lib/vehicleRenderer";
import {
  VehiclePool,
  LODManager,
  StaggeredUpdateManager,
  PerformanceMonitor,
} from "@/lib/performanceOptimizer";

// Analytics
import { TrafficAnalytics } from "@/lib/analytics";
import DebugOverlay from "./DebugOverlay";
import AnalyticsDashboard from "./AnalyticsDashboard";
import {
  isUnderConstruction,
  getConstructionSourceDb,
} from "@/lib/constructionNoise";

interface PlacedBuilding {
  id: string;
  modelPath: string;
  position: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
  scale?: { x: number; y: number; z: number };
  lat: number;
  lng: number;
  timeline?: {
    zoneType?: string;
    startDate?: string;
    durationDays?: number;
  };
}

interface ThreeMapProps {
  initialCenter?: [number, number];
  className?: string;
  onCoordinateClick?: (
    coordinate: {
      lat: number;
      lng: number;
      worldX: number;
      worldY: number;
      worldZ: number;
      ghostRotationY?: number; // Current rotation of ghost preview
    } | null,
  ) => void;
  placedBuildings?: PlacedBuilding[];
  isPlacementMode?: boolean;
  buildingScale?: { x: number; y: number; z: number };
  selectedBuildingId?: string | null;
  onBuildingSelect?: (id: string | null) => void;
  customModelPath?: string | null;
  onOsmBuildingDelete?: (buildingId: string) => void;
  timelineDate?: string;
  showNoiseRipple?: boolean;
}

type CarType = "sedan" | "suv" | "truck" | "compact";

interface TrafficLight {
  id: string;
  position: [number, number];
  state: "red" | "yellow" | "green";
  timer: number;
  mesh?: THREE.Group;
  intersectionId: string;
  direction: "ns" | "ew";
}

const TRAFFIC_LIGHT_TIMINGS = {
  green: 8000,
  yellow: 2000,
  red: 8000,
};

// Create 3D car models
function createCarModel(type: CarType, color: string): THREE.Mesh {
  const group = new THREE.Group();
  const material = new THREE.MeshPhongMaterial({ color });

  switch (type) {
    case "sedan": {
      const bodyGeometry = new THREE.BoxGeometry(1.8, 0.8, 4.2);
      const body = new THREE.Mesh(bodyGeometry, material);
      body.position.y = 0.4;
      group.add(body);

      const cabinGeometry = new THREE.BoxGeometry(1.6, 0.6, 2.2);
      const cabin = new THREE.Mesh(cabinGeometry, material);
      cabin.position.y = 1.1;
      cabin.position.z = -0.3;
      group.add(cabin);
      break;
    }
    case "suv": {
      const bodyGeometry = new THREE.BoxGeometry(2.0, 1.0, 4.5);
      const body = new THREE.Mesh(bodyGeometry, material);
      body.position.y = 0.5;
      group.add(body);

      const cabinGeometry = new THREE.BoxGeometry(1.9, 0.8, 2.5);
      const cabin = new THREE.Mesh(cabinGeometry, material);
      cabin.position.y = 1.3;
      cabin.position.z = -0.2;
      group.add(cabin);
      break;
    }
    case "truck": {
      const cabGeometry = new THREE.BoxGeometry(2.0, 1.2, 2.0);
      const cab = new THREE.Mesh(cabGeometry, material);
      cab.position.y = 1.0;
      cab.position.z = 1.5;
      group.add(cab);

      const bedGeometry = new THREE.BoxGeometry(2.0, 0.8, 3.0);
      const bed = new THREE.Mesh(bedGeometry, material);
      bed.position.y = 0.4;
      bed.position.z = -1.0;
      group.add(bed);
      break;
    }
    case "compact": {
      const bodyGeometry = new THREE.BoxGeometry(1.6, 0.7, 3.5);
      const body = new THREE.Mesh(bodyGeometry, material);
      body.position.y = 0.35;
      group.add(body);

      const cabinGeometry = new THREE.BoxGeometry(1.5, 0.5, 2.0);
      const cabin = new THREE.Mesh(cabinGeometry, material);
      cabin.position.y = 0.95;
      cabin.position.z = -0.2;
      group.add(cabin);
      break;
    }
  }

  // Add wheels
  const wheelGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 16);
  const wheelMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });

  const wheelPositions = [
    [0.7, 0.3, 1.2],
    [-0.7, 0.3, 1.2],
    [0.7, 0.3, -1.2],
    [-0.7, 0.3, -1.2],
  ];

  wheelPositions.forEach(([x, y, z]) => {
    const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, y, z);
    group.add(wheel);
  });

  // Wrap in parent mesh for consistent handling
  const finalGeometry = new THREE.BoxGeometry(1, 1, 1);
  const finalMesh = new THREE.Mesh(finalGeometry, material);
  finalMesh.add(group);
  finalMesh.visible = true;

  return finalMesh;
}

// Create traffic light 3D model
function createTrafficLightModel(): THREE.Group {
  const group = new THREE.Group();

  // Pole - 50% smaller
  const poleGeometry = new THREE.CylinderGeometry(2.5, 2.5, 25, 8);
  const poleMaterial = new THREE.MeshPhongMaterial({
    color: 0x444444,
    emissive: 0x222222,
    emissiveIntensity: 0.5,
  });
  const pole = new THREE.Mesh(poleGeometry, poleMaterial);
  pole.position.y = 12.5;
  group.add(pole);

  // Light housing - 50% smaller
  const housingGeometry = new THREE.BoxGeometry(10, 30, 7.5);
  const housingMaterial = new THREE.MeshPhongMaterial({
    color: 0x222222,
    emissive: 0x111111,
    emissiveIntensity: 0.3,
  });
  const housing = new THREE.Mesh(housingGeometry, housingMaterial);
  housing.position.y = 25;
  group.add(housing);

  // Lights (red, yellow, green) - 50% smaller
  const lightGeometry = new THREE.SphereGeometry(4, 16, 16);

  const redLight = new THREE.Mesh(
    lightGeometry,
    new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 2,
    }),
  );
  redLight.position.set(0, 35, 5);
  redLight.name = "red";
  group.add(redLight);

  const yellowLight = new THREE.Mesh(
    lightGeometry,
    new THREE.MeshStandardMaterial({
      color: 0xffff00,
      emissive: 0xffff00,
      emissiveIntensity: 2,
    }),
  );
  yellowLight.position.set(0, 25, 5);
  yellowLight.name = "yellow";
  group.add(yellowLight);

  const greenLight = new THREE.Mesh(
    lightGeometry,
    new THREE.MeshStandardMaterial({
      color: 0x00ff00,
      emissive: 0x00ff00,
      emissiveIntensity: 2,
    }),
  );
  greenLight.position.set(0, 15, 5);
  greenLight.name = "green";
  group.add(greenLight);

  return group;
}

// Fetch traffic signals from Next.js API route
async function fetchAllTrafficSignals(): Promise<
  Array<{
    lat: number;
    lon: number;
    type: string;
    id: number;
  }>
> {
  try {
    console.log("Fetching traffic signals...");
    const response = await fetch(
      `/api/map/traffic-signals?south=44.220&west=-76.510&north=44.240&east=-76.480`,
      {
        cache: "no-store", // Don't cache - always fetch fresh data
      },
    );

    if (!response.ok) {
      console.warn(`API error: ${response.status}`);
      return [];
    }

    const signals = await response.json();
    console.log(`✅ Found ${signals.length} traffic controls from cache`);

    return signals;
  } catch (error) {
    console.warn("Error fetching traffic signals:", error);
    return [];
  }
}

export default function ThreeMap({
  initialCenter = [-76.4951, 44.2253], // Queen's University
  className = "w-full h-full",
  onCoordinateClick,
  placedBuildings = [],
  isPlacementMode = false,
  buildingScale = { x: 10, y: 10, z: 10 },
  selectedBuildingId = null,
  onBuildingSelect,
  customModelPath = null,
  onOsmBuildingDelete,
  timelineDate = new Date().toISOString().slice(0, 10),
  showNoiseRipple = false,
}: ThreeMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const groupsRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);
  const initialized = useRef(false);

  const [loadingStatus, setLoadingStatus] = useState<string>("Initializing...");
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const [ghostPosition, setGhostPosition] = useState<THREE.Vector3 | null>(
    null,
  );
  const ghostModelRef = useRef<THREE.Group | null>(null);
  const buildingModelsRef = useRef<Map<string, THREE.Group>>(new Map());
  const osmBuildingMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const composerRef = useRef<EffectComposer | null>(null);
  const outlinePassRef = useRef<OutlinePass | null>(null);
  const [selectedOsmBuildingId, setSelectedOsmBuildingId] = useState<
    string | null
  >(null);
  const [ghostRotationY, setGhostRotationY] = useState(0); // Rotation for ghost preview
  const noiseRippleGroupRef = useRef<THREE.Group | null>(null);
  const rippleTimeRef = useRef(0);

  // Analytics state
  const analyticsRef = useRef<TrafficAnalytics | null>(null);
  const [debugOverlayVisible, setDebugOverlayVisible] = useState(false);
  const [dashboardVisible, setDashboardVisible] = useState(false);

  // Traffic system managers (integrated systems)
  const trafficInfrastructureRef = useRef<TrafficInfrastructureManager | null>(
    null,
  );
  const vehiclePhysicsRef = useRef<VehiclePhysics | null>(null);
  const behaviorControllerRef = useRef<VehicleBehaviorController | null>(null);
  const signalCoordinatorRef = useRef<SignalCoordinator | null>(null);
  const collisionSystemRef = useRef<CollisionSystem | null>(null);
  const configManagerRef = useRef<ConfigurationManager | null>(null);

  // Performance optimization managers
  const vehiclePoolRef = useRef<VehiclePool | null>(null);
  const lodManagerRef = useRef<LODManager | null>(null);
  const staggeredUpdateRef = useRef<StaggeredUpdateManager | null>(null);
  const perfMonitorRef = useRef<PerformanceMonitor | null>(null);

  useEffect(() => {
    if (!canvasRef.current || initialized.current) return;
    initialized.current = true;

    let roadNetwork: RoadNetwork;
    let spawner: Spawner;
    let trafficLights: TrafficLight[] = [];
    const carMeshes: Record<string, THREE.Mesh> = {};

    async function initializeScene() {
      if (!canvasRef.current) return;

      try {
        // Create scene manager
        setLoadingStatus("Creating scene...");
        const { scene, camera, renderer, groups } = createSceneManager(
          canvasRef.current,
        );
        sceneRef.current = scene;
        cameraRef.current = camera;
        rendererRef.current = renderer;
        groupsRef.current = groups;

        // Setup camera controls
        const controls = setupControls(camera, renderer);
        controlsRef.current = controls;

        // Ensure controls are enabled
        controls.enabled = true;
        console.log("✅ OrbitControls initialized:", {
          enabled: controls.enabled,
          enableRotate: controls.enableRotate,
          enableZoom: controls.enableZoom,
          enablePan: controls.enablePan,
        });

        // Environment setup (sky and fog removed for clearer view)
        setLoadingStatus("Setting up environment...");

        // Define bounding box for Kingston/Queen's area
        const bbox: [number, number, number, number] = [
          44.22, -76.51, 44.24, -76.48,
        ];

        // Create ground plane (plain white, no texture)
        setLoadingStatus("Creating ground plane...");
        const ground = createGround(
          {
            minLat: bbox[0],
            maxLat: bbox[2],
            minLng: bbox[1],
            maxLng: bbox[3],
          },
          CityProjection,
          undefined, // No texture - plain white ground
        );
        groups.environment.add(ground);

        // Fetch and render buildings
        setLoadingStatus("Fetching buildings from OpenStreetMap...");
        const buildings = await fetchBuildings(bbox);

        setLoadingStatus("Rendering buildings...");
        const osmMeshes = renderBuildings(
          buildings,
          CityProjection,
          groups.staticGeometry,
        );
        // Store OSM building meshes for click detection
        osmBuildingMeshesRef.current = osmMeshes;

        // Initialize road network
        setLoadingStatus("Fetching road network from OpenStreetMap...");
        roadNetwork = new RoadNetwork();
        await roadNetwork.fetchFromOSM({
          south: 44.22,
          west: -76.51,
          north: 44.24,
          east: -76.48,
        });

        roadNetwork.addQueensDestinations();

        console.log("✅ Road network loaded successfully");
        console.log(`   Nodes: ${roadNetwork.getNodes().length}`);
        console.log(`   Edges: ${roadNetwork.getEdges().length}`);
        console.log(`   Destinations: ${roadNetwork.getDestinations().length}`);

        // Render roads
        setLoadingStatus("Rendering roads...");
        const edges = roadNetwork.getEdges();
        renderRoads(edges, CityProjection, groups.staticGeometry);

        // Update static geometry matrix after all additions
        groups.staticGeometry.updateMatrix();

        // Initialize spawner
        setLoadingStatus("Initializing traffic simulation...");
        spawner = new Spawner(roadNetwork, {
          maxCars: 380, // High cap so streets stay busy
          globalSpawnRate: 3.0, // Spawn quickly to fill the map
          despawnRadius: 25,
          defaultCarSpeed: 40,
          carTypeDistribution: {
            sedan: 0.4,
            suv: 0.25,
            truck: 0.15,
            compact: 0.2,
          },
        });

        spawner.initializeQueensSpawnPoints();
        spawner.initializeFromRoadNetwork(45); // Spawn from many edges so cars appear everywhere
        console.log(
          `✅ Spawner initialized with ${spawner.getSpawnPoints().length} spawn points`,
        );

        // Initialize analytics
        setLoadingStatus("Setting up analytics...");
        analyticsRef.current = new TrafficAnalytics({
          enablePerformanceMonitoring: true,
          enableTrafficMetrics: true,
          enableIntersectionTracking: true,
          enableNearMissDetection: true,
          nearMissThreshold: 5,
          snapshotInterval: 1000,
          maxHistoryLength: 300,
        });
        console.log("✅ Analytics initialized");

        // Initialize integrated traffic systems
        setLoadingStatus("Initializing traffic infrastructure...");

        // 1. Configuration Manager
        configManagerRef.current = new ConfigurationManager();
        console.log("✅ Configuration manager initialized");

        // 2. Traffic Infrastructure Manager
        trafficInfrastructureRef.current = new TrafficInfrastructureManager();

        // 3. Vehicle Physics Engine
        vehiclePhysicsRef.current = new VehiclePhysics();
        console.log("✅ Vehicle physics engine initialized");

        // 4. Collision System with bounds
        collisionSystemRef.current = createCollisionSystem({
          south: 44.22,
          west: -76.51,
          north: 44.24,
          east: -76.48,
        });
        console.log("✅ Collision detection system initialized");

        // 5. Vehicle Behavior Controller
        behaviorControllerRef.current = new VehicleBehaviorController();
        console.log("✅ Behavior controller initialized");

        // 6. Performance Optimization Systems
        vehiclePoolRef.current = new VehiclePool(150);
        lodManagerRef.current = new LODManager();
        staggeredUpdateRef.current = new StaggeredUpdateManager(4);
        perfMonitorRef.current = new PerformanceMonitor();
        console.log("✅ Performance optimization systems initialized");

        // Add all vehicle pool meshes to scene
        const pooledMeshes = vehiclePoolRef.current.getAllMeshes();
        console.log(
          `📦 Adding ${pooledMeshes.length} pooled vehicle meshes to scene`,
        );
        pooledMeshes.forEach((mesh) => {
          groups.dynamicObjects.add(mesh);
          mesh.visible = false; // Start hidden
        });
        console.log(
          `✅ Vehicle pool meshes added to scene (${groups.dynamicObjects.children.length} total objects in dynamicObjects)`,
        );

        // Fetch and setup traffic lights using Traffic Infrastructure Manager
        setLoadingStatus("Setting up traffic lights...");
        const osmTrafficSignals = await fetchAllTrafficSignals();

        if (osmTrafficSignals.length > 0 && trafficInfrastructureRef.current) {
          // Load traffic controls into infrastructure manager
          trafficInfrastructureRef.current.loadFromOSM(osmTrafficSignals);
          console.log(
            `🚦 Loaded ${osmTrafficSignals.length} traffic controls from OSM`,
          );

          // SMART INTERSECTION-BASED PLACEMENT
          // 1. Find actual road intersections
          const intersections = roadNetwork.findIntersections();
          console.log(`🚦 Found ${intersections.length} road intersections`);

          const signals = trafficInfrastructureRef.current.getSignals();

          // 2. For each intersection, check if there's a traffic signal nearby
          intersections.forEach((intersection) => {
            // Find closest OSM traffic signal within 50 meters
            let closestSignal = null;
            let minDist = 50; // meters

            signals.forEach((signal) => {
              const dist = turf.distance(
                turf.point(intersection.position),
                turf.point(signal.position),
                { units: "meters" },
              );

              if (dist < minDist) {
                closestSignal = signal;
                minDist = dist;
              }
            });

            if (!closestSignal) return; // No signal at this intersection

            // 3. Get all roads approaching this intersection
            const approachingEdges = roadNetwork.getNodeEdges(intersection.id);

            // 4. Place one traffic light for each approach direction
            approachingEdges.forEach((edge, idx) => {
              const bearing = roadNetwork.getEdgeBearingAtNode(
                edge,
                intersection.id,
              );

              // Create mesh for this approach
              const mesh = createTrafficLightModel();
              const worldPos = CityProjection.projectToWorld(
                intersection.position,
              );

              // Place light on the FAR side of intersection (where traffic goes)
              // Offset 20m in the direction the traffic is heading (50% of original)
              const offsetDistance = 20; // meters in world units
              const offsetX =
                Math.sin((bearing * Math.PI) / 180) * offsetDistance;
              const offsetZ =
                Math.cos((bearing * Math.PI) / 180) * offsetDistance;

              mesh.position.set(
                worldPos.x + offsetX,
                worldPos.y,
                worldPos.z + offsetZ,
              );

              // Rotate to face oncoming traffic
              mesh.rotation.y = ((-bearing + 180) * Math.PI) / 180;

              groups.dynamicObjects.add(mesh);

              // Link to signal (all share same signal state)
              if (idx === 0) {
                closestSignal.mesh = mesh;
              }
            });
          });

          console.log(
            `✅ Placed traffic lights at ${intersections.length} intersections`,
          );

          // Initialize Signal Coordinator for green wave coordination
          if (signalCoordinatorRef.current) {
            signalCoordinatorRef.current = createSignalCoordinator(
              trafficInfrastructureRef.current,
              true, // Auto-analyze and apply coordination
            );
            console.log("✅ Signal coordination initialized");
          }
        }

        // Start animation loop
        setLoadingStatus("Starting simulation...");
        startAnimationLoop();

        // Hide loading overlay so we can see the flight animation
        setIsReady(true);
        setError(null);

        // Fly to specific coordinates: Latitude 44.233472°, Longitude -76.498375°
        await flyToLocation(
          camera,
          controls,
          [-76.498375, 44.233472],
          600,
          2000,
        );

        // Ensure controls are re-enabled after animation
        controls.enabled = true;
        console.log("✅ Controls re-enabled after flyTo animation");

        setLoadingStatus("Ready");
      } catch (err) {
        console.error("Error initializing scene:", err);
        setError(
          err instanceof Error ? err.message : "Failed to initialize scene",
        );
        setLoadingStatus("Error");
      }
    }

    function updateTrafficLights() {
      // Update traffic infrastructure manager (handles signal state transitions)
      if (trafficInfrastructureRef.current) {
        const deltaTime = 16.67; // Approximate ms since last frame (60 FPS)
        trafficInfrastructureRef.current.update(deltaTime);

        // Sync visual meshes with infrastructure manager state
        const signals = trafficInfrastructureRef.current.getSignals();
        signals.forEach((signal) => {
          // Update corresponding traffic light in the old array
          const oldLight = trafficLights.find((l) => l.id === signal.id);
          if (oldLight) {
            oldLight.state = signal.state;
            oldLight.timer = signal.timer;
          }

          // Update 3D mesh visualization
          if (signal.mesh) {
            const redLight = signal.mesh.getObjectByName("red") as THREE.Mesh;
            const yellowLight = signal.mesh.getObjectByName(
              "yellow",
            ) as THREE.Mesh;
            const greenLight = signal.mesh.getObjectByName(
              "green",
            ) as THREE.Mesh;

            if (redLight && yellowLight && greenLight) {
              const redMaterial =
                redLight.material as THREE.MeshStandardMaterial;
              const yellowMaterial =
                yellowLight.material as THREE.MeshStandardMaterial;
              const greenMaterial =
                greenLight.material as THREE.MeshStandardMaterial;

              if (redMaterial.emissive) {
                redMaterial.emissive.setHex(
                  signal.state === "red" ? 0xff0000 : 0x330000,
                );
              }
              if (yellowMaterial.emissive) {
                yellowMaterial.emissive.setHex(
                  signal.state === "yellow" ? 0xffff00 : 0x333300,
                );
              }
              if (greenMaterial.emissive) {
                greenMaterial.emissive.setHex(
                  signal.state === "green" ? 0x00ff00 : 0x003300,
                );
              }
            }
          }
        });
      }
    }

    function startAnimationLoop() {
      let lastTime = Date.now();

      function animate() {
        if (
          !sceneRef.current ||
          !cameraRef.current ||
          !rendererRef.current ||
          !controlsRef.current
        ) {
          return;
        }

        const currentTime = Date.now();
        const deltaTime = (currentTime - lastTime) / 1000;
        lastTime = currentTime;

        // Analytics: Track frame start
        const frameStartTime = performance.now();
        if (analyticsRef.current) {
          analyticsRef.current.onFrameStart(currentTime);
        }

        // Update traffic lights
        updateTrafficLights();

        // Analytics: Track update start
        const updateStartTime = performance.now();

        // Update spawner
        if (spawner) {
          spawner.update(deltaTime);

          const activeCars = spawner.getActiveCars();
          const processedCarIds = new Set<string>();

          // Debug: Log active car count and positions
          if (
            Math.floor(currentTime / 1000) % 5 === 0 &&
            currentTime % 1000 < 20
          ) {
            console.log(
              `🚗 Active cars: ${activeCars.length}, Meshes: ${Object.keys(carMeshes).length}`,
            );
            if (activeCars.length > 0 && cameraRef.current) {
              const firstCar = activeCars[0];
              const firstMesh = carMeshes[firstCar.id];
              console.log(
                `📍 Camera: [${cameraRef.current.position.x.toFixed(0)}, ${cameraRef.current.position.y.toFixed(0)}, ${cameraRef.current.position.z.toFixed(0)}]`,
              );
              if (firstMesh) {
                console.log(
                  `📍 First car (${firstCar.id}): [${firstMesh.position.x.toFixed(0)}, ${firstMesh.position.y.toFixed(0)}, ${firstMesh.position.z.toFixed(0)}], visible: ${firstMesh.visible}, scale: ${firstMesh.scale.x}`,
                );
                const distance = cameraRef.current.position.distanceTo(
                  firstMesh.position,
                );
                console.log(
                  `📏 Distance from camera to first car: ${distance.toFixed(0)} units`,
                );
              }
            }
          }

          // Update collision system spatial grid
          if (collisionSystemRef.current) {
            collisionSystemRef.current.updateGrid(activeCars);
          }

          // Update LOD manager camera position
          if (lodManagerRef.current && cameraRef.current) {
            lodManagerRef.current.updateCameraPosition(cameraRef.current);
          }

          // Performance monitor - record frame
          if (perfMonitorRef.current) {
            perfMonitorRef.current.recordFrame();
          }

          // Update each active car with integrated systems
          activeCars.forEach((spawnedCar) => {
            processedCarIds.add(spawnedCar.id);

            // Create mesh if needed (using vehicle pool for performance)
            if (!carMeshes[spawnedCar.id]) {
              let mesh: EnhancedVehicleMesh | null = null;

              // Try to get from pool
              if (vehiclePoolRef.current) {
                mesh = vehiclePoolRef.current.acquire(
                  spawnedCar.type,
                  spawnedCar.color,
                );
                if (mesh) {
                  console.log(
                    `♻️ Acquired pooled mesh for ${spawnedCar.id} (${spawnedCar.type})`,
                  );
                }
              }

              // Fallback to creating new mesh
              if (!mesh) {
                console.log(
                  `🆕 Creating new mesh for ${spawnedCar.id} (${spawnedCar.type})`,
                );
                mesh = createEnhancedCarModel(
                  spawnedCar.type,
                  spawnedCar.color,
                );
                groupsRef.current?.dynamicObjects.add(mesh);
              }

              carMeshes[spawnedCar.id] = mesh;
              spawnedCar.meshRef = mesh; // Link mesh to car data
              console.log(
                `✅ Mesh ${mesh ? "created" : "FAILED"} for ${spawnedCar.id}, visible: ${mesh?.visible}, parent: ${mesh?.parent?.type}`,
              );

              // Register for staggered updates
              if (staggeredUpdateRef.current) {
                staggeredUpdateRef.current.register(spawnedCar.id);
              }

              // Analytics: Track spawn
              if (analyticsRef.current) {
                analyticsRef.current.trackSpawn();
              }
            }

            // INTEGRATED SIMULATION PIPELINE:
            // 1. Behavior evaluation (traffic rules, signals, following)
            // 2. Physics update (acceleration, velocity)
            // 3. Collision detection
            // 4. Position update
            // 5. Visual updates (lights, LOD)

            const allCarsMap = new Map(activeCars.map((car) => [car.id, car]));

            // 1. Evaluate vehicle behavior
            if (
              behaviorControllerRef.current &&
              trafficInfrastructureRef.current &&
              collisionSystemRef.current
            ) {
              const behaviorResult = behaviorControllerRef.current.evaluate(
                spawnedCar,
                {
                  infrastructureManager: trafficInfrastructureRef.current,
                  collisionSystem: collisionSystemRef.current,
                  allVehicles: allCarsMap,
                  deltaTime,
                },
              );

              spawnedCar.targetSpeed = behaviorResult.targetSpeed;
              spawnedCar.acceleration = behaviorResult.acceleration;
              spawnedCar.currentBehavior = behaviorResult.state;

              // Apply behavior to speed
              behaviorControllerRef.current.applyBehavior(
                spawnedCar,
                behaviorResult,
                deltaTime,
              );

              // Debug first car
              if (
                spawnedCar.id === "car-0" &&
                Math.floor(currentTime / 1000) % 2 === 0 &&
                currentTime % 1000 < 20
              ) {
                console.log(
                  `🚙 Car-0: speed=${spawnedCar.speed.toFixed(1)}, targetSpeed=${spawnedCar.targetSpeed.toFixed(1)}, behavior=${spawnedCar.currentBehavior}`,
                );
              }
            } else {
              // FALLBACK: If behavior system not working, just set speed directly!
              if (!spawnedCar.speed || spawnedCar.speed < 5) {
                spawnedCar.speed = spawnedCar.maxSpeed;
                spawnedCar.targetSpeed = spawnedCar.maxSpeed;
              }
            }

            // 2. Update position along route
            spawner.updateCarPosition(spawnedCar.id, deltaTime);

            // 3. Update visual mesh
            const mesh = carMeshes[spawnedCar.id] as EnhancedVehicleMesh;
            if (mesh) {
              const worldPos = CityProjection.projectToWorld(
                spawnedCar.position,
              );
              mesh.position.set(worldPos.x, worldPos.y + 1, worldPos.z);
              mesh.rotation.y = (-spawnedCar.bearing * Math.PI) / 180;

              // Debug: Log first car position once
              if (
                spawnedCar.id === "car-0" &&
                Math.floor(currentTime / 1000) === 1
              ) {
                console.log(
                  `🎯 Car position - Lat/Lon: [${spawnedCar.position}], World: [${worldPos.x.toFixed(2)}, ${worldPos.y.toFixed(2)}, ${worldPos.z.toFixed(2)}], Visible: ${mesh.visible}, In scene: ${mesh.parent !== null}`,
                );
              }

              // 4. Update turn signals
              updateTurnSignals(mesh, spawnedCar.bearing, deltaTime);

              // 5. Update brake lights (braking if deceleration > 2 m/s²)
              const isBreaking = spawnedCar.acceleration < -2.0;
              updateBrakeLights(mesh, isBreaking);

              // 6. Apply LOD based on distance from camera
              if (lodManagerRef.current) {
                const currentLOD = mesh.userData.lodLevel || "full";
                const newLOD = lodManagerRef.current.calculateLODLevel(
                  mesh.position,
                );
                if (newLOD !== currentLOD) {
                  lodManagerRef.current.applyLOD(mesh, newLOD, currentLOD);
                  mesh.userData.lodLevel = newLOD;
                }
              }
            }
          });

          // Remove meshes for despawned cars
          Object.entries(carMeshes).forEach(([carId, mesh]) => {
            if (!processedCarIds.has(carId)) {
              // Return to pool if using vehicle pool
              if (vehiclePoolRef.current && mesh instanceof THREE.Mesh) {
                vehiclePoolRef.current.release(mesh as EnhancedVehicleMesh);
              } else {
                groupsRef.current?.dynamicObjects.remove(mesh);
              }

              delete carMeshes[carId];

              // Unregister from staggered updates
              if (staggeredUpdateRef.current) {
                staggeredUpdateRef.current.unregister(carId);
              }

              // Clear behavior state
              if (behaviorControllerRef.current) {
                behaviorControllerRef.current.resetVehicleState(carId);
              }

              // Analytics: Track despawn
              if (analyticsRef.current) {
                analyticsRef.current.trackDespawn();
              }
            }
          });

          // Advance staggered update manager
          if (staggeredUpdateRef.current) {
            staggeredUpdateRef.current.nextFrame();
          }
        }

        // Analytics: Record update time
        const updateEndTime = performance.now();
        if (analyticsRef.current) {
          analyticsRef.current.recordUpdateTime(
            updateEndTime - updateStartTime,
          );
        }

        // Update tweens
        updateTweens();

        // Update construction noise ripple animation
        const rippleGroup = noiseRippleGroupRef.current;
        if (rippleGroup) {
          rippleTimeRef.current += deltaTime;
          const RIPPLE_DURATION = 2.5;
          const BASE_MAX_SCALE = 450 / 15;
          rippleGroup.children.forEach((child) => {
            const mesh = child as THREE.Mesh;
            const phaseOffset = mesh.userData?.phaseOffset as number | undefined;
            const intensity = (mesh.userData?.intensity as number) ?? 1;
            if (phaseOffset == null) return;
            const phase =
              ((rippleTimeRef.current + phaseOffset) % RIPPLE_DURATION) /
              RIPPLE_DURATION;
            const maxScale = BASE_MAX_SCALE * intensity;
            const scale = phase * maxScale;
            mesh.scale.set(scale, scale, scale);
            const mat = mesh.material as THREE.MeshBasicMaterial;
            if (mat.transparent) mat.opacity = (0.5 + 0.2 * intensity) * (1 - phase);
          });
        }

        // Update controls
        controlsRef.current.update();

        // Analytics: Track render start
        const renderStartTime = performance.now();

        // Render with composer if available (for outline effect), otherwise normal render
        if (composerRef.current) {
          composerRef.current.render();
        } else {
          rendererRef.current.render(sceneRef.current, cameraRef.current);
        }

        // Analytics: Record render time and frame time
        const renderEndTime = performance.now();
        if (analyticsRef.current) {
          analyticsRef.current.recordRenderTime(
            renderEndTime - renderStartTime,
          );
          analyticsRef.current.recordFrameTime(renderEndTime - frameStartTime);

          // Create snapshot with active cars
          if (spawner) {
            analyticsRef.current.createSnapshot(
              spawner.getActiveCars(),
              currentTime,
            );
          }
        }

        animationFrameRef.current = requestAnimationFrame(animate);
      }

      animate();
    }

    // Handle window resize
    function handleWindowResize() {
      if (!canvasRef.current || !cameraRef.current || !rendererRef.current)
        return;

      const width = canvasRef.current.clientWidth;
      const height = canvasRef.current.clientHeight;

      handleResize(cameraRef.current, rendererRef.current, width, height);
    }

    window.addEventListener("resize", handleWindowResize);

    // Start initialization
    initializeScene();

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleWindowResize);

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      if (rendererRef.current) {
        rendererRef.current.dispose();
      }

      if (controlsRef.current) {
        controlsRef.current.dispose();
      }
    };
  }, []);

  // Click handler to find coordinates or select buildings
  useEffect(() => {
    function handleCanvasClick(event: MouseEvent) {
      if (
        !canvasRef.current ||
        !cameraRef.current ||
        !sceneRef.current ||
        !groupsRef.current
      ) {
        return;
      }

      // Calculate mouse position in normalized device coordinates (-1 to +1)
      const rect = canvasRef.current.getBoundingClientRect();
      const mouse = new THREE.Vector2();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // Update raycaster with mouse position
      raycasterRef.current.setFromCamera(mouse, cameraRef.current);

      // Check if we clicked on a custom placed building first
      const buildingObjects = Array.from(buildingModelsRef.current.values());
      const buildingIntersects = raycasterRef.current.intersectObjects(
        buildingObjects,
        true,
      );

      if (buildingIntersects.length > 0 && !isPlacementMode) {
        // Find which building was clicked
        let clickedBuilding: THREE.Object3D | null =
          buildingIntersects[0].object;
        while (clickedBuilding && !clickedBuilding.userData.buildingId) {
          clickedBuilding = clickedBuilding.parent;
        }

        if (
          clickedBuilding &&
          clickedBuilding.userData.buildingId &&
          onBuildingSelect
        ) {
          onBuildingSelect(clickedBuilding.userData.buildingId);
          setSelectedOsmBuildingId(null);
          return; // Don't process as coordinate click
        }
      }

      // Check if we clicked on an OSM building (from buildings.json)
      const osmBuildingObjects = Array.from(
        osmBuildingMeshesRef.current.values(),
      );
      const osmBuildingIntersects = raycasterRef.current.intersectObjects(
        osmBuildingObjects,
        true,
      );

      if (osmBuildingIntersects.length > 0 && !isPlacementMode) {
        const clickedMesh = osmBuildingIntersects[0].object as THREE.Mesh;
        if (
          clickedMesh.userData.isOsmBuilding &&
          clickedMesh.userData.buildingId
        ) {
          const buildingId = clickedMesh.userData.buildingId;
          console.log("Clicked OSM building:", buildingId);
          setSelectedOsmBuildingId(buildingId);
          if (onBuildingSelect) {
            onBuildingSelect(null); // Deselect custom building
          }
          return; // Don't process as coordinate click
        }
      }

      // For placement mode, check for building collisions first
      if (isPlacementMode && buildingIntersects.length > 0) {
        // Prevent placing a building on top of another building
        console.warn("Cannot place building on top of another building");
        return;
      }

      // For placement mode, only raycast against ground and static geometry
      // For normal mode, raycast against everything
      let intersects;
      if (isPlacementMode) {
        const targetObjects = [
          ...groupsRef.current.environment.children,
          ...groupsRef.current.staticGeometry.children,
        ];
        intersects = raycasterRef.current.intersectObjects(targetObjects, true);
      } else {
        intersects = raycasterRef.current.intersectObjects(
          sceneRef.current.children,
          true,
        );
      }

      if (intersects.length > 0) {
        // Get the first intersection point
        const intersectionPoint = intersects[0].point;

        // Convert world coordinates to lat/lng
        const [lng, lat] = CityProjection.unprojectFromWorld(intersectionPoint);

        // Call the callback with the clicked coordinate
        const coordinate = {
          lat,
          lng,
          worldX: intersectionPoint.x,
          worldY: intersectionPoint.y,
          worldZ: intersectionPoint.z,
          ghostRotationY: isPlacementMode ? ghostRotationY : undefined,
        };

        if (onCoordinateClick) {
          onCoordinateClick(coordinate);
        }

        // Deselect buildings if clicking elsewhere
        if (onBuildingSelect && !isPlacementMode) {
          onBuildingSelect(null);
        }
        setSelectedOsmBuildingId(null);

        console.log("Clicked coordinate:", {
          lat,
          lng,
          worldPos: intersectionPoint,
        });
      }
    }

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener("click", handleCanvasClick);
      return () => canvas.removeEventListener("click", handleCanvasClick);
    }
  }, [onCoordinateClick, onBuildingSelect, isPlacementMode, ghostRotationY]);

  // Keyboard controls for rotating ghost building during placement mode
  useEffect(() => {
    if (!isPlacementMode) return;

    function handleKeyDown(event: KeyboardEvent) {
      // Don't interfere with text inputs
      if ((event.target as HTMLElement).tagName === "INPUT") return;

      const rotationStep = event.shiftKey ? Math.PI / 4 : Math.PI / 12; // 45° or 15°

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setGhostRotationY((prev) => prev + rotationStep); // Counter-clockwise
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        setGhostRotationY((prev) => prev - rotationStep); // Clockwise
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlacementMode]);

  // Apply rotation to ghost model when ghostRotationY changes
  useEffect(() => {
    if (ghostModelRef.current) {
      ghostModelRef.current.rotation.y = ghostRotationY;
    }
  }, [ghostRotationY]);

  // Handle OSM building deletion
  const deleteOsmBuilding = async (buildingId: string, skipApiCall = false) => {
    try {
      // Remove from scene
      const mesh = osmBuildingMeshesRef.current.get(buildingId);
      if (mesh && groupsRef.current) {
        groupsRef.current.staticGeometry.remove(mesh);
        mesh.geometry.dispose();
        if (mesh.material instanceof THREE.Material) {
          mesh.material.dispose();
        }
        osmBuildingMeshesRef.current.delete(buildingId);
      }

      // Call API to remove from buildings.json (unless skipped for batch operations)
      if (!skipApiCall) {
        const response = await fetch(`/api/map/buildings/${buildingId}`, {
          method: "DELETE",
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`✅ Deleted building ${buildingId}:`, result);
          if (onOsmBuildingDelete) {
            onOsmBuildingDelete(buildingId);
          }
        } else {
          console.error("Failed to delete building from server");
        }
      }

      setSelectedOsmBuildingId(null);
    } catch (error) {
      console.error("Error deleting OSM building:", error);
    }
  };

  // Check for collisions between a loaded 3D model and all OSM buildings
  const checkAndDeleteCollidingBuildings = async (
    loadedModel: THREE.Object3D,
  ) => {
    if (!groupsRef.current || osmBuildingMeshesRef.current.size === 0) return;

    const collidingIds: string[] = [];

    // Get the actual bounding box of the loaded model
    const placedBox = new THREE.Box3().setFromObject(loadedModel);

    console.log(`📦 Checking collisions for placed building. Bounding box:`, {
      min: placedBox.min,
      max: placedBox.max,
      size: placedBox.getSize(new THREE.Vector3()),
    });

    // Check each OSM building for collision
    osmBuildingMeshesRef.current.forEach((mesh, buildingId) => {
      // Compute bounding box for the OSM building
      const osmBox = new THREE.Box3().setFromObject(mesh);

      // Check for intersection
      if (placedBox.intersectsBox(osmBox)) {
        collidingIds.push(buildingId);
        console.log(`  ⚠️ Collision detected with: ${buildingId}`);
      }
    });

    if (collidingIds.length > 0) {
      console.log(
        `🔄 Found ${collidingIds.length} colliding OSM buildings, removing all...`,
      );

      // Delete all colliding buildings from scene immediately
      for (const buildingId of collidingIds) {
        const mesh = osmBuildingMeshesRef.current.get(buildingId);
        if (mesh && groupsRef.current) {
          groupsRef.current.staticGeometry.remove(mesh);
          mesh.geometry.dispose();
          if (mesh.material instanceof THREE.Material) {
            mesh.material.dispose();
          }
          osmBuildingMeshesRef.current.delete(buildingId);
          console.log(`  🗑️ Removed from scene: ${buildingId}`);
        }
      }

      // Batch delete from server
      try {
        const response = await fetch("/api/map/buildings/batch-delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: collidingIds }),
        });

        if (response.ok) {
          const result = await response.json();
          console.log(
            `✅ Batch deleted ${result.deletedCount} buildings from server`,
          );
        }
      } catch (error) {
        console.error("Error batch deleting buildings:", error);
      }
    } else {
      console.log(`✅ No collisions detected`);
    }
  };

  // Load and display placed buildings
  useEffect(() => {
    if (!groupsRef.current || !isReady) return;

    const loader = new GLTFLoader();

    // Track which buildings currently exist
    const currentBuildingIds = new Set(placedBuildings.map((b) => b.id));

    // Remove buildings that no longer exist
    const existingIds = Array.from(buildingModelsRef.current.keys());
    existingIds.forEach((id) => {
      if (!currentBuildingIds.has(id)) {
        const model = buildingModelsRef.current.get(id);
        if (model) {
          groupsRef.current?.dynamicObjects.remove(model);
          buildingModelsRef.current.delete(id);
          console.log(`🗑️ Removed building ${id}`);
        }
      }
    });

    // Load new buildings (only ones that don't exist yet)
    placedBuildings.forEach((building) => {
      // Skip if this building is already loaded
      if (buildingModelsRef.current.has(building.id)) {
        return;
      }

      loader.load(
        building.modelPath,
        (gltf) => {
          const model = gltf.scene;
          model.userData.isCustomBuilding = true;
          model.userData.buildingId = building.id;
          model.userData.timeline = building.timeline;

          // Position the model
          model.position.set(
            building.position.x,
            building.position.y,
            building.position.z,
          );

          // Rotation
          if (building.rotation) {
            model.rotation.set(
              building.rotation.x,
              building.rotation.y,
              building.rotation.z,
            );
          }

          // Scale - use per-building scale if available, otherwise use global buildingScale
          const scale = building.scale || buildingScale;
          model.scale.set(scale.x, scale.y, scale.z);

          let toAdd: THREE.Object3D = model;

          if (building.timeline?.startDate && building.timeline?.durationDays) {
            const wrapper = new THREE.Group();
            wrapper.position.copy(model.position);
            wrapper.rotation.copy(model.rotation);
            wrapper.scale.copy(model.scale);
            model.position.set(0, 0, 0);
            model.rotation.set(0, 0, 0);
            model.scale.set(1, 1, 1);
            wrapper.add(model);

            const wireframe = model.clone(true);
            wireframe.traverse((child) => {
              if (child instanceof THREE.Mesh && child.material) {
                const mat = new THREE.MeshBasicMaterial({
                  color: 0x003f7c,
                  wireframe: true,
                  transparent: true,
                  opacity: 0.6,
                  depthTest: true,
                  depthWrite: false,
                });
                child.material = mat;
              }
            });
            wrapper.add(wireframe);
            wrapper.userData.solidModel = model;
            wrapper.userData.buildingId = building.id;
            wrapper.userData.timeline = building.timeline;
            toAdd = wrapper;
          }

          groupsRef.current?.dynamicObjects.add(toAdd);
          buildingModelsRef.current.set(building.id, toAdd);

          toAdd.updateMatrixWorld(true);
          checkAndDeleteCollidingBuildings(toAdd);

          console.log(
            `✅ Loaded building ${building.id} at (${building.position.x.toFixed(1)}, ${building.position.z.toFixed(1)})`,
          );
        },
        undefined,
        (error) => {
          console.error(`❌ Error loading building model:`, error);
        },
      );
    });
  }, [placedBuildings, isReady, buildingScale]);

  // Load ghost preview model
  useEffect(() => {
    if (!isPlacementMode || !groupsRef.current) {
      // Remove ghost if placement mode is off
      if (ghostModelRef.current && groupsRef.current) {
        groupsRef.current.dynamicObjects.remove(ghostModelRef.current);
        ghostModelRef.current = null;
      }
      setGhostPosition(null);
      return;
    }

    // Use custom model path if available, otherwise use default
    const modelPath =
      customModelPath || "/let_me_sleeeeeeep/let_me_sleeeeeeep.gltf";

    const loader = new GLTFLoader();
    loader.load(
      modelPath,
      (gltf) => {
        // Remove any existing ghost first
        if (ghostModelRef.current && groupsRef.current) {
          groupsRef.current.dynamicObjects.remove(ghostModelRef.current);
        }

        const ghost = gltf.scene;
        ghost.scale.set(buildingScale.x, buildingScale.y, buildingScale.z);

        // Make it semi-transparent green
        ghost.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            const material = new THREE.MeshBasicMaterial({
              color: 0x00ff00,
              transparent: true,
              opacity: 0.3,
              wireframe: false,
            });
            mesh.material = material;
          }
        });

        ghostModelRef.current = ghost;
        groupsRef.current?.dynamicObjects.add(ghost);
        ghost.visible = false; // Hide until we have a position

        console.log(`✅ Ghost preview loaded: ${modelPath}`);
      },
      undefined,
      (error) => console.error("Error loading ghost model:", error),
    );

    return () => {
      if (ghostModelRef.current && groupsRef.current) {
        groupsRef.current.dynamicObjects.remove(ghostModelRef.current);
        ghostModelRef.current = null;
      }
    };
  }, [isPlacementMode, buildingScale, customModelPath]);

  // Update ghost scale when buildingScale changes
  useEffect(() => {
    if (ghostModelRef.current) {
      ghostModelRef.current.scale.set(
        buildingScale.x,
        buildingScale.y,
        buildingScale.z,
      );
    }
  }, [buildingScale]);

  // Highlight selected building
  useEffect(() => {
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;

    // Setup composer if not exists
    if (!composerRef.current && rendererRef.current) {
      const composer = new EffectComposer(rendererRef.current);
      const renderPass = new RenderPass(sceneRef.current, cameraRef.current);
      composer.addPass(renderPass);

      const outlinePass = new OutlinePass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        sceneRef.current,
        cameraRef.current,
      );
      outlinePass.edgeStrength = 5;
      outlinePass.edgeGlow = 1;
      outlinePass.edgeThickness = 2;
      outlinePass.visibleEdgeColor.set("#003F7C");
      outlinePass.hiddenEdgeColor.set("#003F7C");

      composer.addPass(outlinePass);
      composerRef.current = composer;
      outlinePassRef.current = outlinePass;
    }

    // Update outline
    if (outlinePassRef.current) {
      const selectedObjects: THREE.Object3D[] = [];

      // Check for selected custom building
      if (selectedBuildingId) {
        const selectedModel = buildingModelsRef.current.get(selectedBuildingId);
        if (selectedModel) {
          selectedObjects.push(selectedModel);
        }
      }

      // Check for selected OSM building
      if (selectedOsmBuildingId) {
        const selectedOsmMesh = osmBuildingMeshesRef.current.get(
          selectedOsmBuildingId,
        );
        if (selectedOsmMesh) {
          selectedObjects.push(selectedOsmMesh);
        }
      }

      outlinePassRef.current.selectedObjects = selectedObjects;
    }
  }, [selectedBuildingId, selectedOsmBuildingId]);

  // Update building transforms in real-time
  useEffect(() => {
    placedBuildings.forEach((building) => {
      const model = buildingModelsRef.current.get(building.id);
      if (model) {
        model.position.set(
          building.position.x,
          building.position.y,
          building.position.z,
        );
        if (building.rotation) {
          model.rotation.set(
            building.rotation.x,
            building.rotation.y,
            building.rotation.z,
          );
        }
        const scale = building.scale || buildingScale;
        model.scale.set(scale.x, scale.y, scale.z);
        model.userData.timeline = building.timeline;
      }
    });
  }, [placedBuildings, buildingScale]);

  // Cross-section clipping for buildings with timeline
  useEffect(() => {
    const dateStr = timelineDate;
    const currentTime = new Date(dateStr).getTime();

    placedBuildings.forEach((building) => {
      const obj = buildingModelsRef.current.get(building.id);
      if (!obj || !building.timeline?.startDate || !building.timeline?.durationDays)
        return;

      const solidModel =
        obj.userData.solidModel ?? (obj as THREE.Group);
      const startTime = new Date(building.timeline.startDate).getTime();
      const elapsedDays = (currentTime - startTime) / (1000 * 60 * 60 * 24);
      const progress = Math.max(0, Math.min(1, elapsedDays / building.timeline.durationDays));

      solidModel.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(solidModel);
      const bottomY = box.min.y;
      const fullHeight = box.max.y - box.min.y;
      const visibleTop = bottomY + progress * fullHeight;
      const clipPlane = new THREE.Plane(
        new THREE.Vector3(0, -1, 0),
        visibleTop
      );

      const applyClip = (target: THREE.Object3D) => {
        target.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material) {
            const mats = Array.isArray(child.material)
              ? child.material
              : [child.material];
            mats.forEach((m) => {
              const mat = m as THREE.Material & { clipShading?: number };
              mat.clippingPlanes = [clipPlane];
              mat.clipShading = THREE.DoubleSide;
            });
          }
        });
      };

      const clearClip = (target: THREE.Object3D) => {
        target.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material) {
            const mats = Array.isArray(child.material)
              ? child.material
              : [child.material];
            mats.forEach((m) => {
              (m as THREE.Material).clippingPlanes = [];
            });
          }
        });
      };

      if (progress >= 1) {
        clearClip(solidModel);
      } else {
        applyClip(solidModel);
      }
    });
  }, [placedBuildings, timelineDate]);

  // Construction noise ripple layer – continuous expanding ripple animation
  const RIPPLE_DURATION = 2.5;
  const RIPPLE_WAVES_PER_SITE = 4;

  useEffect(() => {
    if (!groupsRef.current || !isReady) return;

    if (noiseRippleGroupRef.current) {
      groupsRef.current.dynamicObjects.remove(noiseRippleGroupRef.current);
      noiseRippleGroupRef.current = null;
    }

    if (!showNoiseRipple) return;

    const activeSites = placedBuildings.filter(
      (b) =>
        b.timeline?.startDate &&
        b.timeline?.durationDays &&
        isUnderConstruction(
          b.timeline.startDate,
          b.timeline.durationDays,
          timelineDate
        )
    );

    const group = new THREE.Group();
    group.name = "noiseRippleLayer";

    activeSites.forEach((site) => {
      const px = site.position.x;
      const pz = site.position.z;
      const baseY = 0.5;
      const sourceDb = getConstructionSourceDb(site, timelineDate);
      const intensity = sourceDb / 90;

      for (let w = 0; w < RIPPLE_WAVES_PER_SITE; w++) {
        const phaseOffset = (w / RIPPLE_WAVES_PER_SITE) * RIPPLE_DURATION;
        const ringGeom = new THREE.RingGeometry(0, 15, 32);
        const material = new THREE.MeshBasicMaterial({
          color: 0xe74c3c,
          transparent: true,
          opacity: 0.5 + 0.2 * intensity,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const ring = new THREE.Mesh(ringGeom, material);
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(px, baseY, pz);
        ring.scale.set(0, 0, 0);
        ring.renderOrder = 1;
        ring.userData.phaseOffset = phaseOffset;
        ring.userData.intensity = intensity;
        group.add(ring);
      }
    });

    noiseRippleGroupRef.current = group;
    groupsRef.current.dynamicObjects.add(group);
  }, [
    showNoiseRipple,
    placedBuildings,
    timelineDate,
    isReady,
  ]);

  // Update ghost position on mouse move
  useEffect(() => {
    if (!isPlacementMode) return;

    function handleMouseMove(event: MouseEvent) {
      if (!canvasRef.current || !cameraRef.current || !groupsRef.current)
        return;

      const rect = canvasRef.current.getBoundingClientRect();
      const mouse = new THREE.Vector2();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouse, cameraRef.current);

      // Check if hovering over an existing building
      const buildingObjects = Array.from(buildingModelsRef.current.values());
      const buildingIntersects = raycasterRef.current.intersectObjects(
        buildingObjects,
        true,
      );
      const isOverBuilding = buildingIntersects.length > 0;

      // Only raycast against the ground plane and static geometry (buildings/roads)
      // This prevents placing buildings on cars or in the air
      const targetObjects = [
        ...groupsRef.current.environment.children,
        ...groupsRef.current.staticGeometry.children,
      ];
      const intersects = raycasterRef.current.intersectObjects(
        targetObjects,
        true,
      );

      // Check if ghost exists inside the handler (it might load after this effect runs)
      if (intersects.length > 0 && ghostModelRef.current) {
        const point = intersects[0].point;
        ghostModelRef.current.position.set(point.x, point.y, point.z);
        ghostModelRef.current.visible = true;
        setGhostPosition(point);

        // Change ghost color based on validity
        ghostModelRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material) {
            const mat = child.material as THREE.MeshBasicMaterial & {
              emissive?: { set: (c: number) => void };
            };
            if (isOverBuilding) {
              mat.color.set(0xff0000);
              if (mat.emissive) mat.emissive.set(0x330000);
            } else {
              mat.color.set(0x00ff00);
              if (mat.emissive) mat.emissive.set(0x003300);
            }
          }
        });
      } else if (ghostModelRef.current) {
        // Hide ghost when not hovering over valid placement surface
        ghostModelRef.current.visible = false;
      }
    }

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener("mousemove", handleMouseMove);
      return () => canvas.removeEventListener("mousemove", handleMouseMove);
    }
  }, [isPlacementMode]);

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ touchAction: "none", cursor: "grab" }}
      />

      {/* Loading overlay */}
      {!isReady && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900">
          <div className="text-center">
            <div className="mb-4">
              <div
                className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
                role="status"
              >
                <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
                  Loading...
                </span>
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-400">{loadingStatus}</p>
          </div>
        </div>
      )}

      {/* Error notification */}
      {error && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-200 px-4 py-3 rounded-lg shadow-lg z-20 max-w-md">
          <div className="flex items-center">
            <span className="mr-2">⚠️</span>
            <div>
              <p className="font-bold">Initialization Error</p>
              <p className="text-sm">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-4 text-red-700 dark:text-red-200 hover:text-red-900 dark:hover:text-red-100"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Debug Overlay - Press F3 to toggle */}
      <DebugOverlay
        analytics={analyticsRef.current}
        visible={debugOverlayVisible}
        onToggle={() => setDebugOverlayVisible(!debugOverlayVisible)}
      />

      {/* Analytics Dashboard */}
      <AnalyticsDashboard
        analytics={analyticsRef.current}
        visible={dashboardVisible}
        onClose={() => setDashboardVisible(false)}
      />

      {/* Control Panel */}
      {isReady && (
        <div className="absolute bottom-4 right-4 z-40 flex gap-2">
          <button
            onClick={() => setDebugOverlayVisible(!debugOverlayVisible)}
            className="px-4 py-2 bg-gray-800/90 hover:bg-gray-700/90 text-white rounded-lg shadow-lg text-sm font-medium transition-colors backdrop-blur-sm"
            title="Toggle debug overlay (F3)"
          >
            {debugOverlayVisible ? "Hide" : "Show"} Debug
          </button>
          <button
            onClick={() => setDashboardVisible(!dashboardVisible)}
            className="px-4 py-2 bg-blue-600/90 hover:bg-blue-500/90 text-white rounded-lg shadow-lg text-sm font-medium transition-colors backdrop-blur-sm"
          >
            Analytics Dashboard
          </button>
        </div>
      )}

      {/* Selected OSM Building Panel */}
      {selectedOsmBuildingId && (
        <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 bg-white border border-gray-300 rounded-lg shadow-lg z-20 p-4 min-w-[280px]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-400 rounded"></div>
              <span className="font-bold text-gray-800 text-sm">
                OSM Building Selected
              </span>
            </div>
            <button
              onClick={() => setSelectedOsmBuildingId(null)}
              className="text-gray-400 hover:text-gray-600 text-lg leading-none"
            >
              ✕
            </button>
          </div>
          <div className="text-xs text-gray-600 mb-3 font-mono bg-gray-50 p-2 rounded">
            ID: {selectedOsmBuildingId}
          </div>
          <button
            onClick={() => deleteOsmBuilding(selectedOsmBuildingId)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md text-sm font-semibold transition-colors"
          >
            <span>🗑️</span>
            Delete Building
          </button>
        </div>
      )}
    </div>
  );
}
