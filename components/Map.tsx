"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import * as turf from "@turf/turf";
import * as THREE from "three";

interface MapProps {
  initialCenter?: [number, number];
  initialZoom?: number;
  style?: string;
  className?: string;
}

type CarType = "sedan" | "suv" | "truck" | "compact";

interface Car {
  id: string;
  position: [number, number];
  routeGeometry: GeoJSON.Feature<GeoJSON.LineString>;
  distance: number; // Distance traveled along route in kilometers
  bearing: number;
  speed: number; // Speed in km/h
  maxSpeed: number; // Maximum speed in km/h
  color: string;
  type: CarType;
  mesh?: THREE.Mesh;
  stoppedAtLight: boolean;
}

interface TrafficLight {
  id: string;
  position: [number, number];
  state: "red" | "yellow" | "green";
  timer: number;
  mesh?: THREE.Mesh;
  intersectionId: string; // Group lights by intersection
  direction: "ns" | "ew"; // North-South or East-West
}

const TRAFFIC_LIGHT_TIMINGS = {
  green: 8000,  // 8 seconds
  yellow: 2000, // 2 seconds
  red: 8000,    // 8 seconds
};

// Create 3D car models
function createCarModel(type: CarType, color: string): THREE.Mesh {
  const group = new THREE.Group();
  const material = new THREE.MeshPhongMaterial({ color });

  switch (type) {
    case "sedan": {
      // Car body (lower part)
      const bodyGeometry = new THREE.BoxGeometry(1.8, 0.8, 4.2);
      const body = new THREE.Mesh(bodyGeometry, material);
      body.position.y = 0.4;
      group.add(body);

      // Cabin (upper part)
      const cabinGeometry = new THREE.BoxGeometry(1.6, 0.6, 2.2);
      const cabin = new THREE.Mesh(cabinGeometry, material);
      cabin.position.y = 1.1;
      cabin.position.z = -0.3;
      group.add(cabin);
      break;
    }
    case "suv": {
      // Larger, taller body
      const bodyGeometry = new THREE.BoxGeometry(2.0, 1.0, 4.5);
      const body = new THREE.Mesh(bodyGeometry, material);
      body.position.y = 0.5;
      group.add(body);

      const cabinGeometry = new THREE.BoxGeometry(1.9, 0.8, 2.5);
      const cabin = new THREE.Mesh(cabinGeometry, material);
      cabin.position.y = 1.3;
      cabin.position.z = -0.2;
      group.add(cabin);
      break;
    }
    case "truck": {
      // Truck cab
      const cabGeometry = new THREE.BoxGeometry(2.0, 1.2, 2.0);
      const cab = new THREE.Mesh(cabGeometry, material);
      cab.position.y = 1.0;
      cab.position.z = 1.5;
      group.add(cab);

      // Truck bed
      const bedGeometry = new THREE.BoxGeometry(2.0, 0.8, 3.0);
      const bed = new THREE.Mesh(bedGeometry, material);
      bed.position.y = 0.4;
      bed.position.z = -1.0;
      group.add(bed);
      break;
    }
    case "compact": {
      // Smaller car
      const bodyGeometry = new THREE.BoxGeometry(1.6, 0.7, 3.5);
      const body = new THREE.Mesh(bodyGeometry, material);
      body.position.y = 0.35;
      group.add(body);

      const cabinGeometry = new THREE.BoxGeometry(1.5, 0.5, 2.0);
      const cabin = new THREE.Mesh(cabinGeometry, material);
      cabin.position.y = 0.95;
      cabin.position.z = -0.2;
      group.add(cabin);
      break;
    }
  }

  // Add wheels to all car types
  const wheelGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 16);
  const wheelMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });

  const wheelPositions = [
    [0.7, 0.3, 1.2],   // front left
    [-0.7, 0.3, 1.2],  // front right
    [0.7, 0.3, -1.2],  // back left
    [-0.7, 0.3, -1.2], // back right
  ];

  wheelPositions.forEach(([x, y, z]) => {
    const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, y, z);
    group.add(wheel);
  });

  // Convert group to mesh for easier handling
  const finalGeometry = new THREE.BoxGeometry(1, 1, 1);
  const finalMesh = new THREE.Mesh(finalGeometry, material);
  finalMesh.add(group);
  finalMesh.visible = true;

  return finalMesh;
}

// Create traffic light 3D model
function createTrafficLightModel(): THREE.Group {
  const group = new THREE.Group();

  // Pole
  const poleGeometry = new THREE.CylinderGeometry(0.1, 0.1, 5, 8);
  const poleMaterial = new THREE.MeshPhongMaterial({ color: 0x444444 });
  const pole = new THREE.Mesh(poleGeometry, poleMaterial);
  pole.position.y = 2.5;
  group.add(pole);

  // Light housing
  const housingGeometry = new THREE.BoxGeometry(0.4, 1.2, 0.3);
  const housingMaterial = new THREE.MeshPhongMaterial({ color: 0x222222 });
  const housing = new THREE.Mesh(housingGeometry, housingMaterial);
  housing.position.y = 5;
  group.add(housing);

  // Lights (red, yellow, green) - use MeshStandardMaterial with emissive
  const lightGeometry = new THREE.SphereGeometry(0.15, 16, 16);

  const redLight = new THREE.Mesh(
    lightGeometry,
    new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0x330000,
      emissiveIntensity: 1,
    })
  );
  redLight.position.set(0, 5.4, 0.2);
  redLight.name = "red";
  group.add(redLight);

  const yellowLight = new THREE.Mesh(
    lightGeometry,
    new THREE.MeshStandardMaterial({
      color: 0xffff00,
      emissive: 0x333300,
      emissiveIntensity: 1,
    })
  );
  yellowLight.position.set(0, 5.0, 0.2);
  yellowLight.name = "yellow";
  group.add(yellowLight);

  const greenLight = new THREE.Mesh(
    lightGeometry,
    new THREE.MeshStandardMaterial({
      color: 0x00ff00,
      emissive: 0x003300,
      emissiveIntensity: 1,
    })
  );
  greenLight.position.set(0, 4.6, 0.2);
  greenLight.name = "green";
  group.add(greenLight);

  return group;
}

// Fetch route from Mapbox Directions API
async function fetchRoute(
  start: [number, number],
  end: [number, number],
  accessToken: string
): Promise<GeoJSON.Feature<GeoJSON.LineString> | null> {
  try {
    // Use overview=full for maximum detail in road geometry
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&overview=full&steps=true&access_token=${accessToken}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      console.log(`Route has ${route.geometry.coordinates.length} coordinate points`);
      return {
        type: "Feature",
        properties: {},
        geometry: route.geometry,
      };
    }
  } catch (error) {
    console.error("Error fetching route:", error);
  }
  return null;
}

// Define route start/end points around Queen's University
function getRouteEndpoints(): Array<{
  start: [number, number];
  end: [number, number];
  color: string;
  type: CarType;
}> {
  return [
    {
      start: [-76.4970, 44.2260],
      end: [-76.4850, 44.2320],
      color: "#FF0000",
      type: "sedan",
    },
    {
      start: [-76.4850, 44.2320],
      end: [-76.4970, 44.2260],
      color: "#0000FF",
      type: "suv",
    },
    {
      start: [-76.5000, 44.2300],
      end: [-76.4800, 44.2280],
      color: "#00FF00",
      type: "compact",
    },
    {
      start: [-76.4800, 44.2350],
      end: [-76.4950, 44.2250],
      color: "#FFA500",
      type: "truck",
    },
  ];
}

// Define real intersections around Queen's University campus
function getRealIntersections(): Array<{
  id: string;
  name: string;
  center: [number, number];
}> {
  return [
    {
      id: "union-university",
      name: "Union St & University Ave",
      center: [-76.4950, 44.2285],
    },
    {
      id: "division-princess",
      name: "Division St & Princess St",
      center: [-76.4870, 44.2305],
    },
    {
      id: "university-bader",
      name: "University Ave & Bader Ln",
      center: [-76.4920, 44.2270],
    },
  ];
}

// Find which routes pass near this intersection and place lights
function placeTrafficLightsForIntersection(
  intersection: { id: string; center: [number, number] },
  routes: Array<{ route: GeoJSON.Feature<GeoJSON.LineString>; routeId: number }>
): TrafficLight[] {
  const lights: TrafficLight[] = [];
  const INTERSECTION_RADIUS = 50; // meters

  routes.forEach(({ route, routeId }) => {
    try {
      // Check if route passes near this intersection
      const nearestPoint = turf.nearestPointOnLine(route, turf.point(intersection.center));
      const distance = turf.distance(
        turf.point(intersection.center),
        nearestPoint,
        { units: 'meters' }
      );

      if (distance < INTERSECTION_RADIUS) {
        // This route passes through the intersection
        const approachDistance = Math.max(0, nearestPoint.properties.location! - 0.015); // 15m before
        const lightPosition = turf.along(route, approachDistance, { units: 'kilometers' });

        // Calculate bearing to determine direction
        const nextPoint = turf.along(route, approachDistance + 0.005, { units: 'kilometers' });
        const bearing = turf.bearing(
          turf.point(lightPosition.geometry.coordinates),
          turf.point(nextPoint.geometry.coordinates)
        );

        const normalizedBearing = ((bearing + 360) % 360);
        const direction: "ns" | "ew" =
          (normalizedBearing > 45 && normalizedBearing < 135) ||
          (normalizedBearing > 225 && normalizedBearing < 315)
            ? "ew"
            : "ns";

        lights.push({
          id: `${intersection.id}-route-${routeId}`,
          position: lightPosition.geometry.coordinates as [number, number],
          state: "red",
          timer: Date.now(),
          intersectionId: intersection.id,
          direction,
        });

        console.log(`Placed light at ${intersection.id} for route ${routeId} (${direction})`);
      }
    } catch (e) {
      console.error("Error placing light:", e);
    }
  });

  return lights;
}

// Place traffic lights on approach to intersection
function placeTrafficLightsAtIntersection(
  intersection: [number, number],
  route: GeoJSON.Feature<GeoJSON.LineString>,
  routeIndex: number
): { position: [number, number]; direction: "ns" | "ew"; bearing: number } | null {
  try {
    // Find the point on the route closest to the intersection
    const nearestPoint = turf.nearestPointOnLine(route, turf.point(intersection));
    const distanceToIntersection = nearestPoint.properties.location || 0;

    // Place light 15 meters before the intersection
    const approachDistance = Math.max(0, distanceToIntersection - 0.015); // 15m in km
    const lightPosition = turf.along(route, approachDistance, { units: 'kilometers' });

    // Calculate bearing at this point to determine direction
    const nextPoint = turf.along(route, approachDistance + 0.005, { units: 'kilometers' });
    const bearing = turf.bearing(
      turf.point(lightPosition.geometry.coordinates),
      turf.point(nextPoint.geometry.coordinates)
    );

    // Determine if this is primarily N-S or E-W based on bearing
    // 0° = North, 90° = East, 180° = South, 270° = West
    const normalizedBearing = ((bearing + 360) % 360);
    const direction: "ns" | "ew" =
      (normalizedBearing > 45 && normalizedBearing < 135) ||
      (normalizedBearing > 225 && normalizedBearing < 315)
        ? "ew"
        : "ns";

    return {
      position: lightPosition.geometry.coordinates as [number, number],
      direction,
      bearing: normalizedBearing,
    };
  } catch (e) {
    console.error("Error placing traffic light:", e);
    return null;
  }
}

// Initialize traffic simulation with 3D models
async function initializeTrafficSimulation(map: mapboxgl.Map, center: [number, number]) {
  const accessToken = mapboxgl.accessToken;
  const cars: Car[] = [];
  const trafficLights: TrafficLight[] = [];
  const routeEndpoints = getRouteEndpoints();

  // Mapbox GL JS to Mercator projection utilities
  const modelTransform = {
    translateX: 0,
    translateY: 0,
    translateZ: 0,
    rotateX: Math.PI / 2,
    rotateY: 0,
    rotateZ: 0,
    scale: 5.41843220338983e-8,
  };

  // Fetch routes for each endpoint pair
  console.log("Fetching routes from Mapbox Directions API...");
  for (let i = 0; i < routeEndpoints.length; i++) {
    const { start, end, color, type } = routeEndpoints[i];
    const routeGeometry = await fetchRoute(start, end, accessToken);

    if (routeGeometry && routeGeometry.geometry.coordinates.length > 0) {
      // Create 2 cars per route with different starting positions
      for (let j = 0; j < 2; j++) {
        const routeLength = turf.length(routeGeometry, { units: 'kilometers' });
        cars.push({
          id: `car-${i}-${j}`,
          position: routeGeometry.geometry.coordinates[0] as [number, number],
          routeGeometry: routeGeometry,
          distance: (j * routeLength) / 2, // Stagger cars along route
          bearing: 0,
          speed: 30 + Math.random() * 20, // 30-50 km/h
          maxSpeed: 30 + Math.random() * 20,
          color: color,
          type: type,
          stoppedAtLight: false,
        });
      }
      console.log(`Created route ${i} with ${routeGeometry.geometry.coordinates.length} points`);
    }
  }

  // Get unique routes from cars
  const uniqueRoutes = Array.from(
    new Set(cars.map(car => JSON.stringify(car.routeGeometry.geometry)))
  ).map((s, i) => ({
    route: {
      type: 'Feature' as const,
      properties: {},
      geometry: JSON.parse(s),
    },
    routeId: i,
  }));

  // Use predefined intersections at real Queen's locations
  const realIntersections = getRealIntersections();
  console.log(`Using ${realIntersections.length} predefined intersections`);

  // Place traffic lights at each intersection
  realIntersections.forEach((intersection) => {
    const lightsAtIntersection = placeTrafficLightsForIntersection(
      intersection,
      uniqueRoutes
    );

    // Set initial states - alternate NS and EW
    const nsLights = lightsAtIntersection.filter(l => l.direction === "ns");
    const ewLights = lightsAtIntersection.filter(l => l.direction === "ew");

    nsLights.forEach(light => {
      light.state = "green";
      trafficLights.push(light);
    });

    ewLights.forEach(light => {
      light.state = "red";
      trafficLights.push(light);
    });

    console.log(`${intersection.name}: ${nsLights.length} NS lights, ${ewLights.length} EW lights`);
  });

  console.log(`Created ${cars.length} cars and ${trafficLights.length} traffic lights`);

  // Add route visualization (for debugging)
  map.addSource('car-routes', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: cars.map(car => car.routeGeometry),
    },
  });

  map.addLayer({
    id: 'car-routes-layer',
    type: 'line',
    source: 'car-routes',
    paint: {
      'line-color': '#888',
      'line-width': 3,
      'line-opacity': 0.5,
    },
  });

  // Add 2D car markers (for debugging/fallback)
  map.addSource('cars', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: [],
    },
  });

  map.addLayer({
    id: 'cars-2d-layer',
    type: 'circle',
    source: 'cars',
    paint: {
      'circle-radius': 8,
      'circle-color': ['get', 'color'],
      'circle-stroke-width': 2,
      'circle-stroke-color': '#fff',
    },
  });

  // Add traffic light markers (2D for debugging)
  map.addSource('traffic-lights', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: trafficLights.map(light => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: light.position,
        },
        properties: {
          state: light.state,
        },
      })),
    },
  });

  map.addLayer({
    id: 'traffic-lights-layer',
    type: 'circle',
    source: 'traffic-lights',
    paint: {
      'circle-radius': 10,
      'circle-color': [
        'match',
        ['get', 'state'],
        'red', '#ff0000',
        'yellow', '#ffff00',
        'green', '#00ff00',
        '#888888'
      ],
      'circle-stroke-width': 3,
      'circle-stroke-color': '#000',
    },
  });

  // Custom Three.js layer
  const customLayer: mapboxgl.CustomLayerInterface = {
    id: '3d-model',
    type: 'custom',
    renderingMode: '3d',

    onAdd: function (map: mapboxgl.Map, gl: WebGLRenderingContext) {
      this.camera = new THREE.Camera();
      this.scene = new THREE.Scene();

      // Lighting
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(0, 70, 100).normalize();
      this.scene.add(directionalLight);

      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      this.scene.add(ambientLight);

      // Create car meshes
      cars.forEach(car => {
        const mesh = createCarModel(car.type, car.color);
        mesh.scale.set(
          modelTransform.scale,
          -modelTransform.scale,
          modelTransform.scale
        );
        car.mesh = mesh;
        this.scene.add(mesh);
      });

      // Create traffic light meshes
      trafficLights.forEach(light => {
        const mesh = createTrafficLightModel();
        mesh.scale.set(
          modelTransform.scale,
          -modelTransform.scale,
          modelTransform.scale
        );
        light.mesh = mesh as any;
        this.scene.add(mesh);
      });

      this.map = map;

      // Create WebGL renderer without sharing context
      this.renderer = new THREE.WebGLRenderer({
        canvas: map.getCanvas(),
        antialias: true,
        alpha: true,
      });

      this.renderer.autoClear = false;
    },

    render: function (gl: WebGLRenderingContext, matrix: number[]) {
      const rotationX = new THREE.Matrix4().makeRotationAxis(
        new THREE.Vector3(1, 0, 0),
        modelTransform.rotateX
      );
      const rotationY = new THREE.Matrix4().makeRotationAxis(
        new THREE.Vector3(0, 1, 0),
        modelTransform.rotateY
      );
      const rotationZ = new THREE.Matrix4().makeRotationAxis(
        new THREE.Vector3(0, 0, 1),
        modelTransform.rotateZ
      );

      const m = new THREE.Matrix4().fromArray(matrix);
      const l = new THREE.Matrix4()
        .makeTranslation(
          modelTransform.translateX,
          modelTransform.translateY,
          modelTransform.translateZ
        )
        .scale(
          new THREE.Vector3(
            modelTransform.scale,
            -modelTransform.scale,
            modelTransform.scale
          )
        )
        .multiply(rotationX)
        .multiply(rotationY)
        .multiply(rotationZ);

      this.camera.projectionMatrix = m.multiply(l);
      this.renderer.resetState();
      this.renderer.render(this.scene, this.camera);
      this.map.triggerRepaint();
    },
  } as any;

  map.addLayer(customLayer);

  // Helper: Convert lng/lat to world coordinates
  function projectToWorld(lngLat: [number, number]): THREE.Vector3 {
    const projected = mapboxgl.MercatorCoordinate.fromLngLat(lngLat as any, 0);
    return new THREE.Vector3(projected.x, projected.y, 0);
  }

  // Helper: Check if car is near traffic light
  function isNearTrafficLight(car: Car, light: TrafficLight): boolean {
    const distance = turf.distance(
      turf.point(car.position),
      turf.point(light.position),
      { units: 'meters' }
    );
    return distance < 30; // Within 30 meters
  }

  // Update traffic lights with coordinated timing
  function updateTrafficLights() {
    const now = Date.now();

    // Group lights by intersection (using object instead of Map to avoid naming conflict)
    const intersectionGroups: Record<string, TrafficLight[]> = {};
    trafficLights.forEach(light => {
      if (!intersectionGroups[light.intersectionId]) {
        intersectionGroups[light.intersectionId] = [];
      }
      intersectionGroups[light.intersectionId].push(light);
    });

    // Update each intersection's lights together
    Object.entries(intersectionGroups).forEach(([intersectionId, lights]) => {
      // Use the first light's timer to coordinate the whole intersection
      const primaryLight = lights[0];
      const elapsed = now - primaryLight.timer;
      const duration = TRAFFIC_LIGHT_TIMINGS[primaryLight.state];

      if (elapsed >= duration) {
        // Cycle all lights at this intersection
        lights.forEach(light => {
          if (light.state === "green") {
            light.state = "yellow";
          } else if (light.state === "yellow") {
            light.state = "red";
          } else {
            // When changing from red to green, only change the opposite direction
            // NS and EW should alternate
            const nsLights = lights.filter(l => l.direction === "ns");
            const ewLights = lights.filter(l => l.direction === "ew");

            const nsAreRed = nsLights.every(l => l.state === "red");
            const ewAreRed = ewLights.every(l => l.state === "red");

            if (nsAreRed && light.direction === "ns") {
              light.state = "green";
            } else if (ewAreRed && light.direction === "ew") {
              light.state = "green";
            }
          }
          light.timer = now;

          // Update light visualization
          if (light.mesh) {
            const redLight = light.mesh.getObjectByName("red") as THREE.Mesh;
            const yellowLight = light.mesh.getObjectByName("yellow") as THREE.Mesh;
            const greenLight = light.mesh.getObjectByName("green") as THREE.Mesh;

            if (redLight && yellowLight && greenLight) {
              const redMaterial = redLight.material as THREE.MeshStandardMaterial;
              const yellowMaterial = yellowLight.material as THREE.MeshStandardMaterial;
              const greenMaterial = greenLight.material as THREE.MeshStandardMaterial;

              if (redMaterial.emissive) {
                redMaterial.emissive.setHex(light.state === "red" ? 0xff0000 : 0x330000);
              }
              if (yellowMaterial.emissive) {
                yellowMaterial.emissive.setHex(light.state === "yellow" ? 0xffff00 : 0x333300);
              }
              if (greenMaterial.emissive) {
                greenMaterial.emissive.setHex(light.state === "green" ? 0x00ff00 : 0x003300);
              }
            }
          }
        });
      }
    });
  }

  // Animation loop
  let lastTime = Date.now();

  function animateCars() {
    const currentTime = Date.now();
    const deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    // Update traffic lights
    updateTrafficLights();

    cars.forEach(car => {
      // Check traffic lights
      let shouldStop = false;
      for (const light of trafficLights) {
        if (isNearTrafficLight(car, light) && (light.state === "red" || light.state === "yellow")) {
          shouldStop = true;
          car.stoppedAtLight = true;
          break;
        }
      }

      if (!shouldStop) {
        car.stoppedAtLight = false;
      }

      // Update speed based on traffic lights
      if (car.stoppedAtLight) {
        car.speed = Math.max(0, car.speed - 50 * deltaTime); // Brake
      } else {
        car.speed = Math.min(car.maxSpeed, car.speed + 30 * deltaTime); // Accelerate
      }

      // Move car
      const distanceTraveled = (car.speed * deltaTime) / 3600;
      car.distance += distanceTraveled;

      const routeLength = turf.length(car.routeGeometry, { units: 'kilometers' });
      if (car.distance >= routeLength) {
        car.distance = 0;
      }

      const point = turf.along(car.routeGeometry, car.distance, { units: 'kilometers' });
      car.position = point.geometry.coordinates as [number, number];

      const lookaheadDistance = 0.002;
      const nextDistance = Math.min(car.distance + lookaheadDistance, routeLength);
      const nextPoint = turf.along(car.routeGeometry, nextDistance, { units: 'kilometers' });

      if (nextPoint && nextPoint.geometry.coordinates) {
        car.bearing = turf.bearing(
          turf.point(car.position),
          turf.point(nextPoint.geometry.coordinates)
        );
      }

      // Update 3D mesh position
      if (car.mesh) {
        const worldPos = projectToWorld(car.position);
        car.mesh.position.set(worldPos.x, worldPos.y, worldPos.z);
        car.mesh.rotation.z = (car.bearing * Math.PI) / 180;
      }
    });

    // Update traffic light positions
    trafficLights.forEach(light => {
      if (light.mesh) {
        const worldPos = projectToWorld(light.position);
        light.mesh.position.set(worldPos.x, worldPos.y, worldPos.z);
      }
    });

    // Update 2D car markers (check if source exists first)
    if (map && map.getSource && map.getSource('cars')) {
      const carsSource = map.getSource('cars') as mapboxgl.GeoJSONSource;
      if (carsSource && carsSource.setData) {
        carsSource.setData({
          type: 'FeatureCollection',
          features: cars.map(car => ({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: car.position,
            },
            properties: {
              id: car.id,
              color: car.color,
              speed: car.speed.toFixed(1),
            },
          })),
        });
      }
    }

    // Update traffic light markers (check if source exists first)
    if (map && map.getSource && map.getSource('traffic-lights')) {
      const lightsSource = map.getSource('traffic-lights') as mapboxgl.GeoJSONSource;
      if (lightsSource && lightsSource.setData) {
        lightsSource.setData({
          type: 'FeatureCollection',
          features: trafficLights.map(light => ({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: light.position,
            },
            properties: {
              state: light.state,
            },
          })),
        });
      }
    }

    requestAnimationFrame(animateCars);
  }

  console.log("Starting 3D animation...");
  animateCars();
}

export default function Map({
  initialCenter = [-76.479679, 44.232809], // Queen's University - specific location
  initialZoom = 18.5,
  style = "mapbox://styles/mapbox/standard", // Standard style with enhanced 3D buildings
  className = "w-full h-full",
}: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isSatellite, setIsSatellite] = useState(false);

  useEffect(() => {
    if (!mapContainer.current) return;
    if (map.current) return; // Initialize map only once

    // Set Mapbox access token
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

    // Starting position - initial animation point
    const startCenter: [number, number] = [-76.479679, 44.232809];
    const startZoom = 13;

    // Initialize map with starting position
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: style,
      center: startCenter,
      zoom: startZoom,
      pitch: 30, // Tilt for 3D effect
      bearing: 180,
      // Configure Standard style for monochrome/gray theme
      config: {
        basemap: {
          lightPreset: "day",
          showPointOfInterestLabels: false,
          showPlaceLabels: false,
          showRoadLabels: true,
        },
      },
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    // Add geolocate control for user's current location
    const geolocateControl = new mapboxgl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true,
      },
      trackUserLocation: true,
      showUserHeading: true,
      showUserLocation: true,
    });
    map.current.addControl(geolocateControl, "top-right");

    // Set map loaded state and start zoom animation
    map.current.on("load", () => {
      setMapLoaded(true);

      if (!map.current) return;

      const mapInstance = map.current;

      // Initialize traffic simulation
      initializeTrafficSimulation(mapInstance, initialCenter);

      // Fly to Queen's University after a short delay
      setTimeout(() => {
        map.current?.flyTo({
          center: initialCenter,
          zoom: initialZoom,
          pitch: 60,
          bearing: 220,
          duration: 3000, // 3 seconds animation
          essential: true,
        });
      }, 500);
    });

    // Cleanup on unmount
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [initialCenter, initialZoom, style]);

  // Toggle satellite view
  const toggleSatellite = () => {
    if (map.current) {
      const newStyle = isSatellite
        ? "mapbox://styles/mapbox/standard"
        : "mapbox://styles/mapbox/satellite-streets-v12";

      // When style loads, re-add our custom layers
      map.current.once('style.load', () => {
        if (!map.current) return;

        // Re-add car routes layer
        if (!map.current.getSource('car-routes')) {
          map.current.addSource('car-routes', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: [],
            },
          });
        }

        if (!map.current.getLayer('car-routes-layer')) {
          map.current.addLayer({
            id: 'car-routes-layer',
            type: 'line',
            source: 'car-routes',
            paint: {
              'line-color': '#888',
              'line-width': 3,
              'line-opacity': 0.5,
            },
          });
        }

        // Re-add cars layer
        if (!map.current.getSource('cars')) {
          map.current.addSource('cars', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: [],
            },
          });
        }

        if (!map.current.getLayer('cars-2d-layer')) {
          map.current.addLayer({
            id: 'cars-2d-layer',
            type: 'circle',
            source: 'cars',
            paint: {
              'circle-radius': 8,
              'circle-color': ['get', 'color'],
              'circle-stroke-width': 2,
              'circle-stroke-color': '#fff',
            },
          });
        }

        // Re-add traffic lights layer
        if (!map.current.getSource('traffic-lights')) {
          map.current.addSource('traffic-lights', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: [],
            },
          });
        }

        if (!map.current.getLayer('traffic-lights-layer')) {
          map.current.addLayer({
            id: 'traffic-lights-layer',
            type: 'circle',
            source: 'traffic-lights',
            paint: {
              'circle-radius': 10,
              'circle-color': [
                'match',
                ['get', 'state'],
                'red', '#ff0000',
                'yellow', '#ffff00',
                'green', '#00ff00',
                '#888888'
              ],
              'circle-stroke-width': 3,
              'circle-stroke-color': '#000',
            },
          });
        }
      });

      map.current.setStyle(newStyle);
      setIsSatellite(!isSatellite);
    }
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className={className} />
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900">
          <p className="text-gray-600 dark:text-gray-400">Loading map...</p>
        </div>
      )}
      {/* Satellite toggle button */}
      <button
        onClick={toggleSatellite}
        className="absolute top-4 left-4 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors z-10 font-medium text-sm"
      >
        {isSatellite ? "🗺️ Standard" : "🛰️ Satellite"}
      </button>
    </div>
  );
}
