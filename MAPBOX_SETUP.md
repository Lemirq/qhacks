# Mapbox GL Setup for Next.js

This project is configured with Mapbox GL for interactive maps.

## Getting Started

### 1. Get Your Mapbox Access Token

1. Go to [Mapbox Account](https://account.mapbox.com/access-tokens/)
2. Sign up or log in
3. Copy your default public access token (or create a new one)

### 2. Configure Your Environment

1. Open `.env.local` in the root directory
2. Replace `your_mapbox_access_token_here` with your actual Mapbox token:
   ```
   NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.eyJ1IjoieW91ci11c2VybmFtZSIsImEiOiJjbHh4eHh4eHgifQ.xxxxxxxxxxxxxx
   ```

### 3. Run the Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your map!

## Using the Map Component

The `Map` component is located in `components/Map.tsx` and accepts the following props:

```tsx
import Map from '@/components/Map';

<Map
  initialCenter={[-79.3832, 43.6532]}  // [longitude, latitude]
  initialZoom={12}                      // Zoom level (0-22)
  style="mapbox://styles/mapbox/streets-v12"  // Map style
  className="w-full h-full"             // Custom CSS classes
/>
```

### Available Map Styles

- `mapbox://styles/mapbox/streets-v12` - Standard streets
- `mapbox://styles/mapbox/outdoors-v12` - Outdoors/terrain
- `mapbox://styles/mapbox/light-v11` - Light theme
- `mapbox://styles/mapbox/dark-v11` - Dark theme
- `mapbox://styles/mapbox/satellite-v9` - Satellite imagery
- `mapbox://styles/mapbox/satellite-streets-v12` - Satellite with streets

## Adding Markers

You can extend the Map component to add markers:

```tsx
// Inside the Map component's useEffect
const marker = new mapboxgl.Marker()
  .setLngLat([-79.3832, 43.6532])
  .addTo(map.current);
```

## Adding Popups

```tsx
const popup = new mapboxgl.Popup({ offset: 25 })
  .setHTML('<h3>Toronto</h3><p>A great city!</p>');

new mapboxgl.Marker()
  .setLngLat([-79.3832, 43.6532])
  .setPopup(popup)
  .addTo(map.current);
```

## Resources

- [Mapbox GL JS Documentation](https://docs.mapbox.com/mapbox-gl-js/guides/)
- [Mapbox Examples](https://docs.mapbox.com/mapbox-gl-js/example/)
- [Mapbox Style Specification](https://docs.mapbox.com/mapbox-gl-js/style-spec/)

## Troubleshooting

**Map not loading?**
- Check that your `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` is set correctly in `.env.local`
- Restart your development server after changing `.env.local`
- Verify your token is valid at the Mapbox account dashboard

**TypeScript errors?**
- Make sure `@types/mapbox-gl` is installed: `npm install -D @types/mapbox-gl`
