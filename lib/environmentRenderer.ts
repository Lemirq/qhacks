import * as THREE from 'three';

/**
 * Fetches satellite imagery for a bounding box
 * Uses Mapbox Static Images API with fallback to OpenStreetMap
 * @param bbox - [south, west, north, east] bounding box
 * @returns Promise resolving to satellite image URL or null
 */
export async function fetchSatelliteImagery(
  bbox: [number, number, number, number]
): Promise<string | null> {
  const [south, west, north, east] = bbox;

  // Try Mapbox first (best quality)
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  if (mapboxToken) {
    try {
      // Use Mapbox Static Images API with bbox
      // Format: /[minLng,minLat,maxLng,maxLat]/[width]x[height]@2x
      // Max size is 1280x1280 without @2x, or 640x640 with @2x (giving 1280x1280 retina)
      // We'll use the max retina resolution for best quality
      const width = 1280;
      const height = 1280;
      const url = `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/[${west},${south},${east},${north}]/${width}x${height}@2x?access_token=${mapboxToken}`;

      console.log('🛰️  Fetching Mapbox satellite imagery (2560x2560 retina)...');
      const response = await fetch(url, { method: 'HEAD' }); // Quick check
      if (response.ok) {
        console.log('✅ Mapbox satellite imagery URL ready');
        return url;
      }
    } catch (error) {
      console.warn('Mapbox satellite imagery failed, trying alternative...', error);
    }
  }

  // Fallback: Use ESRI World Imagery (free, good quality)
  try {
    // Calculate center and zoom level
    const centerLat = (south + north) / 2;
    const centerLng = (west + east) / 2;

    // For static imagery, we can construct a tile URL
    // Using OpenStreetMap's Esri World Imagery tiles
    const zoom = 15; // Good detail level for campus
    const tileSize = 512;

    console.log('🛰️  Using ESRI World Imagery...');

    // Note: For production, you'd want to properly tile and stitch images
    // For now, we'll use a simple center-based approach
    const esriUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${west},${south},${east},${north}&bboxSR=4326&imageSR=4326&size=2048,2048&format=png&f=image`;

    console.log('✅ ESRI satellite imagery URL generated');
    return esriUrl;
  } catch (error) {
    console.warn('ESRI satellite imagery failed', error);
  }

  console.log('⚠️  No satellite imagery available, using fallback color');
  return null;
}

/**
 * Creates a ground plane covering the specified bounding box
 * @param bbox - Bounding box defining the area to cover
 * @param projection - CityProjection class for coordinate conversion
 * @param satelliteTexture - Optional satellite texture to apply
 * @returns Ground mesh
 */
export function createGround(
  bbox: { minLat: number; maxLat: number; minLng: number; maxLng: number },
  projection: { projectToWorld: (coord: [number, number]) => THREE.Vector3 },
  satelliteTexture?: THREE.Texture
): THREE.Mesh {
  // Calculate bounds in world coordinates
  const topLeft = projection.projectToWorld([bbox.minLng, bbox.maxLat]);
  const topRight = projection.projectToWorld([bbox.maxLng, bbox.maxLat]);
  const bottomLeft = projection.projectToWorld([bbox.minLng, bbox.minLat]);
  const bottomRight = projection.projectToWorld([bbox.maxLng, bbox.minLat]);

  const width = Math.abs(topRight.x - topLeft.x);
  const depth = Math.abs(bottomLeft.z - topLeft.z);
  const centerX = (topLeft.x + bottomRight.x) / 2;
  const centerZ = (topLeft.z + bottomRight.z) / 2;

  console.log(`Ground dimensions: ${width.toFixed(1)}m x ${depth.toFixed(1)}m at (${centerX.toFixed(1)}, 0, ${centerZ.toFixed(1)})`);

  // Create ground geometry - add padding for seamless appearance
  const padding = 1.2;
  const geometry = new THREE.PlaneGeometry(width * padding, depth * padding);

  // Rotate geometry to be horizontal (in XZ plane) BEFORE creating mesh
  geometry.rotateX(-Math.PI / 2);

  // Create material - use satellite texture if available, otherwise grass color
  const material = new THREE.MeshStandardMaterial({
    map: satelliteTexture || null,
    color: satelliteTexture ? 0xffffff : 0x88cc88, // White with texture, or grass green
    roughness: 0.9,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });

  const ground = new THREE.Mesh(geometry, material);

  // Position with calibrated offset for proper alignment with buildings
  // These values were manually adjusted to align satellite imagery with 3D buildings
  ground.position.set(centerX + 22.2, -10.0, centerZ - 800.6);

  // Scale calibration for perfect alignment
  ground.scale.set(0.910, 1.000, 0.950);

  ground.receiveShadow = true;

  return ground;
}

/**
 * Creates a sky dome with gradient shader
 * @returns Sky mesh
 */
export function createSky(): THREE.Mesh {
  // Create hemisphere for sky dome
  const geometry = new THREE.SphereGeometry(5000, 32, 15, 0, Math.PI * 2, 0, Math.PI / 2);

  // Gradient shader: blue at top fading to white at horizon
  const material = new THREE.ShaderMaterial({
    uniforms: {
      topColor: { value: new THREE.Color(0x0077ff) }, // Sky blue
      bottomColor: { value: new THREE.Color(0xffffff) }, // White horizon
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition).z;
        gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(h, 0.6), 0.0)), 1.0);
      }
    `,
    side: THREE.BackSide,
    depthWrite: false,
  });

  const sky = new THREE.Mesh(geometry, material);
  sky.position.z = 0;

  return sky;
}

/**
 * Adds exponential fog to the scene for atmospheric depth
 * @param scene - Three.js scene to add fog to
 */
export function setupFog(scene: THREE.Scene): void {
  // Light blue-gray fog for atmospheric effect
  scene.fog = new THREE.FogExp2(0xccccff, 0.0015);
}

/**
 * Configures shadow settings for the renderer and light
 * @param renderer - Three.js WebGL renderer
 * @param light - Directional light for shadows
 */
export function setupShadows(
  renderer: THREE.WebGLRenderer,
  light: THREE.DirectionalLight
): void {
  // Enable shadow mapping on renderer
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadows for better quality

  // Configure directional light for shadows
  light.castShadow = true;

  // Set up shadow camera bounds
  const shadowSize = 2000;
  light.shadow.camera.left = -shadowSize;
  light.shadow.camera.right = shadowSize;
  light.shadow.camera.top = shadowSize;
  light.shadow.camera.bottom = -shadowSize;
  light.shadow.camera.near = 0.5;
  light.shadow.camera.far = 5000;

  // Shadow map resolution
  light.shadow.mapSize.width = 2048;
  light.shadow.mapSize.height = 2048;

  // Shadow bias to reduce artifacts
  light.shadow.bias = -0.0001;
}
