import * as THREE from "three";

/**
 * Scene groups for organizing objects hierarchically
 */
export interface SceneGroups {
  environment: THREE.Group;
  staticGeometry: THREE.Group;
  dynamicObjects: THREE.Group;
  debug: THREE.Group;
}

/**
 * Scene manager return type
 */
export interface SceneManager {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  groups: SceneGroups;
}

/**
 * Create and configure the Three.js scene infrastructure
 * @param canvas - The canvas element to render to
 * @returns Scene manager with scene, camera, renderer, and organized groups
 */
export function createSceneManager(canvas: HTMLCanvasElement): SceneManager {
  // Create scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf0f8ff); // Very light blue/white (alice blue)

  // Create organized groups
  const groups: SceneGroups = {
    environment: new THREE.Group(),
    staticGeometry: new THREE.Group(),
    dynamicObjects: new THREE.Group(),
    debug: new THREE.Group(),
  };

  // Disable auto-update for static geometry (performance optimization)
  groups.staticGeometry.matrixAutoUpdate = false;

  // Add groups to scene in logical order
  scene.add(groups.environment);
  scene.add(groups.staticGeometry);
  scene.add(groups.dynamicObjects);
  scene.add(groups.debug);

  // Initially hide debug group
  groups.debug.visible = false;

  // Setup lighting - bright white lighting for clean appearance
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
  directionalLight.position.set(500, 800, 300);
  directionalLight.castShadow = true;

  // Configure shadow properties
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.near = 10;
  directionalLight.shadow.camera.far = 3000;
  directionalLight.shadow.camera.left = -1500;
  directionalLight.shadow.camera.right = 1500;
  directionalLight.shadow.camera.top = 1500;
  directionalLight.shadow.camera.bottom = -1500;

  scene.add(directionalLight);

  // Setup camera
  const camera = new THREE.PerspectiveCamera(
    60, // FOV
    canvas.clientWidth / canvas.clientHeight, // Aspect ratio
    1, // Near plane
    100000, // Far plane
  );

  // Initial position for zoomed out Kingston view
  camera.position.set(0, 500, 800);
  camera.lookAt(0, 0, 0);

  // Setup renderer
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
  });

  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap at 2 for performance

  // Enable shadows
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Enable local clipping for building cross-section timeline
  renderer.localClippingEnabled = true;

  return {
    scene,
    camera,
    renderer,
    groups,
  };
}

/**
 * Toggle debug group visibility
 * @param groups - Scene groups
 * @param visible - Whether debug group should be visible
 */
export function toggleDebugGroup(groups: SceneGroups, visible: boolean): void {
  groups.debug.visible = visible;
}

/**
 * Handle canvas resize
 * @param camera - Camera to update
 * @param renderer - Renderer to update
 * @param width - New width
 * @param height - New height
 */
export function handleResize(
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer,
  width: number,
  height: number,
): void {
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}
