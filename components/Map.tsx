"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import * as turf from "@turf/turf";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { useMapBuildingsOptional, MapBuilding } from "@/lib/map/contexts/MapBuildingsContext";
import { getSavedBuildings, SavedBuildingTemplate } from "@/lib/map/services/buildingStorage";
import type { BuildingSpecification } from "@/lib/editor/types/buildingSpec";

// Local default spec to avoid circular dependency issues
const LOCAL_DEFAULT_SPEC: BuildingSpecification = {
  width: 20,
  depth: 15,
  floorHeight: 3.5,
  numberOfFloors: 3,
  roofType: 'flat',
  roofHeight: 3,
  wallTexture: 'brick',
  roofTexture: 'shingle',
  windowTexture: 'glass',
  windowPattern: 'grid',
  windowRows: 4,
  windowWidth: 1.2,
  windowHeight: 1.8,
  doorWidth: 1.5,
  doorHeight: 2.4,
  doorPosition: 0.5,
};

interface MapProps {
  initialCenter?: [number, number];
  initialZoom?: number;
  style?: string;
  className?: string;
}

type CarType = "sedan" | "suv" | "truck" | "compact";

interface Car {
  id: string;
  position: [number, number];
  routeGeometry: GeoJSON.Feature<GeoJSON.LineString>;
  distance: number; // Distance traveled along route in kilometers
  bearing: number;
  speed: number; // Speed in km/h
  maxSpeed: number; // Maximum speed in km/h
  color: string;
  type: CarType;
  mesh?: THREE.Mesh;
  stoppedAtLight: boolean;
}

interface TrafficLight {
  id: string;
  position: [number, number];
  state: "red" | "yellow" | "green";
  timer: number;
  mesh?: THREE.Mesh;
  intersectionId: string; // Group lights by intersection
  direction: "ns" | "ew"; // North-South or East-West
}

const TRAFFIC_LIGHT_TIMINGS = {
  green: 8000,  // 8 seconds
  yellow: 2000, // 2 seconds
  red: 8000,    // 8 seconds
};

// Create 3D car models
function createCarModel(type: CarType, color: string): THREE.Mesh {
  const group = new THREE.Group();
  const material = new THREE.MeshPhongMaterial({ color });

  switch (type) {
    case "sedan": {
      // Car body (lower part)
      const bodyGeometry = new THREE.BoxGeometry(1.8, 0.8, 4.2);
      const body = new THREE.Mesh(bodyGeometry, material);
      body.position.y = 0.4;
      group.add(body);

      // Cabin (upper part)
      const cabinGeometry = new THREE.BoxGeometry(1.6, 0.6, 2.2);
      const cabin = new THREE.Mesh(cabinGeometry, material);
      cabin.position.y = 1.1;
      cabin.position.z = -0.3;
      group.add(cabin);
      break;
    }
    case "suv": {
      // Larger, taller body
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
      // Truck cab
      const cabGeometry = new THREE.BoxGeometry(2.0, 1.2, 2.0);
      const cab = new THREE.Mesh(cabGeometry, material);
      cab.position.y = 1.0;
      cab.position.z = 1.5;
      group.add(cab);

      // Truck bed
      const bedGeometry = new THREE.BoxGeometry(2.0, 0.8, 3.0);
      const bed = new THREE.Mesh(bedGeometry, material);
      bed.position.y = 0.4;
      bed.position.z = -1.0;
      group.add(bed);
      break;
    }
    case "compact": {
      // Smaller car
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

  // Add wheels to all car types
  const wheelGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 16);
  const wheelMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });

  const wheelPositions = [
    [0.7, 0.3, 1.2],   // front left
    [-0.7, 0.3, 1.2],  // front right
    [0.7, 0.3, -1.2],  // back left
    [-0.7, 0.3, -1.2], // back right
  ];

  wheelPositions.forEach(([x, y, z]) => {
    const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, y, z);
    group.add(wheel);
  });

  // Convert group to mesh for easier handling
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

  // Lights (red, yellow, green) - use MeshStandardMaterial with emissive
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

/**
 * Create a ghost/preview building for placement mode
 * Shows a semi-transparent building that follows the cursor
 *
 * DEBUGGING:
 * - Check console for [GhostBuilding] logs
 * - Ghost should appear green and semi-transparent
 * - Should follow cursor when placementMode is true
 */
function createGhostBuilding(spec?: typeof LOCAL_DEFAULT_SPEC): THREE.Group {
  console.log('[GhostBuilding] Creating ghost building preview...');

  const group = new THREE.Group();

  // Use provided spec or default
  const buildingSpec = spec || LOCAL_DEFAULT_SPEC;
  const width = buildingSpec.width;
  const depth = buildingSpec.depth;
  const height = buildingSpec.numberOfFloors * buildingSpec.floorHeight;

  console.log('[GhostBuilding] Dimensions:', { width, depth, height });

  // Semi-transparent green material for ghost effect
  const ghostMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    transparent: true,
    opacity: 0.4,
    side: THREE.DoubleSide,
    depthWrite: false, // Prevent z-fighting
  });

  // Main building body
  const bodyGeometry = new THREE.BoxGeometry(width, height, depth);
  const body = new THREE.Mesh(bodyGeometry, ghostMaterial);
  body.position.y = height / 2; // Position so bottom is at y=0
  group.add(body);

  // Add wireframe for better visibility (thicker lines)
  const wireframeMaterial = new THREE.LineBasicMaterial({
    color: 0x00ff00,
    linewidth: 2,
  });
  const wireframe = new THREE.LineSegments(
    new THREE.EdgesGeometry(bodyGeometry),
    wireframeMaterial
  );
  wireframe.position.y = height / 2;
  group.add(wireframe);

  // Add a base marker (circle on ground) for visibility
  const baseGeometry = new THREE.RingGeometry(
    Math.max(width, depth) * 0.6,
    Math.max(width, depth) * 0.7,
    32
  );
  const baseMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
  });
  const base = new THREE.Mesh(baseGeometry, baseMaterial);
  base.rotation.x = -Math.PI / 2; // Lay flat on ground
  base.position.y = 0.1; // Slightly above ground
  group.add(base);

  console.log('[GhostBuilding] Ghost building created successfully with base marker');
  return group;
}

/**
 * Load a building model from GLTF file
 *
 * KEY CONCEPTS:
 * - Loads pre-exported GLTF model from /public/models/
 * - Returns a promise that resolves to the loaded model group
 * - Falls back to procedural generation if GLTF not available
 *
 * DEBUGGING FLOW:
 * 1. [Building3D] Check if GLTF path exists
 * 2. [Building3D] Load GLTF using GLTFLoader
 * 3. [Building3D] Return loaded scene
 */
function loadBuildingFromGLTF(gltfPath: string): Promise<THREE.Group> {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();

    console.log('[Building3D] Loading GLTF from:', gltfPath);

    loader.load(
      gltfPath,
      (gltf) => {
        console.log('[Building3D] GLTF loaded successfully');
        const group = gltf.scene;

        // Ensure materials are set up for Mapbox rendering
        group.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            // Use MeshStandardMaterial for better lighting
            if (!(object.material instanceof THREE.MeshStandardMaterial)) {
              object.material = new THREE.MeshStandardMaterial({
                color: 0x8B7355,
                metalness: 0,
                roughness: 1,
              });
            }
          }
        });

        resolve(group);
      },
      (progress) => {
        const percent = (progress.loaded / progress.total) * 100;
        console.log(`[Building3D] Loading progress: ${percent.toFixed(1)}%`);
      },
      (error) => {
        console.error('[Building3D] Error loading GLTF:', error);
        reject(error);
      }
    );
  });
}

/**
 * Create a procedural 3D building model (fallback)
 *
 * KEY CONCEPTS:
 * - Uses building spec (width, depth, floors, etc.) to generate geometry
 * - Creates a simple box-based building with optional roof
 * - Returns a THREE.Group that can be positioned on the map
 *
 * DEBUGGING FLOW:
 * 1. [Building3D] Log input spec
 * 2. [Building3D] Create main body geometry
 * 3. [Building3D] Add windows on each floor
 * 4. [Building3D] Add roof if not flat
 * 5. [Building3D] Return complete group
 */
function createBuildingModelProcedural(building: MapBuilding): THREE.Group {
  console.log('[Building3D] ============ CREATE MODEL ============');
  const group = new THREE.Group();
  const spec = building.spec;

  console.log('[Building3D] Building:', building.id);
  console.log('[Building3D] Spec:', {
    width: spec.width,
    depth: spec.depth,
    floors: spec.numberOfFloors,
    floorHeight: spec.floorHeight,
    roofType: spec.roofType,
  });

  // Calculate total building height
  const totalHeight = spec.numberOfFloors * spec.floorHeight;

  // Main building body
  const bodyGeometry = new THREE.BoxGeometry(spec.width, totalHeight, spec.depth);
  const bodyMaterial = new THREE.MeshPhongMaterial({
    color: 0x8B7355, // Brown/tan color for walls
    flatShading: false,
  });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.y = totalHeight / 2; // Position so bottom is at y=0
  group.add(body);

  // Add windows (simplified as darker rectangles on each floor)
  const windowMaterial = new THREE.MeshPhongMaterial({
    color: 0x4A90D9, // Blue glass color
    emissive: 0x1A3A5C,
    emissiveIntensity: 0.3,
  });

  // Add windows on front and back faces
  for (let floor = 0; floor < spec.numberOfFloors; floor++) {
    const floorY = (floor + 0.5) * spec.floorHeight;

    for (let w = 0; w < spec.windowRows; w++) {
      const windowX = (w - (spec.windowRows - 1) / 2) * (spec.width / spec.windowRows);

      // Front window
      const frontWindow = new THREE.Mesh(
        new THREE.PlaneGeometry(spec.windowWidth, spec.windowHeight),
        windowMaterial
      );
      frontWindow.position.set(windowX, floorY, spec.depth / 2 + 0.01);
      group.add(frontWindow);

      // Back window
      const backWindow = new THREE.Mesh(
        new THREE.PlaneGeometry(spec.windowWidth, spec.windowHeight),
        windowMaterial
      );
      backWindow.position.set(windowX, floorY, -spec.depth / 2 - 0.01);
      backWindow.rotation.y = Math.PI;
      group.add(backWindow);
    }
  }

  // Add roof based on type
  if (spec.roofType !== 'flat') {
    const roofMaterial = new THREE.MeshPhongMaterial({
      color: 0x654321, // Dark brown roof
    });

    if (spec.roofType === 'pyramid' || spec.roofType === 'hipped') {
      const roofGeometry = new THREE.ConeGeometry(
        Math.max(spec.width, spec.depth) * 0.7,
        spec.roofHeight,
        4
      );
      const roof = new THREE.Mesh(roofGeometry, roofMaterial);
      roof.position.y = totalHeight + spec.roofHeight / 2;
      roof.rotation.y = Math.PI / 4;
      group.add(roof);
    } else if (spec.roofType === 'gabled') {
      // Simple gabled roof using a prism shape
      const roofShape = new THREE.Shape();
      roofShape.moveTo(-spec.width / 2, 0);
      roofShape.lineTo(0, spec.roofHeight);
      roofShape.lineTo(spec.width / 2, 0);
      roofShape.lineTo(-spec.width / 2, 0);

      const extrudeSettings = { depth: spec.depth, bevelEnabled: false };
      const roofGeometry = new THREE.ExtrudeGeometry(roofShape, extrudeSettings);
      const roof = new THREE.Mesh(roofGeometry, roofMaterial);
      roof.position.set(0, totalHeight, -spec.depth / 2);
      group.add(roof);
    }
  }

  // Apply rotation from building data
  group.rotation.y = (building.rotation * Math.PI) / 180;

  // Store building ID in userData for later reference
  group.userData.buildingId = building.id;

  console.log('[Building3D] Model completed:', {
    buildingId: building.id,
    totalHeight: totalHeight,
    childrenCount: group.children.length,
    rotationDegrees: building.rotation,
  });
  console.log('[Building3D] ===========================================');

  return group;
}

/**
 * Create building model - loads from GLTF file (REQUIRED)
 *
 * KEY CONCEPTS:
 * - Loads building from pre-saved GLTF file in /public/models/
 * - GLTF path is required - no procedural fallback on map
 * - Returns a promise that resolves to the building group
 *
 * NOTE: Buildings must be saved from the editor first using "Save to Map"
 */
async function createBuildingModel(
  building: MapBuilding,
  gltfPath: string
): Promise<THREE.Group> {
  console.log('[Building3D] ============ LOAD MODEL ============');
  console.log('[Building3D] Building:', building.id);
  console.log('[Building3D] GLTF Path:', gltfPath);

  try {
    const group = await loadBuildingFromGLTF(gltfPath);

    // Apply rotation from building data
    group.rotation.y = (building.rotation * Math.PI) / 180;
    group.userData.buildingId = building.id;

    console.log('[Building3D] ✅ Loaded from GLTF successfully');
    console.log('[Building3D] ===========================================');
    return group;
  } catch (error) {
    console.error('[Building3D] ❌ Failed to load GLTF:', error);
    console.log('[Building3D] ===========================================');
    throw new Error(`Failed to load building model from ${gltfPath}`);
  }
}

/**
 * Initialize the 3D buildings layer
 *
 * KEY CONCEPTS:
 * - Creates a separate Three.js layer for placed buildings
 * - Uses Mapbox's CustomLayerInterface for integration
 * - Returns the scene reference for adding/removing buildings
 *
 * DEBUGGING FLOW:
 * 1. [BuildingsLayer] Layer added to map
 * 2. [BuildingsLayer] Camera and scene created
 * 3. [BuildingsLayer] Lighting added
 * 4. [BuildingsLayer] WebGLRenderer created
 * 5. [BuildingsLayer] Ghost building created
 * 6. [BuildingsLayer] Scene ready callback invoked
 */
function initializeBuildingsLayer(
  map: mapboxgl.Map,
  onSceneReady: (scene: THREE.Scene, ghostBuilding: THREE.Group) => void
): void {
  console.log('[BuildingsLayer] ============ INIT LAYER ============');
  console.log('[BuildingsLayer] Starting layer initialization...');

  const buildingsLayer: mapboxgl.CustomLayerInterface = {
    id: 'placed-buildings-3d',
    type: 'custom',
    renderingMode: '3d',

    onAdd: function (map: mapboxgl.Map, gl: WebGLRenderingContext) {
      console.log(`[BuildingsLayer] Layer added to map`);

      this.camera = new THREE.Camera();
      this.scene = new THREE.Scene();

      // Lighting for buildings - use fewer, more efficient lights
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
      directionalLight.position.set(100, 100, 50).normalize();
      this.scene.add(directionalLight);

      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      this.scene.add(ambientLight);

      // Create renderer with optimizations
      console.log('[BuildingsLayer] Creating WebGLRenderer with optimizations...');
      const canvas = map.getCanvas();

      // Track context loss state
      this.contextLost = false;

      // Enhanced context loss handlers
      const handleContextLost = (e: Event) => {
        console.warn('[BuildingsLayer] ⚠️ WebGL context lost - attempting recovery');
        e.preventDefault(); // Prevent default handling to allow recovery
        this.contextLost = true;

        // Stop any ongoing render loops
        if (this.renderer) {
          this.renderer.forceContextLoss();
        }
      };

      const handleContextRestored = () => {
        console.log('[BuildingsLayer] ✅ WebGL context restored');
        this.contextLost = false;

        // Recreate renderer if needed
        if (!this.renderer || !this.renderer.getContext()) {
          console.log('[BuildingsLayer] Recreating renderer after context restore');
          try {
            this.renderer = new THREE.WebGLRenderer({
              canvas: canvas,
              context: gl,
              antialias: false, // Disable for performance
              alpha: true,
              powerPreference: 'high-performance',
              failIfMajorPerformanceCaveat: false,
              preserveDrawingBuffer: false, // Better performance
            });
            this.renderer.autoClear = false;
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio
            console.log('[BuildingsLayer] Renderer recreated successfully');
          } catch (err) {
            console.error('[BuildingsLayer] Failed to recreate renderer:', err);
          }
        }

        // Trigger a repaint
        if (map && map.triggerRepaint) {
          map.triggerRepaint();
        }
      };

      // Remove any existing listeners first
      canvas.removeEventListener('webglcontextlost', handleContextLost as EventListener);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored as EventListener);

      // Add context loss handlers
      canvas.addEventListener('webglcontextlost', handleContextLost as EventListener, false);
      canvas.addEventListener('webglcontextrestored', handleContextRestored as EventListener, false);

      // Store handlers for cleanup
      this.contextLostHandler = handleContextLost;
      this.contextRestoredHandler = handleContextRestored;

      try {
        this.renderer = new THREE.WebGLRenderer({
          canvas: canvas,
          context: gl,
          antialias: false, // Disable for better performance
          alpha: true,
          powerPreference: 'high-performance',
          failIfMajorPerformanceCaveat: false,
          preserveDrawingBuffer: false,
        });
        this.renderer.autoClear = false;
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio for performance

        // Enable optimizations
        this.renderer.capabilities.logarithmicDepthBuffer = false;

        console.log('[BuildingsLayer] WebGLRenderer created with optimizations');
        console.log('[BuildingsLayer] Max textures:', this.renderer.capabilities.maxTextures);
        console.log('[BuildingsLayer] Pixel ratio:', this.renderer.getPixelRatio());
      } catch (err) {
        console.error('[BuildingsLayer] Failed to create WebGLRenderer:', err);
      }

      this.map = map;

      // Create ghost building for preview (initially invisible)
      this.ghostBuilding = createGhostBuilding();
      this.ghostBuilding.visible = false;
      this.scene.add(this.ghostBuilding);
      console.log('[BuildingsLayer] Ghost building added to scene');

      // Notify that scene is ready
      onSceneReady(this.scene, this.ghostBuilding);
      console.log('[BuildingsLayer] Scene ready callback invoked');
      console.log('[BuildingsLayer] =========================================');
    },

    render: function (gl: WebGLRenderingContext, matrix: number[]) {
      // Skip rendering if context is lost
      if (this.contextLost) {
        return;
      }

      // Guard against missing renderer (e.g., after context loss)
      if (!this.renderer || !this.renderer.getContext()) {
        console.warn('[BuildingsLayer] Renderer not available, skipping render');
        return;
      }

      try {
        // Check if context is still valid
        const context = this.renderer.getContext();
        if (context.isContextLost && context.isContextLost()) {
          console.warn('[BuildingsLayer] Context lost during render, skipping');
          this.contextLost = true;
          return;
        }

        // Transform matrix for proper projection
        const m = new THREE.Matrix4().fromArray(matrix);

        this.camera.projectionMatrix = m;
        this.renderer.resetState();
        this.renderer.render(this.scene, this.camera);

        // Log render stats periodically (every 300 frames to reduce console spam)
        if (!this.frameCount) this.frameCount = 0;
        this.frameCount++;
        if (this.frameCount % 300 === 0) {
          console.log('[BuildingsLayer] Render frame', this.frameCount, '- Scene children:', this.scene.children.length);
          // Log memory usage
          console.log('[BuildingsLayer] Renderer info:', {
            geometries: this.renderer.info.memory.geometries,
            textures: this.renderer.info.memory.textures,
            programs: this.renderer.info.programs?.length || 0,
          });
        }
      } catch (err) {
        console.error('[BuildingsLayer] Render error:', err);
        // If render fails repeatedly, might indicate context loss
        if (!this.renderErrorCount) this.renderErrorCount = 0;
        this.renderErrorCount++;
        if (this.renderErrorCount > 5) {
          console.error('[BuildingsLayer] Multiple render errors, possible context loss');
          this.contextLost = true;
        }
      }
      // NOTE: Do NOT call triggerRepaint() here - it creates an infinite loop!
    },

    onRemove: function (map: mapboxgl.Map, gl: WebGLRenderingContext) {
      console.log('[BuildingsLayer] ============ CLEANUP ============');

      // Remove event listeners
      const canvas = map.getCanvas();
      if (this.contextLostHandler) {
        canvas.removeEventListener('webglcontextlost', this.contextLostHandler as EventListener);
      }
      if (this.contextRestoredHandler) {
        canvas.removeEventListener('webglcontextrestored', this.contextRestoredHandler as EventListener);
      }

      // Dispose of all geometries and materials in the scene
      if (this.scene) {
        this.scene.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            if (object.geometry) {
              object.geometry.dispose();
            }
            if (object.material) {
              if (Array.isArray(object.material)) {
                object.material.forEach(material => material.dispose());
              } else {
                object.material.dispose();
              }
            }
          }
        });
        this.scene.clear();
      }

      // Dispose of renderer
      if (this.renderer) {
        this.renderer.dispose();
        this.renderer.forceContextLoss();
        this.renderer = null;
      }

      console.log('[BuildingsLayer] Layer cleaned up successfully');
      console.log('[BuildingsLayer] =======================================');
    },
  } as any;

  map.addLayer(buildingsLayer);
  console.log(`[BuildingsLayer] Layer registered with Mapbox`);
}

// Fetch route from Mapbox Directions API
async function fetchRoute(
  start: [number, number],
  end: [number, number],
  accessToken: string
): Promise<GeoJSON.Feature<GeoJSON.LineString> | null> {
  try {
    // Use overview=full for maximum detail in road geometry
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&overview=full&steps=true&access_token=${accessToken}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      console.log(`Route has ${route.geometry.coordinates.length} coordinate points`);
      return {
        type: "Feature",
        properties: {},
        geometry: route.geometry,
      };
    }
  } catch (error) {
    console.error("Error fetching route:", error);
  }
  return null;
}

// Define route start/end points around Queen's University
function getRouteEndpoints(): Array<{
  start: [number, number];
  end: [number, number];
  color: string;
  type: CarType;
}> {
  return [
    {
      start: [-76.4970, 44.2260],
      end: [-76.4850, 44.2320],
      color: "#FF0000",
      type: "sedan",
    },
    {
      start: [-76.4850, 44.2320],
      end: [-76.4970, 44.2260],
      color: "#0000FF",
      type: "suv",
    },
    {
      start: [-76.5000, 44.2300],
      end: [-76.4800, 44.2280],
      color: "#00FF00",
      type: "compact",
    },
    {
      start: [-76.4800, 44.2350],
      end: [-76.4950, 44.2250],
      color: "#FFA500",
      type: "truck",
    },
  ];
}

// Define real intersections around Queen's University campus
function getRealIntersections(): Array<{
  id: string;
  name: string;
  center: [number, number];
}> {
  return [
    {
      id: "union-university",
      name: "Union St & University Ave",
      center: [-76.4950, 44.2285],
    },
    {
      id: "division-princess",
      name: "Division St & Princess St",
      center: [-76.4870, 44.2305],
    },
    {
      id: "university-bader",
      name: "University Ave & Bader Ln",
      center: [-76.4920, 44.2270],
    },
  ];
}

// Find which routes pass near this intersection and place lights
function placeTrafficLightsForIntersection(
  intersection: { id: string; center: [number, number] },
  routes: Array<{ route: GeoJSON.Feature<GeoJSON.LineString>; routeId: number }>
): TrafficLight[] {
  const lights: TrafficLight[] = [];
  const INTERSECTION_RADIUS = 50; // meters

  routes.forEach(({ route, routeId }) => {
    try {
      // Check if route passes near this intersection
      const nearestPoint = turf.nearestPointOnLine(route, turf.point(intersection.center));
      const distance = turf.distance(
        turf.point(intersection.center),
        nearestPoint,
        { units: 'meters' }
      );

      if (distance < INTERSECTION_RADIUS) {
        // This route passes through the intersection
        const approachDistance = Math.max(0, nearestPoint.properties.location! - 0.015); // 15m before
        const lightPosition = turf.along(route, approachDistance, { units: 'kilometers' });

        // Calculate bearing to determine direction
        const nextPoint = turf.along(route, approachDistance + 0.005, { units: 'kilometers' });
        const bearing = turf.bearing(
          turf.point(lightPosition.geometry.coordinates),
          turf.point(nextPoint.geometry.coordinates)
        );

        const normalizedBearing = ((bearing + 360) % 360);
        const direction: "ns" | "ew" =
          (normalizedBearing > 45 && normalizedBearing < 135) ||
          (normalizedBearing > 225 && normalizedBearing < 315)
            ? "ew"
            : "ns";

        lights.push({
          id: `${intersection.id}-route-${routeId}`,
          position: lightPosition.geometry.coordinates as [number, number],
          state: "red",
          timer: Date.now(),
          intersectionId: intersection.id,
          direction,
        });

        console.log(`Placed light at ${intersection.id} for route ${routeId} (${direction})`);
      }
    } catch (e) {
      console.error("Error placing light:", e);
    }
  });

  return lights;
}

// Place traffic lights on approach to intersection
function placeTrafficLightsAtIntersection(
  intersection: [number, number],
  route: GeoJSON.Feature<GeoJSON.LineString>,
  routeIndex: number
): { position: [number, number]; direction: "ns" | "ew"; bearing: number } | null {
  try {
    // Find the point on the route closest to the intersection
    const nearestPoint = turf.nearestPointOnLine(route, turf.point(intersection));
    const distanceToIntersection = nearestPoint.properties.location || 0;

    // Place light 15 meters before the intersection
    const approachDistance = Math.max(0, distanceToIntersection - 0.015); // 15m in km
    const lightPosition = turf.along(route, approachDistance, { units: 'kilometers' });

    // Calculate bearing at this point to determine direction
    const nextPoint = turf.along(route, approachDistance + 0.005, { units: 'kilometers' });
    const bearing = turf.bearing(
      turf.point(lightPosition.geometry.coordinates),
      turf.point(nextPoint.geometry.coordinates)
    );

    // Determine if this is primarily N-S or E-W based on bearing
    // 0° = North, 90° = East, 180° = South, 270° = West
    const normalizedBearing = ((bearing + 360) % 360);
    const direction: "ns" | "ew" =
      (normalizedBearing > 45 && normalizedBearing < 135) ||
      (normalizedBearing > 225 && normalizedBearing < 315)
        ? "ew"
        : "ns";

    return {
      position: lightPosition.geometry.coordinates as [number, number],
      direction,
      bearing: normalizedBearing,
    };
  } catch (e) {
    console.error("Error placing traffic light:", e);
    return null;
  }
}

// Initialize traffic simulation with 3D models
async function initializeTrafficSimulation(map: mapboxgl.Map, center: [number, number]) {
  const accessToken = mapboxgl.accessToken as string;
  if (!accessToken) {
    console.error('[TrafficSim] No Mapbox access token available');
    return;
  }
  const cars: Car[] = [];
  const trafficLights: TrafficLight[] = [];
  const routeEndpoints = getRouteEndpoints();

  // Mapbox GL JS to Mercator projection utilities
  const modelTransform = {
    translateX: 0,
    translateY: 0,
    translateZ: 0,
    rotateX: Math.PI / 2,
    rotateY: 0,
    rotateZ: 0,
    scale: 5.41843220338983e-8,
  };

  // Fetch routes for each endpoint pair
  console.log("Fetching routes from Mapbox Directions API...");
  for (let i = 0; i < routeEndpoints.length; i++) {
    const { start, end, color, type } = routeEndpoints[i];
    const routeGeometry = await fetchRoute(start, end, accessToken);

    if (routeGeometry && routeGeometry.geometry.coordinates.length > 0) {
      // Create 2 cars per route with different starting positions
      for (let j = 0; j < 2; j++) {
        const routeLength = turf.length(routeGeometry, { units: 'kilometers' });
        cars.push({
          id: `car-${i}-${j}`,
          position: routeGeometry.geometry.coordinates[0] as [number, number],
          routeGeometry: routeGeometry,
          distance: (j * routeLength) / 2, // Stagger cars along route
          bearing: 0,
          speed: 30 + Math.random() * 20, // 30-50 km/h
          maxSpeed: 30 + Math.random() * 20,
          color: color,
          type: type,
          stoppedAtLight: false,
        });
      }
      console.log(`Created route ${i} with ${routeGeometry.geometry.coordinates.length} points`);
    }
  }

  // Get unique routes from cars
  const uniqueRoutes = Array.from(
    new Set(cars.map(car => JSON.stringify(car.routeGeometry.geometry)))
  ).map((s, i) => ({
    route: {
      type: 'Feature' as const,
      properties: {},
      geometry: JSON.parse(s),
    },
    routeId: i,
  }));

  // Use predefined intersections at real Queen's locations
  const realIntersections = getRealIntersections();
  console.log(`Using ${realIntersections.length} predefined intersections`);

  // Place traffic lights at each intersection
  realIntersections.forEach((intersection) => {
    const lightsAtIntersection = placeTrafficLightsForIntersection(
      intersection,
      uniqueRoutes
    );

    // Set initial states - alternate NS and EW
    const nsLights = lightsAtIntersection.filter(l => l.direction === "ns");
    const ewLights = lightsAtIntersection.filter(l => l.direction === "ew");

    nsLights.forEach(light => {
      light.state = "green";
      trafficLights.push(light);
    });

    ewLights.forEach(light => {
      light.state = "red";
      trafficLights.push(light);
    });

    console.log(`${intersection.name}: ${nsLights.length} NS lights, ${ewLights.length} EW lights`);
  });

  console.log(`Created ${cars.length} cars and ${trafficLights.length} traffic lights`);

  // Add route visualization (for debugging)
  map.addSource('car-routes', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: cars.map(car => car.routeGeometry),
    },
  });

  map.addLayer({
    id: 'car-routes-layer',
    type: 'line',
    source: 'car-routes',
    paint: {
      'line-color': '#888',
      'line-width': 3,
      'line-opacity': 0.5,
    },
  });

  // Add 2D car markers (for debugging/fallback)
  map.addSource('cars', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: [],
    },
  });

  map.addLayer({
    id: 'cars-2d-layer',
    type: 'circle',
    source: 'cars',
    paint: {
      'circle-radius': 8,
      'circle-color': ['get', 'color'],
      'circle-stroke-width': 2,
      'circle-stroke-color': '#fff',
    },
  });

  // Add traffic light markers (2D for debugging)
  map.addSource('traffic-lights', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: trafficLights.map(light => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: light.position,
        },
        properties: {
          state: light.state,
        },
      })),
    },
  });

  map.addLayer({
    id: 'traffic-lights-layer',
    type: 'circle',
    source: 'traffic-lights',
    paint: {
      'circle-radius': 10,
      'circle-color': [
        'match',
        ['get', 'state'],
        'red', '#ff0000',
        'yellow', '#ffff00',
        'green', '#00ff00',
        '#888888'
      ],
      'circle-stroke-width': 3,
      'circle-stroke-color': '#000',
    },
  });

  // Custom Three.js layer
  const customLayer: mapboxgl.CustomLayerInterface = {
    id: '3d-model',
    type: 'custom',
    renderingMode: '3d',

    onAdd: function (map: mapboxgl.Map, gl: WebGLRenderingContext) {
      this.camera = new THREE.Camera();
      this.scene = new THREE.Scene();

      // Lighting
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(0, 70, 100).normalize();
      this.scene.add(directionalLight);

      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      this.scene.add(ambientLight);

      // Create car meshes
      cars.forEach(car => {
        const mesh = createCarModel(car.type, car.color);
        mesh.scale.set(
          modelTransform.scale,
          -modelTransform.scale,
          modelTransform.scale
        );
        car.mesh = mesh;
        this.scene.add(mesh);
      });

      // Create traffic light meshes
      trafficLights.forEach(light => {
        const mesh = createTrafficLightModel();
        mesh.scale.set(
          modelTransform.scale,
          -modelTransform.scale,
          modelTransform.scale
        );
        light.mesh = mesh as any;
        this.scene.add(mesh);
      });

      this.map = map;

      // Create WebGL renderer
      console.log('[TrafficLayer] Creating WebGLRenderer...');
      try {
        this.renderer = new THREE.WebGLRenderer({
          canvas: map.getCanvas(),
          antialias: true,
          alpha: true,
        });
        this.renderer.autoClear = false;
        console.log('[TrafficLayer] WebGLRenderer created successfully');
      } catch (err) {
        console.error('[TrafficLayer] Failed to create WebGLRenderer:', err);
      }
    },

    render: function (gl: WebGLRenderingContext, matrix: number[]) {
      const rotationX = new THREE.Matrix4().makeRotationAxis(
        new THREE.Vector3(1, 0, 0),
        modelTransform.rotateX
      );
      const rotationY = new THREE.Matrix4().makeRotationAxis(
        new THREE.Vector3(0, 1, 0),
        modelTransform.rotateY
      );
      const rotationZ = new THREE.Matrix4().makeRotationAxis(
        new THREE.Vector3(0, 0, 1),
        modelTransform.rotateZ
      );

      const m = new THREE.Matrix4().fromArray(matrix);
      const l = new THREE.Matrix4()
        .makeTranslation(
          modelTransform.translateX,
          modelTransform.translateY,
          modelTransform.translateZ
        )
        .scale(
          new THREE.Vector3(
            modelTransform.scale,
            -modelTransform.scale,
            modelTransform.scale
          )
        )
        .multiply(rotationX)
        .multiply(rotationY)
        .multiply(rotationZ);

      this.camera.projectionMatrix = m.multiply(l);
      this.renderer.resetState();
      this.renderer.render(this.scene, this.camera);
      // NOTE: triggerRepaint is called from the animation loop, not here
    },
  } as any;

  map.addLayer(customLayer);

  // Helper: Convert lng/lat to world coordinates
  function projectToWorld(lngLat: [number, number]): THREE.Vector3 {
    const projected = mapboxgl.MercatorCoordinate.fromLngLat(lngLat as any, 0);
    return new THREE.Vector3(projected.x, projected.y, 0);
  }

  // Helper: Check if car is near traffic light
  function isNearTrafficLight(car: Car, light: TrafficLight): boolean {
    const distance = turf.distance(
      turf.point(car.position),
      turf.point(light.position),
      { units: 'meters' }
    );
    return distance < 30; // Within 30 meters
  }

  // Update traffic lights with coordinated timing
  function updateTrafficLights() {
    const now = Date.now();

    // Group lights by intersection (using object instead of Map to avoid naming conflict)
    const intersectionGroups: Record<string, TrafficLight[]> = {};
    trafficLights.forEach(light => {
      if (!intersectionGroups[light.intersectionId]) {
        intersectionGroups[light.intersectionId] = [];
      }
      intersectionGroups[light.intersectionId].push(light);
    });

    // Update each intersection's lights together
    Object.entries(intersectionGroups).forEach(([intersectionId, lights]) => {
      // Use the first light's timer to coordinate the whole intersection
      const primaryLight = lights[0];
      const elapsed = now - primaryLight.timer;
      const duration = TRAFFIC_LIGHT_TIMINGS[primaryLight.state];

      if (elapsed >= duration) {
        // Cycle all lights at this intersection
        lights.forEach(light => {
          if (light.state === "green") {
            light.state = "yellow";
          } else if (light.state === "yellow") {
            light.state = "red";
          } else {
            // When changing from red to green, only change the opposite direction
            // NS and EW should alternate
            const nsLights = lights.filter(l => l.direction === "ns");
            const ewLights = lights.filter(l => l.direction === "ew");

            const nsAreRed = nsLights.every(l => l.state === "red");
            const ewAreRed = ewLights.every(l => l.state === "red");

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

  // Animation loop
  let lastTime = Date.now();
  let animationStopped = false;

  function animateCars() {
    // Stop animation if map is no longer valid
    if (animationStopped || !map || !map.getSource) {
      console.log('[TrafficSim] Animation stopped - map no longer valid');
      return;
    }

    const currentTime = Date.now();
    const deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    // Update traffic lights
    updateTrafficLights();

    cars.forEach(car => {
      // Check traffic lights
      let shouldStop = false;
      for (const light of trafficLights) {
        if (isNearTrafficLight(car, light) && (light.state === "red" || light.state === "yellow")) {
          shouldStop = true;
          car.stoppedAtLight = true;
          break;
        }
      }

      if (!shouldStop) {
        car.stoppedAtLight = false;
      }

      // Update speed based on traffic lights
      if (car.stoppedAtLight) {
        car.speed = Math.max(0, car.speed - 50 * deltaTime); // Brake
      } else {
        car.speed = Math.min(car.maxSpeed, car.speed + 30 * deltaTime); // Accelerate
      }

      // Move car
      const distanceTraveled = (car.speed * deltaTime) / 3600;
      car.distance += distanceTraveled;

      const routeLength = turf.length(car.routeGeometry, { units: 'kilometers' });
      if (car.distance >= routeLength) {
        car.distance = 0;
      }

      const point = turf.along(car.routeGeometry, car.distance, { units: 'kilometers' });
      car.position = point.geometry.coordinates as [number, number];

      const lookaheadDistance = 0.002;
      const nextDistance = Math.min(car.distance + lookaheadDistance, routeLength);
      const nextPoint = turf.along(car.routeGeometry, nextDistance, { units: 'kilometers' });

      if (nextPoint && nextPoint.geometry.coordinates) {
        car.bearing = turf.bearing(
          turf.point(car.position),
          turf.point(nextPoint.geometry.coordinates)
        );
      }

      // Update 3D mesh position
      if (car.mesh) {
        const worldPos = projectToWorld(car.position);
        car.mesh.position.set(worldPos.x, worldPos.y, worldPos.z);
        car.mesh.rotation.z = (car.bearing * Math.PI) / 180;
      }
    });

    // Update traffic light positions
    trafficLights.forEach(light => {
      if (light.mesh) {
        const worldPos = projectToWorld(light.position);
        light.mesh.position.set(worldPos.x, worldPos.y, worldPos.z);
      }
    });

    // Update 2D car markers (check if source exists first)
    try {
      if (map && map.getSource) {
        const carsSource = map.getSource('cars') as mapboxgl.GeoJSONSource;
        if (carsSource && carsSource.setData) {
          carsSource.setData({
            type: 'FeatureCollection',
            features: cars.map(car => ({
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: car.position,
              },
              properties: {
                id: car.id,
                color: car.color,
                speed: car.speed.toFixed(1),
              },
            })),
          });
        }
      }
    } catch (e) {
      console.log('[TrafficSim] Error updating car markers, stopping animation');
      animationStopped = true;
      return;
    }

    // Update traffic light markers (check if source exists first)
    try {
      if (map && map.getSource) {
        const lightsSource = map.getSource('traffic-lights') as mapboxgl.GeoJSONSource;
        if (lightsSource && lightsSource.setData) {
          lightsSource.setData({
            type: 'FeatureCollection',
            features: trafficLights.map(light => ({
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: light.position,
              },
              properties: {
                state: light.state,
              },
            })),
          });
        }
      }
    } catch (e) {
      console.log('[TrafficSim] Error updating traffic light markers, stopping animation');
      animationStopped = true;
      return;
    }

    // Trigger repaint for the 3D custom layer
    map.triggerRepaint();

    requestAnimationFrame(animateCars);
  }

  console.log("Starting 3D animation...");
  animateCars();
}

export default function Map({
  initialCenter = [-76.479679, 44.232809], // Queen's University - specific location
  initialZoom = 18.5,
  // Using streets-v12 instead of standard to avoid 3D tree model loading issues
  style = "mapbox://styles/mapbox/streets-v12",
  className = "w-full h-full",
}: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isSatellite, setIsSatellite] = useState(false);
  const [sceneReady, setSceneReady] = useState(false); // Track when 3D scene is ready

  // Saved building templates from editor
  const [savedTemplates, setSavedTemplates] = useState<SavedBuildingTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);

  // Building placement context (optional - works without provider too)
  const buildingsContext = useMapBuildingsOptional();

  // Local state for building placement (used if context not available)
  const [localPlacementMode, setLocalPlacementMode] = useState(false);
  const [localBuildings, setLocalBuildings] = useState<MapBuilding[]>([]);

  // Use context if available, otherwise use local state
  const placementMode = buildingsContext?.placementMode ?? localPlacementMode;
  const buildings = buildingsContext?.buildings ?? localBuildings;
  const setPlacementMode = buildingsContext?.setPlacementMode ?? setLocalPlacementMode;

  // Refs for Three.js scene and building meshes
  // Note: Using Record instead of Map to avoid naming conflict with Map component
  const buildingMeshesRef = useRef<Record<string, THREE.Group>>({});
  const sceneRef = useRef<THREE.Scene | null>(null);
  const ghostBuildingRef = useRef<THREE.Group | null>(null);

  /**
   * Handle map click for building placement
   *
   * KEY CONCEPT:
   * - e.lngLat contains the geographic coordinates of the click
   * - Only places building when placementMode is true
   *
   * DEBUGGING FLOW:
   * 1. [MapClick] logs click coordinates
   * 2. [PlacementMode] logs template selection
   * 3. [BuildingCreate] logs new building creation
   * 4. Building gets added to state -> triggers 3D render effect
   */
  const handleMapClick = useCallback((e: mapboxgl.MapMouseEvent) => {
    console.log('[MapClick] ============ CLICK EVENT ============');
    console.log('[MapClick] placementMode:', placementMode);

    if (!placementMode) {
      console.log('[MapClick] Click ignored - placement mode is OFF');
      console.log('[MapClick] ====================================');
      return;
    }

    // Require template selection
    if (!selectedTemplateId) {
      alert('Please select a building template first!');
      console.log('[MapClick] No template selected, aborting');
      console.log('[MapClick] ====================================');
      return;
    }

    const { lng, lat } = e.lngLat;
    console.log('[MapClick] Placing building at coordinates:', { lng, lat });

    // Get the building spec from selected template
    const template = savedTemplates.find(t => t.id === selectedTemplateId);
    if (!template || !template.gltfPath) {
      alert('Selected building has no 3D model!\n\nPlease save the building from the editor first.');
      console.log('[MapClick] Template has no GLTF file, aborting');
      console.log('[MapClick] ====================================');
      return;
    }

    const spec = template.spec;
    const templateName = template.name;

    console.log('[PlacementMode] Using saved template:', template.name);
    console.log('[PlacementMode] GLTF path:', template.gltfPath);
    console.log('[PlacementMode] Template spec:', {
      floors: template.spec.numberOfFloors,
      width: template.spec.width,
      depth: template.spec.depth,
    });

    console.log('[BuildingCreate] Creating new building...');
    console.log('[BuildingCreate] Spec:', {
      width: spec.width,
      depth: spec.depth,
      floors: spec.numberOfFloors,
      floorHeight: spec.floorHeight,
      totalHeight: spec.numberOfFloors * spec.floorHeight,
    });

    if (buildingsContext) {
      // Use context if available with the selected template's spec and gltfPath
      const newId = buildingsContext.addBuilding({ lng, lat }, spec, templateName, template.gltfPath);
      console.log('[BuildingCreate] Building added via context:', newId, 'with GLTF:', template.gltfPath);
    } else {
      // Use local state with selected template's spec and gltfPath
      const newId = `map-building-${Date.now()}`;
      const newBuilding: MapBuilding = {
        id: newId,
        name: `${templateName} ${localBuildings.length + 1}`,
        coordinates: { lng, lat },
        altitude: 0,
        rotation: 0,
        scale: 1,
        spec: { ...spec },
        gltfPath: template.gltfPath,
      };
      setLocalBuildings(prev => [...prev, newBuilding]);
      setLocalPlacementMode(false);
      console.log('[BuildingCreate] Building added to local state:', newId);
      console.log('[BuildingCreate] Building details:', {
        name: newBuilding.name,
        coordinates: newBuilding.coordinates,
        totalHeight: spec.numberOfFloors * spec.floorHeight,
        gltfPath: newBuilding.gltfPath,
      });
    }

    console.log('[MapClick] ====================================');
  }, [placementMode, buildingsContext, localBuildings.length, selectedTemplateId, savedTemplates]);

  // Toggle placement mode
  const togglePlacementMode = useCallback(() => {
    console.log('[PlacementMode] ============ TOGGLE ============');
    console.log('[PlacementMode] Current state:', placementMode);

    // Reload saved templates when entering placement mode
    // Only show templates that have GLTF files
    const allTemplates = getSavedBuildings();
    const templatesWithModels = allTemplates.filter(t => t.gltfPath);
    setSavedTemplates(templatesWithModels);
    console.log('[PlacementMode] Loaded saved templates with models:', templatesWithModels.length);

    if (templatesWithModels.length === 0) {
      alert('No saved buildings available!\n\nPlease create buildings in the editor and click "Save to Map" first.');
      console.log('[PlacementMode] No templates available, staying in current mode');
      return;
    }

    if (buildingsContext) {
      console.log('[PlacementMode] Using context provider');
      buildingsContext.togglePlacementMode();
    } else {
      console.log('[PlacementMode] Using local state');
      setLocalPlacementMode(prev => !prev);
    }

    console.log('[PlacementMode] New state will be:', !placementMode);
    console.log('[PlacementMode] Ghost building should now be visible:', !placementMode);
    console.log('[PlacementMode] ===============================');
  }, [buildingsContext, placementMode]);

  useEffect(() => {
    if (!mapContainer.current) return;
    if (map.current) return; // Initialize map only once

    // Set Mapbox access token
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

    // Starting position - initial animation point
    const startCenter: [number, number] = [-76.479679, 44.232809];
    const startZoom = 13;

    // Initialize map with starting position
    // Using 2D mode (pitch: 0) to prevent WebGL conflicts with 3D building layer
    console.log('[Map] Initializing map in 2D mode...');
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: style,
      center: startCenter,
      zoom: startZoom,
      pitch: 0, // Keep 2D to prevent conflicts with 3D building overlay
      bearing: 0,
      // Configure Standard style for monochrome/gray theme
      config: {
        basemap: {
          lightPreset: "day",
          showPointOfInterestLabels: false,
          showPlaceLabels: false,
          showRoadLabels: true,
        },
      },
    });
    console.log('[Map] Map instance created in 2D mode');

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    // Add geolocate control for user's current location
    const geolocateControl = new mapboxgl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true,
      },
      trackUserLocation: true,
      showUserHeading: true,
      showUserLocation: true,
    });
    map.current.addControl(geolocateControl, "top-right");

    // Set map loaded state and start zoom animation
    map.current.on("load", () => {
      setMapLoaded(true);

      if (!map.current) return;

      const mapInstance = map.current;

      // Multiple resize calls at different times to ensure proper sizing
      // This fixes the canvas being stuck in bottom-left corner
      mapInstance.resize();
      console.log('[Map] Resize #1 - immediate');

      setTimeout(() => {
        mapInstance.resize();
        console.log('[Map] Resize #2 - after 100ms');
      }, 100);

      setTimeout(() => {
        mapInstance.resize();
        console.log('[Map] Resize #3 - after 300ms');
      }, 300);

      // TODO: Traffic simulation disabled temporarily - conflicts with buildings layer
      // Both create separate WebGLRenderers which causes context loss
      // initializeTrafficSimulation(mapInstance, initialCenter);
      console.log('[Map] Traffic simulation disabled to prevent WebGL context conflicts');

      // Fly to Queen's University after a short delay
      // Keep 2D mode (pitch: 0) for building placement compatibility
      setTimeout(() => {
        console.log('[Map] Flying to target location...');
        map.current?.flyTo({
          center: initialCenter,
          zoom: initialZoom,
          pitch: 0, // Keep 2D for building placement
          bearing: 0,
          duration: 3000, // 3 seconds animation
          essential: true,
        });

        // Resize after animation completes
        setTimeout(() => {
          if (map.current) {
            console.log('[Map] Resize after flyTo animation');
            map.current.resize();
            map.current.triggerRepaint();
          }
        }, 3100); // Slightly after animation duration
      }, 500);

      console.log(`[Map] Map loaded, setting up building placement...`);

      // Initialize 3D buildings layer
      initializeBuildingsLayer(mapInstance, (scene, ghostBuilding) => {
        sceneRef.current = scene;
        ghostBuildingRef.current = ghostBuilding;
        setSceneReady(true);
        console.log(`[Map] Buildings scene reference stored, scene ready`);
        console.log(`[Map] Ghost building reference stored`);
      });

      // Add 2D building markers layer for visual feedback
      mapInstance.addSource('placed-buildings', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });

      mapInstance.addLayer({
        id: 'placed-buildings-layer',
        type: 'circle',
        source: 'placed-buildings',
        paint: {
          'circle-radius': 15,
          'circle-color': '#3B82F6',
          'circle-stroke-width': 3,
          'circle-stroke-color': '#1D4ED8',
          'circle-opacity': 0.7,
        },
      });

      console.log(`[Map] Building placement layer added`);
    });

    // Cleanup on unmount
    return () => {
      console.log('[Map] ============ COMPONENT CLEANUP ============');

      // Clean up building meshes
      if (sceneRef.current) {
        sceneRef.current.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.geometry?.dispose();
            if (Array.isArray(object.material)) {
              object.material.forEach(m => m.dispose());
            } else {
              object.material?.dispose();
            }
          }
        });
      }

      // Clear mesh references
      Object.values(buildingMeshesRef.current).forEach((mesh) => {
        mesh.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.geometry?.dispose();
            if (Array.isArray(object.material)) {
              object.material.forEach(m => m.dispose());
            } else {
              object.material?.dispose();
            }
          }
        });
      });
      buildingMeshesRef.current = {};

      // Remove map
      if (map.current) {
        map.current.remove();
        map.current = null;
      }

      console.log('[Map] Cleanup complete');
      console.log('[Map] =======================================');
    };
  }, [initialCenter, initialZoom, style]);

  /**
   * Effect: Load saved building templates on mount
   * Only load templates that have GLTF files
   */
  useEffect(() => {
    const allTemplates = getSavedBuildings();
    const templatesWithModels = allTemplates.filter(t => t.gltfPath);
    setSavedTemplates(templatesWithModels);

    // Auto-select first template if available
    if (templatesWithModels.length > 0 && !selectedTemplateId) {
      setSelectedTemplateId(templatesWithModels[0].id);
      console.log(`[Map] Auto-selected first template: ${templatesWithModels[0].name}`);
    }

    console.log(`[Map] Loaded ${templatesWithModels.length} saved building templates with GLTF models`);
  }, [selectedTemplateId]);

  /**
   * Effect: Handle ESC key to cancel placement mode
   *
   * DEBUGGING:
   * - Check console for [ESC] logs
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && placementMode) {
        console.log(`[ESC] Canceling placement mode`);
        setPlacementMode(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [placementMode, setPlacementMode]);

  /**
   * Effect: Handle container resize with ResizeObserver
   * More reliable than window resize for flexbox containers
   */
  useEffect(() => {
    if (!mapContainer.current || !map.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === mapContainer.current && map.current) {
          const { width, height } = entry.contentRect;
          console.log('[Map] Container resized:', { width, height });
          map.current.resize();
        }
      }
    });

    resizeObserver.observe(mapContainer.current);
    console.log('[Map] ResizeObserver attached to container');

    return () => {
      resizeObserver.disconnect();
      console.log('[Map] ResizeObserver disconnected');
    };
  }, [mapLoaded]);

  /**
   * Effect: Handle click events for building placement
   *
   * KEY CONCEPTS:
   * - Registers click handler on the map
   * - Changes cursor to crosshair when in placement mode
   * - Cleans up listener on unmount or mode change
   *
   * DEBUGGING:
   * - Check console for [MapClick] logs
   * - Cursor should change to crosshair when placement mode is on
   */
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const mapInstance = map.current;

    // Update cursor based on placement mode
    if (placementMode) {
      mapInstance.getCanvas().style.cursor = 'crosshair';
      console.log(`[Cursor] Changed to crosshair (placement mode ON)`);
    } else {
      mapInstance.getCanvas().style.cursor = '';
      console.log(`[Cursor] Reset to default (placement mode OFF)`);
    }

    // Show/hide ghost building based on placement mode
    if (ghostBuildingRef.current) {
      ghostBuildingRef.current.visible = placementMode;
      console.log(`[Ghost] Visibility set to: ${placementMode}`);
      console.log('[Ghost] Current position:', {
        x: ghostBuildingRef.current.position.x,
        y: ghostBuildingRef.current.position.y,
        z: ghostBuildingRef.current.position.z,
      });
      console.log('[Ghost] Current scale:', {
        x: ghostBuildingRef.current.scale.x,
        y: ghostBuildingRef.current.scale.y,
        z: ghostBuildingRef.current.scale.z,
      });
      mapInstance.triggerRepaint();
    } else {
      console.log('[Ghost] Ghost building ref not yet available');
    }

    // Mouse move handler for ghost building
    // Updates ghost position as cursor moves over map
    const handleMouseMove = (e: mapboxgl.MapMouseEvent) => {
      if (!placementMode) return;

      if (!ghostBuildingRef.current) {
        console.log('[MouseMove] Ghost building ref not available');
        return;
      }

      if (!sceneReady) {
        console.log('[MouseMove] Scene not ready yet');
        return;
      }

      const { lng, lat } = e.lngLat;

      // Position the ghost building using Mercator projection
      const mercator = mapboxgl.MercatorCoordinate.fromLngLat([lng, lat], 0);
      const scale = mercator.meterInMercatorCoordinateUnits();

      // Update ghost building position
      ghostBuildingRef.current.position.set(mercator.x, mercator.y, mercator.z || 0);
      ghostBuildingRef.current.scale.set(scale, -scale, scale);
      ghostBuildingRef.current.visible = true;

      // Trigger repaint to show updated ghost position
      mapInstance.triggerRepaint();
    };

    // Add event handlers
    mapInstance.on('click', handleMapClick);
    mapInstance.on('mousemove', handleMouseMove);
    console.log(`[Map] Click and mousemove handlers registered`);

    return () => {
      mapInstance.off('click', handleMapClick);
      mapInstance.off('mousemove', handleMouseMove);
      console.log(`[Map] Click and mousemove handlers removed`);
    };
  }, [mapLoaded, placementMode, handleMapClick, sceneReady]);

  /**
   * Effect: Update 2D building markers when buildings change
   *
   * KEY CONCEPTS:
   * - Updates the GeoJSON source with current buildings
   * - Creates markers for visual feedback on the map
   *
   * DEBUGGING:
   * - Check console for [Buildings2D] logs
   * - Blue circles should appear where buildings are placed
   */
  useEffect(() => {
    console.log('[Buildings2D] ============ UPDATE MARKERS ============');
    console.log('[Buildings2D] Buildings count:', buildings.length);

    if (!map.current || !mapLoaded) {
      console.log('[Buildings2D] Map not ready, skipping');
      return;
    }

    const source = map.current.getSource('placed-buildings') as mapboxgl.GeoJSONSource;
    if (!source) {
      console.log('[Buildings2D] Source not ready yet');
      console.log('[Buildings2D] =======================================');
      return;
    }

    const features = buildings.map(building => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [building.coordinates.lng, building.coordinates.lat],
      },
      properties: {
        id: building.id,
        name: building.name,
      },
    }));

    source.setData({
      type: 'FeatureCollection',
      features,
    });

    console.log('[Buildings2D] Updated GeoJSON source with features:');
    buildings.forEach(b => {
      console.log(`[Buildings2D]   - ${b.id}: ${b.name} at (${b.coordinates.lng.toFixed(6)}, ${b.coordinates.lat.toFixed(6)})`);
    });
    console.log('[Buildings2D] =======================================');
  }, [buildings, mapLoaded]);

  /**
   * Effect: Render 3D building models in the Three.js scene
   *
   * KEY CONCEPTS:
   * - Loads GLTF models if available, or creates procedurally
   * - Positions them using Mercator projection
   * - Updates when buildings array changes
   *
   * DEBUGGING FLOW:
   * 1. [Buildings3D] Check preconditions (scene, map, loaded states)
   * 2. [Buildings3D] Remove old meshes for deleted buildings
   * 3. [Buildings3D] Load/create new meshes with positioning info
   * 4. [Buildings3D] Trigger repaint to render changes
   */
  useEffect(() => {
    console.log('[Buildings3D] ============ RENDER EFFECT ============');
    console.log('[Buildings3D] Preconditions:', {
      hasScene: !!sceneRef.current,
      hasMap: !!map.current,
      mapLoaded,
      sceneReady,
      buildingsCount: buildings.length,
    });

    if (!sceneRef.current || !map.current || !mapLoaded || !sceneReady) {
      console.log('[Buildings3D] Waiting for dependencies...');
      console.log('[Buildings3D] ===========================================');
      return;
    }

    const scene = sceneRef.current;
    const currentBuildingIds = new Set(buildings.map(b => b.id));
    const meshes = buildingMeshesRef.current;

    console.log('[Buildings3D] Current building IDs:', Array.from(currentBuildingIds));
    console.log('[Buildings3D] Existing mesh IDs:', Object.keys(meshes));

    // Remove meshes for buildings that no longer exist
    Object.entries(meshes).forEach(([id, mesh]) => {
      if (!currentBuildingIds.has(id)) {
        scene.remove(mesh);
        // Dispose of geometry and materials to prevent memory leaks
        mesh.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.geometry?.dispose();
            if (Array.isArray(object.material)) {
              object.material.forEach(m => m.dispose());
            } else {
              object.material?.dispose();
            }
          }
        });
        delete meshes[id];
        console.log(`[Buildings3D] Removed and disposed mesh for deleted building: ${id}`);
      }
    });

    // Add or update meshes for current buildings (async)
    const loadBuildings = async () => {
      for (const building of buildings) {
        if (!(building.id in meshes)) {
          console.log(`[Buildings3D] Creating mesh for: ${building.id}`);

          try {
            // Get GLTF path - use building.gltfPath directly, fallback to template lookup
            let gltfPath = building.gltfPath;

            // Fallback: try to find matching template if building doesn't have gltfPath
            if (!gltfPath) {
              const savedTemplates = getSavedBuildings();
              const template = savedTemplates.find(t => t.name === building.name);
              gltfPath = template?.gltfPath;
              console.log(`[Buildings3D] Building ${building.id} missing gltfPath, template lookup: ${gltfPath ? 'found' : 'not found'}`);
            }

            if (!gltfPath) {
              console.error(`[Buildings3D] Building ${building.id} has no GLTF file, skipping`);
              continue;
            }

            console.log(`[Buildings3D] Loading building ${building.id} from: ${gltfPath}`);

            // Load from GLTF (required - no procedural fallback on map)
            const mesh = await createBuildingModel(building, gltfPath);

            // Position the mesh using Mercator projection
            const mercator = mapboxgl.MercatorCoordinate.fromLngLat(
              [building.coordinates.lng, building.coordinates.lat],
              building.altitude
            );

            // Scale factor for the model (meters to Mercator units)
            const scale = mercator.meterInMercatorCoordinateUnits() * building.scale;

            console.log('[Buildings3D] Mercator projection:', {
              lng: building.coordinates.lng,
              lat: building.coordinates.lat,
              mercatorX: mercator.x,
              mercatorY: mercator.y,
              mercatorZ: mercator.z,
              meterScale: mercator.meterInMercatorCoordinateUnits(),
              finalScale: scale,
            });

            mesh.position.set(mercator.x, mercator.y, mercator.z || 0);
            mesh.scale.set(scale, -scale, scale); // Negative Y for correct orientation

            scene.add(mesh);
            meshes[building.id] = mesh;

            console.log(`[Buildings3D] Mesh added to scene:`, {
              buildingId: building.id,
              name: building.name,
              position: { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z },
              scale: { x: mesh.scale.x, y: mesh.scale.y, z: mesh.scale.z },
              buildingHeight: building.spec.numberOfFloors * building.spec.floorHeight,
              loadedFromGLTF: !!gltfPath,
            });

            // Trigger repaint after each building loads
            map.current?.triggerRepaint();
          } catch (error) {
            console.error(`[Buildings3D] Error creating mesh for ${building.id}:`, error);
          }
        } else {
          console.log(`[Buildings3D] Mesh already exists for: ${building.id}`);
        }
      }

      console.log('[Buildings3D] Scene summary:', {
        totalChildren: scene.children.length,
        buildingMeshes: Object.keys(meshes).length,
        lights: scene.children.filter(c => c instanceof THREE.Light).length,
      });

      // Final repaint
      map.current?.triggerRepaint();
      console.log('[Buildings3D] All buildings loaded, triggered final repaint');
      console.log('[Buildings3D] ===========================================');
    };

    // Start async loading
    loadBuildings();
  }, [buildings, mapLoaded, sceneReady]);

  // Force map resize/reload
  const forceMapResize = useCallback(() => {
    console.log('[Map] ============ FORCE RESIZE ============');
    if (map.current) {
      console.log('[Map] Triggering manual resize...');
      map.current.resize();
      console.log('[Map] Resize complete');

      // Also trigger repaint for 3D layers
      map.current.triggerRepaint();
      console.log('[Map] Repaint triggered');
    }
    console.log('[Map] ========================================');
  }, []);

  // Expose resize function globally for console access
  useEffect(() => {
    (window as any).resizeMap = forceMapResize;
    console.log('[Map] Exposed window.resizeMap() for manual resize');

    return () => {
      delete (window as any).resizeMap;
    };
  }, [forceMapResize]);

  // Toggle satellite view
  const toggleSatellite = () => {
    if (map.current) {
      const newStyle = isSatellite
        ? "mapbox://styles/mapbox/standard"
        : "mapbox://styles/mapbox/satellite-streets-v12";

      // When style loads, re-add our custom layers
      map.current.once('style.load', () => {
        if (!map.current) return;

        // Re-add car routes layer
        if (!map.current.getSource('car-routes')) {
          map.current.addSource('car-routes', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: [],
            },
          });
        }

        if (!map.current.getLayer('car-routes-layer')) {
          map.current.addLayer({
            id: 'car-routes-layer',
            type: 'line',
            source: 'car-routes',
            paint: {
              'line-color': '#888',
              'line-width': 3,
              'line-opacity': 0.5,
            },
          });
        }

        // Re-add cars layer
        if (!map.current.getSource('cars')) {
          map.current.addSource('cars', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: [],
            },
          });
        }

        if (!map.current.getLayer('cars-2d-layer')) {
          map.current.addLayer({
            id: 'cars-2d-layer',
            type: 'circle',
            source: 'cars',
            paint: {
              'circle-radius': 8,
              'circle-color': ['get', 'color'],
              'circle-stroke-width': 2,
              'circle-stroke-color': '#fff',
            },
          });
        }

        // Re-add traffic lights layer
        if (!map.current.getSource('traffic-lights')) {
          map.current.addSource('traffic-lights', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: [],
            },
          });
        }

        if (!map.current.getLayer('traffic-lights-layer')) {
          map.current.addLayer({
            id: 'traffic-lights-layer',
            type: 'circle',
            source: 'traffic-lights',
            paint: {
              'circle-radius': 10,
              'circle-color': [
                'match',
                ['get', 'state'],
                'red', '#ff0000',
                'yellow', '#ffff00',
                'green', '#00ff00',
                '#888888'
              ],
              'circle-stroke-width': 3,
              'circle-stroke-color': '#000',
            },
          });
        }
      });

      map.current.setStyle(newStyle);
      setIsSatellite(!isSatellite);
    }
  };

  return (
    <div className="w-full h-full min-h-0">
      <div
        ref={mapContainer}
        className={className}
        style={{ width: '100%', height: '100%', minHeight: '100%' }}
      />
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900">
          <p className="text-gray-600 dark:text-gray-400">Loading map...</p>
        </div>
      )}
      {/* Control buttons */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
        {/* Map resize button */}
        <button
          onClick={forceMapResize}
          className="bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-medium text-sm"
          title="Fix map display issues"
        >
          🔄 Resize Map
        </button>

        {/* Satellite toggle button */}
        <button
          onClick={toggleSatellite}
          className="bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-medium text-sm"
        >
          {isSatellite ? "Standard" : "Satellite"}
        </button>

        {/* Building placement toggle */}
        <button
          onClick={togglePlacementMode}
          className={`px-4 py-2 rounded-lg shadow-lg transition-colors font-medium text-sm ${
            placementMode
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
          }`}
        >
          {placementMode ? "Click to Place..." : "Place Building"}
        </button>

        {/* Template selector (shown when in placement mode or has saved templates) */}
        {(placementMode || savedTemplates.length > 0) && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
            <button
              onClick={() => setShowTemplateSelector(!showTemplateSelector)}
              className="w-full px-4 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                {selectedTemplateId ? (
                  <>
                    <span className="text-green-500">✓</span>
                    {savedTemplates.find(t => t.id === selectedTemplateId)?.name || 'Select Building'}
                  </>
                ) : (
                  <>
                    <span className="text-yellow-500">⚠</span>
                    Select a Building
                  </>
                )}
              </span>
              <span className="text-gray-400">{showTemplateSelector ? '▲' : '▼'}</span>
            </button>

            {showTemplateSelector && (
              <div className="border-t border-gray-200 dark:border-gray-700 max-h-48 overflow-y-auto">
                {/* Saved templates */}
                {savedTemplates.map(template => (
                  <button
                    key={template.id}
                    onClick={() => {
                      setSelectedTemplateId(template.id);
                      setShowTemplateSelector(false);
                      console.log(`[TemplateSelector] Selected: ${template.name}`);
                    }}
                    className={`w-full px-4 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      selectedTemplateId === template.id ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{template.name}</div>
                        <div className="text-xs text-gray-500">
                          {template.spec.numberOfFloors} floors, {template.spec.width}x{template.spec.depth}m
                        </div>
                      </div>
                      {template.gltfPath && (
                        <span className="text-xs text-green-600 dark:text-green-400 ml-2">📦 Model</span>
                      )}
                    </div>
                  </button>
                ))}

                {savedTemplates.length === 0 && (
                  <div className="px-4 py-3 text-sm text-gray-500 text-center">
                    <p className="font-medium text-yellow-600 dark:text-yellow-400 mb-2">⚠️ No Buildings Available</p>
                    <p className="text-xs mb-2">To place buildings on the map:</p>
                    <ol className="text-xs text-left space-y-1 max-w-xs mx-auto">
                      <li>1. Go to the <span className="font-medium">3D Building Editor</span></li>
                      <li>2. Create your building design</li>
                      <li>3. Click <span className="font-medium text-orange-600">"Save to Map"</span></li>
                      <li>4. Come back here to place it!</li>
                    </ol>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Building count indicator */}
        {buildings.length > 0 && (
          <div className="bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-lg text-sm">
            <span className="font-medium">{buildings.length}</span>
            <span className="text-gray-600 dark:text-gray-400 ml-1">
              building{buildings.length !== 1 ? 's' : ''} placed
            </span>
          </div>
        )}
      </div>

      {/* Placement mode instructions */}
      {placementMode && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg z-10">
          <p className="text-sm font-medium">Click anywhere on the map to place a building</p>
          <p className="text-xs opacity-80 mt-1">Press ESC or click the button again to cancel</p>
        </div>
      )}
    </div>
  );
}
