import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as TWEEN from '@tweenjs/tween.js';
import { CityProjection } from './projection';

/**
 * Sets up OrbitControls for the Three.js camera
 */
export function setupControls(
  camera: THREE.Camera,
  renderer: THREE.WebGLRenderer
): OrbitControls {
  const controls = new OrbitControls(camera, renderer.domElement);

  controls.enableDamping = true;
  controls.dampingFactor = 0.1;

  controls.maxPolarAngle = Math.PI * 0.495;
  controls.minPolarAngle = 0;

  controls.enableZoom = true;
  controls.enablePan = true;
  controls.enableRotate = true;

  controls.minDistance = 2;
  controls.maxDistance = 100000;

  controls.panSpeed = 1.5;
  controls.rotateSpeed = 0.8;
  controls.zoomSpeed = 1.2;

  // Use logarithmic zoom so it feels consistent at all distances
  // (close = small steps, far = big steps)
  controls.zoomToCursor = true;

  return controls;
}

// ==================== WASD Keyboard Controls ====================

const MOVE_SPEED_BASE = 200; // world units/sec at normal speed
const MOVE_SPEED_SHIFT = 800; // world units/sec with shift held
const ALTITUDE_SPEED = 150; // world units/sec for Q/E up/down

interface KeyState {
  w: boolean;
  a: boolean;
  s: boolean;
  d: boolean;
  q: boolean;
  e: boolean;
  shift: boolean;
}

let keyState: KeyState = {
  w: false, a: false, s: false, d: false,
  q: false, e: false, shift: false,
};
let keyListenersAttached = false;

function onKeyDown(event: KeyboardEvent) {
  // Don't capture when typing in inputs
  const tag = (event.target as HTMLElement)?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

  const key = event.key.toLowerCase();
  if (key in keyState) {
    (keyState as any)[key] = true;
  }
  if (event.shiftKey) keyState.shift = true;
}

function onKeyUp(event: KeyboardEvent) {
  const key = event.key.toLowerCase();
  if (key in keyState) {
    (keyState as any)[key] = false;
  }
  if (!event.shiftKey) keyState.shift = false;
}

/**
 * Attach WASD keyboard listeners to window.
 * Call once during setup. Returns a cleanup function.
 */
export function attachKeyboardControls(): () => void {
  if (keyListenersAttached) return () => {};
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  keyListenersAttached = true;

  return () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    keyListenersAttached = false;
    keyState = { w: false, a: false, s: false, d: false, q: false, e: false, shift: false };
  };
}

/**
 * Update camera position based on currently held keys.
 * Call every frame from the animation loop.
 *
 * Movement is relative to the camera's current facing direction (projected onto XZ):
 *   W/S = forward/backward, A/D = strafe left/right,
 *   Q/E = down/up, Shift = 4x speed
 */
export function updateKeyboardMovement(
  camera: THREE.Camera,
  controls: OrbitControls,
  deltaTime: number,
): void {
  const { w, a, s, d, q, e, shift } = keyState;
  if (!w && !a && !s && !d && !q && !e) return;

  // Speed scales with altitude — faster when high up, slower when close to ground
  const altitude = Math.max(camera.position.y, 10);
  const altitudeScale = Math.sqrt(altitude / 100); // sqrt for smooth scaling
  const speed = (shift ? MOVE_SPEED_SHIFT : MOVE_SPEED_BASE) * altitudeScale * deltaTime;

  // Forward direction = camera look direction projected onto XZ plane
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();

  // Right direction = perpendicular to forward in XZ
  const right = new THREE.Vector3(-forward.z, 0, forward.x);

  const move = new THREE.Vector3();

  if (w) move.add(forward.clone().multiplyScalar(speed));
  if (s) move.add(forward.clone().multiplyScalar(-speed));
  if (d) move.add(right.clone().multiplyScalar(speed));
  if (a) move.add(right.clone().multiplyScalar(-speed));

  // Vertical movement
  const vertSpeed = (shift ? ALTITUDE_SPEED * 4 : ALTITUDE_SPEED) * altitudeScale * deltaTime;
  if (e) move.y += vertSpeed;
  if (q) move.y -= vertSpeed;

  // Prevent going below ground
  const newY = camera.position.y + move.y;
  if (newY < 5) move.y = 5 - camera.position.y;

  // Move both camera and orbit target together (so orbit center follows)
  camera.position.add(move);
  controls.target.add(move);
}

// ==================== Fly-to animations ====================

/**
 * Animates camera from Kingston overview to Queen's campus
 */
export function flyToQueens(
  camera: THREE.Camera,
  controls: OrbitControls
): Promise<void> {
  return new Promise((resolve) => {
    const [queensLng, queensLat] = CityProjection.getCenter();
    const queensPosition = CityProjection.projectToWorld([queensLng, queensLat]);

    const startPosition = {
      x: queensPosition.x - 400,
      y: 600,
      z: queensPosition.z + 400,
    };

    const endPosition = {
      x: queensPosition.x - 100,
      y: 200,
      z: queensPosition.z + 100,
    };

    const startTarget = {
      x: queensPosition.x,
      y: 0,
      z: queensPosition.z,
    };

    const endTarget = {
      x: queensPosition.x,
      y: 0,
      z: queensPosition.z,
    };

    camera.position.set(startPosition.x, startPosition.y, startPosition.z);
    controls.target.set(startTarget.x, startTarget.y, startTarget.z);
    controls.update();

    const positionTween = new TWEEN.Tween(startPosition)
      .to(endPosition, 3500)
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate(() => {
        camera.position.set(startPosition.x, startPosition.y, startPosition.z);
      });

    const targetTween = new TWEEN.Tween(startTarget)
      .to(endTarget, 3500)
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate(() => {
        controls.target.set(startTarget.x, startTarget.y, startTarget.z);
        controls.update();
      })
      .onComplete(() => {
        resolve();
      });

    positionTween.start();
    targetTween.start();
  });
}

/**
 * Updates all active TWEEN animations
 */
export function updateTweens(time?: number): void {
  TWEEN.update(time);
}

// ==================== Street-level POV ====================

/** Pedestrian eye height in world units (≈1.7m real-world × scale factor) */
const STREET_LEVEL_HEIGHT = 1.7 * (10 / 1.4);

/** Minimum camera Y in street view — prevents clipping through the ground */
const STREET_MIN_Y = 1.5;

/** Saved bird-eye camera state so we can return */
interface SavedCameraState {
  position: THREE.Vector3;
  target: THREE.Vector3;
  minPolarAngle: number;
  maxPolarAngle: number;
  minDistance: number;
  maxDistance: number;
  enablePan: boolean;
  enableZoom: boolean;
  zoomToCursor: boolean;
}

let savedCameraState: SavedCameraState | null = null;
let groundClampListener: (() => void) | null = null;

/**
 * Animate camera from current bird-eye position down to street level at a world position.
 * Configures orbit controls for first-person look-around from a fixed point.
 */
export function flyToStreetLevel(
  camera: THREE.Camera,
  controls: OrbitControls,
  worldX: number,
  worldZ: number,
  duration: number = 1500,
): Promise<void> {
  // Save current state for returning later
  savedCameraState = {
    position: camera.position.clone(),
    target: controls.target.clone(),
    minPolarAngle: controls.minPolarAngle,
    maxPolarAngle: controls.maxPolarAngle,
    minDistance: controls.minDistance,
    maxDistance: controls.maxDistance,
    enablePan: controls.enablePan,
    enableZoom: controls.enableZoom,
    zoomToCursor: controls.zoomToCursor,
  };

  return new Promise((resolve) => {
    const startPosition = {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
    };

    // Place camera at street level, slightly offset so we're "on the sidewalk"
    const endPosition = {
      x: worldX + 15,
      y: STREET_LEVEL_HEIGHT,
      z: worldZ + 15,
    };

    // Look toward the building from the offset position
    const startTarget = {
      x: controls.target.x,
      y: controls.target.y,
      z: controls.target.z,
    };

    const endTarget = {
      x: worldX,
      y: STREET_LEVEL_HEIGHT,
      z: worldZ,
    };

    const positionTween = new TWEEN.Tween(startPosition)
      .to(endPosition, duration)
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate(() => {
        camera.position.set(startPosition.x, startPosition.y, startPosition.z);
      });

    const targetTween = new TWEEN.Tween(startTarget)
      .to(endTarget, duration)
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate(() => {
        controls.target.set(startTarget.x, startTarget.y, startTarget.z);
        controls.update();
      })
      .onComplete(() => {
        // Configure controls for first-person look-around
        controls.enablePan = false;
        controls.enableZoom = false;
        controls.zoomToCursor = false;
        controls.minDistance = 0.1;
        controls.maxDistance = 20;
        // Allow looking up freely, but cap downward angle so the camera
        // can't orbit below ground level (π*0.75 ≈ 135° = ~45° above horizon)
        controls.minPolarAngle = 0.05;
        controls.maxPolarAngle = Math.PI * 0.75;
        controls.update();

        // Hard clamp: if OrbitControls still nudges the camera below ground,
        // snap it back up on every change event
        groundClampListener = () => {
          if ((camera as THREE.PerspectiveCamera).position.y < STREET_MIN_Y) {
            (camera as THREE.PerspectiveCamera).position.y = STREET_MIN_Y;
            controls.target.y = Math.max(controls.target.y, STREET_MIN_Y);
          }
        };
        controls.addEventListener('change', groundClampListener);

        resolve();
      });

    positionTween.start();
    targetTween.start();
  });
}

/**
 * Return camera from street level back to the saved bird-eye view.
 * @param overrideTarget - If provided, animate to this position/target instead of the module-level savedCameraState.
 */
export function exitStreetLevel(
  camera: THREE.Camera,
  controls: OrbitControls,
  duration: number = 1500,
  overrideTarget?: { position: THREE.Vector3; target: THREE.Vector3 },
): Promise<void> {
  const state = overrideTarget
    ? { ...savedCameraState, position: overrideTarget.position, target: overrideTarget.target } as SavedCameraState
    : savedCameraState;

  savedCameraState = null;

  if (!state) {
    // No saved state — just reset controls to defaults
    controls.enablePan = true;
    controls.enableZoom = true;
    controls.zoomToCursor = true;
    controls.minDistance = 2;
    controls.maxDistance = 100000;
    controls.minPolarAngle = 0;
    controls.maxPolarAngle = Math.PI * 0.495;
    controls.update();
    return Promise.resolve();
  }

  // Remove ground clamp before animating back up
  if (groundClampListener) {
    controls.removeEventListener('change', groundClampListener);
    groundClampListener = null;
  }

  return new Promise((resolve) => {
    // Phase 1: shoot straight up from street level to a high altitude
    //          directly above the current position (~600 units up)
    const phase1Start = {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
    };
    const phase1End = {
      x: camera.position.x,
      y: Math.max(state.position.y, 600),
      z: camera.position.z,
    };
    const targetPhase1Start = {
      x: controls.target.x,
      y: controls.target.y,
      z: controls.target.z,
    };
    const targetPhase1End = {
      x: controls.target.x,
      y: 0,
      z: controls.target.z,
    };

    // Phase 2: glide from high-up to the saved bird-eye position
    const phase2Start = { x: phase1End.x, y: phase1End.y, z: phase1End.z };
    const phase2End = { x: state.position.x, y: state.position.y, z: state.position.z };
    const targetPhase2Start = { x: targetPhase1End.x, y: 0, z: targetPhase1End.z };
    const targetPhase2End = { x: state.target.x, y: state.target.y, z: state.target.z };

    const phase2Pos = new TWEEN.Tween(phase2Start)
      .to(phase2End, duration * 0.7)
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate(() => {
        camera.position.set(phase2Start.x, phase2Start.y, phase2Start.z);
      });

    const phase2Target = new TWEEN.Tween(targetPhase2Start)
      .to(targetPhase2End, duration * 0.7)
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate(() => {
        controls.target.set(targetPhase2Start.x, targetPhase2Start.y, targetPhase2Start.z);
        controls.update();
      })
      .onComplete(() => {
        controls.enablePan = state.enablePan;
        controls.enableZoom = state.enableZoom;
        controls.zoomToCursor = state.zoomToCursor;
        controls.minDistance = state.minDistance;
        controls.maxDistance = state.maxDistance;
        controls.minPolarAngle = state.minPolarAngle;
        controls.maxPolarAngle = state.maxPolarAngle;
        controls.update();
        resolve();
      });

    const phase1Pos = new TWEEN.Tween(phase1Start)
      .to(phase1End, duration * 0.5)
      .easing(TWEEN.Easing.Cubic.In)
      .onUpdate(() => {
        camera.position.set(phase1Start.x, phase1Start.y, phase1Start.z);
      })
      .onComplete(() => {
        phase2Pos.start();
        phase2Target.start();
      });

    const phase1Target = new TWEEN.Tween(targetPhase1Start)
      .to(targetPhase1End, duration * 0.5)
      .easing(TWEEN.Easing.Cubic.In)
      .onUpdate(() => {
        controls.target.set(targetPhase1Start.x, targetPhase1Start.y, targetPhase1Start.z);
        controls.update();
      });

    phase1Pos.start();
    phase1Target.start();
  });
}

/**
 * Whether we have a saved bird-eye state (i.e. we're in street mode)
 */
export function isInStreetMode(): boolean {
  return savedCameraState !== null;
}

/**
 * Update WASD movement for street-level mode.
 * Keeps camera at pedestrian height, moves along XZ plane.
 */
export function updateStreetWalkMovement(
  camera: THREE.Camera,
  controls: OrbitControls,
  deltaTime: number,
): void {
  const { w, a, s, d } = keyState;
  if (!w && !a && !s && !d) return;

  const walkSpeed = 120 * deltaTime;

  // Forward direction = camera look direction projected onto XZ plane
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();

  const right = new THREE.Vector3(-forward.z, 0, forward.x);

  const move = new THREE.Vector3();
  if (w) move.add(forward.clone().multiplyScalar(walkSpeed));
  if (s) move.add(forward.clone().multiplyScalar(-walkSpeed));
  if (d) move.add(right.clone().multiplyScalar(walkSpeed));
  if (a) move.add(right.clone().multiplyScalar(-walkSpeed));

  // Keep at street height
  move.y = 0;

  camera.position.add(move);
  controls.target.add(move);
}

/**
 * Flies camera to a specific geographic location
 */
export function flyToLocation(
  camera: THREE.Camera,
  controls: OrbitControls,
  lngLat: [number, number],
  altitude: number = 200,
  duration: number = 2000
): Promise<void> {
  return new Promise((resolve) => {
    const targetPosition = CityProjection.projectToWorld(lngLat);

    const startPosition = {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
    };

    const endPosition = {
      x: targetPosition.x - 100,
      y: altitude,
      z: targetPosition.z + 100,
    };

    const startTarget = {
      x: controls.target.x,
      y: controls.target.y,
      z: controls.target.z,
    };

    const endTarget = {
      x: targetPosition.x,
      y: 0,
      z: targetPosition.z,
    };

    const positionTween = new TWEEN.Tween(startPosition)
      .to(endPosition, duration)
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate(() => {
        camera.position.set(startPosition.x, startPosition.y, startPosition.z);
      });

    const targetTween = new TWEEN.Tween(startTarget)
      .to(endTarget, duration)
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate(() => {
        controls.target.set(startTarget.x, startTarget.y, startTarget.z);
        controls.update();
      })
      .onComplete(() => {
        resolve();
      });

    positionTween.start();
    targetTween.start();
  });
}
