import * as THREE from 'three';
import { BuildingSpecification, RoofType } from '../types/buildingSpec';

export function createBuildingBody(spec: BuildingSpecification): THREE.Mesh {
  const totalHeight = spec.floorHeight * spec.numberOfFloors;

  let geometry: THREE.BufferGeometry;

  if (spec.footprint && spec.footprint.length > 2) {
    // Use extruded geometry from polygon footprint
    const shape = new THREE.Shape();
    spec.footprint.forEach((point, index) => {
      if (index === 0) {
        shape.moveTo(point[0], point[1]);
      } else {
        shape.lineTo(point[0], point[1]);
      }
    });

    geometry = new THREE.ExtrudeGeometry(shape, {
      depth: totalHeight,
      bevelEnabled: false,
    });

    // Rotate so extrusion goes upward along Y axis
    geometry.rotateX(Math.PI / 2);
  } else {
    // Simple box geometry
    geometry = new THREE.BoxGeometry(spec.width, totalHeight, spec.depth);
  }

  const material = new THREE.MeshStandardMaterial({
    color: 0xcccccc,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = totalHeight / 2;
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  return mesh;
}

export function createFloorSeparators(spec: BuildingSpecification): THREE.Group {
  const group = new THREE.Group();
  const slabHeight = 0.15;
  const slabOverhang = 0.2;

  for (let i = 1; i < spec.numberOfFloors; i++) {
    const y = i * spec.floorHeight;

    const geometry = new THREE.BoxGeometry(
      spec.width + slabOverhang,
      slabHeight,
      spec.depth + slabOverhang
    );

    const material = new THREE.MeshStandardMaterial({
      color: 0x888888,
    });

    const slab = new THREE.Mesh(geometry, material);
    slab.position.y = y;
    slab.castShadow = true;
    slab.receiveShadow = true;

    group.add(slab);
  }

  return group;
}

export function createRoof(spec: BuildingSpecification): THREE.Mesh {
  const baseY = spec.floorHeight * spec.numberOfFloors;

  let geometry: THREE.BufferGeometry;

  switch (spec.roofType) {
    case 'flat':
      geometry = new THREE.BoxGeometry(spec.width, 0.3, spec.depth);
      break;

    case 'gabled':
      geometry = createGabledRoof(spec.width, spec.depth, spec.roofHeight);
      break;

    case 'hipped':
      geometry = createHippedRoof(spec.width, spec.depth, spec.roofHeight);
      break;

    case 'pyramid':
      geometry = new THREE.ConeGeometry(
        Math.max(spec.width, spec.depth) * 0.7,
        spec.roofHeight,
        4
      );
      geometry.rotateY(Math.PI / 4);
      break;

    default:
      geometry = new THREE.BoxGeometry(spec.width, 0.3, spec.depth);
  }

  const material = new THREE.MeshStandardMaterial({
    color: 0x8b4513,
  });

  const mesh = new THREE.Mesh(geometry, material);

  if (spec.roofType === 'flat') {
    mesh.position.y = baseY + 0.15;
  } else {
    mesh.position.y = baseY + spec.roofHeight / 2;
  }

  mesh.castShadow = true;
  mesh.receiveShadow = true;

  return mesh;
}

function createGabledRoof(width: number, depth: number, height: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(0, height);
  shape.lineTo(width / 2, 0);
  shape.lineTo(-width / 2, 0);

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: depth,
    bevelEnabled: false,
  });

  geometry.rotateX(Math.PI / 2);
  geometry.translate(0, 0, -depth / 2);

  return geometry;
}

function createHippedRoof(width: number, depth: number, height: number): THREE.BufferGeometry {
  const vertices = new Float32Array([
    // Base rectangle
    -width/2, 0, -depth/2,
    width/2, 0, -depth/2,
    width/2, 0, depth/2,
    -width/2, 0, depth/2,
    // Ridge line
    -width/4, height, 0,
    width/4, height, 0,
  ]);

  const indices = [
    // Front face
    0, 1, 5,
    0, 5, 4,
    // Right face
    1, 2, 5,
    // Back face
    2, 3, 4,
    2, 4, 5,
    // Left face
    3, 0, 4,
  ];

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

export function createWindows(spec: BuildingSpecification): THREE.Group {
  const group = new THREE.Group();

  if (spec.windowPattern === 'none') {
    return group;
  }

  const windowWidth = 1.2;
  const windowHeight = 1.8;
  const windowDepth = 0.1;

  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x88ccff,
    transmission: 0.9,
    roughness: 0.1,
    metalness: 0.0,
    transparent: true,
    opacity: 0.5,
  });

  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x333333,
  });

  // Calculate window spacing
  const horizontalSpacing = (spec.width - windowWidth) / (spec.windowRows + 1);
  const verticalSpacing = spec.floorHeight;

  for (let floor = 0; floor < spec.numberOfFloors; floor++) {
    for (let col = 0; col < spec.windowRows; col++) {
      const windowGroup = new THREE.Group();

      // Glass pane
      const glassGeometry = new THREE.BoxGeometry(windowWidth, windowHeight, windowDepth);
      const glass = new THREE.Mesh(glassGeometry, glassMaterial);

      // Frame
      const frameGeometry = new THREE.BoxGeometry(windowWidth + 0.1, windowHeight + 0.1, windowDepth + 0.05);
      const frame = new THREE.Mesh(frameGeometry, frameMaterial);

      windowGroup.add(frame);
      windowGroup.add(glass);

      // Position window on front face
      const x = -spec.width / 2 + horizontalSpacing * (col + 1) + windowWidth / 2;
      const y = floor * verticalSpacing + verticalSpacing / 2;
      const z = spec.depth / 2 + windowDepth / 2;

      windowGroup.position.set(x, y, z);

      group.add(windowGroup);

      // Add windows to other sides (simplified for MVP)
      if (spec.windowPattern === 'grid') {
        // Back face
        const backWindow = windowGroup.clone();
        backWindow.position.z = -spec.depth / 2 - windowDepth / 2;
        backWindow.rotation.y = Math.PI;
        group.add(backWindow);
      }
    }
  }

  return group;
}

export function createGround(): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(200, 200);
  const material = new THREE.MeshStandardMaterial({
    color: 0x3a5f3a,
    roughness: 0.8,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;

  return mesh;
}
