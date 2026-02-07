import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Sky } from '@react-three/drei';
import { Building } from './Building';
import { Ground } from './Ground';
import { BuildingSpecification } from '../../types/buildingSpec';

interface SceneProps {
  buildingSpec: BuildingSpecification;
  buildingRef?: React.MutableRefObject<THREE.Group | null>;
}

export function Scene({ buildingSpec, buildingRef }: SceneProps) {
  return (
    <div className="w-full h-full">
      <Canvas
        shadows
        camera={{ position: [30, 30, 30], fov: 50 }}
        gl={{ preserveDrawingBuffer: true }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[50, 50, 50]}
          intensity={0.8}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={200}
          shadow-camera-left={-50}
          shadow-camera-right={50}
          shadow-camera-top={50}
          shadow-camera-bottom={-50}
        />
        <hemisphereLight args={[0xaaddff, 0x444422, 0.3]} />

        {/* Sky */}
        <Sky distance={450000} sunPosition={[5, 1, 8]} inclination={0} azimuth={0.25} />

        {/* Ground */}
        <Ground />

        {/* Grid helper */}
        <Grid
          args={[200, 50]}
          cellColor="#cccccc"
          sectionColor="#999999"
          position={[0, 0.01, 0]}
        />

        {/* Building */}
        <Building spec={buildingSpec} ref={buildingRef} />

        {/* Controls */}
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={10}
          maxDistance={200}
          maxPolarAngle={Math.PI / 2}
        />
      </Canvas>
    </div>
  );
}
