"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import * as turf from "@turf/turf";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// Scene management
import { createSceneManager, handleResize } from "@/lib/sceneManager";

// Rendering systems
import { fetchBuildings } from "@/lib/buildingData";
import { renderBuildings } from "@/lib/buildingRenderer";
import { renderRoads } from "@/lib/roadRenderer";
import {
  createSky,
  setupFog,
  createGround,
  fetchSatelliteImagery
} from "@/lib/environmentRenderer";

// Projection and camera
import { CityProjection } from "@/lib/projection";
import { setupControls, flyToQueens, updateTweens } from "@/lib/cameraController";

// Traffic simulation
import { RoadNetwork } from "@/lib/roadNetwork";
import { Pathfinder } from "@/lib/pathfinding";
import { Spawner, SpawnedCar } from "@/lib/spawning";

interface ThreeMapProps {
  initialCenter?: [number, number];
  className?: string;
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

// Fetch traffic signals from OpenStreetMap
async function fetchAllTrafficSignals(): Promise<
  Array<{
    lat: number;
    lon: number;
    type: string;
    id: number;
  }>
> {
  try {
    const query = `
      [out:json][timeout:25];
      (
        node["highway"="traffic_signals"](44.220,-76.510,44.240,-76.480);
        node["highway"="stop"](44.220,-76.510,44.240,-76.480);
      );
      out body;
    `;

    console.log("Fetching traffic signals from OpenStreetMap...");
    const response = await fetch(
      `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`
    );

    if (!response.ok) {
      console.warn(`OSM Overpass API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    console.log(`✅ Found ${data.elements?.length || 0} traffic controls from OSM`);

    return data.elements.map((el: any) => ({
      lat: el.lat,
      lon: el.lon,
      type: el.tags.highway,
      id: el.id,
    }));
  } catch (error) {
    console.warn("Error fetching from Overpass API:", error);
    return [];
  }
}

export default function ThreeMap({
  initialCenter = [-76.4951, 44.2253], // Queen's University
  className = "w-full h-full",
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

        // Add sky and fog
        setLoadingStatus("Setting up environment...");
        const sky = createSky();
        groups.environment.add(sky);
        setupFog(scene);

        // Define bounding box for Kingston/Queen's area
        const bbox: [number, number, number, number] = [44.220, -76.510, 44.240, -76.480];

        // Fetch and apply satellite imagery
        setLoadingStatus("Fetching satellite imagery...");
        const satelliteImageUrl = await fetchSatelliteImagery(bbox);

        let satelliteTexture: THREE.Texture | undefined;
        if (satelliteImageUrl) {
          const textureLoader = new THREE.TextureLoader();
          satelliteTexture = await new Promise<THREE.Texture>((resolve, reject) => {
            textureLoader.load(
              satelliteImageUrl,
              (texture) => {
                // Enable proper texture filtering for better quality at all distances
                texture.wrapS = THREE.ClampToEdgeWrapping;
                texture.wrapT = THREE.ClampToEdgeWrapping;

                // Use mipmaps for better quality at distance
                texture.minFilter = THREE.LinearMipmapLinearFilter;
                texture.magFilter = THREE.LinearFilter;

                // Enable anisotropic filtering for better quality at oblique angles
                if (rendererRef.current) {
                  const maxAnisotropy = rendererRef.current.capabilities.getMaxAnisotropy();
                  texture.anisotropy = Math.min(16, maxAnisotropy);
                  console.log(`✅ Satellite texture loaded with anisotropy: ${texture.anisotropy}`);
                }

                // Generate mipmaps for better LOD
                texture.generateMipmaps = true;
                texture.needsUpdate = true;

                console.log('✅ Satellite texture loaded successfully');
                resolve(texture);
              },
              undefined,
              (error) => {
                console.warn('Failed to load satellite texture:', error);
                reject(error);
              }
            );
          }).catch(() => undefined);
        }

        // Create ground with satellite texture
        setLoadingStatus("Creating ground plane...");
        const ground = createGround(
          {
            minLat: bbox[0],
            maxLat: bbox[2],
            minLng: bbox[1],
            maxLng: bbox[3]
          },
          CityProjection,
          satelliteTexture
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

        // Fly to Queen's campus
        setLoadingStatus("Flying to Queen's...");
        await flyToQueens(camera, controls);

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

        // Render
        rendererRef.current.render(sceneRef.current, cameraRef.current);

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
