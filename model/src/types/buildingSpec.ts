export type RoofType = 'flat' | 'gabled' | 'hipped' | 'pyramid';
export type WindowPattern = 'grid' | 'ribbon' | 'none';

export interface BuildingSpecification {
  // Dimensions
  width: number;            // meters
  depth: number;            // meters
  floorHeight: number;      // meters
  numberOfFloors: number;

  // Roof
  roofType: RoofType;
  roofHeight: number;       // meters (for non-flat roofs)

  // Textures
  wallTexture: string;      // texture name or 'custom'
  roofTexture: string;      // texture name or 'custom'
  customWallTexture?: string;  // data URL if custom
  customRoofTexture?: string;  // data URL if custom

  // Windows
  windowPattern: WindowPattern;
  windowRows: number;       // windows per floor horizontally
  windowColumns?: number;   // auto-calculated from numberOfFloors

  // Blueprint (optional)
  footprint?: Array<[number, number]>;  // polygon vertices [x, z]
  blueprintImage?: string;  // data URL
}

export interface BuildingExportData {
  version: string;
  building: BuildingSpecification;
  position: {
    longitude: number | null;
    latitude: number | null;
    altitude: number;
    rotation: number;
  };
  metadata?: {
    name?: string;
    description?: string;
    createdAt?: string;
  };
}

export const DEFAULT_BUILDING_SPEC: BuildingSpecification = {
  width: 20,
  depth: 15,
  floorHeight: 3.5,
  numberOfFloors: 3,
  roofType: 'flat',
  roofHeight: 3,
  wallTexture: 'brick',
  roofTexture: 'shingle',
  windowPattern: 'grid',
  windowRows: 4,
};
