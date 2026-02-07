/**
 * Process raw OSM data into the format expected by the app
 * Run with: npx tsx scripts/process-map-data.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as turf from '@turf/turf';

const PUBLIC_DIR = path.join(process.cwd(), 'public', 'map-data');

// ==================== BUILDINGS ====================

interface Building {
  id: string;
  footprint: [number, number][];
  height: number;
  type?: string;
}

function calculateBuildingHeight(tags: any): number {
  // Try explicit height tag
  if (tags.height) {
    const heightStr = tags.height.toString();
    const heightMatch = heightStr.match(/[\d.]+/);
    if (heightMatch) {
      const parsedHeight = parseFloat(heightMatch[0]);
      if (!isNaN(parsedHeight) && parsedHeight > 0) {
        return parsedHeight;
      }
    }
  }

  // Try building:levels tag (assume 3.5m per level)
  if (tags['building:levels']) {
    const levels = parseInt(tags['building:levels']);
    if (!isNaN(levels) && levels > 0) {
      return levels * 3.5;
    }
  }

  // Default height
  return 10;
}

function parseBuildingsFromOSM(osmData: any): Building[] {
  const osmNodes = new Map<number, [number, number]>();
  const buildings: Building[] = [];

  // First pass: collect all nodes with coordinates
  osmData.elements.forEach((element: any) => {
    if (element.type === 'node') {
      osmNodes.set(element.id, [element.lon, element.lat]);
    }
  });

  // Second pass: process building ways
  osmData.elements.forEach((element: any) => {
    if (element.type === 'way' && element.tags?.building) {
      const tags = element.tags;

      // Build footprint polygon from node references
      const footprint: [number, number][] = [];
      for (const nodeId of element.nodes) {
        const coords = osmNodes.get(nodeId);
        if (coords) {
          footprint.push(coords);
        }
      }

      // Skip if footprint is invalid
      if (footprint.length < 3) return;

      const height = calculateBuildingHeight(tags);

      const building: Building = {
        id: `building-${element.id}`,
        footprint,
        height,
        type: tags.building !== 'yes' ? tags.building : undefined,
      };

      buildings.push(building);
    }
  });

  return buildings;
}

// ==================== TRAFFIC SIGNALS ====================

interface TrafficSignal {
  lat: number;
  lon: number;
  type: string;
  id: number;
}

function parseTrafficSignals(osmData: any): TrafficSignal[] {
  return osmData.elements.map((el: any) => ({
    lat: el.lat,
    lon: el.lon,
    type: el.tags.highway,
    id: el.id,
  }));
}

// ==================== ROADS ====================

interface RoadNode {
  id: string;
  position: [number, number];
  type: 'intersection' | 'spawn' | 'destination' | 'parking';
  connectedEdges: string[];
}

interface RoadEdge {
  id: string;
  from: string;
  to: string;
  geometry: [number, number][];
  length: number;
  speedLimit: number;
  lanes: number;
  oneway: boolean;
  name?: string;
}

interface RoadNetworkData {
  nodes: RoadNode[];
  edges: RoadEdge[];
}

function getSpeedLimit(tags: any): number {
  if (tags.maxspeed) {
    const speedStr = tags.maxspeed.toString();
    const speedMatch = speedStr.match(/[\d]+/);
    if (speedMatch) {
      const speed = parseInt(speedMatch[0]);
      if (!isNaN(speed) && speed > 0) {
        return speed;
      }
    }
  }

  // Default speeds by road type
  const defaults: Record<string, number> = {
    primary: 60,
    secondary: 50,
    tertiary: 40,
    residential: 30,
    unclassified: 40,
  };

  return defaults[tags.highway] || 40;
}

function buildGraphFromOSM(osmData: any): RoadNetworkData {
  const nodes = new Map<string, RoadNode>();
  const edges = new Map<string, RoadEdge>();
  const osmNodes = new Map<number, [number, number]>();
  const ways: any[] = [];

  // First pass: collect all nodes with coordinates
  osmData.elements.forEach((element: any) => {
    if (element.type === 'node') {
      osmNodes.set(element.id, [element.lon, element.lat]);
    } else if (element.type === 'way') {
      ways.push(element);
    }
  });

  // Second pass: build edges from ways
  ways.forEach((way) => {
    const wayNodes = way.nodes;
    const tags = way.tags || {};

    // Get road properties
    const speedLimit = getSpeedLimit(tags);
    const lanes = parseInt(tags.lanes) || 1;
    const oneway = tags.oneway === 'yes';

    // Build edge geometry
    const geometry: [number, number][] = [];
    for (const nodeId of wayNodes) {
      const coords = osmNodes.get(nodeId);
      if (coords) {
        geometry.push(coords);
      }
    }

    if (geometry.length < 2) return;

    // Create edge
    const edgeId = `way-${way.id}`;
    const fromNodeId = `node-${wayNodes[0]}`;
    const toNodeId = `node-${wayNodes[wayNodes.length - 1]}`;

    // Calculate length
    const line = turf.lineString(geometry);
    const length = turf.length(line, { units: 'meters' });

    const edge: RoadEdge = {
      id: edgeId,
      from: fromNodeId,
      to: toNodeId,
      geometry,
      length,
      speedLimit,
      lanes,
      oneway,
      name: tags.name,
    };

    edges.set(edgeId, edge);

    // Create or update nodes
    const ensureNode = (
      nodeId: string,
      position: [number, number],
      edgeId: string
    ) => {
      if (!nodes.has(nodeId)) {
        nodes.set(nodeId, {
          id: nodeId,
          position,
          type: 'intersection',
          connectedEdges: [],
        });
      }
      const node = nodes.get(nodeId)!;
      if (!node.connectedEdges.includes(edgeId)) {
        node.connectedEdges.push(edgeId);
      }
    };

    ensureNode(fromNodeId, geometry[0], edgeId);
    ensureNode(toNodeId, geometry[geometry.length - 1], edgeId);

    // If two-way, create reverse edge
    if (!oneway) {
      const reverseEdgeId = `${edgeId}-reverse`;
      const reverseEdge: RoadEdge = {
        id: reverseEdgeId,
        from: toNodeId,
        to: fromNodeId,
        geometry: [...geometry].reverse(),
        length,
        speedLimit,
        lanes,
        oneway: false,
        name: tags.name,
      };
      edges.set(reverseEdgeId, reverseEdge);
      ensureNode(toNodeId, geometry[geometry.length - 1], reverseEdgeId);
      ensureNode(fromNodeId, geometry[0], reverseEdgeId);
    }
  });

  return {
    nodes: Array.from(nodes.values()),
    edges: Array.from(edges.values()),
  };
}

// ==================== MAIN ====================

async function main() {
  console.log('🔄 Processing map data...\n');

  // Process buildings
  console.log('📦 Processing buildings...');
  const buildingsRaw = JSON.parse(
    fs.readFileSync(path.join(PUBLIC_DIR, 'buildings-raw.json'), 'utf-8')
  );
  const buildings = parseBuildingsFromOSM(buildingsRaw);
  fs.writeFileSync(
    path.join(PUBLIC_DIR, 'buildings.json'),
    JSON.stringify(buildings, null, 2)
  );
  console.log(`✅ Processed ${buildings.length} buildings\n`);

  // Process traffic signals
  console.log('🚦 Processing traffic signals...');
  const trafficSignalsRaw = JSON.parse(
    fs.readFileSync(path.join(PUBLIC_DIR, 'traffic-signals-raw.json'), 'utf-8')
  );
  const trafficSignals = parseTrafficSignals(trafficSignalsRaw);
  fs.writeFileSync(
    path.join(PUBLIC_DIR, 'traffic-signals.json'),
    JSON.stringify(trafficSignals, null, 2)
  );
  console.log(`✅ Processed ${trafficSignals.length} traffic signals\n`);

  // Process roads
  console.log('🛣️  Processing roads...');
  const roadsRaw = JSON.parse(
    fs.readFileSync(path.join(PUBLIC_DIR, 'roads-raw.json'), 'utf-8')
  );
  const roads = buildGraphFromOSM(roadsRaw);
  fs.writeFileSync(
    path.join(PUBLIC_DIR, 'roads.json'),
    JSON.stringify(roads, null, 2)
  );
  console.log(`✅ Processed ${roads.nodes.length} nodes and ${roads.edges.length} edges\n`);

  console.log('🎉 All map data processed successfully!');
}

main().catch(console.error);
