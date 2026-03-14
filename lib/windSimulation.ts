/**
 * Wind Effect Visualization for Kingston
 * Simplified wind model using building heights and orientation
 * relative to prevailing wind direction (W/SW for Kingston).
 *
 * Uses a coarse grid + particle system to show wind flow at street level.
 */

import * as THREE from "three";
import { Building } from "./buildingData";
import { CityProjection } from "./projection";

const BASE_WIND_SPEED = 5.0; // m/s
const COMFORT_THRESHOLD = 6.0; // m/s — uncomfortable
const SAFETY_THRESHOLD = 15.0; // m/s — dangerous

// Coarse grid — fewer cells = much faster computation
const GRID_RES = 30;
const PARTICLE_AREA_PADDING = 40;

// Wind direction: blowing FROM WSW, particles move toward ENE
const WIND_DIR_X = 0.87;  // ENE
const WIND_DIR_Z = -0.5;

interface WindCell {
  x: number;
  z: number;
  speed: number;
  dirX: number;
  dirZ: number;
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
 * Compute wind field on a coarse grid with yields so the UI doesn't freeze.
 * Skips expensive Venturi pair-building; uses a simpler wake+deflect model.
 */
async function computeWindField(
  buildings: Building[],
  projection: typeof CityProjection,
): Promise<{ cells: WindCell[]; bounds: { minX: number; maxX: number; minZ: number; maxZ: number } }> {
  const obstacles: BuildingObstacle[] = [];
  let bMinX = Infinity, bMaxX = -Infinity;
  let bMinZ = Infinity, bMaxZ = -Infinity;

  for (const b of buildings) {
    if (b.footprint.length < 3 || b.height < 2) continue;
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const coord of b.footprint) {
      const p = projection.projectToWorld(coord);
      if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
      if (p.z < minZ) minZ = p.z; if (p.z > maxZ) maxZ = p.z;
    }
    obstacles.push({
      centerX: (minX + maxX) / 2, centerZ: (minZ + maxZ) / 2,
      halfWidth: (maxX - minX) / 2, halfDepth: (maxZ - minZ) / 2,
      height: b.height, minX, maxX, minZ, maxZ,
    });
    if (minX < bMinX) bMinX = minX; if (maxX > bMaxX) bMaxX = maxX;
    if (minZ < bMinZ) bMinZ = minZ; if (maxZ > bMaxZ) bMaxZ = maxZ;
  }

  bMinX -= PARTICLE_AREA_PADDING; bMaxX += PARTICLE_AREA_PADDING;
  bMinZ -= PARTICLE_AREA_PADDING; bMaxZ += PARTICLE_AREA_PADDING;
  const bounds = { minX: bMinX, maxX: bMaxX, minZ: bMinZ, maxZ: bMaxZ };

  const cols = Math.ceil((bMaxX - bMinX) / GRID_RES);
  const rows = Math.ceil((bMaxZ - bMinZ) / GRID_RES);
  const cells: WindCell[] = new Array(rows * cols);

  for (let r = 0; r < rows; r++) {
    // Yield every 5 rows — coarse grid, so this is frequent enough
    if (r > 0 && r % 5 === 0) {
      await new Promise<void>(resolve => setTimeout(resolve, 0));
    }
    for (let c = 0; c < cols; c++) {
      const cellX = bMinX + c * GRID_RES + GRID_RES / 2;
      const cellZ = bMinZ + r * GRID_RES + GRID_RES / 2;

      let speed = BASE_WIND_SPEED;
      let dX = WIND_DIR_X;
      let dZ = WIND_DIR_Z;
      let inside = false;

      for (const obs of obstacles) {
        // Inside building — no wind
        if (cellX >= obs.minX && cellX <= obs.maxX && cellZ >= obs.minZ && cellZ <= obs.maxZ) {
          inside = true;
          break;
        }

        const relX = cellX - obs.centerX;
        const relZ = cellZ - obs.centerZ;
        const dist = Math.sqrt(relX * relX + relZ * relZ);
        const radius = Math.max(obs.halfWidth, obs.halfDepth);

        // Wake zone: downwind of building
        const dotWind = relX * WIND_DIR_X + relZ * WIND_DIR_Z;
        const crossWind = Math.abs(relX * (-WIND_DIR_Z) + relZ * WIND_DIR_X);
        const wakeLen = obs.height * 2.0;
        if (dotWind > 0 && dotWind < wakeLen && crossWind < radius * 1.3) {
          const f = 1 - (1 - dotWind / wakeLen) * 0.5 * Math.min(obs.height / 20, 1.5);
          speed *= Math.max(0.3, f);
        }

        // Corner acceleration
        if (dist > radius * 0.9 && dist < radius * 1.8) {
          speed *= 1 + (obs.height / 50) * 0.5 * Math.max(0, 1 - (dist - radius) / radius);
        }
      }

      if (inside) { speed = 0; }

      const len = Math.sqrt(dX * dX + dZ * dZ);
      cells[r * cols + c] = { x: cellX, z: cellZ, speed, dirX: dX / len, dirZ: dZ / len };
    }
  }

  return { cells, bounds };
}


/**
 * Build a single merged mesh where every grid cell is colored by wind speed.
 * Uses vertex colors so one draw call covers the whole heatmap.
 *
 * Color scale (speed in m/s):
 *   0–3   : green  (calm)
 *   3–6   : cyan→blue (breezy)
 *   6–15  : yellow→orange (uncomfortable)
 *   15+   : red (dangerous)
 */
function createWindHeatmap(cells: WindCell[]): THREE.Mesh {
  const validCells = cells.filter(c => c.speed > 0.1); // skip inside-building cells
  const size = GRID_RES * 0.92;
  const half = size / 2;

  const positions = new Float32Array(validCells.length * 4 * 3);
  const vColors   = new Float32Array(validCells.length * 4 * 3);
  const indices   = new Uint32Array(validCells.length * 6);

  const col = new THREE.Color();

  for (let i = 0; i < validCells.length; i++) {
    const { x, z, speed } = validCells[i];
    const b = i * 12;

    positions[b]      = x - half; positions[b + 1]  = 1.5; positions[b + 2]  = z - half;
    positions[b + 3]  = x + half; positions[b + 4]  = 1.5; positions[b + 5]  = z - half;
    positions[b + 6]  = x + half; positions[b + 7]  = 1.5; positions[b + 8]  = z + half;
    positions[b + 9]  = x - half; positions[b + 10] = 1.5; positions[b + 11] = z + half;

    // Map speed to color
    if (speed < 3) {
      // 0–3 m/s: green
      col.setRGB(0.1, 0.75, 0.2);
    } else if (speed < COMFORT_THRESHOLD) {
      // 3–6 m/s: green → yellow
      const t = (speed - 3) / (COMFORT_THRESHOLD - 3);
      col.setRGB(0.1 + t * 0.9, 0.75, 0.2 - t * 0.2);
    } else if (speed < SAFETY_THRESHOLD) {
      // 6–15 m/s: yellow → orange → red
      const t = (speed - COMFORT_THRESHOLD) / (SAFETY_THRESHOLD - COMFORT_THRESHOLD);
      col.setRGB(1.0, 0.65 - t * 0.55, 0.0);
    } else {
      // 15+ m/s: red
      col.setRGB(0.95, 0.05, 0.05);
    }

    for (let v = 0; v < 4; v++) {
      vColors[(i * 4 + v) * 3]     = col.r;
      vColors[(i * 4 + v) * 3 + 1] = col.g;
      vColors[(i * 4 + v) * 3 + 2] = col.b;
    }

    const vi = i * 4, ib = i * 6;
    indices[ib] = vi; indices[ib+1] = vi+1; indices[ib+2] = vi+2;
    indices[ib+3] = vi; indices[ib+4] = vi+2; indices[ib+5] = vi+3;
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geom.setAttribute("color",    new THREE.BufferAttribute(vColors, 3));
  geom.setIndex(new THREE.BufferAttribute(indices, 1));

  const mesh = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.45,
    side: THREE.DoubleSide,
    depthWrite: false,
  }));
  mesh.name = "windHeatmap";
  mesh.renderOrder = 9998;
  return mesh;
}


export interface WindVisualization {
  group: THREE.Group;
  update: (deltaTime: number) => void;
  dispose: () => void;
}

export async function createWindVisualization(
  buildings: Building[],
  projection: typeof CityProjection,
): Promise<WindVisualization> {
  const group = new THREE.Group();
  group.name = "windLayer";

  const { cells } = await computeWindField(buildings, projection);

  group.add(createWindHeatmap(cells));
  group.add(createWindArrows(cells));

  function update(_deltaTime: number) {
    // Pulse arrow opacity — heatmap is static
    const arrowGroup = group.getObjectByName("windArrows") as THREE.Group | undefined;
    if (arrowGroup) {
      const mat = arrowGroup.userData.arrowMaterial as THREE.MeshBasicMaterial | undefined;
      if (mat) mat.opacity = 0.5 + 0.3 * Math.sin(Date.now() * 0.003);
    }
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

function createWindArrows(cells: WindCell[]): THREE.Group {
  const group = new THREE.Group();
  group.name = "windArrows";

  // Sample every 2nd cell, cap at 200 arrows
  const eligible: WindCell[] = [];
  for (let i = 0; i < cells.length && eligible.length < 200; i += 2) {
    if (cells[i] && cells[i].speed >= COMFORT_THRESHOLD * 0.7) eligible.push(cells[i]);
  }
  if (eligible.length === 0) return group;

  const arrowGeom = new THREE.ConeGeometry(2.5, 7, 4);
  arrowGeom.rotateX(Math.PI / 2);

  const mat = new THREE.MeshBasicMaterial({
    transparent: true, opacity: 0.6, depthWrite: false, vertexColors: true,
  });

  const mesh = new THREE.InstancedMesh(arrowGeom, mat, eligible.length);
  mesh.renderOrder = 9996;

  const dummy = new THREE.Object3D();
  const col = new THREE.Color();

  for (let i = 0; i < eligible.length; i++) {
    const cell = eligible[i];
    dummy.position.set(cell.x, 4, cell.z);
    dummy.rotation.y = -Math.atan2(cell.dirZ, cell.dirX) + Math.PI / 2;
    dummy.scale.setScalar(0.5 + (cell.speed / SAFETY_THRESHOLD) * 0.8);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    col.set(cell.speed >= SAFETY_THRESHOLD ? 0xff3333 : cell.speed >= COMFORT_THRESHOLD ? 0xffaa33 : 0x3366ff);
    mesh.setColorAt(i, col);
  }

  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

  group.add(mesh);
  group.userData.arrowMaterial = mat;
  return group;
}
