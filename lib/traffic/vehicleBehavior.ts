/**
 * Vehicle Behavior Controller
 *
 * AI-driven vehicle decision making system that follows real traffic rules:
 * - Stop signs: Complete stop, 2-second wait, check cross-traffic
 * - Traffic signals: Obey red/yellow/green states
 * - Following distance: Maintain 2-second gap
 * - Collision avoidance: Emergency braking when needed
 *
 * Implements a state machine for realistic vehicle behavior.
 */

import * as turf from "@turf/turf";
import { SpawnedCar } from "../spawning";
import { CollisionSystem } from "./collisionSystem";
import {
  TrafficInfrastructureManager,
  TrafficSignal,
  StopSign,
  SignalState,
} from "../trafficInfrastructure";

export type VehicleBehaviorState =
  | "cruising" // Normal driving at target speed
  | "approaching_signal" // Slowing down for red/yellow light
  | "stopped_at_signal" // Waiting at red light
  | "approaching_stop_sign" // Approaching stop sign
  | "stopped_at_sign" // Stopped at stop sign
  | "yielding" // Waiting for right-of-way
  | "following" // Following another vehicle
  | "emergency_braking"; // Collision avoidance

export interface BehaviorContext {
  infrastructureManager: TrafficInfrastructureManager;
  collisionSystem: CollisionSystem;
  allVehicles: Map<string, SpawnedCar>;
  deltaTime: number;
}

export interface BehaviorResult {
  targetSpeed: number; // Target speed in km/h
  acceleration: number; // Acceleration in km/h per second
  state: VehicleBehaviorState;
  reason?: string; // Debug info about decision
}

export interface VehicleState {
  behaviorState: VehicleBehaviorState;
  targetSpeed: number;
  stoppedTime: number; // How long vehicle has been stopped (ms)
  lastStopSignId?: string; // Track which stop sign was last stopped at
  lastSignalId?: string; // Track which signal was last stopped at
  waitingForClearance: boolean; // Waiting for cross-traffic to clear
}

const BEHAVIOR_CONFIG = {
  // Stop sign behavior
  STOP_SIGN_DETECTION_DISTANCE: 30, // Detect stop signs within 30m
  STOP_SIGN_STOP_DISTANCE: 2, // Stop 2m before stop sign
  STOP_SIGN_MIN_WAIT: 2000, // Minimum 2 second stop
  STOP_SIGN_CLEARANCE_RADIUS: 20, // Check for vehicles within 20m of intersection

  // Traffic signal behavior
  SIGNAL_DETECTION_DISTANCE: 50, // Detect signals within 50m
  SIGNAL_STOP_DISTANCE: 3, // Stop 3m before signal
  YELLOW_DECISION_DISTANCE: 15, // If closer than 15m to yellow, proceed

  // Following behavior
  FOLLOWING_TIME_GAP: 2.0, // 2-second following distance
  FOLLOWING_MIN_DISTANCE: 10, // Minimum 10m following distance
  DETECTION_RADIUS: 50, // Look ahead 50m for lead vehicles

  // Comfort acceleration/braking
  COMFORT_ACCELERATION: 30, // 30 km/h per second
  COMFORT_DECELERATION: 40, // 40 km/h per second
  EMERGENCY_DECELERATION: 100, // 100 km/h per second (emergency brake)

  // Speed matching
  SPEED_MATCH_THRESHOLD: 5, // Match speed if within 5 km/h
};

export class VehicleBehaviorController {
  private vehicleStates: Map<string, VehicleState> = new Map();

  /**
   * Evaluate vehicle behavior and return target speed/acceleration
   * Call this for each vehicle every frame
   */
  evaluate(car: SpawnedCar, context: BehaviorContext): BehaviorResult {
    // Initialize state if needed
    if (!this.vehicleStates.has(car.id)) {
      this.vehicleStates.set(car.id, {
        behaviorState: "cruising",
        targetSpeed: car.maxSpeed,
        stoppedTime: 0,
        waitingForClearance: false,
      });
    }

    const state = this.vehicleStates.get(car.id)!;

    // Priority 1: Emergency collision avoidance (highest priority)
    const emergencyCheck = this.checkEmergencyBraking(car, context);
    if (emergencyCheck) {
      return emergencyCheck;
    }

    // Priority 2: Stop sign behavior
    const stopSignCheck = this.checkStopSign(car, state, context);
    if (stopSignCheck) {
      return stopSignCheck;
    }

    // Priority 3: Traffic signal behavior
    const signalCheck = this.checkTrafficSignal(car, state, context);
    if (signalCheck) {
      return signalCheck;
    }

    // Priority 4: Following behavior (maintain safe distance from vehicle ahead)
    const followingCheck = this.checkFollowing(car, state, context);
    if (followingCheck) {
      return followingCheck;
    }

    // Priority 5: Normal cruising
    return this.cruise(car, state, context);
  }

  /**
   * Get current state of a vehicle
   */
  getVehicleState(carId: string): VehicleState | undefined {
    return this.vehicleStates.get(carId);
  }

  /**
   * Reset vehicle state (e.g., when despawning)
   */
  resetVehicleState(carId: string): void {
    this.vehicleStates.delete(carId);
  }

  /**
   * Clear all vehicle states
   */
  clearAll(): void {
    this.vehicleStates.clear();
  }

  // ========== BEHAVIOR CHECKS ==========

  /**
   * Emergency braking for imminent collisions
   */
  private checkEmergencyBraking(
    car: SpawnedCar,
    context: BehaviorContext,
  ): BehaviorResult | null {
    if (
      context.collisionSystem.requiresEmergencyBrake(car, context.allVehicles)
    ) {
      const state = this.vehicleStates.get(car.id)!;
      state.behaviorState = "emergency_braking";

      return {
        targetSpeed: 0,
        acceleration: -BEHAVIOR_CONFIG.EMERGENCY_DECELERATION,
        state: "emergency_braking",
        reason: "Imminent collision detected",
      };
    }

    return null;
  }

  /**
   * Stop sign protocol
   * 1. Detect stop sign ahead
   * 2. Decelerate to stop
   * 3. Wait 2 seconds minimum
   * 4. Check cross-traffic
   * 5. Proceed when clear
   */
  private checkStopSign(
    car: SpawnedCar,
    state: VehicleState,
    context: BehaviorContext,
  ): BehaviorResult | null {
    const stopSigns = context.infrastructureManager.getStopSigns();

    // Find stop sign ahead
    let nearestStopSign: StopSign | null = null;
    let minDistance = Infinity;

    for (const stopSign of stopSigns) {
      const distance = turf.distance(
        turf.point(car.position),
        turf.point(stopSign.position),
        { units: "meters" },
      );

      if (distance > BEHAVIOR_CONFIG.STOP_SIGN_DETECTION_DISTANCE) continue;

      // Check if stop sign is ahead (not behind)
      const bearing = turf.bearing(
        turf.point(car.position),
        turf.point(stopSign.position),
      );
      const bearingDiff = Math.abs(((bearing - car.bearing + 180) % 360) - 180);

      if (bearingDiff < 90 && distance < minDistance) {
        minDistance = distance;
        nearestStopSign = stopSign;
      }
    }

    if (!nearestStopSign) {
      // No stop sign ahead, clear state if previously stopped
      if (state.behaviorState === "stopped_at_sign") {
        state.behaviorState = "cruising";
        state.stoppedTime = 0;
        state.lastStopSignId = undefined;
        state.waitingForClearance = false;
      }
      return null;
    }

    // Already passed this stop sign, don't stop again
    if (state.lastStopSignId === nearestStopSign.id && minDistance > 15) {
      state.lastStopSignId = undefined;
      return null;
    }

    // Approaching stop sign
    if (
      minDistance > BEHAVIOR_CONFIG.STOP_SIGN_STOP_DISTANCE &&
      state.behaviorState !== "stopped_at_sign"
    ) {
      state.behaviorState = "approaching_stop_sign";

      // Calculate target speed based on distance
      const brakingDistance = Math.max(
        0,
        minDistance - BEHAVIOR_CONFIG.STOP_SIGN_STOP_DISTANCE,
      );
      const targetSpeed = Math.sqrt(
        (2 * BEHAVIOR_CONFIG.COMFORT_DECELERATION * brakingDistance) / 3.6,
      );

      return {
        targetSpeed: Math.min(targetSpeed, car.speed),
        acceleration: -BEHAVIOR_CONFIG.COMFORT_DECELERATION,
        state: "approaching_stop_sign",
        reason: `Approaching stop sign ${nearestStopSign.id} (${minDistance.toFixed(1)}m)`,
      };
    }

    // At stop sign
    if (car.speed < 1) {
      state.behaviorState = "stopped_at_sign";
      state.lastStopSignId = nearestStopSign.id;

      // Increment stopped time
      state.stoppedTime += context.deltaTime * 1000;

      // Wait minimum 2 seconds
      if (state.stoppedTime < BEHAVIOR_CONFIG.STOP_SIGN_MIN_WAIT) {
        return {
          targetSpeed: 0,
          acceleration: 0,
          state: "stopped_at_sign",
          reason: `Stopped at sign, waiting ${((BEHAVIOR_CONFIG.STOP_SIGN_MIN_WAIT - state.stoppedTime) / 1000).toFixed(1)}s`,
        };
      }

      // Check for cross-traffic
      const isClear = this.checkIntersectionClearance(
        nearestStopSign.position,
        context,
      );

      if (!isClear) {
        state.waitingForClearance = true;
        return {
          targetSpeed: 0,
          acceleration: 0,
          state: "yielding",
          reason: "Waiting for cross-traffic to clear",
        };
      }

      // All clear, proceed
      state.behaviorState = "cruising";
      state.stoppedTime = 0;
      state.waitingForClearance = false;

      return {
        targetSpeed: car.maxSpeed,
        acceleration: BEHAVIOR_CONFIG.COMFORT_ACCELERATION,
        state: "cruising",
        reason: "Proceeding through stop sign",
      };
    }

    return null;
  }

  /**
   * Traffic signal protocol
   * 1. Detect signal ahead
   * 2. If red/yellow and far: brake
   * 3. If yellow and close: proceed
   * 4. If stopped at red: wait for green
   * 5. If green: maintain speed
   */
  private checkTrafficSignal(
    car: SpawnedCar,
    state: VehicleState,
    context: BehaviorContext,
  ): BehaviorResult | null {
    const signals = context.infrastructureManager.getSignals();

    // Find nearest signal ahead
    let nearestSignal: TrafficSignal | null = null;
    let minDistance = Infinity;

    for (const signal of signals) {
      const distance = turf.distance(
        turf.point(car.position),
        turf.point(signal.position),
        { units: "meters" },
      );

      if (distance > BEHAVIOR_CONFIG.SIGNAL_DETECTION_DISTANCE) continue;

      // Check if signal is ahead
      const bearing = turf.bearing(
        turf.point(car.position),
        turf.point(signal.position),
      );
      const bearingDiff = Math.abs(((bearing - car.bearing + 180) % 360) - 180);

      if (bearingDiff < 90 && distance < minDistance) {
        minDistance = distance;
        nearestSignal = signal;
      }
    }

    if (!nearestSignal) {
      // No signal ahead
      if (state.behaviorState === "stopped_at_signal") {
        state.behaviorState = "cruising";
        state.stoppedTime = 0;
        state.lastSignalId = undefined;
      }
      return null;
    }

    // Already passed this signal
    if (state.lastSignalId === nearestSignal.id && minDistance > 20) {
      state.lastSignalId = undefined;
      return null;
    }

    const signalState = nearestSignal.state;

    // Green light - proceed
    if (signalState === "green") {
      if (
        state.behaviorState === "stopped_at_signal" ||
        state.behaviorState === "approaching_signal"
      ) {
        state.behaviorState = "cruising";
        state.lastSignalId = nearestSignal.id;
      }
      return null; // Continue with normal behavior
    }

    // Yellow light
    if (signalState === "yellow") {
      // If close to intersection, proceed through
      if (minDistance < BEHAVIOR_CONFIG.YELLOW_DECISION_DISTANCE) {
        state.lastSignalId = nearestSignal.id;
        return {
          targetSpeed: car.maxSpeed,
          acceleration: BEHAVIOR_CONFIG.COMFORT_ACCELERATION,
          state: "cruising",
          reason: "Proceeding through yellow light (too close to stop)",
        };
      }

      // Otherwise, brake for red
      state.behaviorState = "approaching_signal";

      const brakingDistance = Math.max(
        0,
        minDistance - BEHAVIOR_CONFIG.SIGNAL_STOP_DISTANCE,
      );
      const targetSpeed = Math.sqrt(
        (2 * BEHAVIOR_CONFIG.COMFORT_DECELERATION * brakingDistance) / 3.6,
      );

      return {
        targetSpeed: Math.min(targetSpeed, car.speed),
        acceleration: -BEHAVIOR_CONFIG.COMFORT_DECELERATION,
        state: "approaching_signal",
        reason: `Braking for yellow light (${minDistance.toFixed(1)}m)`,
      };
    }

    // Red light
    if (signalState === "red") {
      // Approaching red light
      if (minDistance > BEHAVIOR_CONFIG.SIGNAL_STOP_DISTANCE && car.speed > 1) {
        state.behaviorState = "approaching_signal";

        const brakingDistance = Math.max(
          0,
          minDistance - BEHAVIOR_CONFIG.SIGNAL_STOP_DISTANCE,
        );
        const targetSpeed = Math.sqrt(
          (2 * BEHAVIOR_CONFIG.COMFORT_DECELERATION * brakingDistance) / 3.6,
        );

        return {
          targetSpeed: Math.min(targetSpeed, car.speed),
          acceleration: -BEHAVIOR_CONFIG.COMFORT_DECELERATION,
          state: "approaching_signal",
          reason: `Braking for red light (${minDistance.toFixed(1)}m)`,
        };
      }

      // Stopped at red light
      if (car.speed < 1) {
        state.behaviorState = "stopped_at_signal";
        state.lastSignalId = nearestSignal.id;
        state.stoppedTime += context.deltaTime * 1000;

        return {
          targetSpeed: 0,
          acceleration: 0,
          state: "stopped_at_signal",
          reason: "Stopped at red light",
        };
      }
    }

    return null;
  }

  /**
   * Following behavior - maintain safe distance from vehicle ahead
   */
  private checkFollowing(
    car: SpawnedCar,
    state: VehicleState,
    context: BehaviorContext,
  ): BehaviorResult | null {
    // Find lead vehicle directly ahead
    const leadVehicle = this.findLeadVehicle(car, context);

    if (!leadVehicle) {
      if (state.behaviorState === "following") {
        state.behaviorState = "cruising";
      }
      return null;
    }

    const distance = turf.distance(
      turf.point(car.position),
      turf.point(leadVehicle.position),
      { units: "meters" },
    );

    // Calculate safe following distance based on current speed
    const safeDistance = context.collisionSystem.getSafeFollowingDistance(
      car.speed,
    );

    // If we're too close, slow down
    if (distance < safeDistance) {
      state.behaviorState = "following";

      // Match speed of lead vehicle or slow down
      const targetSpeed = Math.min(leadVehicle.speed, car.speed - 5);

      return {
        targetSpeed: Math.max(0, targetSpeed),
        acceleration: -BEHAVIOR_CONFIG.COMFORT_DECELERATION,
        state: "following",
        reason: `Following vehicle ${leadVehicle.id} (${distance.toFixed(1)}m, safe: ${safeDistance.toFixed(1)}m)`,
      };
    }

    // If we're at a good distance but following, match speed
    if (state.behaviorState === "following" && distance < safeDistance * 1.5) {
      // Speed matching
      if (
        Math.abs(car.speed - leadVehicle.speed) <
        BEHAVIOR_CONFIG.SPEED_MATCH_THRESHOLD
      ) {
        return {
          targetSpeed: leadVehicle.speed,
          acceleration: 0,
          state: "following",
          reason: `Matching speed of ${leadVehicle.id} at ${leadVehicle.speed.toFixed(0)} km/h`,
        };
      }

      return {
        targetSpeed: leadVehicle.speed,
        acceleration:
          leadVehicle.speed > car.speed
            ? BEHAVIOR_CONFIG.COMFORT_ACCELERATION * 0.5
            : -BEHAVIOR_CONFIG.COMFORT_DECELERATION * 0.5,
        state: "following",
        reason: `Adjusting to match ${leadVehicle.id}`,
      };
    }

    // Far enough, can cruise
    if (state.behaviorState === "following") {
      state.behaviorState = "cruising";
    }

    return null;
  }

  /**
   * Normal cruising behavior
   */
  private cruise(
    car: SpawnedCar,
    state: VehicleState,
    context: BehaviorContext,
  ): BehaviorResult {
    state.behaviorState = "cruising";
    state.stoppedTime = 0;

    // Accelerate to max speed
    if (car.speed < car.maxSpeed) {
      return {
        targetSpeed: car.maxSpeed,
        acceleration: BEHAVIOR_CONFIG.COMFORT_ACCELERATION,
        state: "cruising",
        reason: "Accelerating to cruising speed",
      };
    }

    // Maintain speed
    return {
      targetSpeed: car.maxSpeed,
      acceleration: 0,
      state: "cruising",
      reason: "Cruising at target speed",
    };
  }

  // ========== HELPER METHODS ==========

  /**
   * Check if intersection is clear of cross-traffic
   */
  private checkIntersectionClearance(
    intersectionPos: [number, number],
    context: BehaviorContext,
  ): boolean {
    const { allVehicles } = context;

    for (const vehicle of allVehicles.values()) {
      const distance = turf.distance(
        turf.point(intersectionPos),
        turf.point(vehicle.position),
        { units: "meters" },
      );

      // If another vehicle is within clearance radius and moving, intersection is not clear
      if (
        distance < BEHAVIOR_CONFIG.STOP_SIGN_CLEARANCE_RADIUS &&
        vehicle.speed > 5
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * Find the lead vehicle directly ahead
   */
  private findLeadVehicle(
    car: SpawnedCar,
    context: BehaviorContext,
  ): SpawnedCar | null {
    const nearby = context.collisionSystem.getNearbyVehicles(
      car,
      BEHAVIOR_CONFIG.DETECTION_RADIUS,
      context.allVehicles,
    );

    let leadVehicle: SpawnedCar | null = null;
    let minDistance = Infinity;

    for (const other of nearby) {
      // Check if vehicle is ahead (not behind or beside)
      const bearing = turf.bearing(
        turf.point(car.position),
        turf.point(other.position),
      );
      const bearingDiff = Math.abs(((bearing - car.bearing + 180) % 360) - 180);

      // Vehicle is ahead if bearing difference is < 45 degrees
      if (bearingDiff < 45) {
        const distance = turf.distance(
          turf.point(car.position),
          turf.point(other.position),
          { units: "meters" },
        );

        if (distance < minDistance) {
          minDistance = distance;
          leadVehicle = other;
        }
      }
    }

    return leadVehicle;
  }

  /**
   * Apply behavior result to car (updates speed)
   */
  applyBehavior(
    car: SpawnedCar,
    result: BehaviorResult,
    deltaTime: number,
  ): void {
    // Apply acceleration
    if (result.acceleration !== 0) {
      const deltaSpeed = result.acceleration * deltaTime;
      car.speed = Math.max(0, Math.min(car.maxSpeed, car.speed + deltaSpeed));
    }

    // Move towards target speed
    if (result.targetSpeed !== car.speed) {
      const speedDiff = result.targetSpeed - car.speed;
      const maxChange = Math.abs(result.acceleration) * deltaTime;

      if (Math.abs(speedDiff) < maxChange) {
        car.speed = result.targetSpeed;
      }
    }

    // Clamp speed
    car.speed = Math.max(0, Math.min(car.maxSpeed, car.speed));
  }

  /**
   * Get statistics
   */
  getStats() {
    const stateCounts: Record<VehicleBehaviorState, number> = {
      cruising: 0,
      approaching_signal: 0,
      stopped_at_signal: 0,
      approaching_stop_sign: 0,
      stopped_at_sign: 0,
      yielding: 0,
      following: 0,
      emergency_braking: 0,
    };

    this.vehicleStates.forEach((state) => {
      stateCounts[state.behaviorState]++;
    });

    return {
      totalVehicles: this.vehicleStates.size,
      states: stateCounts,
    };
  }
}
