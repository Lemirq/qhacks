# Urban Planning 3D Building Modeler

An interactive web application for designing 3D building models with real-time visualization, built with Next.js, React Three Fiber, and Three.js. Export your designs as GLB files for integration with Mapbox GL JS or other 3D mapping platforms.

![Building Modeler](https://img.shields.io/badge/Next.js-14-black) ![React](https://img.shields.io/badge/React-18-blue) ![Three.js](https://img.shields.io/badge/Three.js-0.160-green) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)

## Features

- 🏗️ **Interactive 3D Building Design** - Real-time building generation with customizable parameters
- 📐 **Dimension Controls** - Adjust width, depth, floors, and floor height with sliders
- 🏠 **Multiple Roof Types** - Flat, gabled, hipped, and pyramid roofs
- 🎨 **Texture System** - Predefined texture library + custom texture upload
- 🪟 **Window Patterns** - Grid, ribbon, or no windows with customizable density
- 📋 **Blueprint Upload** - Import floor plan images (polygon tracing coming soon)
- 💾 **GLB Export** - Export 3D models in glTF/GLB format for Mapbox integration
- 📄 **JSON Export** - Save building specifications for later editing
- 🎮 **Orbit Controls** - Rotate, zoom, and pan around your building
- 🌅 **Realistic Lighting** - Directional, ambient, and hemisphere lighting with shadows

## Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **3D Rendering**: [Three.js](https://threejs.org/) via [React Three Fiber](https://docs.pmnd.rs/react-three-fiber)
- **3D Helpers**: [@react-three/drei](https://github.com/pmndrs/drei)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Language**: TypeScript

## Getting Started

### Prerequisites

- Node.js 18.0 or later
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

### Build for Production

```bash
npm run build
npm run start
```

## Usage Guide

### Basic Workflow

1. **Adjust Dimensions** - Use the dimension sliders to set building footprint and height
2. **Select Roof Type** - Choose from flat, gabled, hipped, or pyramid roofs
3. **Apply Textures** - Select wall and roof textures from the library or upload custom images
4. **Add Windows** - Choose window pattern and adjust density
5. **Export** - Download as GLB for 3D applications or save spec as JSON

### Input Parameters

| Parameter | Range | Default | Description |
|-----------|-------|---------|-------------|
| Width | 5-50m | 20m | Building footprint width |
| Depth | 5-50m | 15m | Building footprint depth |
| Floors | 1-20 | 3 | Number of floors |
| Floor Height | 2.5-6m | 3.5m | Height of each floor |
| Roof Height | 1-10m | 3m | Height of roof peak (non-flat) |
| Windows/Floor | 1-10 | 4 | Number of windows horizontally |

### Export Formats

#### GLB Export
- Industry-standard 3D model format
- Includes embedded textures
- Ready for Mapbox GL JS, Three.js, Unity, Unreal Engine, etc.
- Coordinate system: Y-up (rotate -90° on X for Z-up systems like Mapbox)

#### JSON Export
```json
{
  "version": "1.0",
  "building": {
    "width": 20,
    "depth": 15,
    "numberOfFloors": 3,
    ...
  },
  "position": {
    "longitude": null,
    "latitude": null,
    "altitude": 0,
    "rotation": 0
  }
}
```

## Project Structure

```
model/
├── app/
│   ├── layout.tsx          # Next.js root layout
│   └── page.tsx            # Main page (dynamic import for CSR)
├── src/
│   ├── components/
│   │   ├── InputPanel/     # Form controls
│   │   ├── Viewport/       # 3D scene components
│   │   └── Export/         # Export functionality
│   ├── hooks/
│   │   └── useBuildingSpec.ts  # State management
│   ├── utils/
│   │   ├── geometryBuilders.ts  # Three.js geometry creation
│   │   ├── textureLoader.ts     # Texture management
│   │   └── exportUtils.ts       # GLB/JSON export
│   ├── types/
│   │   └── buildingSpec.ts      # TypeScript interfaces
│   ├── App.tsx             # Main application component
│   └── index.css           # Global styles + Tailwind
├── public/
│   └── textures/           # Texture assets
│       ├── walls/
│       ├── roofs/
│       └── ground/
└── next.config.js          # Next.js + Three.js configuration
```

## Adding Custom Textures

### Method 1: UI Upload
Use the texture selector's upload button to load custom wall/roof textures

### Method 2: Add to Library
1. Place tileable texture images in `public/textures/walls/` or `public/textures/roofs/`
2. Update `src/utils/textureLoader.ts`:
```typescript
export const WALL_TEXTURES: TextureInfo[] = [
  // ... existing textures
  { name: 'my-texture', displayName: 'My Texture', path: '/textures/walls/my-texture.jpg', category: 'wall' },
];
```

Recommended texture specs:
- Format: JPG or PNG
- Resolution: 512x512 to 2048x2048
- Tileable/seamless
- File size: < 1MB

## Performance Optimization

- Textures are cached to avoid reloading
- Dynamic imports for Three.js (client-side only)
- Geometry is memoized and only rebuilt on spec changes
- GLB export uses binary format for smaller file sizes

## Troubleshooting

### Three.js SSR Errors
If you see "window is not defined" errors, ensure components using Three.js have `'use client'` directive and are dynamically imported with `{ ssr: false }`.

### Texture Loading Issues
Missing textures will fall back to solid colors. Check browser console for 404 errors and verify texture paths.

### Build Errors
- Run `npm run lint` to check for TypeScript errors
- Clear `.next` folder and rebuild: `rm -rf .next && npm run build`

## Roadmap

- [ ] Polygon tracing for blueprint images
- [ ] Advanced window customization (balconies, different styles)
- [ ] Building details (doors, stairs, rooftop features)
- [ ] Multiple buildings in one scene
- [ ] Camera presets and screenshot export
- [ ] Undo/redo functionality
- [ ] Building templates library

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## License

MIT License - feel free to use this project for your own urban planning needs!

## Acknowledgments

- Built with [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) by Poimandres
- Inspired by urban planning and 3D modeling tools
- Designed for integration with Mapbox GL JS

---

**Built for QHacks 2026** 🚀
