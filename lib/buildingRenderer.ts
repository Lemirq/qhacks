/**
 * Building Renderer for 3D City Visualization
 * Renders buildings as extruded 3D meshes in Three.js
 */

import * as THREE from 'three';
import { Building } from './buildingData';
import { CityProjection } from './projection';

/**
 * Render buildings as 3D meshes and add them to the scene
 *
 * @param buildings - Array of buildings to render
 * @param projection - CityProjection instance for coordinate conversion
 * @param scene - Three.js scene to add meshes to
 */
export function renderBuildings(
  buildings: Building[],
  projection: typeof CityProjection,
  scene: THREE.Scene
): void {
  console.log(`Rendering ${buildings.length} buildings...`);

  let rendered = 0;

  buildings.forEach((building) => {
    try {
      // Create the building mesh
      const mesh = createBuildingMesh(building, projection);

      if (mesh) {
        // Add to scene
        scene.add(mesh);
        rendered++;
      }
    } catch (error) {
      console.warn(`Failed to render building ${building.id}:`, error);
    }
  });

  console.log(`✅ Rendered ${rendered} buildings`);
}

/**
 * Create a 3D mesh for a single building
 */
function createBuildingMesh(
  building: Building,
  projection: typeof CityProjection
): THREE.Mesh | null {
  // Need at least 3 points for a valid polygon
  if (building.footprint.length < 3) {
    return null;
  }

  // Create shape from footprint polygon
  const shape = new THREE.Shape();

  // Project footprint coordinates to world space
  const projectedPoints: THREE.Vector3[] = [];

  building.footprint.forEach((coord, index) => {
    const worldPos = projection.projectToWorld(coord);
    projectedPoints.push(worldPos);

    // First point - move to start
    if (index === 0) {
      shape.moveTo(worldPos.x, worldPos.z);
    } else {
      // Subsequent points - draw line
      shape.lineTo(worldPos.x, worldPos.z);
    }
  });

  // Close the shape by connecting back to first point
  if (projectedPoints.length > 0) {
    const firstPoint = projectedPoints[0];
    shape.lineTo(firstPoint.x, firstPoint.z);
  }

  // Extrude settings
  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    depth: building.height,
    bevelEnabled: false,
  };

  // Create extruded geometry
  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

  // Rotate geometry to stand upright (extrusion happens along Z, we want Y)
  geometry.rotateX(Math.PI / 2);

  // Choose material color based on building type
  const color = getBuildingColor(building.type);
  const material = new THREE.MeshLambertMaterial({
    color,
    flatShading: false,
  });

  // Create mesh
  const mesh = new THREE.Mesh(geometry, material);

  // Position at ground level (y=0)
  // The geometry is already centered, so we just need to set the base at y=0
  mesh.position.y = 0;

  // Enable shadows
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  // Set mesh name for debugging
  mesh.name = building.id;

  return mesh;
}

/**
 * Get building color based on type
 */
function getBuildingColor(type?: string): number {
  if (!type || type === 'yes') {
    return 0x888888; // Default gray
  }

  // Vary colors by building type
  switch (type) {
    case 'residential':
    case 'house':
    case 'apartments':
      return 0xb8956a; // Tan/beige

    case 'commercial':
    case 'retail':
    case 'shop':
      return 0x7a9bc4; // Light blue

    case 'industrial':
    case 'warehouse':
      return 0x8b7a6a; // Brown

    case 'school':
    case 'university':
    case 'college':
      return 0xa47d5c; // Academic brown

    case 'hospital':
    case 'clinic':
      return 0xc47d7d; // Reddish

    case 'church':
    case 'cathedral':
    case 'chapel':
      return 0x9a8a7a; // Stone gray

    case 'civic':
    case 'public':
    case 'government':
      return 0x7a8a9a; // Blue gray

    default:
      return 0x888888; // Default gray
  }
}
