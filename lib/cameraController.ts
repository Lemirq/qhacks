import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as TWEEN from '@tweenjs/tween.js';
import { CityProjection } from './projection';

/**
 * Sets up OrbitControls for the Three.js camera
 *
 * @param camera - The Three.js camera to control
 * @param renderer - The Three.js renderer (needed for DOM element)
 * @returns Configured OrbitControls instance
 */
export function setupControls(
  camera: THREE.Camera,
  renderer: THREE.WebGLRenderer
): OrbitControls {
  const controls = new OrbitControls(camera, renderer.domElement);

  // Enable smooth damping for fluid camera movement
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;

  // Allow nearly full rotation while preventing camera from going below ground
  // Math.PI * 0.495 = ~89 degrees from vertical (almost horizontal, but stays above ground)
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.minPolarAngle = 0; // Allow view from directly above

  // Enable all control types
  controls.enableZoom = true;
  controls.enablePan = true;
  controls.enableRotate = true;

  // Set expanded zoom limits for better exploration
  controls.minDistance = 2;   // Zoom in very close
  controls.maxDistance = 100000; // Zoom out for regional view

  // Adjust speeds for better user experience
  controls.panSpeed = 1.5; // Faster panning
  controls.rotateSpeed = 0.8; // Slightly slower rotation for precision
  controls.zoomSpeed = 1.2; // Slightly faster zoom

  return controls;
}

/**
 * Animates camera from Kingston overview to Queen's campus
 * Smooth flyover animation using TWEEN.js
 *
 * @param camera - The Three.js camera to animate
 * @param controls - OrbitControls instance (for updating target)
 * @returns Promise that resolves when animation completes
 */
export function flyToQueens(
  camera: THREE.Camera,
  controls: OrbitControls
): Promise<void> {
  return new Promise((resolve) => {
    // Get Queen's University center point from projection system
    const [queensLng, queensLat] = CityProjection.getCenter();
    const queensPosition = CityProjection.projectToWorld([queensLng, queensLat]);

    // Starting position: High altitude view of Kingston area
    const startPosition = {
      x: queensPosition.x - 400,
      y: 600,
      z: queensPosition.z + 400,
    };

    // End position: Closer view of Queen's campus
    const endPosition = {
      x: queensPosition.x - 100,
      y: 200,
      z: queensPosition.z + 100,
    };

    // Starting lookAt target: General Kingston area
    const startTarget = {
      x: queensPosition.x,
      y: 0,
      z: queensPosition.z,
    };

    // Ending lookAt target: Queen's campus center
    const endTarget = {
      x: queensPosition.x,
      y: 0,
      z: queensPosition.z,
    };

    // Set initial camera state
    camera.position.set(startPosition.x, startPosition.y, startPosition.z);
    controls.target.set(startTarget.x, startTarget.y, startTarget.z);
    controls.update();

    // Create tween for camera position
    const positionTween = new TWEEN.Tween(startPosition)
      .to(endPosition, 3500) // 3.5 second duration
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate(() => {
        camera.position.set(startPosition.x, startPosition.y, startPosition.z);
      });

    // Create tween for camera target (lookAt point)
    const targetTween = new TWEEN.Tween(startTarget)
      .to(endTarget, 3500) // Same duration
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate(() => {
        controls.target.set(startTarget.x, startTarget.y, startTarget.z);
        controls.update();
      })
      .onComplete(() => {
        resolve();
      });

    // Start both tweens simultaneously
    positionTween.start();
    targetTween.start();
  });
}

/**
 * Updates all active TWEEN animations
 * Should be called in the animation loop
 *
 * @param time - Current time in milliseconds (optional, uses performance.now() if not provided)
 */
export function updateTweens(time?: number): void {
  TWEEN.update(time);
}

/**
 * Flies camera to a specific geographic location
 *
 * @param camera - The Three.js camera to animate
 * @param controls - OrbitControls instance
 * @param lngLat - Target [longitude, latitude]
 * @param altitude - Camera altitude in meters (default: 800)
 * @param duration - Animation duration in milliseconds (default: 2000)
 * @returns Promise that resolves when animation completes
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

    // Current position
    const startPosition = {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
    };

    // End position with offset for angled view
    const endPosition = {
      x: targetPosition.x - 100,
      y: altitude,
      z: targetPosition.z + 100,
    };

    // Current target
    const startTarget = {
      x: controls.target.x,
      y: controls.target.y,
      z: controls.target.z,
    };

    // New target at location
    const endTarget = {
      x: targetPosition.x,
      y: 0,
      z: targetPosition.z,
    };

    // Animate camera position
    const positionTween = new TWEEN.Tween(startPosition)
      .to(endPosition, duration)
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate(() => {
        camera.position.set(startPosition.x, startPosition.y, startPosition.z);
      });

    // Animate camera target
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

    // Start both tweens
    positionTween.start();
    targetTween.start();
  });
}
