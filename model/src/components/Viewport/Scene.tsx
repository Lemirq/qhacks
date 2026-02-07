import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { Building } from './Building';
import type { BuildingSpecification } from '../../types/buildingSpec';

interface SceneProps {
  buildingSpec: BuildingSpecification;
  buildingRef?: React.MutableRefObject<THREE.Group | null>;
}

export function Scene({ buildingSpec, buildingRef }: SceneProps) {
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
        {/* Even lighting from all directions for consistent illumination */}
        <ambientLight intensity={0.8} />
        <hemisphereLight args={[0xffffff, 0xffffff, 0.5]} />

        {/* Subtle fill lights from multiple angles for even coverage */}
        <pointLight position={[50, 50, 50]} intensity={0.3} />
        <pointLight position={[-50, 50, 50]} intensity={0.3} />
        <pointLight position={[50, 50, -50]} intensity={0.3} />
        <pointLight position={[-50, 50, -50]} intensity={0.3} />

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

        {/* Building */}
        <Building spec={buildingSpec} ref={buildingRef} />

        {/* Controls */}
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={10}
          maxDistance={200}
        />
      </Canvas>
    </div>
  );
}
