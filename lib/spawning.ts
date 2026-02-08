/**
 * Traffic-Based Car Spawning System
 * Manages the lifecycle of cars in the autonomous traffic simulation
 */

import * as turf from "@turf/turf";
import * as THREE from "three";
import { RoadNetwork, RoadNode, Destination } from "./roadNetwork";
import { Pathfinder, Route } from "./pathfinding";
import { VehiclePhysicsConfig } from "./vehiclePhysics";

export type CarType = "sedan" | "suv" | "truck" | "compact";

export interface SpawnPoint {
  id: string;
  position: [number, number]; // [lon, lat]
  roadNodeId: string; // Associated road network node
  spawnRate: number; // Cars per minute
  lastSpawnTime: number; // Timestamp of last spawn
  direction?: string; // Optional direction (e.g., "northbound", "eastbound")
  active: boolean; // Can be toggled on/off
}

export interface SpawnedCar {
  id: string;
  type: CarType;
  color: string;
  spawnPointId: string;
  spawnTime: number;
  position: [number, number];
  destination: Destination;
  route: Route;
  currentEdgeId: string | null;
  distanceOnEdge: number; // Distance traveled on current edge (meters)
  speed: number; // Current speed (km/h)
  maxSpeed: number; // Maximum speed for this car (km/h)
  bearing: number; // Current direction (degrees)
  stoppedAtLight: boolean;

  // Physics integration fields
  physicsProfile: VehiclePhysicsConfig;
  targetSpeed: number; // Target speed from behavior controller (km/h)
  acceleration: number; // Current acceleration (m/s²)

  // Behavior fields
  currentBehavior?: string; // Current behavior state (for debugging)
  behaviorTimer: number; // Timer for behavior state changes

  // Rendering fields
  meshRef?: THREE.Object3D; // Reference to 3D mesh for light updates
}

export interface SpawnerConfig {
  maxCars: number; // Maximum number of active cars
  globalSpawnRate: number; // Base spawn rate modifier (0.0 - 2.0)
  despawnRadius: number; // Distance from destination to despawn (meters)
  defaultCarSpeed: number; // Default max speed (km/h)
  carTypeDistribution: {
    sedan: number;
    suv: number;
    truck: number;
    compact: number;
  };
}

const DEFAULT_CONFIG: SpawnerConfig = {
  maxCars: 50,
  globalSpawnRate: 1.0,
  despawnRadius: 20,
  defaultCarSpeed: 40,
  carTypeDistribution: {
    sedan: 0.4, // 40%
    suv: 0.25, // 25%
    truck: 0.15, // 15%
    compact: 0.2, // 20%
  },
};

const CAR_COLORS = [
  "#FF0000", // Red
  "#0000FF", // Blue
  "#00FF00", // Green
  "#FFA500", // Orange
  "#800080", // Purple
  "#FFFF00", // Yellow
  "#00FFFF", // Cyan
  "#FF00FF", // Magenta
  "#C0C0C0", // Silver
  "#000000", // Black
  "#FFFFFF", // White
  "#808080", // Gray
];

export class Spawner {
  private spawnPoints: Map<string, SpawnPoint> = new Map();
  private activeCars: Map<string, SpawnedCar> = new Map();
  private config: SpawnerConfig;
  private nextCarId: number = 0;
  private pathfinder: Pathfinder;

  constructor(
    private roadNetwork: RoadNetwork,
    config?: Partial<SpawnerConfig>,
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.pathfinder = new Pathfinder(roadNetwork);
  }

  /**
   * Define spawn points around Queen's campus (road entry points)
   */
  initializeQueensSpawnPoints(): void {
    const spawnPoints: Omit<SpawnPoint, "lastSpawnTime" | "active">[] = [
      {
        id: "union-st-west",
        position: [-76.5, 44.2285],
        roadNodeId: "entry-union-west",
        spawnRate: 2.0, // 2 cars per minute
        direction: "eastbound",
      },
      {
        id: "union-st-east",
        position: [-76.485, 44.2285],
        roadNodeId: "entry-union-east",
        spawnRate: 1.5,
        direction: "westbound",
      },
      {
        id: "university-ave-north",
        position: [-76.495, 44.235],
        roadNodeId: "entry-university-north",
        spawnRate: 1.8,
        direction: "southbound",
      },
      {
        id: "university-ave-south",
        position: [-76.495, 44.225],
        roadNodeId: "entry-university-south",
        spawnRate: 1.5,
        direction: "northbound",
      },
      {
        id: "division-st-north",
        position: [-76.487, 44.234],
        roadNodeId: "entry-division-north",
        spawnRate: 2.2,
        direction: "southbound",
      },
      {
        id: "division-st-south",
        position: [-76.487, 44.227],
        roadNodeId: "entry-division-south",
        spawnRate: 1.3,
        direction: "northbound",
      },
      {
        id: "princess-st-west",
        position: [-76.492, 44.231],
        roadNodeId: "entry-princess-west",
        spawnRate: 1.7,
        direction: "eastbound",
      },
      {
        id: "princess-st-east",
        position: [-76.48, 44.231],
        roadNodeId: "entry-princess-east",
        spawnRate: 1.4,
        direction: "westbound",
      },
    ];

    spawnPoints.forEach((sp) => {
      this.addSpawnPoint({
        ...sp,
        lastSpawnTime: Date.now(),
        active: true,
      });
    });

    console.log(
      `✅ Initialized ${this.spawnPoints.size} spawn points around Queen's campus`,
    );
  }

  /**
   * Add a spawn point
   */
  addSpawnPoint(spawnPoint: SpawnPoint): void {
    this.spawnPoints.set(spawnPoint.id, spawnPoint);
  }

  /**
   * Remove a spawn point
   */
  removeSpawnPoint(spawnPointId: string): void {
    this.spawnPoints.delete(spawnPointId);
  }

  /**
   * Toggle spawn point active state
   */
  toggleSpawnPoint(spawnPointId: string, active: boolean): void {
    const spawnPoint = this.spawnPoints.get(spawnPointId);
    if (spawnPoint) {
      spawnPoint.active = active;
    }
  }

  /**
   * Update spawner (call this in animation loop)
   */
  update(deltaTime: number): void {
    const now = Date.now();

    // Try to spawn cars at each spawn point
    this.spawnPoints.forEach((spawnPoint) => {
      if (!spawnPoint.active) return;
      if (this.activeCars.size >= this.config.maxCars) return;

      const timeSinceLastSpawn = now - spawnPoint.lastSpawnTime;
      const spawnInterval =
        60000 / (spawnPoint.spawnRate * this.config.globalSpawnRate); // ms

      if (timeSinceLastSpawn >= spawnInterval) {
        this.spawnCar(spawnPoint);
        spawnPoint.lastSpawnTime = now;
      }
    });

    // Check for cars that reached their destination
    this.checkForDespawns();
  }

  /**
   * Spawn a car at a spawn point with a random destination
   */
  private spawnCar(spawnPoint: SpawnPoint): SpawnedCar | null {
    // Select random destination (weighted)
    const destination = this.selectDestination();
    if (!destination) {
      console.warn("⚠️ No destinations available");
      return null;
    }

    console.log(
      `🚀 Attempting to spawn car from ${spawnPoint.id} [${spawnPoint.position}] to ${destination.name} [${destination.position}]`,
    );

    // Find route from spawn point to destination
    let route = this.pathfinder.findRoute(
      spawnPoint.position,
      destination.position,
    );

    // FALLBACK: If pathfinding fails, create a simple route with just the spawn position
    if (!route) {
      console.warn(
        `⚠️ Could not find route, creating fallback route at spawn point`,
      );
      // Create a minimal route that just stays at the spawn point for now
      const edges = this.roadNetwork.getEdges();
      if (edges.length > 0) {
        const randomEdge = edges[Math.floor(Math.random() * edges.length)];
        route = {
          nodes: [],
          edges: [randomEdge.id],
          totalDistance: randomEdge.length,
          estimatedTime: randomEdge.length / 10, // ~10 m/s
          waypoints: randomEdge.geometry,
        };
        console.log(`✅ Created fallback route on edge ${randomEdge.id}`);
      } else {
        console.error(`❌ No edges available for fallback route`);
        return null;
      }
    } else {
      console.log(
        `✅ Route found! ${route.waypoints.length} waypoints, ${route.edges.length} edges`,
      );
    }

    // Select car type based on distribution
    const carType = this.selectCarType();
    const color = this.selectCarColor();

    // Get physics profile for this car type
    const physicsProfile = this.getPhysicsProfileForType(carType);

    // Use first waypoint of route as actual spawn position (on the road)
    const actualSpawnPos =
      route.waypoints.length > 0
        ? (route.waypoints[0] as [number, number])
        : spawnPoint.position;

    const car: SpawnedCar = {
      id: `car-${this.nextCarId++}`,
      type: carType,
      color,
      spawnPointId: spawnPoint.id,
      spawnTime: Date.now(),
      position: actualSpawnPos, // Use route waypoint, not spawn point
      destination,
      route,
      currentEdgeId: route.edges[0] || null,
      distanceOnEdge: 0,
      speed: 0, // Start from stopped
      maxSpeed: this.config.defaultCarSpeed + (Math.random() * 20 - 10), // ±10 km/h variance
      bearing: 0,
      stoppedAtLight: false,

      // Physics integration
      physicsProfile,
      targetSpeed: this.config.defaultCarSpeed,
      acceleration: 0,

      // Behavior fields
      currentBehavior: "cruising",
      behaviorTimer: 0,

      // Mesh reference (set later in ThreeMap)
      meshRef: undefined,
    };

    // Calculate initial bearing
    if (route.waypoints.length >= 2) {
      car.bearing = turf.bearing(
        turf.point(route.waypoints[0]),
        turf.point(route.waypoints[1]),
      );
    }

    this.activeCars.set(car.id, car);
    console.log(
      `🚗 Spawned ${car.type} (${car.id}) at ${spawnPoint.id} → ${destination.name}`,
    );

    return car;
  }

  /**
   * Select destination using weighted random selection
   */
  private selectDestination(): Destination | null {
    const dest = this.roadNetwork.getRandomDestination();
    if (!dest) {
      console.error("❌ No destinations available in road network!");
    }
    return dest;
  }

  /**
   * Select car type based on distribution
   */
  private selectCarType(): CarType {
    const rand = Math.random();
    let cumulative = 0;

    for (const [type, probability] of Object.entries(
      this.config.carTypeDistribution,
    )) {
      cumulative += probability;
      if (rand <= cumulative) {
        return type as CarType;
      }
    }

    return "sedan"; // Fallback
  }

  /**
   * Select random car color
   */
  private selectCarColor(): string {
    return CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)];
  }

  /**
   * Get physics profile for car type
   */
  private getPhysicsProfileForType(type: CarType): VehiclePhysicsConfig {
    const profiles: Record<CarType, VehiclePhysicsConfig> = {
      sedan: {
        maxAcceleration: 3.0,
        maxDeceleration: 8.0,
        comfortDeceleration: 3.5,
        reactionTime: 1.0,
        minFollowDistance: 2.0,
        timeHeadway: 1.5,
        speedVariance: 0.1,
      },
      suv: {
        maxAcceleration: 2.5,
        maxDeceleration: 7.0,
        comfortDeceleration: 3.0,
        reactionTime: 1.1,
        minFollowDistance: 2.5,
        timeHeadway: 1.8,
        speedVariance: 0.12,
      },
      truck: {
        maxAcceleration: 1.8,
        maxDeceleration: 6.0,
        comfortDeceleration: 2.5,
        reactionTime: 1.3,
        minFollowDistance: 3.5,
        timeHeadway: 2.2,
        speedVariance: 0.08,
      },
      compact: {
        maxAcceleration: 3.2,
        maxDeceleration: 8.5,
        comfortDeceleration: 4.0,
        reactionTime: 0.9,
        minFollowDistance: 1.8,
        timeHeadway: 1.3,
        speedVariance: 0.15,
      },
    };

    return profiles[type];
  }

  /**
   * Check for cars that reached their destination and despawn them
   */
  private checkForDespawns(): void {
    const toDespawn: string[] = [];

    this.activeCars.forEach((car) => {
      const distanceToDestination = turf.distance(
        turf.point(car.position),
        turf.point(car.destination.position),
        { units: "meters" },
      );

      if (distanceToDestination < this.config.despawnRadius) {
        toDespawn.push(car.id);
      }
    });

    toDespawn.forEach((carId) => {
      const car = this.activeCars.get(carId);
      if (car) {
        console.log(
          `✅ Car ${carId} reached destination: ${car.destination.name}`,
        );
        this.despawnCar(carId);
      }
    });
  }

  /**
   * Manually despawn a car
   */
  despawnCar(carId: string): void {
    this.activeCars.delete(carId);
  }

  /**
   * Get all active cars
   */
  getActiveCars(): SpawnedCar[] {
    return Array.from(this.activeCars.values());
  }

  /**
   * Get car by ID
   */
  getCar(carId: string): SpawnedCar | undefined {
    return this.activeCars.get(carId);
  }

  /**
   * Get spawn points
   */
  getSpawnPoints(): SpawnPoint[] {
    return Array.from(this.spawnPoints.values());
  }

  /**
   * Update car position along its route
   */
  updateCarPosition(carId: string, deltaTime: number): void {
    const car = this.activeCars.get(carId);
    if (!car || !car.route || !car.currentEdgeId) return;

    // Calculate distance traveled this frame
    const distanceTraveled = (car.speed / 3.6) * deltaTime; // Convert km/h to m/s, multiply by deltaTime
    car.distanceOnEdge += distanceTraveled;

    // Get current edge
    const edge = this.roadNetwork.getEdge(car.currentEdgeId);
    if (!edge) return;

    // Check if we've completed this edge
    if (car.distanceOnEdge >= edge.length) {
      // Move to next edge
      const nextEdgeId = this.pathfinder.getNextEdge(
        car.currentEdgeId,
        car.route,
      );

      if (nextEdgeId) {
        car.currentEdgeId = nextEdgeId;
        car.distanceOnEdge = 0;
      } else {
        // Route complete, at destination
        return;
      }
    }

    // Update position along edge
    const progress = car.distanceOnEdge / edge.length;
    const line = turf.lineString(edge.geometry);
    const along = turf.along(line, car.distanceOnEdge / 1000, {
      units: "kilometers",
    });

    car.position = along.geometry.coordinates as [number, number];

    // Update bearing
    const lookaheadDistance = Math.min(car.distanceOnEdge + 10, edge.length); // Look 10m ahead
    const lookahead = turf.along(line, lookaheadDistance / 1000, {
      units: "kilometers",
    });
    car.bearing = turf.bearing(
      turf.point(car.position),
      turf.point(lookahead.geometry.coordinates),
    );
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SpawnerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): SpawnerConfig {
    return { ...this.config };
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      activeCars: this.activeCars.size,
      maxCars: this.config.maxCars,
      spawnPoints: this.spawnPoints.size,
      activeSpawnPoints: Array.from(this.spawnPoints.values()).filter(
        (sp) => sp.active,
      ).length,
    };
  }

  /**
   * Clear all cars (useful for reset)
   */
  clearAllCars(): void {
    this.activeCars.clear();
    console.log("🧹 Cleared all spawned cars");
  }

  /**
   * Reset spawner (clear cars and reset spawn timers)
   */
  reset(): void {
    this.clearAllCars();
    this.nextCarId = 0;
    const now = Date.now();
    this.spawnPoints.forEach((sp) => {
      sp.lastSpawnTime = now;
    });
    console.log("🔄 Spawner reset");
  }
}
