/**
 * Wind Effect Visualization for Kingston
 * Simplified wind model using building heights, gaps, and orientation
 * relative to prevailing wind direction (W/SW for Kingston).
 *
 * Uses particle system to show wind flow at street level and
 * highlights danger zones where wind speed exceeds comfort/safety thresholds.
 */

import * as THREE from "three";
import { Building } from "./buildingData";
import { CityProjection } from "./projection";

// Kingston prevailing wind from W/SW (~240° from north, i.e. blowing toward E/NE)
const PREVAILING_WIND_DIR = new THREE.Vector2(
  Math.cos((240 * Math.PI) / 180), // x component
  Math.sin((240 * Math.PI) / 180), // z component (mapped to world)
);
const BASE_WIND_SPEED = 5.0; // m/s base wind speed

// Thresholds (Lawson comfort criteria simplified)
const COMFORT_THRESHOLD = 6.0; // m/s — uncomfortable for sitting
const SAFETY_THRESHOLD = 15.0; // m/s — dangerous for pedestrians

// Particle system config
const PARTICLE_COUNT = 3000;
const PARTICLE_AREA_PADDING = 50; // extra world units around building bounds
const PARTICLE_HEIGHT_MIN = 1.5; // street level
const PARTICLE_HEIGHT_MAX = 8.0; // low-level wind viz
const PARTICLE_SPEED_SCALE = 12.0;
const PARTICLE_LIFETIME = 4.0; // seconds before reset

interface WindCell {
  x: number;
  z: number;
  speed: number; // wind speed in m/s
  dirX: number; // normalized direction x
  dirZ: number; // normalized direction z
}

interface BuildingObstacle {
  centerX: number;
  centerZ: number;
  halfWidth: number;
  halfDepth: number;
  height: number;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/**
 * Compute simplified wind field on a grid.
 * Models: deflection around buildings, Venturi acceleration in gaps,
 * and wake turbulence behind buildings.
 */
function computeWindField(
  buildings: Building[],
  projection: typeof CityProjection,
  gridRes: number = 10, // grid cell size in world units
): { cells: WindCell[]; bounds: { minX: number; maxX: number; minZ: number; maxZ: number }; gridRes: number } {
  // Project buildings to world space and compute bounding boxes
  const obstacles: BuildingObstacle[] = [];
  let boundsMinX = Infinity, boundsMaxX = -Infinity;
  let boundsMinZ = Infinity, boundsMaxZ = -Infinity;

  for (const b of buildings) {
    if (b.footprint.length < 3 || b.height < 2) continue;

    let minX = Infinity, maxX = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    for (const coord of b.footprint) {
      const p = projection.projectToWorld(coord);
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minZ = Math.min(minZ, p.z);
      maxZ = Math.max(maxZ, p.z);
    }

    obstacles.push({
      centerX: (minX + maxX) / 2,
      centerZ: (minZ + maxZ) / 2,
      halfWidth: (maxX - minX) / 2,
      halfDepth: (maxZ - minZ) / 2,
      height: b.height,
      minX, maxX, minZ, maxZ,
    });

    boundsMinX = Math.min(boundsMinX, minX);
    boundsMaxX = Math.max(boundsMaxX, maxX);
    boundsMinZ = Math.min(boundsMinZ, minZ);
    boundsMaxZ = Math.max(boundsMaxZ, maxZ);
  }

  // Add padding
  boundsMinX -= PARTICLE_AREA_PADDING;
  boundsMaxX += PARTICLE_AREA_PADDING;
  boundsMinZ -= PARTICLE_AREA_PADDING;
  boundsMaxZ += PARTICLE_AREA_PADDING;

  const bounds = { minX: boundsMinX, maxX: boundsMaxX, minZ: boundsMinZ, maxZ: boundsMaxZ };

  // Create wind grid
  const cols = Math.ceil((boundsMaxX - boundsMinX) / gridRes);
  const rows = Math.ceil((boundsMaxZ - boundsMinZ) / gridRes);
  const cells: WindCell[] = [];

  // Wind direction in world space (Three.js: x right, z toward camera)
  // 240° from north = blowing from WSW, so wind vector points ENE
  const windDirX = 0.87; // cos(30°) roughly ENE
  const windDirZ = -0.5; // sin(30°)

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cellX = boundsMinX + c * gridRes + gridRes / 2;
      const cellZ = boundsMinZ + r * gridRes + gridRes / 2;

      let speed = BASE_WIND_SPEED;
      let dX = windDirX;
      let dZ = windDirZ;

      // Check interaction with each building
      for (const obs of obstacles) {
        const relX = cellX - obs.centerX;
        const relZ = cellZ - obs.centerZ;

        // Distance to building center
        const dist = Math.sqrt(relX * relX + relZ * relZ);
        const buildingRadius = Math.max(obs.halfWidth, obs.halfDepth);

        // Inside building footprint — no wind
        if (
          cellX >= obs.minX && cellX <= obs.maxX &&
          cellZ >= obs.minZ && cellZ <= obs.maxZ
        ) {
          speed = 0;
          break;
        }

        // Downwind wake zone: reduced and turbulent wind
        // Check if cell is downwind of building
        const dotWind = relX * windDirX + relZ * windDirZ;
        const crossWind = Math.abs(relX * (-windDirZ) + relZ * windDirX);
        const wakeLength = obs.height * 2.5; // wake extends ~2.5x building height downwind

        if (dotWind > 0 && dotWind < wakeLength && crossWind < buildingRadius * 1.2) {
          // In wake zone — reduce speed, add turbulence
          const wakeFactor = 1 - (1 - dotWind / wakeLength) * 0.6 * (obs.height / 30);
          speed *= Math.max(0.3, wakeFactor);
          // Add slight deflection
          dX += (Math.random() - 0.5) * 0.3;
          dZ += (Math.random() - 0.5) * 0.3;
        }

        // Upwind pressure zone: wind slows and deflects upward/sideways
        if (dotWind < 0 && dotWind > -buildingRadius * 2 && crossWind < buildingRadius * 1.5) {
          const upwindFactor = 0.7 + 0.3 * (Math.abs(dotWind) / (buildingRadius * 2));
          speed *= upwindFactor;
          // Deflect sideways
          const deflectSign = relZ > obs.centerZ ? 1 : -1;
          dX += (-windDirZ) * 0.3 * deflectSign;
          dZ += windDirX * 0.3 * deflectSign;
        }

        // Venturi effect: wind accelerates between closely spaced buildings
        // Check if this cell is between two buildings perpendicular to wind
        if (dist < buildingRadius * 3) {
          for (const other of obstacles) {
            if (other === obs) continue;
            const gapX = other.centerX - obs.centerX;
            const gapZ = other.centerZ - obs.centerZ;
            const gapDist = Math.sqrt(gapX * gapX + gapZ * gapZ);
            const combinedRadius = Math.max(obs.halfWidth, obs.halfDepth) + Math.max(other.halfWidth, other.halfDepth);

            // Gap between buildings (narrow corridor)
            if (gapDist < combinedRadius * 3 && gapDist > combinedRadius * 0.5) {
              // Check if gap is roughly perpendicular to wind (channeling)
              const gapNormX = gapX / gapDist;
              const gapNormZ = gapZ / gapDist;
              const perpDot = Math.abs(gapNormX * windDirX + gapNormZ * windDirZ);

              // If gap is somewhat aligned with wind, it channels it
              if (perpDot > 0.3) {
                // Check if cell is in the gap
                const toCellX = cellX - obs.centerX;
                const toCellZ = cellZ - obs.centerZ;
                const projOnGap = (toCellX * gapNormX + toCellZ * gapNormZ) / gapDist;

                if (projOnGap > 0 && projOnGap < 1) {
                  // Venturi: narrower gap = more acceleration
                  const gapWidth = gapDist - combinedRadius;
                  const venturiMultiplier = 1 + Math.max(0, (30 - gapWidth) / 30) *
                    (Math.min(obs.height, other.height) / 20) * 1.5;
                  speed *= Math.min(venturiMultiplier, 2.5);

                  // Channel wind along gap direction
                  dX = dX * 0.5 + gapNormX * perpDot * 0.5;
                  dZ = dZ * 0.5 + gapNormZ * perpDot * 0.5;
                }
              }
            }
          }
        }

        // Corner acceleration: wind speeds up around building corners
        if (dist > buildingRadius * 0.8 && dist < buildingRadius * 2.0) {
          const cornerAccel = 1 + (obs.height / 40) * 0.4 * Math.max(0, 1 - (dist - buildingRadius) / buildingRadius);
          speed *= Math.min(cornerAccel, 1.8);
        }
      }

      // Normalize direction
      const dirLen = Math.sqrt(dX * dX + dZ * dZ);
      if (dirLen > 0) {
        dX /= dirLen;
        dZ /= dirLen;
      }

      cells.push({ x: cellX, z: cellZ, speed, dirX: dX, dirZ: dZ });
    }
  }

  return { cells, bounds, gridRes };
}

/**
 * Sample wind at a world position by interpolating nearby grid cells
 */
function sampleWind(
  x: number,
  z: number,
  cells: WindCell[],
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number },
  gridRes: number,
): { speed: number; dirX: number; dirZ: number } {
  const cols = Math.ceil((bounds.maxX - bounds.minX) / gridRes);

  const col = (x - bounds.minX) / gridRes - 0.5;
  const row = (z - bounds.minZ) / gridRes - 0.5;

  const c0 = Math.max(0, Math.floor(col));
  const r0 = Math.max(0, Math.floor(row));
  const rows = Math.ceil((bounds.maxZ - bounds.minZ) / gridRes);
  const c1 = Math.min(cols - 1, c0 + 1);
  const r1 = Math.min(rows - 1, r0 + 1);

  const fx = col - c0;
  const fz = row - r0;

  const getCell = (r: number, c: number) => cells[r * cols + c];
  const tl = getCell(r0, c0);
  const tr = getCell(r0, c1);
  const bl = getCell(r1, c0);
  const br = getCell(r1, c1);

  if (!tl || !tr || !bl || !br) {
    return { speed: BASE_WIND_SPEED, dirX: 0.87, dirZ: -0.5 };
  }

  const speed = (tl.speed * (1 - fx) * (1 - fz) + tr.speed * fx * (1 - fz) +
    bl.speed * (1 - fx) * fz + br.speed * fx * fz);
  const dirX = (tl.dirX * (1 - fx) * (1 - fz) + tr.dirX * fx * (1 - fz) +
    bl.dirX * (1 - fx) * fz + br.dirX * fx * fz);
  const dirZ = (tl.dirZ * (1 - fx) * (1 - fz) + tr.dirZ * fx * (1 - fz) +
    bl.dirZ * (1 - fx) * fz + br.dirZ * fx * fz);

  return { speed, dirX, dirZ };
}

/**
 * Create danger zone overlay meshes showing areas where wind exceeds thresholds
 */
function createDangerZones(
  cells: WindCell[],
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number },
  gridRes: number,
): THREE.Group {
  const group = new THREE.Group();
  group.name = "windDangerZones";

  for (const cell of cells) {
    if (cell.speed < COMFORT_THRESHOLD) continue;

    const isSafety = cell.speed >= SAFETY_THRESHOLD;
    const color = isSafety ? 0xff2222 : 0xffaa00;
    const opacity = isSafety
      ? 0.25 + 0.15 * Math.min(1, (cell.speed - SAFETY_THRESHOLD) / 10)
      : 0.15 + 0.1 * ((cell.speed - COMFORT_THRESHOLD) / (SAFETY_THRESHOLD - COMFORT_THRESHOLD));

    const geom = new THREE.PlaneGeometry(gridRes * 0.9, gridRes * 0.9);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
      depthWrite: false,
      depthTest: false,
    });

    const mesh = new THREE.Mesh(geom, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(cell.x, 1.5, cell.z);
    mesh.renderOrder = 9998;
    mesh.userData.isWindDanger = true;
    mesh.userData.windSpeed = cell.speed;

    group.add(mesh);
  }

  return group;
}

/**
 * Create the particle system for wind flow visualization
 */
function createWindParticles(
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number },
): {
  points: THREE.Points;
  positions: Float32Array;
  velocities: Float32Array;
  lifetimes: Float32Array;
  colors: Float32Array;
} {
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const velocities = new Float32Array(PARTICLE_COUNT * 3);
  const lifetimes = new Float32Array(PARTICLE_COUNT);
  const colors = new Float32Array(PARTICLE_COUNT * 3);

  const rangeX = bounds.maxX - bounds.minX;
  const rangeZ = bounds.maxZ - bounds.minZ;

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    positions[i * 3] = bounds.minX + Math.random() * rangeX;
    positions[i * 3 + 1] = PARTICLE_HEIGHT_MIN + Math.random() * (PARTICLE_HEIGHT_MAX - PARTICLE_HEIGHT_MIN);
    positions[i * 3 + 2] = bounds.minZ + Math.random() * rangeZ;
    lifetimes[i] = Math.random() * PARTICLE_LIFETIME;
    // Initial color (will be updated based on speed)
    colors[i * 3] = 0.7;
    colors[i * 3 + 1] = 0.85;
    colors[i * 3 + 2] = 1.0;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 3,
    vertexColors: true,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geometry, material);
  points.name = "windParticles";
  points.renderOrder = 9997;

  return { points, positions, velocities, lifetimes, colors };
}

/**
 * Wind visualization state — returned to caller for animation updates
 */
export interface WindVisualization {
  group: THREE.Group;
  update: (deltaTime: number) => void;
  dispose: () => void;
}

/**
 * Build and return the complete wind visualization layer.
 * Caller adds group to scene and calls update() each frame.
 */
export function createWindVisualization(
  buildings: Building[],
  projection: typeof CityProjection,
): WindVisualization {
  const group = new THREE.Group();
  group.name = "windLayer";

  // 1) Compute wind field
  const { cells, bounds, gridRes } = computeWindField(buildings, projection, 12);

  // 2) Create danger zone overlay
  const dangerGroup = createDangerZones(cells, bounds, gridRes);
  group.add(dangerGroup);

  // 3) Create particle system
  const { points, positions, velocities, lifetimes, colors } = createWindParticles(bounds);
  group.add(points);

  // 4) Create wind direction arrows (instanced) for strong wind areas
  const arrowGroup = createWindArrows(cells, gridRes);
  group.add(arrowGroup);

  const rangeX = bounds.maxX - bounds.minX;
  const rangeZ = bounds.maxZ - bounds.minZ;

  // Animation update function
  function update(deltaTime: number) {
    const posAttr = points.geometry.getAttribute("position") as THREE.BufferAttribute;
    const colAttr = points.geometry.getAttribute("color") as THREE.BufferAttribute;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      lifetimes[i] -= deltaTime;

      if (lifetimes[i] <= 0) {
        // Reset particle — spawn at upwind edge
        positions[i * 3] = bounds.minX + Math.random() * rangeX;
        positions[i * 3 + 1] = PARTICLE_HEIGHT_MIN + Math.random() * (PARTICLE_HEIGHT_MAX - PARTICLE_HEIGHT_MIN);
        positions[i * 3 + 2] = bounds.minZ + Math.random() * rangeZ;
        lifetimes[i] = PARTICLE_LIFETIME * (0.5 + Math.random() * 0.5);
        continue;
      }

      const x = positions[i * 3];
      const z = positions[i * 3 + 2];

      // Sample wind field
      const wind = sampleWind(x, z, cells, bounds, gridRes);

      // Move particle
      const moveScale = PARTICLE_SPEED_SCALE * deltaTime;
      positions[i * 3] += wind.dirX * wind.speed * moveScale;
      positions[i * 3 + 1] += (Math.sin(lifetimes[i] * 3) * 0.2) * deltaTime; // gentle vertical bob
      positions[i * 3 + 2] += wind.dirZ * wind.speed * moveScale;

      // Color based on speed: blue (calm) -> yellow (uncomfortable) -> red (dangerous)
      const speedNorm = Math.min(wind.speed / SAFETY_THRESHOLD, 1.0);
      if (wind.speed < COMFORT_THRESHOLD) {
        // Blue-white for calm
        colors[i * 3] = 0.6 + speedNorm * 0.4;
        colors[i * 3 + 1] = 0.8 + speedNorm * 0.2;
        colors[i * 3 + 2] = 1.0;
      } else if (wind.speed < SAFETY_THRESHOLD) {
        // Yellow-orange for uncomfortable
        const t = (wind.speed - COMFORT_THRESHOLD) / (SAFETY_THRESHOLD - COMFORT_THRESHOLD);
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.9 - t * 0.5;
        colors[i * 3 + 2] = 0.2 - t * 0.2;
      } else {
        // Red for dangerous
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.1;
        colors[i * 3 + 2] = 0.1;
      }

      // Fade out particles near end of life
      const fadeFactor = Math.min(lifetimes[i] / 0.5, 1.0);
      colors[i * 3] *= fadeFactor;
      colors[i * 3 + 1] *= fadeFactor;
      colors[i * 3 + 2] *= fadeFactor;

      // Reset if out of bounds
      if (x < bounds.minX || x > bounds.maxX || z < bounds.minZ || z > bounds.maxZ) {
        lifetimes[i] = 0;
      }
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;

    // Animate arrows (pulse opacity)
    const pulse = 0.5 + 0.3 * Math.sin(Date.now() * 0.003);
    arrowGroup.children.forEach((child) => {
      if (child instanceof THREE.Mesh) {
        (child.material as THREE.MeshBasicMaterial).opacity = pulse;
      }
    });
  }

  function dispose() {
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
        obj.geometry?.dispose();
        if (obj.material instanceof THREE.Material) obj.material.dispose();
      }
    });
  }

  return { group, update, dispose };
}

/**
 * Create arrow indicators at cells with significant wind
 */
function createWindArrows(cells: WindCell[], gridRes: number): THREE.Group {
  const group = new THREE.Group();
  group.name = "windArrows";

  // Only place arrows every few cells to avoid clutter
  const step = 3;
  const arrowGeom = new THREE.ConeGeometry(2, 6, 4);
  arrowGeom.rotateX(Math.PI / 2); // Point along Z

  let arrowCount = 0;
  const MAX_ARROWS = 300;

  for (let i = 0; i < cells.length; i += step) {
    if (arrowCount >= MAX_ARROWS) break;
    const cell = cells[i];
    if (cell.speed < COMFORT_THRESHOLD * 0.8) continue; // Only show for notable wind

    const isSafety = cell.speed >= SAFETY_THRESHOLD;
    const isComfort = cell.speed >= COMFORT_THRESHOLD;
    const color = isSafety ? 0xff3333 : isComfort ? 0xffaa33 : 0x88bbff;

    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const arrow = new THREE.Mesh(arrowGeom.clone(), mat);
    arrow.position.set(cell.x, 3, cell.z);

    // Rotate arrow to point in wind direction
    const angle = Math.atan2(cell.dirZ, cell.dirX);
    arrow.rotation.y = -angle + Math.PI / 2;

    // Scale by wind speed
    const scale = 0.5 + (cell.speed / SAFETY_THRESHOLD) * 0.8;
    arrow.scale.set(scale, scale, scale);

    arrow.renderOrder = 9996;
    group.add(arrow);
    arrowCount++;
  }

  return group;
}
