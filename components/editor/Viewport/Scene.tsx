import React, { useRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { BuildingWrapper } from './BuildingWrapper';
import { useBuildings } from '@/lib/editor/contexts/BuildingsContext';

interface SceneContentProps {
  sceneRef?: React.MutableRefObject<THREE.Scene | null>;
}

function SceneContent({ sceneRef }: SceneContentProps) {
  const { buildings, selectedBuildingId, selectBuilding, addBuilding, placementMode } = useBuildings();
  const { scene } = useThree();
  const gridPlaneRef = useRef<THREE.Mesh>(null);

  // Sync scene ref
  useEffect(() => {
    if (sceneRef) {
      sceneRef.current = scene;
    }
  }, [scene, sceneRef]);

  const handleGridClick = (e: any) => {
    if (!placementMode) return;

    // Calculate the click position on the grid
    const point = e.point;

    // Round to nearest grid cell (optional, for snapping)
    const x = Math.round(point.x);
    const z = Math.round(point.z);

    addBuilding({ x, z });
  };

  return (
    <>
      {/* Even lighting from all directions for consistent illumination */}
      <ambientLight intensity={0.8} />
      <hemisphereLight args={[0xffffff, 0xffffff, 0.5]} />

      {/* Subtle fill lights from multiple angles for even coverage */}
      <pointLight position={[50, 50, 50]} intensity={0.3} />
      <pointLight position={[-50, 50, 50]} intensity={0.3} />
      <pointLight position={[50, 50, -50]} intensity={0.3} />
      <pointLight position={[-50, 50, -50]} intensity={0.3} />

      {/* Invisible grid plane for click detection */}
      <mesh
        ref={gridPlaneRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        onClick={handleGridClick}
        visible={false}
      >
        <planeGeometry args={[1000, 1000]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Grid */}
      <Grid
        position={[0, -0.01, 0]}
        args={[100, 100]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#a0a0a0"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#707070"
        fadeDistance={100}
        fadeStrength={1}
        infiniteGrid
      />

      {/* Buildings */}
      {buildings.map((building) => (
        <BuildingWrapper
          key={building.id}
          building={building}
          isSelected={building.id === selectedBuildingId}
          onSelect={() => selectBuilding(building.id)}
        />
      ))}

      {/* Controls */}
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={10}
        maxDistance={200}
      />
    </>
  );
}

interface SceneProps {
  sceneRef?: React.MutableRefObject<THREE.Scene | null>;
}

export function Scene({ sceneRef }: SceneProps) {
  return (
    <div className="w-full h-full bg-sky-100">
      <Canvas
        camera={{ position: [30, 30, 30], fov: 50 }}
        gl={{
          preserveDrawingBuffer: true,
          alpha: false
        }}
        scene={{ background: new THREE.Color('#ffffff') }}
        style={{ background: '#ffffff' }}
      >
        <SceneContent sceneRef={sceneRef} />
      </Canvas>
    </div>
  );
}
