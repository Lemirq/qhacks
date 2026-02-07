import { NextResponse } from 'next/server';
import buildingsData from '@/public/map-data/buildings.json';

interface Building {
  id: string;
  footprint: [number, number][];
  height: number;
  type?: string;
}

/**
 * Serve pre-processed buildings data from static JSON file
 * Data was downloaded from OpenStreetMap and processed offline
 * See scripts/process-map-data.ts for processing logic
 */
export async function GET() {
  try {
    // Serve pre-processed static data
    const buildings = buildingsData as Building[];

    return NextResponse.json(buildings, {
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable', // Cache forever since it's static
      },
    });
  } catch (error) {
    console.error('Error serving buildings:', error);
    return NextResponse.json(
      { error: 'Failed to serve buildings' },
      { status: 500 }
    );
  }
}
