/**
 * SCS Curve Number Runoff Model
 * Estimates stormwater runoff using the USDA TR-55 method for Kingston, Ontario.
 */

export interface StormScenario {
  returnPeriod: string;
  rainfallMm: number;
}

export interface RunoffResult {
  returnPeriod: string;
  rainfallMm: number;
  cnBefore: number;
  cnAfter: number;
  runoffBeforeMm: number;
  runoffAfterMm: number;
  runoffIncreaseMm: number;
  /** Total volume increase over the lot in litres */
  runoffVolumeIncreaseL: number;
  /** Peak flow rate increase in L/s (Rational Method) */
  peakFlowIncreaseLps: number;
}

// Curve numbers for Hydrologic Soil Group B (typical Kingston clay-loam)
const CN_IMPERVIOUS = 98;
const CN_GRASS = 61;
const CN_OPEN_FAIR = 69;
const CN_WOODS = 55;
const CN_GRAVEL = 82;

// Kingston IDF design storms (1-hour duration)
export const KINGSTON_STORMS: StormScenario[] = [
  { returnPeriod: '2-year', rainfallMm: 25 },
  { returnPeriod: '10-year', rainfallMm: 38 },
  { returnPeriod: '25-year', rainfallMm: 47 },
  { returnPeriod: '100-year', rainfallMm: 60 },
];

/**
 * Calculate weighted curve number for a mix of impervious and pervious surfaces.
 * Pervious portion assumed grass in good condition (CN=61).
 */
function weightedCN(imperviousFraction: number): number {
  const perviousFraction = 1 - imperviousFraction;
  return imperviousFraction * CN_IMPERVIOUS + perviousFraction * CN_GRASS;
}

/**
 * SCS runoff depth (mm) given precipitation P (mm) and curve number CN.
 * Q = (P - 0.2*S)^2 / (P + 0.8*S) when P > 0.2*S, else Q = 0
 * where S = (25400 / CN) - 254
 */
function scsRunoff(rainfallMm: number, cn: number): number {
  if (cn <= 0 || cn > 100) return 0;
  const S = (25400 / cn) - 254;
  const Ia = 0.2 * S;
  if (rainfallMm <= Ia) return 0;
  const numerator = (rainfallMm - Ia) ** 2;
  const denominator = rainfallMm - Ia + S;
  return numerator / denominator;
}

/**
 * Peak flow using Rational Method: Q = C * i * A / 360
 * C = runoff coefficient ≈ CN/100
 * i = rainfall intensity (mm/hr) — assumes 1-hour storm so i = rainfallMm
 * A = area in hectares
 */
function peakFlowLps(cn: number, rainfallMmPerHr: number, areaM2: number): number {
  const C = cn / 100;
  const areaHa = areaM2 / 10000;
  return (C * rainfallMmPerHr * areaHa) / 0.36; // result in L/s
}

/**
 * Calculate runoff for all Kingston design storms.
 */
export function calculateRunoff(
  lotAreaM2: number,
  imperviousFractionBefore: number,
  imperviousFractionAfter: number,
  storms?: StormScenario[]
): RunoffResult[] {
  const scenarios = storms ?? KINGSTON_STORMS;

  return scenarios.map((storm) => {
    const cnBefore = weightedCN(imperviousFractionBefore);
    const cnAfter = weightedCN(imperviousFractionAfter);

    const runoffBeforeMm = scsRunoff(storm.rainfallMm, cnBefore);
    const runoffAfterMm = scsRunoff(storm.rainfallMm, cnAfter);
    const runoffIncreaseMm = Math.max(0, runoffAfterMm - runoffBeforeMm);

    // Volume = depth (m) * area (m²) * 1000 L/m³
    const volumeIncreaseL = (runoffIncreaseMm / 1000) * lotAreaM2 * 1000;

    const peakBefore = peakFlowLps(cnBefore, storm.rainfallMm, lotAreaM2);
    const peakAfter = peakFlowLps(cnAfter, storm.rainfallMm, lotAreaM2);
    const peakIncrease = Math.max(0, peakAfter - peakBefore);

    return {
      returnPeriod: storm.returnPeriod,
      rainfallMm: storm.rainfallMm,
      cnBefore: Math.round(cnBefore),
      cnAfter: Math.round(cnAfter),
      runoffBeforeMm: Math.round(runoffBeforeMm * 10) / 10,
      runoffAfterMm: Math.round(runoffAfterMm * 10) / 10,
      runoffIncreaseMm: Math.round(runoffIncreaseMm * 10) / 10,
      runoffVolumeIncreaseL: Math.round(volumeIncreaseL),
      peakFlowIncreaseLps: Math.round(peakIncrease * 100) / 100,
    };
  });
}
