/**
 * Green Infrastructure Mitigation Suggestions
 * Recommends stormwater management measures based on runoff increase.
 */

import type { ImperviousSurfaceResult } from './imperviousSurface';
import type { RunoffResult } from './runoffModel';

export interface MitigationMeasure {
  name: string;
  description: string;
  volumeReductionL: number;
  areaRequiredM2: number;
  costEstimateLow: number;
  costEstimateHigh: number;
  applicability: 'high' | 'medium' | 'low';
}

/**
 * Suggest mitigation measures scaled to the building and its runoff increase.
 * Uses the 2-year storm (first result) as the design target.
 */
export function suggestMitigations(
  surface: ImperviousSurfaceResult,
  runoffResults: RunoffResult[],
  roofStyle: 'flat' | 'gable' | 'hip'
): MitigationMeasure[] {
  // Use 2-year storm as primary design target
  const designStorm = runoffResults[0];
  if (!designStorm || designStorm.runoffVolumeIncreaseL <= 0) return [];

  const roofArea = surface.buildingFootprintM2;
  const parkingArea = surface.parkingAreaM2;
  const measures: MitigationMeasure[] = [];

  // 1. Green Roof
  const greenRoofRetentionMm = 15; // mm per storm event
  const greenRoofVolumeL = (greenRoofRetentionMm / 1000) * roofArea * 1000;
  measures.push({
    name: 'Green Roof',
    description: `Install extensive green roof (${roofArea} m² roof area). Retains ~15mm of rainfall per storm event with sedum/native plantings.`,
    volumeReductionL: Math.round(greenRoofVolumeL),
    areaRequiredM2: roofArea,
    costEstimateLow: roofArea * 150,
    costEstimateHigh: roofArea * 400,
    applicability: roofStyle === 'flat' ? 'high' : 'low',
  });

  // 2. Permeable Pavement (for parking)
  if (parkingArea > 0) {
    const permeableRetentionMm = 25;
    const permeableVolumeL = (permeableRetentionMm / 1000) * parkingArea * 1000;
    measures.push({
      name: 'Permeable Pavement',
      description: `Replace standard parking surface (${parkingArea} m²) with permeable interlocking pavers or porous asphalt.`,
      volumeReductionL: Math.round(permeableVolumeL),
      areaRequiredM2: parkingArea,
      costEstimateLow: parkingArea * 80,
      costEstimateHigh: parkingArea * 150,
      applicability: 'high',
    });
  }

  // 3. Rain Garden / Bioswale
  const rainGardenArea = Math.round(surface.totalImperviousM2 * 0.07); // 7% of contributing area
  const rainGardenDepthMm = 150; // ponding depth
  const rainGardenVolumeL = (rainGardenDepthMm / 1000) * rainGardenArea * 1000;
  measures.push({
    name: 'Rain Garden / Bioswale',
    description: `Install bioretention garden (${rainGardenArea} m²) along building perimeter or parking edge. Filters and infiltrates runoff.`,
    volumeReductionL: Math.round(rainGardenVolumeL),
    areaRequiredM2: rainGardenArea,
    costEstimateLow: rainGardenArea * 30,
    costEstimateHigh: rainGardenArea * 60,
    applicability: 'high',
  });

  // 4. Underground Detention Tank
  const targetVolumeM3 = designStorm.runoffVolumeIncreaseL / 1000;
  measures.push({
    name: 'Underground Detention Tank',
    description: `Install subsurface detention system (${targetVolumeM3.toFixed(1)} m³) to store and slowly release stormwater. Best for constrained sites.`,
    volumeReductionL: designStorm.runoffVolumeIncreaseL,
    areaRequiredM2: Math.round(targetVolumeM3 / 1.5), // ~1.5m deep tank
    costEstimateLow: Math.round(targetVolumeM3 * 500),
    costEstimateHigh: Math.round(targetVolumeM3 * 1000),
    applicability: 'medium',
  });

  // 5. Rainwater Harvesting Cistern
  const cisternVolumeM3 = Math.min(20, Math.max(5, roofArea * 0.015));
  measures.push({
    name: 'Rainwater Harvesting',
    description: `Install ${cisternVolumeM3.toFixed(0)} m³ cistern to capture roof runoff for irrigation and non-potable uses.`,
    volumeReductionL: Math.round(cisternVolumeM3 * 1000),
    areaRequiredM2: Math.round(cisternVolumeM3 / 2), // footprint estimate
    costEstimateLow: 1000,
    costEstimateHigh: 5000,
    applicability: 'medium',
  });

  // Sort: high applicability first, then by volume reduction descending
  const appOrder = { high: 0, medium: 1, low: 2 };
  measures.sort((a, b) => {
    const d = appOrder[a.applicability] - appOrder[b.applicability];
    if (d !== 0) return d;
    return b.volumeReductionL - a.volumeReductionL;
  });

  return measures;
}

/**
 * Calculate what percentage of the design storm runoff increase is offset
 * by a combination of mitigation measures.
 */
export function calculateOffsetPercent(
  measures: MitigationMeasure[],
  designStormVolumeIncreaseL: number
): number {
  if (designStormVolumeIncreaseL <= 0) return 100;
  const totalReduction = measures.reduce((sum, m) => sum + m.volumeReductionL, 0);
  return Math.min(100, Math.round((totalReduction / designStormVolumeIncreaseL) * 100));
}
