import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Stars } from '@react-three/drei';

interface PathParticlesProps {
  count?: number;
  pathFunction?: (t: number) => [number, number, number]; // Optional parametric path
}

// Firefly particle system
function Fireflies({ count = 80, pathFunction }: { count?: number; pathFunction?: (t: number) => [number, number, number] }) {
  const mesh = useRef<THREE.Points>(null);
  // Generate initial positions along the path or randomly
  const positions = useMemo(() => {
    const arr = [];
    for (let i = 0; i < count; i++) {
      const t = Math.random();
      let pos: [number, number, number];
      if (pathFunction) {
        pos = pathFunction(t);
      } else {
        // Helix default
        const angle = t * Math.PI * 4;
        const x = Math.cos(angle) * 8 + (Math.random() - 0.5) * 2;
        const y = t * 40 - 20 + (Math.random() - 0.5) * 2;
        const z = Math.sin(angle) * 8 + (Math.random() - 0.5) * 2;
        pos = [x, y, z];
      }
      arr.push(...pos);
    }
    return new Float32Array(arr);
  }, [count, pathFunction]);

  // Animate fireflies
  useFrame(({ clock }) => {
    if (mesh.current) {
      const time = clock.getElapsedTime();
      const positions = mesh.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < count; i++) {
        const idx = i * 3;
        positions[idx + 0] += Math.sin(time * 0.7 + i) * 0.01;
        positions[idx + 1] += Math.cos(time * 0.5 + i) * 0.01;
        positions[idx + 2] += Math.sin(time * 0.9 + i) * 0.01;
      }
      mesh.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#fffbe6" size={0.25} sizeAttenuation transparent opacity={0.8} />
    </points>
  );
}

// Comet streaks
function CometStreaks({ count = 3, pathFunction }: { count?: number; pathFunction?: (t: number) => [number, number, number] }) {
  const group = useRef<THREE.Group>(null);
  // Animate comets along the path
  useFrame(({ clock }) => {
    if (group.current) {
      const time = clock.getElapsedTime();
      group.current.children.forEach((mesh, i) => {
        const t = ((time * 0.12 + i * 0.33) % 1);
        let pos: [number, number, number];
        if (pathFunction) {
          pos = pathFunction(t);
        } else {
          // Helix default
          const angle = t * Math.PI * 4;
          const x = Math.cos(angle) * 8;
          const y = t * 40 - 20;
          const z = Math.sin(angle) * 8;
          pos = [x, y, z];
        }
        mesh.position.set(...pos);
      });
    }
  });
  return (
    <group ref={group}>
      {Array.from({ length: count }).map((_, i) => (
        <mesh key={i}>
          <sphereGeometry args={[0.35, 16, 16]} />
          <meshBasicMaterial color="#fff" emissive="#fff" emissiveIntensity={1} />
          {/* Comet tail */}
          <mesh position={[0, 0, -0.7]}>
            <cylinderGeometry args={[0.05, 0.2, 1.2, 8]} />
            <meshBasicMaterial color="#fffbe6" transparent opacity={0.5} />
          </mesh>
        </mesh>
      ))}
    </group>
  );
}

const PathParticles: React.FC<PathParticlesProps> = ({ count = 80, pathFunction }) => {
  return (
    <>
      {/* Starfield background */}
      <Stars radius={100} depth={60} count={800} factor={2.5} saturation={0.7} fade speed={0.5} />
      {/* Firefly particles */}
      <Fireflies count={count} pathFunction={pathFunction} />
      {/* Comet streaks */}
      <CometStreaks count={3} pathFunction={pathFunction} />
    </>
  );
};

export default PathParticles; 