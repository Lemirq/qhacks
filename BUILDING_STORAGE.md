# Building Storage Guide

This document explains where and how building data is stored in the application.

## 📦 Storage Locations

### 1. **Building Templates (Specifications)**
- **Storage Type:** Browser localStorage
- **Key:** `'qhacks-saved-buildings'`
- **Format:** JSON array of `SavedBuildingTemplate` objects
- **Contains:**
  - Building ID
  - Building name
  - Building specification (dimensions, floors, materials, etc.)
  - Timestamp (savedAt)
  - Optional thumbnail (base64)
  - GLTF file path (e.g., `/models/building-123.gltf`)

**View in Browser:**
1. Open DevTools (F12)
2. Go to Application tab
3. Expand "Local Storage" in the sidebar
4. Click on your domain
5. Find key: `qhacks-saved-buildings`

**Example Data Structure:**
```json
[
  {
    "id": "template-1707326400000",
    "name": "Office Building",
    "spec": {
      "width": 20,
      "depth": 15,
      "numberOfFloors": 5,
      "floorHeight": 3.5,
      "roofType": "flat",
      ...
    },
    "savedAt": "2024-02-07T12:00:00.000Z",
    "gltfPath": "/models/template-1707326400000.gltf"
  }
]
```

### 2. **3D Model Files (GLTF)**
- **Storage Type:** File system
- **Directory:** `/public/models/`
- **Format:** `.gltf` (JSON-based 3D model format)
- **Naming:** `{buildingId}.gltf`
- **Public URL:** `/models/{buildingId}.gltf`

**Access Files:**
- **Via File System:** `/Users/notjackl3/Desktop/CODING/qhacks/public/models/`
- **Via Browser:** `http://localhost:3000/models/{filename}.gltf`
- **Via API:** GET request to `/api/models/save`

## 🔄 Workflow

### Saving Buildings from Editor to Map

1. **User clicks "Save to Map" in Editor**
   ↓
2. **For each building:**
   - Extract 3D geometry from scene
   - Export as GLTF (no textures, optimized)
   - Send to API: `POST /api/models/save`
   ↓
3. **API saves GLTF file:**
   - File saved to `/public/models/{buildingId}.gltf`
   - Returns file path: `/models/{buildingId}.gltf`
   ↓
4. **Building template saved to localStorage:**
   - Building spec + GLTF path stored
   - Available in template selector on map
   ↓
5. **Success message shown**

### Loading Buildings on Map

**IMPORTANT:** Only buildings saved from the editor (with GLTF files) can be placed on the map.

1. **User clicks "Place Building" on Map**
   ↓
2. **System loads available buildings:**
   - Only shows templates with GLTF files
   - Auto-selects first template if available
   - Shows warning if no buildings available
   ↓
3. **User selects a building from dropdown**
   - Must select a building (no default option)
   - Each building shows "📦 Model" indicator
   ↓
4. **User clicks on map location**
   ↓
5. **System validates selection:**
   - Checks if GLTF path exists
   - Aborts if no GLTF file found
   ↓
6. **Building loaded from GLTF file:**
   - Loads 3D model from `/public/models/{buildingId}.gltf`
   - No procedural fallback (GLTF required)
   ↓
7. **Building rendered on map**

## 🛠️ API Endpoints

### Save GLTF Model
```
POST /api/models/save
Content-Type: application/json

{
  "buildingId": "template-1707326400000",
  "gltfData": "{...gltf json...}"
}

Response:
{
  "success": true,
  "filePath": "/models/template-1707326400000.gltf",
  "filename": "template-1707326400000.gltf"
}
```

### List Saved Models
```
GET /api/models/save

Response:
{
  "success": true,
  "models": [
    "/models/template-1707326400000.gltf",
    "/models/template-1707326401000.gltf"
  ]
}
```

## 🧹 Clearing Data

### Clear Building Templates (localStorage)
```javascript
localStorage.removeItem('qhacks-saved-buildings');
```

### Delete GLTF Files
```bash
rm -rf /Users/notjackl3/Desktop/CODING/qhacks/public/models/*.gltf
```

Or manually delete files from the `/public/models/` directory.

## 🔍 Debugging

### Check if Buildings are Saved
1. Open browser console
2. Run: `localStorage.getItem('qhacks-saved-buildings')`
3. Should see JSON array or `null` if empty

### Check if GLTF Files Exist
```bash
ls -la /Users/notjackl3/Desktop/CODING/qhacks/public/models/
```

### View GLTF Model in Browser
Navigate to: `http://localhost:3000/models/{filename}.gltf`

### Console Logs to Watch
- `[ExportBar] Saving buildings to map storage`
- `[ExportBar] GLTF saved at: /models/...`
- `[BuildingStorage] Saved building template`
- `[Building3D] Loading GLTF from: /models/...`
- `[Building3D] Loaded from GLTF successfully`

## ⚠️ Important Notes

1. **localStorage has size limits** (~5-10MB depending on browser)
   - Don't store large base64 images as thumbnails
   - GLTF files are stored separately to avoid this limit

2. **GLTF files are optimized for Mapbox:**
   - No textures included (geometry only)
   - Materials simplified to MeshStandardMaterial
   - Colors preserved from original

3. **Building IDs must be unique**
   - Format: `template-{timestamp}-{originalId}`
   - Ensures no conflicts

4. **GLTF files persist across sessions**
   - Stored in file system, not browser
   - Survive browser cache clears
   - Need manual deletion to remove
