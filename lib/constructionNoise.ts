/**
 * Construction noise (dB) and population happiness calculations.
 * Models sound propagation from construction sites and resident disturbance.
 * Noise varies by construction phase (slice complexity) and deterministic randomness over time.
 */

/** Base construction noise at 1m from source (jackhammers, pile drivers, heavy equipment: 100-115 dB) */
const BASE_SOURCE_DB = 108;

/** Inverse-square law: L2 = L1 - 20*log10(d2/d1). At d meters: dB = SOURCE - 20*log10(d) */
export function dbAtDistanceMeters(
  distanceM: number,
  sourceDbAt1M: number = BASE_SOURCE_DB
): number {
  if (distanceM <= 0) return sourceDbAt1M;
  return sourceDbAt1M - 20 * Math.log10(Math.max(0.1, distanceM));
}

/** Deterministic pseudo-random 0–1 from a seed string */
function seededRandom(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h << 5) - h + seed.charCodeAt(i);
    h = h & h;
  }
  return Math.abs(h % 10000) / 10000;
}

/** Slice intensity by progress: foundation loud, finishing quiet */
function sliceIntensityAtProgress(progress: number): number {
  if (progress < 0.12) return 1.0;      // excavation, pile driving
  if (progress < 0.3) return 0.95;      // foundation concrete
  if (progress < 0.6) return 0.85;      // structural framing
  if (progress < 0.85) return 0.8;      // envelope, MEP
  return 0.55;                          // interior finishing
}

/** Get source dB for a building at a given date. Varies by slice complexity + deterministic randomness. */
export function getConstructionSourceDb(
  building: {
    id?: string;
    position?: { x: number; y: number; z: number };
    timeline?: { startDate?: string; durationDays?: number };
  },
  timelineDate: string
): number {
  if (!building.timeline?.startDate || !building.timeline?.durationDays) {
    return BASE_SOURCE_DB;
  }
  const start = new Date(building.timeline.startDate).getTime();
  const durationMs = building.timeline.durationDays * 24 * 60 * 60 * 1000;
  const now = new Date(timelineDate).getTime();
  const elapsed = now - start;
  const progress = Math.max(0, Math.min(1, elapsed / durationMs));

  const phaseIntensity = sliceIntensityAtProgress(progress);
  const weekIndex = Math.floor(elapsed / (7 * 24 * 60 * 60 * 1000));
  const seed = `${building.id ?? "b"}-${timelineDate}-${weekIndex}`;
  const randomFactor = 0.7 + seededRandom(seed) * 0.6; // 0.7–1.3

  const sourceDb = BASE_SOURCE_DB * phaseIntensity * randomFactor;
  return Math.max(85, Math.min(118, sourceDb));
}

/** Check if a building is under construction on the given date */
export function isUnderConstruction(
  startDate: string,
  durationDays: number,
  currentDate: string
): boolean {
  const start = new Date(startDate).getTime();
  const end = start + durationDays * 24 * 60 * 60 * 1000;
  const now = new Date(currentDate).getTime();
  return now >= start && now <= end;
}

/** Construction progress 0–1 at a given date. 0 = just started, 1 = completed or past end. */
export function getConstructionProgress(
  startDate: string,
  durationDays: number,
  currentDate: string
): number {
  const start = new Date(startDate).getTime();
  const durationMs = durationDays * 24 * 60 * 60 * 1000;
  const now = new Date(currentDate).getTime();
  const elapsed = now - start;
  return Math.max(0, Math.min(1, elapsed / durationMs));
}

/** Distance between two points in world space (XZ plane) */
export function distance2D(
  ax: number,
  az: number,
  bx: number,
  bz: number
): number {
  return Math.sqrt((bx - ax) ** 2 + (bz - az) ** 2);
}

/** DB contour ring radii for visualization (distances where dB drops to these levels) */
export const DB_CONTOURS = [
  { db: 95, label: "95 dB" },
  { db: 80, label: "80 dB" },
  { db: 65, label: "65 dB" },
  { db: 50, label: "50 dB" },
] as const;

/** Get distance (m) at which noise drops to target dB */
export function distanceForDb(
  targetDb: number,
  sourceDbAt1M: number = BASE_SOURCE_DB
): number {
  if (targetDb >= sourceDbAt1M) return 0;
  return Math.pow(10, (sourceDbAt1M - targetDb) / 20);
}

/** Population happiness: 0-100. Higher dB exposure = lower happiness */
export function computeHappinessScore(
  placedBuildings: Array<{
    id?: string;
    position: { x: number; y: number; z: number };
    timeline?: { startDate?: string; durationDays?: number };
  }>,
  timelineDate: string,
  /** Sample points (e.g. residential areas) - we use a grid over the map for simplicity */
  sampleCount = 64
): { score: number; avgDb: number; activeCount: number } {
  const active = placedBuildings.filter(
    (b) =>
      b.timeline?.startDate &&
      b.timeline?.durationDays &&
      isUnderConstruction(
        b.timeline.startDate,
        b.timeline.durationDays,
        timelineDate
      )
  );

  if (active.length === 0) {
    return { score: 100, avgDb: 0, activeCount: 0 };
  }

  const min = -1500;
  const max = 1500;
  const step = (max - min) / Math.sqrt(sampleCount);
  let totalDb = 0;
  let count = 0;

  for (let x = min; x <= max; x += step) {
    for (let z = min; z <= max; z += step) {
      let combinedDb = -Infinity;
      for (const b of active) {
        const sourceDb = getConstructionSourceDb(b, timelineDate);
        const d = distance2D(x, z, b.position.x, b.position.z);
        const db = dbAtDistanceMeters(d, sourceDb);
        if (db > combinedDb) combinedDb = db;
      }
      if (combinedDb > 0) {
        totalDb += combinedDb;
        count++;
      }
    }
  }

  const avgDb = count > 0 ? totalDb / count : 0;
  const score = Math.max(0, Math.min(100, 100 - (avgDb / 100) * 100));

  return { score: Math.round(score), avgDb: Math.round(avgDb * 10) / 10, activeCount: active.length };
}
