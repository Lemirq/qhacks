import * as THREE from 'three';
import { CityProjection } from './projection';
import { RoadEdge } from './roadNetwork';

/**
 * Render roads from RoadEdge data into a Three.js scene
 */

/**
 * Render all roads from edge data
 * @param edges - Array of road edges to render
 * @param projection - CityProjection for coordinate conversion
 * @param scene - Three.js scene to add road meshes to
 */
export function renderRoads(
  edges: RoadEdge[],
  projection: typeof CityProjection,
  scene: THREE.Scene
): void {
  console.log(`Rendering ${edges.length} roads...`);

  edges.forEach((edge) => {
    // Skip edges with insufficient geometry
    if (edge.geometry.length < 2) {
      return;
    }

    // Project coordinates to 3D world space
    const points = edge.geometry.map((coord) =>
      projection.projectToWorld(coord)
    );

    // Calculate road width based on lanes (3.5 meters per lane is standard)
    const width = edge.lanes * 3.5;

    // Create road mesh
    const roadMesh = createRoadMesh(points, width);

    // Position slightly above ground to prevent z-fighting
    roadMesh.position.y = 0.1;

    // Add to scene
    scene.add(roadMesh);
  });

  console.log('✅ Roads rendered');
}

/**
 * Create a road mesh from a series of points
 * @param points - Array of THREE.Vector3 points defining the road path
 * @param width - Width of the road in meters
 * @returns THREE.Mesh representing the road
 */
function createRoadMesh(points: THREE.Vector3[], width: number): THREE.Mesh {
  // For simple roads, we'll create a flat ribbon geometry
  // This is more efficient than TubeGeometry for most roads

  if (points.length === 2) {
    // Straight road - use a simple box
    return createStraightRoad(points[0], points[1], width);
  } else {
    // Curved road - use a ribbon geometry along the path
    return createCurvedRoad(points, width);
  }
}

/**
 * Create a straight road segment between two points
 */
function createStraightRoad(
  start: THREE.Vector3,
  end: THREE.Vector3,
  width: number
): THREE.Mesh {
  // Calculate length and direction
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

  // Create geometry
  const geometry = new THREE.PlaneGeometry(width, length);

  // Rotate to align with direction
  const angle = Math.atan2(direction.x, -direction.z);
  geometry.rotateZ(angle);

  // Create material
  const material = new THREE.MeshBasicMaterial({
    color: 0x333333,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(midpoint);
  mesh.rotateX(-Math.PI / 2); // Rotate to be horizontal

  return mesh;
}

/**
 * Create a curved road along a path of points
 */
function createCurvedRoad(points: THREE.Vector3[], width: number): THREE.Mesh {
  // Create a ribbon geometry that follows the path
  const geometry = new THREE.BufferGeometry();

  const vertices: number[] = [];
  const indices: number[] = [];

  // For each segment, create a quad
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];

    // Calculate perpendicular direction for road width
    const forward = new THREE.Vector3().subVectors(p2, p1).normalize();
    const right = new THREE.Vector3(-forward.z, 0, forward.x).multiplyScalar(width / 2);

    // Create quad vertices (left and right side of road)
    const startIdx = i * 2;

    // Left side
    vertices.push(
      p1.x - right.x,
      p1.y,
      p1.z - right.z
    );

    // Right side
    vertices.push(
      p1.x + right.x,
      p1.y,
      p1.z + right.z
    );

    // Add last segment's end points
    if (i === points.length - 2) {
      vertices.push(
        p2.x - right.x,
        p2.y,
        p2.z - right.z
      );
      vertices.push(
        p2.x + right.x,
        p2.y,
        p2.z + right.z
      );
    }

    // Create triangles for this segment
    if (i < points.length - 1) {
      const idx = startIdx;
      // Triangle 1
      indices.push(idx, idx + 2, idx + 1);
      // Triangle 2
      indices.push(idx + 1, idx + 2, idx + 3);
    }
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  // Create material
  const material = new THREE.MeshBasicMaterial({
    color: 0x333333,
    side: THREE.DoubleSide,
  });

  return new THREE.Mesh(geometry, material);
}

/**
 * Alternative rendering function using TubeGeometry for main roads
 * This creates 3D roads with more visual detail but is more expensive
 * @param edges - Road edges to render
 * @param projection - Projection system
 * @param scene - Scene to add to
 */
export function renderRoadsWithTubes(
  edges: RoadEdge[],
  projection: typeof CityProjection,
  scene: THREE.Scene
): void {
  console.log(`Rendering ${edges.length} roads with tube geometry...`);

  edges.forEach((edge) => {
    if (edge.geometry.length < 2) {
      return;
    }

    const points = edge.geometry.map((coord) =>
      projection.projectToWorld(coord)
    );

    const width = edge.lanes * 3.5;

    // Use tube geometry for 3D appearance
    const roadMesh = createTubeRoad(points, width);
    roadMesh.position.y = 0.1;
    scene.add(roadMesh);
  });

  console.log('✅ Roads rendered with tubes');
}

/**
 * Create a 3D tube road for better visual appearance
 */
function createTubeRoad(points: THREE.Vector3[], width: number): THREE.Mesh {
  // Create curve from points
  const curve = new THREE.CatmullRomCurve3(points);

  // Create tube geometry
  const geometry = new THREE.TubeGeometry(
    curve,
    Math.max(points.length * 2, 32), // segments
    width / 2, // radius (half width for diameter)
    8, // radial segments
    false // closed
  );

  const material = new THREE.MeshBasicMaterial({
    color: 0x333333,
  });

  return new THREE.Mesh(geometry, material);
}
