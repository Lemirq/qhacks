# Building Height Multiplier - Configuration Guide

## Overview

The `HEIGHT_MULTIPLIER` allows you to adjust the visual height of all buildings on the map without changing the actual data. This is useful for:
- Making buildings more dramatic and visible
- Adjusting the cityscape's visual impact
- Testing different height scales

## Current Configuration

**File**: `lib/buildingRenderer.ts`
**Current Value**: `12.0x` (buildings are 12 times their calculated height)

## How It Works

Building height calculation follows this formula:

```
Final Height = OSM Height × SCALE_FACTOR × HEIGHT_MULTIPLIER
```

Where:
- **OSM Height**: Real-world height in meters (from OpenStreetMap data)
- **SCALE_FACTOR**: `10 / 1.4 ≈ 7.14` (matches horizontal coordinate scaling)
- **HEIGHT_MULTIPLIER**: `12.0` (configurable visual multiplier)

### Example with Current Settings (12.0x):

| Building Type | Real Height | OSM Height | SCALE_FACTOR | HEIGHT_MULTIPLIER | Final Height |
|--------------|-------------|------------|--------------|-------------------|--------------|
| 1-story house | 3.5m | 3.5m | 7.14 | 12.0 | ~300 units |
| 3-story building | 10.5m | 10.5m | 7.14 | 12.0 | ~900 units |
| 10-story building | 35m | 35m | 7.14 | 12.0 | ~3,000 units |
| 20-story tower | 70m | 70m | 7.14 | 12.0 | ~6,000 units |

Your custom 20-story building (70m) will render as approximately **6,000 units tall**! 🏢

## Adjusting the Multiplier

To change the height multiplier, edit `lib/buildingRenderer.ts`:

```typescript
// Line 16
export const HEIGHT_MULTIPLIER = 12.0;  // Change this value
```

### Recommended Values:

| Multiplier | Effect | Use Case |
|-----------|---------|----------|
| `0.5` | Half height | Subtle, realistic cityscape |
| `1.0` | Natural proportions | Balanced view |
| `2.0` | Double height | Slightly dramatic |
| `5.0` | Very tall | Impressive skyline |
| `12.0` | **Current** | Very dramatic, highly visible |
| `20.0` | Extreme height | Maximum visual impact |

## Visual Impact at 12.0x

With the current `12.0x` multiplier:

✨ **Pros:**
- Buildings are extremely visible and dramatic
- Easy to see building heights from far away
- Creates an impressive, exaggerated cityscape
- Great for showcasing architecture

⚠️ **Considerations:**
- Buildings may appear unrealistically tall
- May dominate the view
- Could make navigation harder if too tall

## Implementation Details

The multiplier is applied in two places:

1. **Extrusion depth** (line 96):
   ```typescript
   depth: building.height * SCALE_FACTOR * HEIGHT_MULTIPLIER
   ```

2. **Vertical positioning** (line 118):
   ```typescript
   const scaledHeight = building.height * SCALE_FACTOR * HEIGHT_MULTIPLIER;
   mesh.position.y = scaledHeight / 2;
   ```

This ensures buildings:
- Have the correct visual height
- Sit properly on the ground (base at y=0)
- Extend upward correctly

## Testing Different Values

To experiment with different heights:

1. Open `lib/buildingRenderer.ts`
2. Change line 16: `export const HEIGHT_MULTIPLIER = X.X;`
3. Save the file
4. Refresh the map page
5. Buildings will render with the new height

**No data changes needed** - this only affects visualization!

## Reverting to Natural Proportions

To see buildings at their natural proportions:

```typescript
export const HEIGHT_MULTIPLIER = 1.0;  // Natural height
```

This will show buildings at their real-world scale (with the coordinate scale factor applied).

---

**Current Status**: ✅ Multiplier active at **12.0x**
**Last Updated**: February 7, 2026
