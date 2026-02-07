/**
 * Building Data Fetcher for 3D City Visualization
 * Fetches building footprints and heights from OpenStreetMap
 */

export interface Building {
  id: string;
  footprint: [number, number][]; // Polygon coordinates [lon, lat]
  height: number; // meters
  type?: string; // building type (residential, commercial, etc.)
}

/**
 * Fetch buildings from cached Next.js API route
 * @param bbox Bounding box [south, west, north, east]
 * @returns Array of buildings with footprints and heights
 */
export async function fetchBuildings(
  bbox: [number, number, number, number]
): Promise<Building[]> {
  const [south, west, north, east] = bbox;

  console.log("Fetching buildings from cached API...");

  try {
    const response = await fetch(
      `/api/map/buildings?south=${south}&west=${west}&north=${north}&east=${east}`,
      {
        cache: 'force-cache', // Use browser cache
        next: { revalidate: 86400 }, // Revalidate every 24 hours
      }
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const buildings = await response.json();

    console.log(`✅ Fetched ${buildings.length} buildings (cached)`);
    return buildings;
  } catch (error) {
    console.error("Error fetching buildings:", error);
    throw error;
  }
}

/**
 * Parse OSM data to extract building footprints and heights
 */
function parseBuildingsFromOSM(osmData: any): Building[] {
  const osmNodes = new Map<number, [number, number]>();
  const buildings: Building[] = [];

  // First pass: collect all nodes with coordinates
  osmData.elements.forEach((element: any) => {
    if (element.type === "node") {
      osmNodes.set(element.id, [element.lon, element.lat]);
    }
  });

  // Second pass: process building ways
  osmData.elements.forEach((element: any) => {
    if (element.type === "way" && element.tags?.building) {
      const tags = element.tags;

      // Build footprint polygon from node references
      const footprint: [number, number][] = [];
      for (const nodeId of element.nodes) {
        const coords = osmNodes.get(nodeId);
        if (coords) {
          footprint.push(coords);
        }
      }

      // Skip if footprint is invalid (need at least 3 points for a polygon)
      if (footprint.length < 3) return;

      // Calculate building height with priority:
      // 1. Use 'height' tag if available (in meters)
      // 2. Use 'building:levels' * 3.5m
      // 3. Default to 10m
      const height = calculateBuildingHeight(tags);

      const building: Building = {
        id: `building-${element.id}`,
        footprint,
        height,
        type: tags.building !== "yes" ? tags.building : undefined,
      };

      buildings.push(building);
    }
  });

  return buildings;
}

/**
 * Calculate building height from OSM tags
 * Priority: height tag > building:levels * 3.5m > default 10m
 */
function calculateBuildingHeight(tags: any): number {
  // Try explicit height tag
  if (tags.height) {
    const heightStr = tags.height.toString();
    // Handle "10 m" or "10m" or just "10"
    const heightMatch = heightStr.match(/[\d.]+/);
    if (heightMatch) {
      const parsedHeight = parseFloat(heightMatch[0]);
      if (!isNaN(parsedHeight) && parsedHeight > 0) {
        return parsedHeight;
      }
    }
  }

  // Try building:levels tag (assume 3.5m per level)
  if (tags["building:levels"]) {
    const levels = parseInt(tags["building:levels"]);
    if (!isNaN(levels) && levels > 0) {
      return levels * 3.5;
    }
  }

  // Default height
  return 10;
}
