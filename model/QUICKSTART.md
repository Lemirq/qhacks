# Quick Start Guide

Get your Urban Planning 3D Building Modeler running in under 2 minutes!

## 🚀 Start Development Server

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

## 🎯 First Steps

1. **Adjust Dimensions**
   - Move the width/depth sliders to change building footprint
   - Increase/decrease number of floors
   - Adjust floor height for taller/shorter ceilings

2. **Choose a Roof**
   - Click between Flat, Gabled, Hipped, or Pyramid
   - Adjust roof height for pitched roofs

3. **Apply Textures**
   - Select from preset wall textures (Brick, Concrete, etc.)
   - Or upload your own texture image
   - Same for roof textures

4. **Add Windows**
   - Choose Grid pattern for windows on all sides
   - Adjust "Windows per Floor" slider
   - Or select "None" for a windowless building

5. **Export Your Model**
   - Click "Download GLB" to get a 3D model file
   - Click "Download JSON" to save your building configuration
   - Click "Copy JSON" to copy specs to clipboard

## 🎨 Adding Custom Textures

### Quick Method
1. Click the file upload button under "Wall Texture" or "Roof Texture"
2. Select a JPG or PNG image
3. The texture will be applied immediately

### Library Method
1. Add your texture to `public/textures/walls/` or `public/textures/roofs/`
2. Edit `src/utils/textureLoader.ts`
3. Add your texture to the array:
```typescript
{ name: 'my-brick', displayName: 'My Brick', path: '/textures/walls/my-brick.jpg', category: 'wall' }
```

**Tip**: Use tileable/seamless textures for best results!

## 🎮 3D Viewport Controls

- **Rotate**: Click and drag
- **Zoom**: Mouse wheel or pinch
- **Pan**: Right-click and drag (or Shift + Left-click)

## 📦 Build for Production

```bash
npm run build
npm run start
```

This creates an optimized production build and starts the server on port 3000.

## 🐛 Troubleshooting

### Port 3000 already in use
```bash
npx kill-port 3000
npm run dev
```

### Textures not loading
- Check browser console for errors
- Verify texture files exist in `public/textures/`
- Try a different texture or upload a custom one

### Build errors
```bash
rm -rf .next
npm run build
```

## 🎓 Next Steps

- Check out [README.md](./README.md) for full documentation
- Explore the codebase in `src/components/`
- Add your own texture library
- Customize building parameters in `src/types/buildingSpec.ts`

## 📝 Example Building Configs

### Small Office (3 floors)
- Width: 20m, Depth: 15m
- Floors: 3, Floor Height: 3.5m
- Roof: Flat
- Windows: Grid, 4 per floor

### Apartment Building (8 floors)
- Width: 30m, Depth: 25m
- Floors: 8, Floor Height: 3m
- Roof: Flat
- Windows: Grid, 6 per floor

### Residential House
- Width: 12m, Depth: 10m
- Floors: 2, Floor Height: 3m
- Roof: Gabled, Height: 4m
- Windows: Grid, 3 per floor

Happy building! 🏗️
