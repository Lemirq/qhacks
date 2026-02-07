# Urban Planning App - Implementation Plan

## Project Overview

An urban planning application for the City of Kingston that allows users to:
1. Create custom 3D building models from blueprints or manual specifications
2. Place buildings on a Mapbox map
3. Simulate construction timeline with environmental impact analysis
4. Visualize traffic impact during construction
5. Track CO2 emissions, noise, pollution, and traffic bottlenecks

**Target**: City of Kingston $10,000 prize track

---

## Tech Stack

- **Frontend**: Next.js (App Router)
- **3D Rendering**: Three.js, @react-three/fiber, @react-three/drei
- **Mapping**: Mapbox GL JS
- **State Management**: Zustand
- **Form Handling**: React Hook Form
- **Styling**: Tailwind CSS
- **3D Export**: GLTFExporter, GeoJSON

---

## Project Structure

```
qhacks/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── builder/
│   │   └── page.tsx                # Building creation interface
│   └── map/
│       └── page.tsx                # Map view with 3D buildings
├── components/
│   ├── builder/
│   │   ├── BlueprintUpload.tsx     # Blueprint image upload & tracing
│   │   ├── ManualSpecForm.tsx      # Form-based building input
│   │   ├── BuildingPreview.tsx     # 3D preview component
│   │   └── MaterialSelector.tsx    # Texture/material picker
│   ├── viewer/
│   │   ├── BuildingViewer.tsx      # Main 3D viewer with controls
│   │   ├── Building.tsx            # Three.js building mesh component
│   │   └── Controls.tsx            # Camera and interaction controls
│   ├── map/
│   │   ├── LocationPicker.tsx      # Mapbox location selection
│   │   └── MapboxViewer.tsx        # Main map component
│   └── common/
│       ├── Button.tsx
│       ├── Input.tsx
│       └── Card.tsx
├── lib/
│   ├── three/
│   │   ├── buildingGenerator.ts    # Core 3D building generation
│   │   ├── textureLoader.ts        # Texture management
│   │   ├── materials.ts            # Material presets
│   │   └── geometryUtils.ts        # Helper functions for geometry
│   ├── blueprint/
│   │   ├── imageProcessor.ts       # Blueprint image processing
│   │   ├── traceExtractor.ts       # Extract building data from traces
│   │   └── dimensionCalculator.ts  # Calculate real-world dimensions
│   ├── export/
│   │   ├── geoJsonExporter.ts      # Export to GeoJSON format
│   │   ├── glbExporter.ts          # Export to GLB format
│   │   └── coordinateConverter.ts  # Geographic coordinate conversion
│   ├── mapbox/
│   │   ├── customLayer.ts          # Mapbox custom Three.js layer
│   │   └── mercatorUtils.ts        # Mercator projection utilities
│   └── types/
│       └── building.ts             # TypeScript interfaces
├── public/
│   └── textures/
│       ├── walls/
│       │   ├── brick_red.png
│       │   ├── brick_brown.png
│       │   ├── concrete_smooth.png
│       │   ├── concrete_rough.png
│       │   ├── glass_clear.png
│       │   └── glass_tinted.png
│       ├── roofs/
│       │   ├── shingles.png
│       │   ├── metal.png
│       │   └── tiles.png
│       └── ground/
│           └── asphalt.png
└── store/
    └── buildingStore.ts            # Zustand state management
```

---

## Phase 1: 3D Building Generator (CURRENT FOCUS)

### Task 1.1: Project Setup & Architecture

**Priority**: 🔴 CRITICAL - Do this first

**Instructions for AI Agent:**

```bash
# Install required dependencies
npm install three @react-three/fiber @react-three/drei
npm install zustand
npm install react-hook-form
npm install mapbox-gl
npm install sharp
npm install @types/three --save-dev
```

**Create base TypeScript interfaces:**

File: `lib/types/building.ts`
```typescript
export interface Point2D {
  x: number;
  y: number;
}

export interface BuildingFootprint {
  points: Point2D[];  // Polygon vertices
}

export interface WindowSpec {
  floor: number;
  position: Point2D;
  width: number;
  height: number;
}

export interface DoorSpec {
  floor: number;
  position: Point2D;
  width: number;
  height: number;
}

export interface MaterialSpec {
  walls: string;      // Texture path
  roof: string;
  windows: string;
  roughness?: number;
  metalness?: number;
}

export interface BuildingSpec {
  id: string;
  name: string;
  footprint: BuildingFootprint;
  floors: number;
  floorHeight: number;  // in meters
  windows: WindowSpec[];
  doors: DoorSpec[];
  materials: MaterialSpec;
  roofType: 'flat' | 'gabled' | 'hipped';
  location?: {
    lat: number;
    lng: number;
  };
}

export interface BuildingDimensions {
  length: number;   // meters
  width: number;    // meters
  height: number;   // meters
  volume: number;   // cubic meters
}
```

**Create Zustand store:**

File: `store/buildingStore.ts`
```typescript
import { create } from 'zustand';
import { BuildingSpec } from '@/lib/types/building';

interface BuildingStore {
  currentBuilding: BuildingSpec | null;
  buildings: BuildingSpec[];

  setCurrentBuilding: (building: BuildingSpec) => void;
  addBuilding: (building: BuildingSpec) => void;
  updateBuilding: (id: string, updates: Partial<BuildingSpec>) => void;
  removeBuilding: (id: string) => void;
}

export const useBuildingStore = create<BuildingStore>((set) => ({
  currentBuilding: null,
  buildings: [],

  setCurrentBuilding: (building) => set({ currentBuilding: building }),

  addBuilding: (building) =>
    set((state) => ({ buildings: [...state.buildings, building] })),

  updateBuilding: (id, updates) =>
    set((state) => ({
      buildings: state.buildings.map((b) =>
        b.id === id ? { ...b, ...updates } : b
      ),
      currentBuilding:
        state.currentBuilding?.id === id
          ? { ...state.currentBuilding, ...updates }
          : state.currentBuilding,
    })),

  removeBuilding: (id) =>
    set((state) => ({
      buildings: state.buildings.filter((b) => b.id !== id),
      currentBuilding:
        state.currentBuilding?.id === id ? null : state.currentBuilding,
    })),
}));
```

---

### Task 1.2: Blueprint Upload & Processing

**Priority**: 🟡 HIGH

**Instructions for AI Agent:**

Create a component that allows users to upload a blueprint image and trace building parameters.

File: `components/builder/BlueprintUpload.tsx`
```typescript
'use client';

import { useRef, useState, useEffect } from 'react';
import { Point2D } from '@/lib/types/building';

interface BlueprintUploadProps {
  onExtract: (data: {
    footprint: Point2D[];
    floors: number;
    floorHeight: number;
  }) => void;
}

export function BlueprintUpload({ onExtract }: BlueprintUploadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [points, setPoints] = useState<Point2D[]>([]);
  const [scale, setScale] = useState(1); // pixels per meter
  const [floors, setFloors] = useState(1);
  const [floorHeight, setFloorHeight] = useState(3); // default 3 meters

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    img.onload = () => {
      setImage(img);
      drawImage(img);
    };
    img.src = URL.createObjectURL(file);
  };

  const drawImage = (img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newPoints = [...points, { x, y }];
    setPoints(newPoints);

    // Draw point
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, 2 * Math.PI);
    ctx.fill();

    // Draw line to previous point
    if (points.length > 0) {
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(points[points.length - 1].x, points[points.length - 1].y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const handleComplete = () => {
    // Convert pixel coordinates to meters
    const footprint = points.map(p => ({
      x: p.x / scale,
      y: p.y / scale,
    }));

    onExtract({
      footprint,
      floors,
      floorHeight,
    });
  };

  const handleReset = () => {
    setPoints([]);
    if (image) drawImage(image);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">
          Upload Blueprint
        </label>
        <input
          type="file"
          accept="image/*,.pdf"
          onChange={handleImageUpload}
          className="block w-full text-sm"
        />
      </div>

      {image && (
        <>
          <div className="border rounded-lg overflow-hidden">
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              className="cursor-crosshair max-w-full"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Scale (pixels per meter)
              </label>
              <input
                type="number"
                value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Number of Floors
              </label>
              <input
                type="number"
                min="1"
                value={floors}
                onChange={(e) => setFloors(Number(e.target.value))}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Floor Height (m)
              </label>
              <input
                type="number"
                step="0.1"
                value={floorHeight}
                onChange={(e) => setFloorHeight(Number(e.target.value))}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleComplete}
              disabled={points.length < 3}
              className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
            >
              Generate Building ({points.length} points)
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 border rounded"
            >
              Reset
            </button>
          </div>

          <p className="text-sm text-gray-600">
            Click on the blueprint to trace the building outline. At least 3 points required.
          </p>
        </>
      )}
    </div>
  );
}
```

---

### Task 1.3: Manual Building Specification Form

**Priority**: 🟡 HIGH

**Instructions for AI Agent:**

Create a form-based alternative for users who want to specify buildings manually.

File: `components/builder/ManualSpecForm.tsx`
```typescript
'use client';

import { useForm } from 'react-hook-form';
import { BuildingSpec } from '@/lib/types/building';

interface FormData {
  name: string;
  shape: 'rectangular' | 'l-shape' | 'custom';
  length: number;
  width: number;
  floors: number;
  floorHeight: number;
  roofType: 'flat' | 'gabled' | 'hipped';
  windowsPerFloor: number;
  wallMaterial: string;
  roofMaterial: string;
}

interface ManualSpecFormProps {
  onSubmit: (spec: BuildingSpec) => void;
}

export function ManualSpecForm({ onSubmit }: ManualSpecFormProps) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      name: 'New Building',
      shape: 'rectangular',
      length: 20,
      width: 15,
      floors: 3,
      floorHeight: 3,
      roofType: 'flat',
      windowsPerFloor: 4,
      wallMaterial: 'brick_red',
      roofMaterial: 'shingles',
    },
  });

  const shape = watch('shape');

  const onFormSubmit = (data: FormData) => {
    // Generate footprint based on shape
    let footprint;

    if (data.shape === 'rectangular') {
      footprint = {
        points: [
          { x: 0, y: 0 },
          { x: data.length, y: 0 },
          { x: data.length, y: data.width },
          { x: 0, y: data.width },
        ],
      };
    } else if (data.shape === 'l-shape') {
      // L-shape: 60% length, 60% width for main part
      const mainLength = data.length * 0.6;
      const mainWidth = data.width * 0.6;

      footprint = {
        points: [
          { x: 0, y: 0 },
          { x: data.length, y: 0 },
          { x: data.length, y: mainWidth },
          { x: mainLength, y: mainWidth },
          { x: mainLength, y: data.width },
          { x: 0, y: data.width },
        ],
      };
    } else {
      // Default to rectangular for custom (user can edit later)
      footprint = {
        points: [
          { x: 0, y: 0 },
          { x: data.length, y: 0 },
          { x: data.length, y: data.width },
          { x: 0, y: data.width },
        ],
      };
    }

    // Generate windows
    const windows = [];
    for (let floor = 0; floor < data.floors; floor++) {
      for (let i = 0; i < data.windowsPerFloor; i++) {
        windows.push({
          floor,
          position: {
            x: (data.length / (data.windowsPerFloor + 1)) * (i + 1),
            y: 0, // Front wall
          },
          width: 1.2,
          height: 1.5,
        });
      }
    }

    const buildingSpec: BuildingSpec = {
      id: `building-${Date.now()}`,
      name: data.name,
      footprint,
      floors: data.floors,
      floorHeight: data.floorHeight,
      windows,
      doors: [
        {
          floor: 0,
          position: { x: data.length / 2, y: 0 },
          width: 1.2,
          height: 2.1,
        },
      ],
      materials: {
        walls: data.wallMaterial,
        roof: data.roofMaterial,
        windows: 'glass_clear',
      },
      roofType: data.roofType,
    };

    onSubmit(buildingSpec);
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2">Building Name</label>
        <input
          {...register('name', { required: true })}
          className="w-full border rounded px-3 py-2"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Building Shape</label>
          <select
            {...register('shape')}
            className="w-full border rounded px-3 py-2"
          >
            <option value="rectangular">Rectangular</option>
            <option value="l-shape">L-Shape</option>
            <option value="custom">Custom Polygon</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Roof Type</label>
          <select
            {...register('roofType')}
            className="w-full border rounded px-3 py-2"
          >
            <option value="flat">Flat</option>
            <option value="gabled">Gabled</option>
            <option value="hipped">Hipped</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Length (m)</label>
          <input
            type="number"
            step="0.1"
            {...register('length', { required: true, min: 1 })}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Width (m)</label>
          <input
            type="number"
            step="0.1"
            {...register('width', { required: true, min: 1 })}
            className="w-full border rounded px-3 py-2"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Number of Floors</label>
          <input
            type="number"
            {...register('floors', { required: true, min: 1 })}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Floor Height (m)</label>
          <input
            type="number"
            step="0.1"
            {...register('floorHeight', { required: true, min: 2 })}
            className="w-full border rounded px-3 py-2"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Windows Per Floor</label>
        <input
          type="number"
          {...register('windowsPerFloor', { required: true, min: 0 })}
          className="w-full border rounded px-3 py-2"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Wall Material</label>
          <select
            {...register('wallMaterial')}
            className="w-full border rounded px-3 py-2"
          >
            <option value="brick_red">Red Brick</option>
            <option value="brick_brown">Brown Brick</option>
            <option value="concrete_smooth">Smooth Concrete</option>
            <option value="concrete_rough">Rough Concrete</option>
            <option value="glass_tinted">Tinted Glass</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Roof Material</label>
          <select
            {...register('roofMaterial')}
            className="w-full border rounded px-3 py-2"
          >
            <option value="shingles">Shingles</option>
            <option value="metal">Metal</option>
            <option value="tiles">Tiles</option>
          </select>
        </div>
      </div>

      <button
        type="submit"
        className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
      >
        Generate 3D Model
      </button>
    </form>
  );
}
```

---

### Task 1.4: 3D Model Generator with Three.js

**Priority**: 🔴 CRITICAL

**Instructions for AI Agent:**

Create the core building generation logic using Three.js.

File: `lib/three/buildingGenerator.ts`
```typescript
import * as THREE from 'three';
import { BuildingSpec } from '@/lib/types/building';
import { loadTexture } from './textureLoader';

export function generateBuilding(spec: BuildingSpec): THREE.Group {
  const buildingGroup = new THREE.Group();
  buildingGroup.name = spec.name;

  // 1. Generate walls
  const wallsGroup = generateWalls(spec);
  buildingGroup.add(wallsGroup);

  // 2. Generate floors
  const floorsGroup = generateFloors(spec);
  buildingGroup.add(floorsGroup);

  // 3. Generate roof
  const roof = generateRoof(spec);
  buildingGroup.add(roof);

  // 4. Generate windows
  const windowsGroup = generateWindows(spec);
  buildingGroup.add(windowsGroup);

  // 5. Generate doors
  const doorsGroup = generateDoors(spec);
  buildingGroup.add(doorsGroup);

  return buildingGroup;
}

function generateWalls(spec: BuildingSpec): THREE.Group {
  const wallsGroup = new THREE.Group();
  const buildingHeight = spec.floors * spec.floorHeight;

  // Create shape from footprint
  const shape = new THREE.Shape();
  spec.footprint.points.forEach((point, index) => {
    if (index === 0) {
      shape.moveTo(point.x, point.y);
    } else {
      shape.lineTo(point.x, point.y);
    }
  });
  shape.closePath();

  // Extrude settings
  const extrudeSettings = {
    depth: buildingHeight,
    bevelEnabled: false,
  };

  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

  // Rotate to stand upright (extrude goes in Z, we want Y)
  geometry.rotateX(Math.PI / 2);

  // Load texture
  const wallTexture = loadTexture(`/textures/walls/${spec.materials.walls}.png`);
  const material = new THREE.MeshStandardMaterial({
    map: wallTexture,
    roughness: spec.materials.roughness || 0.8,
    metalness: spec.materials.metalness || 0.1,
  });

  const wallMesh = new THREE.Mesh(geometry, material);
  wallsGroup.add(wallMesh);

  return wallsGroup;
}

function generateFloors(spec: BuildingSpec): THREE.Group {
  const floorsGroup = new THREE.Group();

  // Create floor shape
  const shape = new THREE.Shape();
  spec.footprint.points.forEach((point, index) => {
    if (index === 0) {
      shape.moveTo(point.x, point.y);
    } else {
      shape.lineTo(point.x, point.y);
    }
  });
  shape.closePath();

  const floorGeometry = new THREE.ShapeGeometry(shape);
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x808080,
    roughness: 0.9,
  });

  // Create floor for each level
  for (let i = 0; i <= spec.floors; i++) {
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = i * spec.floorHeight;
    floorsGroup.add(floor);
  }

  return floorsGroup;
}

function generateRoof(spec: BuildingSpec): THREE.Mesh {
  const roofHeight = spec.floors * spec.floorHeight;

  // Create roof shape (same as floor for flat roof)
  const shape = new THREE.Shape();
  spec.footprint.points.forEach((point, index) => {
    if (index === 0) {
      shape.moveTo(point.x, point.y);
    } else {
      shape.lineTo(point.x, point.y);
    }
  });
  shape.closePath();

  let roofGeometry: THREE.BufferGeometry;

  if (spec.roofType === 'flat') {
    roofGeometry = new THREE.ShapeGeometry(shape);
  } else if (spec.roofType === 'gabled') {
    // Simple gabled roof (pyramid for now)
    // Calculate center point
    const center = calculateCenter(spec.footprint.points);
    const roofPeakHeight = 2; // meters above top floor

    roofGeometry = new THREE.ConeGeometry(5, roofPeakHeight, 4);
  } else {
    // Hipped - similar to gabled for now
    roofGeometry = new THREE.ShapeGeometry(shape);
  }

  const roofTexture = loadTexture(`/textures/roofs/${spec.materials.roof}.png`);
  const roofMaterial = new THREE.MeshStandardMaterial({
    map: roofTexture,
    roughness: 0.7,
  });

  const roofMesh = new THREE.Mesh(roofGeometry, roofMaterial);
  roofMesh.rotation.x = -Math.PI / 2;
  roofMesh.position.y = roofHeight;

  return roofMesh;
}

function generateWindows(spec: BuildingSpec): THREE.Group {
  const windowsGroup = new THREE.Group();

  const windowGeometry = new THREE.BoxGeometry(1, 1.5, 0.1);
  const windowMaterial = new THREE.MeshStandardMaterial({
    color: 0x87CEEB,
    transparent: true,
    opacity: 0.5,
    metalness: 0.9,
    roughness: 0.1,
  });

  spec.windows.forEach((windowSpec) => {
    const windowMesh = new THREE.Mesh(windowGeometry, windowMaterial);

    // Position window
    windowMesh.position.set(
      windowSpec.position.x,
      windowSpec.floor * spec.floorHeight + spec.floorHeight / 2,
      windowSpec.position.y
    );

    windowsGroup.add(windowMesh);
  });

  return windowsGroup;
}

function generateDoors(spec: BuildingSpec): THREE.Group {
  const doorsGroup = new THREE.Group();

  const doorGeometry = new THREE.BoxGeometry(1.2, 2.1, 0.1);
  const doorMaterial = new THREE.MeshStandardMaterial({
    color: 0x654321,
    roughness: 0.8,
  });

  spec.doors.forEach((doorSpec) => {
    const doorMesh = new THREE.Mesh(doorGeometry, doorMaterial);

    doorMesh.position.set(
      doorSpec.position.x,
      doorSpec.height / 2,
      doorSpec.position.y
    );

    doorsGroup.add(doorMesh);
  });

  return doorsGroup;
}

function calculateCenter(points: { x: number; y: number }[]): { x: number; y: number } {
  const sum = points.reduce(
    (acc, point) => ({
      x: acc.x + point.x,
      y: acc.y + point.y,
    }),
    { x: 0, y: 0 }
  );

  return {
    x: sum.x / points.length,
    y: sum.y / points.length,
  };
}
```

File: `lib/three/textureLoader.ts`
```typescript
import * as THREE from 'three';

const textureCache = new Map<string, THREE.Texture>();
const loader = new THREE.TextureLoader();

export function loadTexture(path: string): THREE.Texture {
  if (textureCache.has(path)) {
    return textureCache.get(path)!;
  }

  const texture = loader.load(path);

  // Configure texture wrapping and repeat
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);

  textureCache.set(path, texture);
  return texture;
}

export function clearTextureCache() {
  textureCache.forEach(texture => texture.dispose());
  textureCache.clear();
}
```

---

### Task 1.5: Interactive 3D Viewer Component

**Priority**: 🔴 CRITICAL

**Instructions for AI Agent:**

Create the React component that renders the 3D building using @react-three/fiber.

File: `components/viewer/BuildingViewer.tsx`
```typescript
'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, GizmoHelper, GizmoViewport, Sky } from '@react-three/drei';
import { Building } from './Building';
import { BuildingSpec } from '@/lib/types/building';

interface BuildingViewerProps {
  buildingSpec: BuildingSpec | null;
}

export function BuildingViewer({ buildingSpec }: BuildingViewerProps) {
  if (!buildingSpec) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <p className="text-gray-500">Create or upload a building to preview</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [40, 40, 40], fov: 50 }}
        shadows
      >
        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[10, 20, 10]}
          intensity={1}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <hemisphereLight args={[0x87CEEB, 0x545454, 0.6]} />

        {/* Sky */}
        <Sky sunPosition={[100, 20, 100]} />

        {/* Building */}
        <Building spec={buildingSpec} />

        {/* Ground Grid */}
        <Grid
          args={[100, 100]}
          cellSize={5}
          cellThickness={0.5}
          cellColor="#6b7280"
          sectionSize={10}
          sectionThickness={1}
          sectionColor="#374151"
          fadeDistance={100}
          fadeStrength={1}
          followCamera={false}
        />

        {/* Controls */}
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={10}
          maxDistance={200}
          maxPolarAngle={Math.PI / 2}
        />

        {/* Gizmo Helper */}
        <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
          <GizmoViewport
            axisColors={['red', 'green', 'blue']}
            labelColor="black"
          />
        </GizmoHelper>
      </Canvas>
    </div>
  );
}
```

File: `components/viewer/Building.tsx`
```typescript
'use client';

import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BuildingSpec } from '@/lib/types/building';
import { generateBuilding } from '@/lib/three/buildingGenerator';

interface BuildingProps {
  spec: BuildingSpec;
}

export function Building({ spec }: BuildingProps) {
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!groupRef.current) return;

    // Clear previous building
    while (groupRef.current.children.length > 0) {
      const child = groupRef.current.children[0];
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
      groupRef.current.remove(child);
    }

    // Generate new building
    const building = generateBuilding(spec);
    groupRef.current.add(building);

  }, [spec]);

  return <group ref={groupRef} />;
}
```

---

### Task 1.6: Texture Management System

**Priority**: 🟡 MEDIUM

**Instructions for AI Agent:**

Create placeholder textures and a material library.

**Create placeholder texture images** in `public/textures/`:

You can use online texture generators or download from:
- https://www.poliigon.com (free tier)
- https://polyhaven.com/textures
- https://www.textures.com

Required textures:
- `walls/brick_red.png` (512x512 or 1024x1024)
- `walls/brick_brown.png`
- `walls/concrete_smooth.png`
- `walls/concrete_rough.png`
- `walls/glass_clear.png`
- `walls/glass_tinted.png`
- `roofs/shingles.png`
- `roofs/metal.png`
- `roofs/tiles.png`

File: `lib/three/materials.ts`
```typescript
import * as THREE from 'three';
import { loadTexture } from './textureLoader';

export interface MaterialPreset {
  name: string;
  texture: string;
  roughness: number;
  metalness: number;
  normalMap?: string;
  color?: number;
}

export const WALL_MATERIALS: MaterialPreset[] = [
  {
    name: 'Red Brick',
    texture: '/textures/walls/brick_red.png',
    roughness: 0.9,
    metalness: 0,
  },
  {
    name: 'Brown Brick',
    texture: '/textures/walls/brick_brown.png',
    roughness: 0.9,
    metalness: 0,
  },
  {
    name: 'Smooth Concrete',
    texture: '/textures/walls/concrete_smooth.png',
    roughness: 0.7,
    metalness: 0,
  },
  {
    name: 'Rough Concrete',
    texture: '/textures/walls/concrete_rough.png',
    roughness: 0.95,
    metalness: 0,
  },
  {
    name: 'Clear Glass',
    texture: '/textures/walls/glass_clear.png',
    roughness: 0.1,
    metalness: 0.9,
  },
];

export const ROOF_MATERIALS: MaterialPreset[] = [
  {
    name: 'Shingles',
    texture: '/textures/roofs/shingles.png',
    roughness: 0.8,
    metalness: 0,
  },
  {
    name: 'Metal',
    texture: '/textures/roofs/metal.png',
    roughness: 0.3,
    metalness: 0.9,
  },
  {
    name: 'Tiles',
    texture: '/textures/roofs/tiles.png',
    roughness: 0.6,
    metalness: 0,
  },
];

export function createMaterial(preset: MaterialPreset): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    map: loadTexture(preset.texture),
    roughness: preset.roughness,
    metalness: preset.metalness,
  });

  if (preset.color) {
    material.color = new THREE.Color(preset.color);
  }

  return material;
}
```

---

## Phase 2: Export to Mapbox Format

### Task 2.1: GeoJSON Exporter

**Priority**: 🟢 MEDIUM

**Instructions for AI Agent:**

Create export functionality for simple building extrusions.

File: `lib/export/geoJsonExporter.ts`
```typescript
import { BuildingSpec } from '@/lib/types/building';

export interface GeoJSONExportOptions {
  coordinates: {
    lat: number;
    lng: number;
  };
}

export function exportToGeoJSON(
  buildingSpec: BuildingSpec,
  options: GeoJSONExportOptions
) {
  const { lat, lng } = options.coordinates;

  // Convert building footprint to geographic coordinates
  const coordinates = buildingSpec.footprint.points.map(point => {
    // Convert meters to degrees (approximate)
    // 1 degree latitude ≈ 111,320 meters
    // 1 degree longitude ≈ 111,320 * cos(latitude) meters
    const latOffset = point.y / 110540;
    const lngOffset = point.x / (111320 * Math.cos(lat * Math.PI / 180));

    return [lng + lngOffset, lat + latOffset];
  });

  // Close the polygon
  coordinates.push(coordinates[0]);

  const buildingHeight = buildingSpec.floors * buildingSpec.floorHeight;

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          id: buildingSpec.id,
          name: buildingSpec.name,
          height: buildingHeight,
          base_height: 0,
          color: '#ff6b6b',
          building_type: 'custom',
          floors: buildingSpec.floors,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [coordinates],
        },
      },
    ],
  };
}

export function downloadGeoJSON(data: any, filename: string = 'building.geojson') {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
```

---

### Task 2.2: GLB Exporter for Complex Models

**Priority**: 🟢 MEDIUM

**Instructions for AI Agent:**

Export full 3D models with textures as GLB files.

File: `lib/export/glbExporter.ts`
```typescript
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

export async function exportToGLB(scene: THREE.Object3D): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const exporter = new GLTFExporter();

    const options = {
      binary: true,
      maxTextureSize: 4096,
      embedImages: true,
    };

    exporter.parse(
      scene,
      (result) => {
        if (result instanceof ArrayBuffer) {
          const blob = new Blob([result], { type: 'application/octet-stream' });
          resolve(blob);
        } else {
          reject(new Error('Expected ArrayBuffer from GLTFExporter'));
        }
      },
      (error) => {
        reject(error);
      },
      options
    );
  });
}

export function downloadGLB(blob: Blob, filename: string = 'building.glb') {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function exportBuildingToGLB(
  buildingGroup: THREE.Group,
  filename?: string
): Promise<void> {
  try {
    const blob = await exportToGLB(buildingGroup);
    downloadGLB(blob, filename);
  } catch (error) {
    console.error('Error exporting to GLB:', error);
    throw error;
  }
}
```

---

### Task 2.3: Location Picker Component

**Priority**: 🟢 MEDIUM

**Instructions for AI Agent:**

Create a Mapbox-based location picker focused on Kingston.

File: `components/map/LocationPicker.tsx`
```typescript
'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

interface LocationPickerProps {
  onLocationSelect: (location: { lat: number; lng: number }) => void;
  initialLocation?: { lat: number; lng: number };
}

// Kingston, Ontario coordinates
const KINGSTON_CENTER = {
  lng: -76.4813,
  lat: 44.2312,
};

export function LocationPicker({ onLocationSelect, initialLocation }: LocationPickerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [selectedLocation, setSelectedLocation] = useState(initialLocation);

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [KINGSTON_CENTER.lng, KINGSTON_CENTER.lat],
      zoom: 13,
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Click handler
    map.current.on('click', (e) => {
      const { lng, lat } = e.lngLat;

      // Remove previous marker
      if (marker.current) {
        marker.current.remove();
      }

      // Add new marker
      marker.current = new mapboxgl.Marker({ color: '#ff0000' })
        .setLngLat([lng, lat])
        .addTo(map.current!);

      setSelectedLocation({ lat, lng });
      onLocationSelect({ lat, lng });
    });

    return () => {
      map.current?.remove();
    };
  }, []);

  return (
    <div className="space-y-2">
      <div
        ref={mapContainer}
        className="w-full h-96 rounded-lg overflow-hidden border"
      />
      {selectedLocation && (
        <div className="text-sm text-gray-600">
          Selected: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
        </div>
      )}
      <p className="text-sm text-gray-500">
        Click on the map to select building location
      </p>
    </div>
  );
}
```

---

## Phase 3: Mapbox Integration (FUTURE)

### Task 3.1: Custom Three.js Layer in Mapbox

**Priority**: ⚪ LOW (Future implementation)

**Instructions for AI Agent:**

This is how you'll integrate the GLB models into Mapbox when ready.

File: `lib/mapbox/customLayer.ts`
```typescript
import * as THREE from 'three';
import mapboxgl from 'mapbox-gl';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface CustomBuildingLayerOptions {
  id: string;
  modelUrl: string;
  coordinates: [number, number]; // [lng, lat]
  scale?: number;
  rotation?: number;
}

export function createCustomBuildingLayer(
  options: CustomBuildingLayerOptions
): mapboxgl.CustomLayerInterface {
  const modelOrigin = options.coordinates;
  const modelAltitude = 0;
  const modelRotate = [Math.PI / 2, 0, options.rotation || 0];
  const modelScale = options.scale || 1;

  let camera: THREE.Camera;
  let scene: THREE.Scene;
  let renderer: THREE.WebGLRenderer;
  let model: THREE.Group;

  return {
    id: options.id,
    type: 'custom',
    renderingMode: '3d',

    onAdd: function (map: mapboxgl.Map, gl: WebGLRenderingContext) {
      // Setup Three.js camera
      camera = new THREE.Camera();
      scene = new THREE.Scene();

      // Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(100, 100, 100);
      scene.add(directionalLight);

      // Load GLB model
      const loader = new GLTFLoader();
      loader.load(options.modelUrl, (gltf) => {
        model = gltf.scene;
        scene.add(model);
      });

      // Setup renderer using Mapbox's WebGL context
      renderer = new THREE.WebGLRenderer({
        canvas: map.getCanvas(),
        context: gl,
        antialias: true,
      });

      renderer.autoClear = false;
    },

    render: function (gl: WebGLRenderingContext, matrix: number[]) {
      // Get Mapbox's mercator coordinates
      const mercatorCoordinate = mapboxgl.MercatorCoordinate.fromLngLat(
        modelOrigin,
        modelAltitude
      );

      const scale = mercatorCoordinate.meterInMercatorCoordinateUnits() * modelScale;

      // Create transformation matrix
      const rotationX = new THREE.Matrix4().makeRotationX(modelRotate[0]);
      const rotationY = new THREE.Matrix4().makeRotationY(modelRotate[1]);
      const rotationZ = new THREE.Matrix4().makeRotationZ(modelRotate[2]);

      const m = new THREE.Matrix4().fromArray(matrix);
      const l = new THREE.Matrix4()
        .makeTranslation(
          mercatorCoordinate.x,
          mercatorCoordinate.y,
          mercatorCoordinate.z
        )
        .scale(new THREE.Vector3(scale, -scale, scale))
        .multiply(rotationX)
        .multiply(rotationY)
        .multiply(rotationZ);

      camera.projectionMatrix = m.multiply(l);

      // Render
      renderer.resetState();
      renderer.render(scene, camera);

      // Trigger repaint
      (this as any).map.triggerRepaint();
    },
  };
}
```

**Usage example** (for future implementation):
```typescript
import mapboxgl from 'mapbox-gl';
import { createCustomBuildingLayer } from '@/lib/mapbox/customLayer';

// After exporting building to GLB and uploading to server/CDN
const layer = createCustomBuildingLayer({
  id: 'custom-building-1',
  modelUrl: '/uploads/building.glb',
  coordinates: [-76.4813, 44.2312],
  scale: 1,
  rotation: 0,
});

map.addLayer(layer);
```

---

### Task 3.2: Simple Fill-Extrusion Layer

**Priority**: ⚪ LOW (Future implementation)

**Instructions for AI Agent:**

Simpler approach using Mapbox's built-in extrusions.

File: `lib/mapbox/extrusionLayer.ts`
```typescript
import mapboxgl from 'mapbox-gl';

export function addBuildingExtrusion(
  map: mapboxgl.Map,
  geoJsonData: any,
  layerId: string = 'building-extrusion'
) {
  // Add source
  map.addSource(layerId, {
    type: 'geojson',
    data: geoJsonData,
  });

  // Add extrusion layer
  map.addLayer({
    id: layerId,
    type: 'fill-extrusion',
    source: layerId,
    paint: {
      'fill-extrusion-color': ['get', 'color'],
      'fill-extrusion-height': ['get', 'height'],
      'fill-extrusion-base': ['get', 'base_height'],
      'fill-extrusion-opacity': 0.8,
    },
  });
}
```

---

## Phase 4: Construction Timeline Simulation (FUTURE)

### Task 4.1: Timeline Component

**Priority**: ⚪ LOW

**Instructions for AI Agent:**

```typescript
// components/timeline/ConstructionTimeline.tsx

interface ConstructionTimelineProps {
  startDate: Date;
  endDate: Date;
  onProgressChange: (progress: number) => void; // 0-1
}

export function ConstructionTimeline({ startDate, endDate, onProgressChange }: ConstructionTimelineProps) {
  const [progress, setProgress] = useState(0);

  const handleSliderChange = (value: number) => {
    setProgress(value);
    onProgressChange(value / 100);
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <div className="flex justify-between mb-2">
        <span>{startDate.toLocaleDateString()}</span>
        <span>{progress}% Complete</span>
        <span>{endDate.toLocaleDateString()}</span>
      </div>

      <input
        type="range"
        min="0"
        max="100"
        value={progress}
        onChange={(e) => handleSliderChange(Number(e.target.value))}
        className="w-full"
      />

      <div className="mt-4">
        <h3 className="font-semibold">Current Stage:</h3>
        <p>
          {progress < 20 && 'Foundation'}
          {progress >= 20 && progress < 60 && 'Structure'}
          {progress >= 60 && progress < 90 && 'Exterior'}
          {progress >= 90 && 'Finishing'}
        </p>
      </div>
    </div>
  );
}
```

### Task 4.2: Progressive Building Visualization

**Instructions for AI Agent:**

Modify building generator to show construction progress:

```typescript
// Add to buildingGenerator.ts

export function generateBuildingWithProgress(
  spec: BuildingSpec,
  progress: number // 0-1
): THREE.Group {
  const group = new THREE.Group();

  const maxHeight = spec.floors * spec.floorHeight;
  const currentHeight = maxHeight * progress;
  const currentFloor = Math.floor((currentHeight / spec.floorHeight));

  // Only show floors up to current progress
  const visibleFloors = Math.min(currentFloor, spec.floors);

  // Generate partial building
  const partialSpec = {
    ...spec,
    floors: visibleFloors,
  };

  return generateBuilding(partialSpec);
}
```

---

## Phase 5: Traffic & Environmental Impact (FUTURE)

### Task 5.1: Traffic Simulation Data Structure

**Priority**: ⚪ LOW

**Instructions for AI Agent:**

```typescript
// lib/types/traffic.ts

export interface RoadClosure {
  roadId: string;
  lanes: number[];        // Which lanes are closed
  startDate: Date;
  endDate: Date;
  reason: 'construction' | 'safety';
}

export interface TrafficMetrics {
  averageSpeed: number;   // km/h
  congestionLevel: number; // 0-1
  delayMinutes: number;
  affectedVehicles: number;
}

export interface EnvironmentalImpact {
  co2Emissions: number;    // kg per day
  noiseLevel: number;      // decibels
  airQuality: number;      // 0-100 AQI
  dustParticles: number;   // PM2.5
}
```

### Task 5.2: Impact Calculator

```typescript
// lib/simulation/impactCalculator.ts

export function calculateConstructionImpact(
  buildingSpec: BuildingSpec,
  progress: number,
  trafficData: any
): EnvironmentalImpact {
  // Simplified calculation - replace with real models

  const baseEmissions = buildingSpec.floors * 100; // kg CO2 per floor
  const constructionPhase = getConstructionPhase(progress);

  let phaseMultiplier = 1;
  if (constructionPhase === 'foundation') phaseMultiplier = 1.5;
  if (constructionPhase === 'structure') phaseMultiplier = 2.0;
  if (constructionPhase === 'exterior') phaseMultiplier = 1.2;

  return {
    co2Emissions: baseEmissions * phaseMultiplier,
    noiseLevel: 75 + (phaseMultiplier * 10),
    airQuality: 60 - (phaseMultiplier * 10),
    dustParticles: 35 * phaseMultiplier,
  };
}

function getConstructionPhase(progress: number): string {
  if (progress < 0.2) return 'foundation';
  if (progress < 0.6) return 'structure';
  if (progress < 0.9) return 'exterior';
  return 'finishing';
}
```

---

## Implementation Priority Order

### **Sprint 1: Core 3D Builder (Week 1)**
1. ✅ Project setup with dependencies
2. ✅ TypeScript interfaces and types
3. ✅ Manual specification form
4. ✅ Basic 3D building generator
5. ✅ 3D viewer component
6. ✅ Basic textures and materials

### **Sprint 2: Blueprint & Export (Week 2)**
1. Blueprint upload component
2. Canvas-based tracing tool
3. GLB export functionality
4. GeoJSON export functionality
5. Location picker for Kingston

### **Sprint 3: Mapbox Integration (Week 3)**
1. Basic Mapbox setup
2. Simple fill-extrusion layer
3. Custom Three.js layer (if time permits)
4. Building placement on map

### **Sprint 4: Timeline & Simulation (Week 4)**
1. Construction timeline UI
2. Progressive building visualization
3. Basic traffic simulation
4. Environmental impact calculator
5. Dashboard/metrics display

---

## Environment Variables

Create `.env.local`:
```bash
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here
```

Get Mapbox token from: https://account.mapbox.com/

---

## Testing Strategy

### Manual Testing Checklist:
- [ ] Upload blueprint and trace building outline
- [ ] Create building via manual form
- [ ] View 3D model with orbit controls
- [ ] Export to GeoJSON
- [ ] Export to GLB
- [ ] Select location on Kingston map
- [ ] Place building on map
- [ ] Adjust construction timeline
- [ ] View environmental metrics

---

## Key Technical Decisions

1. **Three.js over Babylon.js**: Better React integration with @react-three/fiber
2. **GLB over OBJ**: GLB includes textures and materials in single file
3. **Zustand over Redux**: Simpler state management for this use case
4. **Mapbox over Google Maps**: Better 3D capabilities and custom layers
5. **Next.js App Router**: Future-proof with React Server Components

---

## Resources & Documentation

- Three.js Docs: https://threejs.org/docs/
- React Three Fiber: https://docs.pmnd.rs/react-three-fiber
- Mapbox GL JS: https://docs.mapbox.com/mapbox-gl-js/
- Kingston Open Data: https://www.cityofkingston.ca/explore/data-catalogue
- GLTFExporter: https://threejs.org/docs/#examples/en/exporters/GLTFExporter

---

## Future Enhancements

- AI-powered blueprint analysis (computer vision)
- Real-time collaboration (multiple users editing)
- Integration with Kingston city planning regulations API
- Advanced traffic simulation with car models
- Weather impact on construction timeline
- Cost estimation calculator
- 3D printing export (STL format)
- VR/AR preview mode

---

## Notes for AI Agents

- **Start with Task 1.1** - Project setup is critical
- **Use exact file paths** provided in this document
- **Test each component** before moving to next task
- **Ask for clarification** if requirements are unclear
- **Commit frequently** with descriptive messages
- **Document any deviations** from this plan

---

**Last Updated**: 2026-02-07
**Version**: 1.0
**Target Completion**: 4 weeks
