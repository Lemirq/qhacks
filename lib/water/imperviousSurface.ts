/**
 * Impervious Surface Calculator
 * Calculates added impervious area from building footprint, parking, and access surfaces.
 */

export interface ImperviousSurfaceResult {
  buildingFootprintM2: number;
  parkingAreaM2: number;
  sidewalksAndAccessM2: number;
  totalImperviousM2: number;
  previousImperviousM2: number;
  netImperviousIncrease: number;
  lotAreaM2: number;
  imperviousPercentBefore: number;
  imperviousPercentAfter: number;
}

export interface BuildingSpec {
  widthM: number;
  lengthM: number;
  floors: number;
  roofStyle: 'flat' | 'gable' | 'hip';
  zoneType?: string;
}

/**
 * Map zone category to parking requirement (spaces per m² of GFA).
 * Based on City of Kingston Zoning By-Law 2022-62 parking minimums.
 */
function getParkingRatio(zoneCategory: string): number {
  const cat = zoneCategory.toLowerCase();
  if (cat.includes('residential') || cat.includes('heritage')) return 1.2 / 80; // 1.2 spaces per unit, ~80m² per unit
  if (cat.includes('commercial') || cat.includes('mixed')) return 1 / 30;
  if (cat.includes('institutional')) return 1 / 45;
  if (cat.includes('employment') || cat.includes('industrial')) return 1 / 100;
  return 1 / 50; // default
}

/**
 * Map zone category to pre-development impervious fraction.
 * Urban zones are assumed to have some existing impervious surface.
 */
function getPreDevelopmentImpervious(zoneCategory: string): number {
  const cat = zoneCategory.toLowerCase();
  if (cat.includes('downtown') || cat.includes('mixed')) return 0.6;
  if (cat.includes('commercial')) return 0.5;
  if (cat.includes('residential') && cat.includes('urban')) return 0.3;
  if (cat.includes('institutional')) return 0.4;
  if (cat.includes('employment') || cat.includes('industrial')) return 0.4;
  if (cat.includes('rural')) return 0.05;
  return 0.2; // default: some grass/gravel
}

/**
 * Get the zone category from a zone code string.
 */
function inferZoneCategory(zoneType?: string): string {
  if (!zoneType) return 'unknown';
  const code = zoneType.toUpperCase();
  if (code.startsWith('DT')) return 'Downtown Mixed Use';
  if (code.startsWith('MU') || code.startsWith('WM')) return 'Mixed Use';
  if (code.startsWith('URM')) return 'Urban Multi-Residential';
  if (code.startsWith('UR')) return 'Urban Residential';
  if (code.startsWith('HCD')) return 'Heritage';
  if (code.startsWith('IN') || code.startsWith('G')) return 'Institutional';
  if (code.startsWith('C') || code === 'HB') return 'Commercial';
  if (code.startsWith('M')) return 'Employment';
  if (code.startsWith('AG') || code.startsWith('RU') || code === 'HAM' || code === 'LSR') return 'Rural';
  return 'unknown';
}

const SPACE_AREA_M2 = 15; // average parking space area including lane share

export function calculateImperviousSurface(
  spec: BuildingSpec,
  lotAreaM2?: number
): ImperviousSurfaceResult {
  const footprint = spec.widthM * spec.lengthM;
  const gfa = footprint * spec.floors;
  const zoneCategory = inferZoneCategory(spec.zoneType);

  // Estimate parking area
  const parkingRatio = getParkingRatio(zoneCategory);
  const spaces = Math.ceil(gfa * parkingRatio);
  const parkingAreaM2 = spaces * SPACE_AREA_M2;

  // Sidewalks & access: ~15% of building footprint
  const sidewalksAndAccessM2 = Math.round(footprint * 0.15);

  const totalImperviousM2 = footprint + parkingAreaM2 + sidewalksAndAccessM2;

  // Estimate lot area if not given (typical urban Kingston lot-to-building ratio ~2.5)
  const estimatedLotArea = lotAreaM2 ?? Math.round(footprint * 2.5);

  // Pre-development impervious
  const preFraction = getPreDevelopmentImpervious(zoneCategory);
  const previousImperviousM2 = Math.round(estimatedLotArea * preFraction);

  const netIncrease = Math.max(0, totalImperviousM2 - previousImperviousM2);

  return {
    buildingFootprintM2: Math.round(footprint),
    parkingAreaM2,
    sidewalksAndAccessM2,
    totalImperviousM2,
    previousImperviousM2,
    netImperviousIncrease: netIncrease,
    lotAreaM2: estimatedLotArea,
    imperviousPercentBefore: Math.round((previousImperviousM2 / estimatedLotArea) * 100),
    imperviousPercentAfter: Math.min(100, Math.round((totalImperviousM2 / estimatedLotArea) * 100)),
  };
}
