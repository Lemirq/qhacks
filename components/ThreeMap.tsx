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
import { setupControls, flyToLocation, updateTweens } from "@/lib/cameraController";

// Traffic simulation
import { RoadNetwork } from "@/lib/roadNetwork";
import { Pathfinder } from "@/lib/pathfinding";
import { Spawner, SpawnedCar } from "@/lib/spawning";

interface PlacedBuilding {
  id: string;
  modelPath: string;
  position: { x: number; y: number; z: number };
  lat: number;
  lng: number;
}

interface ThreeMapProps {
  initialCenter?: [number, number];
  className?: string;
  onCoordinateClick?: (coordinate: {
    lat: number;
    lng: number;
    worldX: number;
    worldY: number;
    worldZ: number;
  } | null) => void;
  placedBuildings?: PlacedBuilding[];
  isPlacementMode?: boolean;
  buildingScale?: { x: number; y: number; z: number };
  selectedBuildingId?: string | null;
  onBuildingSelect?: (id: string | null) => void;
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

  // Pole
  const poleGeometry = new THREE.CylinderGeometry(0.1, 0.1, 5, 8);
  const poleMaterial = new THREE.MeshPhongMaterial({ color: 0x444444 });
  const pole = new THREE.Mesh(poleGeometry, poleMaterial);
  pole.position.y = 2.5;
  group.add(pole);

  // Light housing
  const housingGeometry = new THREE.BoxGeometry(0.4, 1.2, 0.3);
  const housingMaterial = new THREE.MeshPhongMaterial({ color: 0x222222 });
  const housing = new THREE.Mesh(housingGeometry, housingMaterial);
  housing.position.y = 5;
  group.add(housing);

  // Lights (red, yellow, green)
  const lightGeometry = new THREE.SphereGeometry(0.15, 16, 16);

  const redLight = new THREE.Mesh(
    lightGeometry,
    new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0x330000,
      emissiveIntensity: 1,
    })
  );
  redLight.position.set(0, 5.4, 0.2);
  redLight.name = "red";
  group.add(redLight);

  const yellowLight = new THREE.Mesh(
    lightGeometry,
    new THREE.MeshStandardMaterial({
      color: 0xffff00,
      emissive: 0x333300,
      emissiveIntensity: 1,
    })
  );
  yellowLight.position.set(0, 5.0, 0.2);
  yellowLight.name = "yellow";
  group.add(yellowLight);

  const greenLight = new THREE.Mesh(
    lightGeometry,
    new THREE.MeshStandardMaterial({
      color: 0x00ff00,
      emissive: 0x003300,
      emissiveIntensity: 1,
    })
  );
  greenLight.position.set(0, 4.6, 0.2);
  greenLight.name = "green";
  group.add(greenLight);

  return group;
}

// Fetch traffic signals from cached Next.js API route
async function fetchAllTrafficSignals(): Promise<
  Array<{
    lat: number;
    lon: number;
    type: string;
    id: number;
  }>
> {
  try {
    console.log("Fetching traffic signals from cached API...");
    const response = await fetch(
      `/api/map/traffic-signals?south=44.220&west=-76.510&north=44.240&east=-76.480`,
      {
        cache: 'force-cache', // Use browser cache
        next: { revalidate: 86400 }, // Revalidate every 24 hours
      }
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
  const [ghostPosition, setGhostPosition] = useState<THREE.Vector3 | null>(null);
  const ghostModelRef = useRef<THREE.Group | null>(null);
  const buildingModelsRef = useRef<Map<string, THREE.Group>>(new Map());
  const composerRef = useRef<EffectComposer | null>(null);
  const outlinePassRef = useRef<OutlinePass | null>(null);

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
        const { scene, camera, renderer, groups } = createSceneManager(canvasRef.current);
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
          enablePan: controls.enablePan
        });

        // Environment setup (sky and fog removed for clearer view)
        setLoadingStatus("Setting up environment...");

        // Define bounding box for Kingston/Queen's area
        const bbox: [number, number, number, number] = [44.220, -76.510, 44.240, -76.480];

        // Create ground plane (plain white, no texture)
        setLoadingStatus("Creating ground plane...");
        const ground = createGround(
          {
            minLat: bbox[0],
            maxLat: bbox[2],
            minLng: bbox[1],
            maxLng: bbox[3]
          },
          CityProjection,
          undefined // No texture - plain white ground
        );
        groups.environment.add(ground);

        // Fetch and render buildings
        setLoadingStatus("Fetching buildings from OpenStreetMap...");
        const buildings = await fetchBuildings(bbox);

        setLoadingStatus("Rendering buildings...");
        renderBuildings(buildings, CityProjection, groups.staticGeometry);

        // Initialize road network
        setLoadingStatus("Fetching road network from OpenStreetMap...");
        roadNetwork = new RoadNetwork();
        await roadNetwork.fetchFromOSM({
          south: 44.220,
          west: -76.510,
          north: 44.240,
          east: -76.480,
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
          maxCars: 30,
          globalSpawnRate: 1.2,
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
        console.log(`✅ Spawner initialized with ${spawner.getSpawnPoints().length} spawn points`);

        // Fetch and setup traffic lights
        setLoadingStatus("Setting up traffic lights...");
        const osmTrafficSignals = await fetchAllTrafficSignals();

        if (osmTrafficSignals.length > 0) {
          osmTrafficSignals.forEach((signal, idx) => {
            const signalPos: [number, number] = [signal.lon, signal.lat];

            // Create NS and EW traffic lights at each signal
            // Alternate initial states
            const nsLight: TrafficLight = {
              id: `${signal.id}-ns`,
              position: signalPos,
              state: idx % 2 === 0 ? "green" : "red",
              timer: Date.now(),
              intersectionId: `osm-${signal.id}`,
              direction: "ns",
            };

            const ewLight: TrafficLight = {
              id: `${signal.id}-ew`,
              position: signalPos,
              state: idx % 2 === 0 ? "red" : "green",
              timer: Date.now(),
              intersectionId: `osm-${signal.id}`,
              direction: "ew",
            };

            // Create meshes
            nsLight.mesh = createTrafficLightModel();
            ewLight.mesh = createTrafficLightModel();

            const worldPos = CityProjection.projectToWorld(signalPos);

            nsLight.mesh.position.set(worldPos.x, worldPos.y, worldPos.z);
            ewLight.mesh.position.set(worldPos.x + 10, worldPos.y, worldPos.z + 10);

            groups.dynamicObjects.add(nsLight.mesh);
            groups.dynamicObjects.add(ewLight.mesh);

            trafficLights.push(nsLight, ewLight);
          });

          console.log(`✅ Created ${trafficLights.length} traffic lights`);
        }

        // Start animation loop
        setLoadingStatus("Starting simulation...");
        startAnimationLoop();

        // Fly to specific coordinates: Latitude 44.232760°, Longitude -76.479941°
        setLoadingStatus("Flying to target location...");
        await flyToLocation(camera, controls, [-76.479941, 44.232760], 600, 3500);

        // Ensure controls are re-enabled after animation
        controls.enabled = true;
        console.log("✅ Controls re-enabled after flyTo animation");

        setLoadingStatus("Ready");
        setIsReady(true);
        setError(null);
      } catch (err) {
        console.error("Error initializing scene:", err);
        setError(err instanceof Error ? err.message : "Failed to initialize scene");
        setLoadingStatus("Error");
      }
    }

    function updateTrafficLights() {
      const now = Date.now();

      const intersectionGroups: Record<string, TrafficLight[]> = {};
      trafficLights.forEach((light) => {
        if (!intersectionGroups[light.intersectionId]) {
          intersectionGroups[light.intersectionId] = [];
        }
        intersectionGroups[light.intersectionId].push(light);
      });

      Object.entries(intersectionGroups).forEach(([intersectionId, lights]) => {
        const primaryLight = lights[0];
        const elapsed = now - primaryLight.timer;
        const duration = TRAFFIC_LIGHT_TIMINGS[primaryLight.state];

        if (elapsed >= duration) {
          lights.forEach((light) => {
            if (light.state === "green") {
              light.state = "yellow";
            } else if (light.state === "yellow") {
              light.state = "red";
            } else {
              const nsLights = lights.filter((l) => l.direction === "ns");
              const ewLights = lights.filter((l) => l.direction === "ew");

              const nsAreRed = nsLights.every((l) => l.state === "red");
              const ewAreRed = ewLights.every((l) => l.state === "red");

              if (nsAreRed && light.direction === "ns") {
                light.state = "green";
              } else if (ewAreRed && light.direction === "ew") {
                light.state = "green";
              }
            }
            light.timer = now;

            // Update light visualization
            if (light.mesh) {
              const redLight = light.mesh.getObjectByName("red") as THREE.Mesh;
              const yellowLight = light.mesh.getObjectByName("yellow") as THREE.Mesh;
              const greenLight = light.mesh.getObjectByName("green") as THREE.Mesh;

              if (redLight && yellowLight && greenLight) {
                const redMaterial = redLight.material as THREE.MeshStandardMaterial;
                const yellowMaterial = yellowLight.material as THREE.MeshStandardMaterial;
                const greenMaterial = greenLight.material as THREE.MeshStandardMaterial;

                if (redMaterial.emissive) {
                  redMaterial.emissive.setHex(light.state === "red" ? 0xff0000 : 0x330000);
                }
                if (yellowMaterial.emissive) {
                  yellowMaterial.emissive.setHex(light.state === "yellow" ? 0xffff00 : 0x333300);
                }
                if (greenMaterial.emissive) {
                  greenMaterial.emissive.setHex(light.state === "green" ? 0x00ff00 : 0x003300);
                }
              }
            }
          });
        }
      });
    }

    function startAnimationLoop() {
      let lastTime = Date.now();

      function animate() {
        if (!sceneRef.current || !cameraRef.current || !rendererRef.current || !controlsRef.current) {
          return;
        }

        const currentTime = Date.now();
        const deltaTime = (currentTime - lastTime) / 1000;
        lastTime = currentTime;

        // Update traffic lights
        updateTrafficLights();

        // Update spawner
        if (spawner) {
          spawner.update(deltaTime);

          const activeCars = spawner.getActiveCars();
          const processedCarIds = new Set<string>();

          // Update each active car
          activeCars.forEach((spawnedCar) => {
            processedCarIds.add(spawnedCar.id);

            // Create mesh if needed
            if (!carMeshes[spawnedCar.id]) {
              const mesh = createCarModel(spawnedCar.type, spawnedCar.color);
              carMeshes[spawnedCar.id] = mesh;
              groupsRef.current?.dynamicObjects.add(mesh);
            }

            // Check traffic lights
            let shouldStop = false;
            for (const light of trafficLights) {
              const distance = turf.distance(
                turf.point(spawnedCar.position),
                turf.point(light.position),
                { units: "meters" }
              );

              if (distance < 30 && (light.state === "red" || light.state === "yellow")) {
                shouldStop = true;
                spawnedCar.stoppedAtLight = true;
                break;
              }
            }

            if (!shouldStop) {
              spawnedCar.stoppedAtLight = false;
            }

            // Update speed
            if (spawnedCar.stoppedAtLight) {
              spawnedCar.speed = Math.max(0, spawnedCar.speed - 50 * deltaTime);
            } else {
              spawnedCar.speed = Math.min(spawnedCar.maxSpeed, spawnedCar.speed + 30 * deltaTime);
            }

            // Update position
            spawner.updateCarPosition(spawnedCar.id, deltaTime);

            // Update mesh
            const mesh = carMeshes[spawnedCar.id];
            if (mesh) {
              const worldPos = CityProjection.projectToWorld(spawnedCar.position);
              mesh.position.set(worldPos.x, worldPos.y + 1, worldPos.z);
              mesh.rotation.y = (-spawnedCar.bearing * Math.PI) / 180;
            }
          });

          // Remove meshes for despawned cars
          Object.entries(carMeshes).forEach(([carId, mesh]) => {
            if (!processedCarIds.has(carId)) {
              groupsRef.current?.dynamicObjects.remove(mesh);
              delete carMeshes[carId];
            }
          });
        }

        // Update tweens
        updateTweens();

        // Update controls
        controlsRef.current.update();

        // Render with composer if available (for outline effect), otherwise normal render
        if (composerRef.current) {
          composerRef.current.render();
        } else {
          rendererRef.current.render(sceneRef.current, cameraRef.current);
        }

        animationFrameRef.current = requestAnimationFrame(animate);
      }

      animate();
    }

    // Handle window resize
    function handleWindowResize() {
      if (!canvasRef.current || !cameraRef.current || !rendererRef.current) return;

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
      if (!canvasRef.current || !cameraRef.current || !sceneRef.current || !groupsRef.current) {
        return;
      }

      // Calculate mouse position in normalized device coordinates (-1 to +1)
      const rect = canvasRef.current.getBoundingClientRect();
      const mouse = new THREE.Vector2();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // Update raycaster with mouse position
      raycasterRef.current.setFromCamera(mouse, cameraRef.current);

      // Check if we clicked on a building first
      const buildingObjects = Array.from(buildingModelsRef.current.values());
      const buildingIntersects = raycasterRef.current.intersectObjects(buildingObjects, true);

      if (buildingIntersects.length > 0 && !isPlacementMode) {
        // Find which building was clicked
        let clickedBuilding: THREE.Object3D | null = buildingIntersects[0].object;
        while (clickedBuilding && !clickedBuilding.userData.buildingId) {
          clickedBuilding = clickedBuilding.parent;
        }

        if (clickedBuilding && clickedBuilding.userData.buildingId && onBuildingSelect) {
          onBuildingSelect(clickedBuilding.userData.buildingId);
          return; // Don't process as coordinate click
        }
      }

      // For placement mode, only raycast against ground and static geometry
      // For normal mode, raycast against everything
      let intersects;
      if (isPlacementMode) {
        const targetObjects = [
          ...groupsRef.current.environment.children,
          ...groupsRef.current.staticGeometry.children
        ];
        intersects = raycasterRef.current.intersectObjects(targetObjects, true);
      } else {
        intersects = raycasterRef.current.intersectObjects(sceneRef.current.children, true);
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
        };

        if (onCoordinateClick) {
          onCoordinateClick(coordinate);
        }

        // Deselect building if clicking elsewhere
        if (onBuildingSelect && !isPlacementMode) {
          onBuildingSelect(null);
        }

        console.log('Clicked coordinate:', { lat, lng, worldPos: intersectionPoint });
      }
    }

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('click', handleCanvasClick);
      return () => canvas.removeEventListener('click', handleCanvasClick);
    }
  }, [onCoordinateClick, onBuildingSelect, isPlacementMode]);

  // Load and display placed buildings
  useEffect(() => {
    if (!groupsRef.current || !isReady) return;

    const loader = new GLTFLoader();
    const loadedModels: THREE.Group[] = [];

    // Remove all previously loaded custom buildings
    const customBuildingsGroup = groupsRef.current.dynamicObjects;
    const objectsToRemove: THREE.Object3D[] = [];
    customBuildingsGroup.children.forEach((child) => {
      if (child.userData.isCustomBuilding) {
        objectsToRemove.push(child);
      }
    });
    objectsToRemove.forEach((obj) => customBuildingsGroup.remove(obj));
    buildingModelsRef.current.clear();

    // Load and place each building
    placedBuildings.forEach((building) => {
      loader.load(
        building.modelPath,
        (gltf) => {
          const model = gltf.scene;
          model.userData.isCustomBuilding = true;
          model.userData.buildingId = building.id;

          // Position the model
          model.position.set(building.position.x, building.position.y, building.position.z);

          // Rotation
          if (building.rotation) {
            model.rotation.set(building.rotation.x, building.rotation.y, building.rotation.z);
          }

          // Scale - use per-building scale if available, otherwise use global buildingScale
          const scale = building.scale || buildingScale;
          model.scale.set(scale.x, scale.y, scale.z);

          // Add to scene
          groupsRef.current?.dynamicObjects.add(model);
          loadedModels.push(model);
          buildingModelsRef.current.set(building.id, model);

          console.log(`✅ Loaded building at (${building.position.x.toFixed(1)}, ${building.position.z.toFixed(1)})`);
        },
        undefined,
        (error) => {
          console.error(`❌ Error loading building model:`, error);
        }
      );
    });

    return () => {
      // Cleanup loaded models when component unmounts
      loadedModels.forEach((model) => {
        groupsRef.current?.dynamicObjects.remove(model);
      });
      buildingModelsRef.current.clear();
    };
  }, [placedBuildings, isReady]);

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

    const loader = new GLTFLoader();
    loader.load(
      '/let_me_sleeeeeeep/let_me_sleeeeeeep.gltf',
      (gltf) => {
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
      },
      undefined,
      (error) => console.error('Error loading ghost model:', error)
    );

    return () => {
      if (ghostModelRef.current && groupsRef.current) {
        groupsRef.current.dynamicObjects.remove(ghostModelRef.current);
        ghostModelRef.current = null;
      }
    };
  }, [isPlacementMode, buildingScale]);

  // Update ghost scale when buildingScale changes
  useEffect(() => {
    if (ghostModelRef.current) {
      ghostModelRef.current.scale.set(buildingScale.x, buildingScale.y, buildingScale.z);
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
        cameraRef.current
      );
      outlinePass.edgeStrength = 5;
      outlinePass.edgeGlow = 1;
      outlinePass.edgeThickness = 2;
      outlinePass.visibleEdgeColor.set('#003F7C');
      outlinePass.hiddenEdgeColor.set('#003F7C');

      composer.addPass(outlinePass);
      composerRef.current = composer;
      outlinePassRef.current = outlinePass;
    }

    // Update outline
    if (outlinePassRef.current) {
      if (selectedBuildingId) {
        const selectedModel = buildingModelsRef.current.get(selectedBuildingId);
        if (selectedModel) {
          outlinePassRef.current.selectedObjects = [selectedModel];
        } else {
          outlinePassRef.current.selectedObjects = [];
        }
      } else {
        outlinePassRef.current.selectedObjects = [];
      }
    }
  }, [selectedBuildingId]);

  // Update building transforms in real-time
  useEffect(() => {
    placedBuildings.forEach((building) => {
      const model = buildingModelsRef.current.get(building.id);
      if (model) {
        model.position.set(building.position.x, building.position.y, building.position.z);
        if (building.rotation) {
          model.rotation.set(building.rotation.x, building.rotation.y, building.rotation.z);
        }
        const scale = building.scale || buildingScale;
        model.scale.set(scale.x, scale.y, scale.z);
      }
    });
  }, [placedBuildings, buildingScale]);

  // Update ghost position on mouse move
  useEffect(() => {
    if (!isPlacementMode) return;

    function handleMouseMove(event: MouseEvent) {
      if (!canvasRef.current || !cameraRef.current || !groupsRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const mouse = new THREE.Vector2();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouse, cameraRef.current);

      // Only raycast against the ground plane and static geometry (buildings/roads)
      // This prevents placing buildings on cars or in the air
      const targetObjects = [
        ...groupsRef.current.environment.children,
        ...groupsRef.current.staticGeometry.children
      ];
      const intersects = raycasterRef.current.intersectObjects(targetObjects, true);

      // Check if ghost exists inside the handler (it might load after this effect runs)
      if (intersects.length > 0 && ghostModelRef.current) {
        const point = intersects[0].point;
        ghostModelRef.current.position.set(point.x, point.y, point.z);
        ghostModelRef.current.visible = true;
        setGhostPosition(point);
      } else if (ghostModelRef.current) {
        // Hide ghost when not hovering over valid placement surface
        ghostModelRef.current.visible = false;
      }
    }

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('mousemove', handleMouseMove);
      return () => canvas.removeEventListener('mousemove', handleMouseMove);
    }
  }, [isPlacementMode]);

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ touchAction: 'none', cursor: 'grab' }}
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

    </div>
  );
}
