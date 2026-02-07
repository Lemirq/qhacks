/**
 * Pre-fetch map data to warm up the browser cache
 * Call this on app initialization
 */

const KINGSTON_BBOX = {
  south: 44.220,
  west: -76.510,
  north: 44.240,
  east: -76.480,
};

/**
 * Pre-fetch all map data to warm up the browser cache
 * This can be called on app startup to improve initial load performance
 */
export async function prefetchMapData() {
  if (typeof window === 'undefined') return; // Only run client-side

  try {
    // Pre-fetch all endpoints in parallel with aggressive caching
    await Promise.allSettled([
      fetch(`/api/map/buildings?south=${KINGSTON_BBOX.south}&west=${KINGSTON_BBOX.west}&north=${KINGSTON_BBOX.north}&east=${KINGSTON_BBOX.east}`, {
        cache: 'force-cache',
        next: { revalidate: 86400 },
      }),
      fetch(`/api/map/roads?south=${KINGSTON_BBOX.south}&west=${KINGSTON_BBOX.west}&north=${KINGSTON_BBOX.north}&east=${KINGSTON_BBOX.east}`, {
        cache: 'force-cache',
        next: { revalidate: 86400 },
      }),
      fetch(`/api/map/traffic-signals?south=${KINGSTON_BBOX.south}&west=${KINGSTON_BBOX.west}&north=${KINGSTON_BBOX.north}&east=${KINGSTON_BBOX.east}`, {
        cache: 'force-cache',
        next: { revalidate: 86400 },
      }),
    ]);

    console.log('✅ Map data cache pre-warmed');
  } catch (error) {
    console.warn('Failed to pre-warm map data cache:', error);
  }
}
