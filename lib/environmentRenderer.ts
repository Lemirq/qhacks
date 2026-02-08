import * as THREE from "three";

/**
 * Fetches map imagery for a bounding box from OSM-based sources
 * Uses the same data source as buildings/roads for perfect alignment
 * @param bbox - [south, west, north, east] bounding box
 * @returns Promise resolving to map image URL or null
 */
export async function fetchSatelliteImagery(
  bbox: [number, number, number, number],
): Promise<string | null> {
  const [south, west, north, east] = bbox;

  // Try Mapbox Streets (OSM-based) for perfect alignment with 3D data
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  if (mapboxToken) {
    try {
      // Use Mapbox Static Images API with OSM-based streets style
      // This uses the same OSM data as our buildings/roads, ensuring perfect alignment
      const width = 1280;
      const height = 1280;

      // Try satellite first for realistic imagery
      const satelliteUrl = `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/[${west},${south},${east},${north}]/${width}x${height}@2x?access_token=${mapboxToken}`;

      console.log(
        "🗺️  Fetching Mapbox satellite-streets (OSM + satellite hybrid)...",
      );
      const satelliteResponse = await fetch(satelliteUrl, { method: "HEAD" });
      if (satelliteResponse.ok) {
        console.log("✅ Mapbox satellite-streets imagery URL ready");
        return satelliteUrl;
      }
    } catch (error) {
      console.warn(
        "Mapbox satellite-streets failed, trying streets-only...",
        error,
      );
    }

    try {
      // Fallback to pure streets style (OSM-based map without satellite)
      const width = 1280;
      const height = 1280;
      const streetsUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/[${west},${south},${east},${north}]/${width}x${height}@2x?access_token=${mapboxToken}`;

      console.log("🗺️  Fetching Mapbox streets (pure OSM rendering)...");
      const streetsResponse = await fetch(streetsUrl, { method: "HEAD" });
      if (streetsResponse.ok) {
        console.log("✅ Mapbox streets imagery URL ready");
        return streetsUrl;
      }
    } catch (error) {
      console.warn("Mapbox streets failed", error);
    }
  }

  // Fallback: Use OpenStreetMap static map API
  try {
    const centerLat = (south + north) / 2;
    const centerLng = (west + east) / 2;

    // Calculate appropriate zoom level for the bbox
    const latDiff = north - south;
    const zoom = Math.floor(Math.log2(360 / latDiff)) - 1;

    console.log("🗺️  Using StaticMap OSM renderer...");

    // Use staticmap service with OSM tiles
    const osmUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${centerLat},${centerLng}&zoom=${zoom}&size=2048x2048&maptype=mapnik`;

    console.log("✅ OSM static map URL generated");
    return osmUrl;
  } catch (error) {
    console.warn("OSM static map failed", error);
  }

  console.log("⚠️  No map imagery available, using fallback color");
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
  satelliteTexture?: THREE.Texture,
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

  console.log(
    `Ground dimensions: ${width.toFixed(1)}m x ${depth.toFixed(1)}m at (${centerX.toFixed(1)}, 0, ${centerZ.toFixed(1)})`,
  );

  // Create infinite ground geometry
  const geometry = new THREE.PlaneGeometry(100000, 100000); // 100km x 100km (effectively infinite)

  // Rotate geometry to be horizontal (in XZ plane) BEFORE creating mesh
  geometry.rotateX(-Math.PI / 2);

  // Create material - white ground
  const material = new THREE.MeshStandardMaterial({
    map: satelliteTexture || null,
    color: satelliteTexture ? 0xffffff : 0xffffff, // Pure white
    roughness: 0.9,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });

  const ground = new THREE.Mesh(geometry, material);

  // Position with calibrated offset for proper alignment with buildings
  // These values were manually adjusted to align satellite imagery with 3D buildings
  // Calibrated values: Position (33.3, -10.0, -750.9), Scale (0.980, 1.000, 0.920)
  ground.position.set(centerX + 33.3, -10.0, centerZ - 750.9);

  // Scale calibration for perfect alignment
  ground.scale.set(0.98, 1.0, 0.92);

  ground.receiveShadow = true;

  return ground;
}

/**
 * Creates a sky dome with gradient shader
 * @returns Sky mesh
 */
export function createSky(): THREE.Mesh {
  // Create hemisphere for sky dome
  const geometry = new THREE.SphereGeometry(
    5000,
    32,
    15,
    0,
    Math.PI * 2,
    0,
    Math.PI / 2,
  );

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
  light: THREE.DirectionalLight,
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
