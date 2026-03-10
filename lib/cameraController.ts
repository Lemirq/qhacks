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
