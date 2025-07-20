import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface AgentInfo {
  name: string;
  description: string;
  icon?: string; // emoji or image url
  extra1?: string;
  extra2?: string;
}

interface AgentInfoCubeProps {
  agent: AgentInfo;
  size?: number;
  onClose?: () => void;
}

function createTextTexture({ text, color1, color2 }: { text: string; color1: string; color2: string }) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  // Gradient background
  const gradient = ctx.createLinearGradient(0, 0, 512, 512);
  gradient.addColorStop(0, color1);
  gradient.addColorStop(1, color2);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);
  // Text
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 48px Segoe UI, Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 8;
  ctx.fillText(text, 256, 256);
  return new THREE.CanvasTexture(canvas);
}

function createFaceMaterials(agent: AgentInfo) {
  // Each face: [right, left, top, bottom, front, back]
  return [
    // Right: 'Agent'
    new THREE.MeshBasicMaterial({ map: createTextTexture({ text: 'Agent', color1: '#8EC5FC', color2: '#E0C3FC' }), transparent: true }),
    // Left: 'Info'
    new THREE.MeshBasicMaterial({ map: createTextTexture({ text: 'Info', color1: '#F9D423', color2: '#FF4E50' }), transparent: true }),
    // Top: icon or ''
    new THREE.MeshBasicMaterial({ map: createTextTexture({ text: agent.icon || '', color1: '#43CEA2', color2: '#185A9D' }), transparent: true }),
    // Bottom: ''
    new THREE.MeshBasicMaterial({ map: createTextTexture({ text: '', color1: '#F7971E', color2: '#FFD200' }), transparent: true }),
    // Front: name
    new THREE.MeshBasicMaterial({ map: createTextTexture({ text: agent.name, color1: '#FFDEE9', color2: '#B5FFFC' }), transparent: true }),
    // Back: description
    new THREE.MeshBasicMaterial({ map: createTextTexture({ text: agent.description, color1: '#C9FFBF', color2: '#FFAFBD' }), transparent: true }),
  ];
}

function RotatingCube({ agent, size = 4 }: { agent: AgentInfo; size?: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [pulse, setPulse] = useState(0);
  // Audio for interaction
  const particleAudio = useMemo(() => typeof window !== 'undefined' ? new Audio('/particle-movement.wav') : null, []);
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += 0.01;
      ref.current.rotation.x += 0.005;
      // Pulse effect
      if (hovered) {
        setPulse((p) => (p + delta * 4) % (2 * Math.PI));
        const scale = 1.15 + Math.sin(pulse) * 0.08;
        ref.current.scale.set(scale, scale, scale);
      } else {
        ref.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.2);
      }
    }
  });
  const materials = useMemo(() => createFaceMaterials(agent), [agent]);
  return (
    <mesh
      ref={ref}
      onPointerOver={() => {
        setHovered(true);
        if (particleAudio) {
          particleAudio.currentTime = 0;
          particleAudio.play();
        }
      }}
      onPointerOut={() => setHovered(false)}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[size, size, size]} />
      {materials.map((mat, i) => (
        <primitive attach={`material-${i}`} object={mat} key={i} />
      ))}
      {/* Optional: Add a subtle glow effect when hovered */}
      {hovered && (
        <mesh>
          <boxGeometry args={[size * 1.12, size * 1.12, size * 1.12]} />
          <meshBasicMaterial color="#4ade80" transparent opacity={0.18} />
        </mesh>
      )}
    </mesh>
  );
}

const AgentInfoCube: React.FC<AgentInfoCubeProps> = ({ agent, size = 4, onClose }) => {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 3000, background: 'rgba(0,0,0,0.2)' }}>
      <button
        onClick={onClose}
        style={{ position: 'absolute', top: 30, right: 30, zIndex: 3100, background: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontWeight: 'bold', cursor: 'pointer' }}
      >
        Close
      </button>
      <Canvas camera={{ position: [0, 0, 10] }} style={{ width: '100vw', height: '100vh' }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 10, 7]} intensity={0.7} />
        <RotatingCube agent={agent} size={size} />
      </Canvas>
    </div>
  );
};

export default AgentInfoCube; 





