import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

/**
 * API Route: Save GLTF model to local file system
 *
 * POST /api/models/save
 * Body: { buildingId: string, gltfData: string }
 *
 * Saves the GLTF model to /public/models/{buildingId}.gltf
 * Returns the public URL path for accessing the model
 */
export async function POST(request: NextRequest) {
  try {
    const { buildingId, gltfData } = await request.json();

    if (!buildingId || !gltfData) {
      return NextResponse.json(
        { error: 'Missing buildingId or gltfData' },
        { status: 400 }
      );
    }

    console.log('[API] Saving GLTF model:', buildingId);

    // Ensure the models directory exists
    const modelsDir = join(process.cwd(), 'public', 'models');
    try {
      await mkdir(modelsDir, { recursive: true });
    } catch (error) {
      // Directory might already exist, ignore error
    }

    // Create a safe filename from buildingId
    const safeFilename = buildingId.replace(/[^a-zA-Z0-9-_]/g, '_');
    const filename = `${safeFilename}.gltf`;
    const filePath = join(modelsDir, filename);

    // Write the GLTF file
    await writeFile(filePath, gltfData, 'utf-8');

    // Return the public URL path (relative to /public)
    const publicPath = `/models/${filename}`;

    console.log('[API] GLTF saved successfully:', publicPath);

    return NextResponse.json({
      success: true,
      filePath: publicPath,
      filename,
    });
  } catch (error) {
    console.error('[API] Error saving GLTF:', error);
    return NextResponse.json(
      { error: 'Failed to save GLTF model', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/models/save
 * Returns list of saved models
 */
export async function GET() {
  try {
    const { readdir } = await import('fs/promises');
    const modelsDir = join(process.cwd(), 'public', 'models');

    try {
      const files = await readdir(modelsDir);
      const gltfFiles = files
        .filter(f => f.endsWith('.gltf'))
        .map(f => `/models/${f}`);

      return NextResponse.json({
        success: true,
        models: gltfFiles,
      });
    } catch (error) {
      // Directory doesn't exist yet
      return NextResponse.json({
        success: true,
        models: [],
      });
    }
  } catch (error) {
    console.error('[API] Error listing models:', error);
    return NextResponse.json(
      { error: 'Failed to list models' },
      { status: 500 }
    );
  }
}
