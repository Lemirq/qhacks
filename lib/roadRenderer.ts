import * as THREE from "three";
import { CityProjection } from "./projection";
import { RoadEdge } from "./roadNetwork";

/**
 * Road Renderer with realistic widths, mitered joins, and visual hierarchy
 */

const SCALE_FACTOR = 10 / 1.4;

/**
 * Road style based on speed limit (proxy for OSM highway classification)
 * - 60 km/h → primary/arterial
 * - 50 km/h → secondary
 * - 40 km/h → tertiary
 * - 30 km/h → residential
 */
function getRoadStyle(speedLimit: number, lanes: number): { width: number; color: number } {
  // Real-world lane widths (meters) vary by road class
  let laneWidth: number;
  let shoulder: number;
  let color: number;

  if (speedLimit >= 60) {
    // Primary / arterial
    laneWidth = 3.7;
    shoulder = 1.0;
    color = 0x2a2a2a;
  } else if (speedLimit >= 50) {
    // Secondary
    laneWidth = 3.5;
    shoulder = 0.5;
    color = 0x333333;
  } else if (speedLimit >= 40) {
    // Tertiary
    laneWidth = 3.3;
    shoulder = 0.3;
    color = 0x3d3d3d;
  } else {
    // Residential
    laneWidth = 3.0;
    shoulder = 0.0;
    color = 0x484848;
  }

  const totalWidth = (lanes * laneWidth + shoulder * 2) * SCALE_FACTOR;
  return { width: totalWidth, color };
}

/**
 * Render all roads from edge data
 */
export function renderRoads(
  edges: RoadEdge[],
  projection: typeof CityProjection,
  scene: THREE.Object3D,
): void {
  console.log(`Rendering ${edges.length} roads...`);

  edges.forEach((edge) => {
    if (edge.geometry.length < 2) return;

    const points = edge.geometry.map((coord) =>
      projection.projectToWorld(coord),
    );

    const { width, color } = getRoadStyle(edge.speedLimit, edge.lanes);
    const roadMesh = createRoadMesh(points, width, color);

    // Slightly above ground to avoid z-fighting with satellite texture
    roadMesh.position.y = 0.5;

    roadMesh.name = `road-${edge.id || "segment"}`;
    roadMesh.userData.isRoad = true;
    roadMesh.userData.roadWidth = width;

    scene.add(roadMesh);
  });

  console.log("✅ Roads rendered");
}

/**
 * Create a road mesh from a series of points
 */
function createRoadMesh(
  points: THREE.Vector3[],
  width: number,
  color: number,
): THREE.Mesh {
  if (points.length === 2) {
    return createStraightRoad(points[0], points[1], width, color);
  } else {
    return createCurvedRoad(points, width, color);
  }
}

/**
 * Create a straight road segment between two points
 */
function createStraightRoad(
  start: THREE.Vector3,
  end: THREE.Vector3,
  width: number,
  color: number,
): THREE.Mesh {
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  const midpoint = new THREE.Vector3()
    .addVectors(start, end)
    .multiplyScalar(0.5);

  const geometry = new THREE.PlaneGeometry(width, length);
  const angle = Math.atan2(direction.x, -direction.z);
  geometry.rotateZ(angle);

  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.95,
    metalness: 0.0,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(midpoint);
  mesh.rotateX(-Math.PI / 2);
  mesh.receiveShadow = true;

  return mesh;
}

/**
 * Create a curved road along a path of points with mitered joins
 */
function createCurvedRoad(
  points: THREE.Vector3[],
  width: number,
  color: number,
): THREE.Mesh {
  const geometry = new THREE.BufferGeometry();
  const half = width / 2;

  const vertices: number[] = [];
  const indices: number[] = [];

  // Compute perpendicular (right) vectors for each segment
  const segRights: THREE.Vector3[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const forward = new THREE.Vector3()
      .subVectors(points[i + 1], points[i])
      .normalize();
    segRights.push(new THREE.Vector3(-forward.z, 0, forward.x));
  }

  // For each vertex, compute mitered perpendicular by averaging adjacent segments
  for (let i = 0; i < points.length; i++) {
    let right: THREE.Vector3;

    if (i === 0) {
      right = segRights[0].clone();
    } else if (i === points.length - 1) {
      right = segRights[segRights.length - 1].clone();
    } else {
      // Average the perpendiculars of the two adjacent segments
      right = new THREE.Vector3()
        .addVectors(segRights[i - 1], segRights[i])
        .normalize();

      // Scale to maintain consistent width through the miter
      // miterScale = 1 / cos(halfAngle) — clamped to avoid extreme spikes
      const dot = segRights[i - 1].dot(segRights[i]);
      const miterScale = Math.min(1 / Math.sqrt((1 + dot) / 2), 2.0);
      right.multiplyScalar(miterScale);
    }

    const p = points[i];
    // Left vertex
    vertices.push(p.x - right.x * half, 0, p.z - right.z * half);
    // Right vertex
    vertices.push(p.x + right.x * half, 0, p.z + right.z * half);

    // Create triangles for the quad between this vertex pair and the next
    if (i < points.length - 1) {
      const idx = i * 2;
      indices.push(idx, idx + 2, idx + 1);
      indices.push(idx + 1, idx + 2, idx + 3);
    }
  }

  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.95,
    metalness: 0.0,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Alternative rendering function using TubeGeometry for main roads
 * This creates 3D roads with more visual detail but is more expensive
 */
export function renderRoadsWithTubes(
  edges: RoadEdge[],
  projection: typeof CityProjection,
  scene: THREE.Scene,
): void {
  console.log(`Rendering ${edges.length} roads with tube geometry...`);

  edges.forEach((edge) => {
    if (edge.geometry.length < 2) return;

    const points = edge.geometry.map((coord) =>
      projection.projectToWorld(coord),
    );

    const { width } = getRoadStyle(edge.speedLimit, edge.lanes);

    const curve = new THREE.CatmullRomCurve3(points);
    const geometry = new THREE.TubeGeometry(
      curve,
      Math.max(points.length * 2, 32),
      width / 2,
      8,
      false,
    );

    const material = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.95,
      metalness: 0.0,
    });
    const roadMesh = new THREE.Mesh(geometry, material);
    roadMesh.position.y = 0;

    roadMesh.name = `road-tube-${edge.id || "segment"}`;
    roadMesh.userData.isRoad = true;
    roadMesh.userData.roadWidth = width;

    scene.add(roadMesh);
  });

  console.log("✅ Roads rendered with tubes");
}

// ─── Traffic Impact Heatmap Overlay ─────────────────────────────────────────

/**
 * Render a colored heatmap overlay on top of existing roads to show traffic impact.
 * Each impacted edge gets a semi-transparent colored overlay (green→red).
 * Returns a THREE.Group that can be added/removed from the scene.
 */
export function renderTrafficHeatmap(
  edgeImpact: Map<string, { edgeId: string; level: number; delta: number }>,
  allEdges: RoadEdge[],
  projection: typeof CityProjection,
): THREE.Group {
  const group = new THREE.Group();
  group.name = "traffic-heatmap";

  const edgeMap = new Map(allEdges.map((e) => [e.id, e]));

  edgeImpact.forEach((impact) => {
    const edge = edgeMap.get(impact.edgeId);
    if (!edge || edge.geometry.length < 2 || impact.delta <= 0) return;

    const points = edge.geometry.map((coord) =>
      projection.projectToWorld(coord),
    );

    const { width } = getRoadStyle(edge.speedLimit, edge.lanes);
    const color = getCongestionHex(impact.level);

    // Create overlay strip on top of the road
    const overlayWidth = width * 0.85; // slightly narrower than road
    const mesh = createHeatmapStrip(points, overlayWidth, color, impact.level);
    mesh.position.y = 1.5; // above road surface
    mesh.name = `heatmap-${edge.id}`;
    group.add(mesh);
  });

  return group;
}

/**
 * Render markers at congested intersections.
 * Returns a THREE.Group of pulsing red rings.
 */
export function renderCongestionMarkers(
  nodeIds: string[],
  nodePositions: Map<string, [number, number]>,
  projection: typeof CityProjection,
): THREE.Group {
  const group = new THREE.Group();
  group.name = "congestion-markers";

  nodeIds.forEach((nodeId) => {
    const pos = nodePositions.get(nodeId);
    if (!pos) return;

    const worldPos = projection.projectToWorld(pos);

    // Red pulsing ring at congested intersection
    const ringGeometry = new THREE.RingGeometry(
      15 * SCALE_FACTOR,
      20 * SCALE_FACTOR,
      32,
    );
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xff2222,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.position.set(worldPos.x, 2, worldPos.z);
    ring.rotation.x = -Math.PI / 2;
    ring.name = `congestion-ring-${nodeId}`;
    group.add(ring);

    // Inner glow
    const innerGeometry = new THREE.CircleGeometry(12 * SCALE_FACTOR, 32);
    const innerMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
    });
    const inner = new THREE.Mesh(innerGeometry, innerMaterial);
    inner.position.set(worldPos.x, 1.8, worldPos.z);
    inner.rotation.x = -Math.PI / 2;
    group.add(inner);
  });

  return group;
}

/** Congestion level (0-1) to hex color */
function getCongestionHex(level: number): number {
  const t = Math.max(0, Math.min(1, level));
  let r: number, g: number;
  if (t < 0.5) {
    r = Math.round(t * 2 * 255);
    g = 255;
  } else {
    r = 255;
    g = Math.round((1 - (t - 0.5) * 2) * 255);
  }
  return (r << 16) | (g << 8) | 0;
}

/** Create a heatmap strip mesh along a polyline */
function createHeatmapStrip(
  points: THREE.Vector3[],
  width: number,
  color: number,
  level: number,
): THREE.Mesh {
  const geometry = new THREE.BufferGeometry();
  const half = width / 2;
  const vertices: number[] = [];
  const indices: number[] = [];

  const segRights: THREE.Vector3[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const forward = new THREE.Vector3()
      .subVectors(points[i + 1], points[i])
      .normalize();
    segRights.push(new THREE.Vector3(-forward.z, 0, forward.x));
  }

  for (let i = 0; i < points.length; i++) {
    let right: THREE.Vector3;
    if (i === 0) {
      right = segRights[0].clone();
    } else if (i === points.length - 1) {
      right = segRights[segRights.length - 1].clone();
    } else {
      right = new THREE.Vector3()
        .addVectors(segRights[i - 1], segRights[i])
        .normalize();
      const dot = segRights[i - 1].dot(segRights[i]);
      const miterScale = Math.min(1 / Math.sqrt((1 + dot) / 2), 2.0);
      right.multiplyScalar(miterScale);
    }

    const p = points[i];
    vertices.push(p.x - right.x * half, 0, p.z - right.z * half);
    vertices.push(p.x + right.x * half, 0, p.z + right.z * half);

    if (i < points.length - 1) {
      const idx = i * 2;
      indices.push(idx, idx + 2, idx + 1);
      indices.push(idx + 1, idx + 2, idx + 3);
    }
  }

  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const opacity = 0.35 + level * 0.45; // more opaque for higher congestion
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}
