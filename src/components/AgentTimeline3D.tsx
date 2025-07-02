import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AIAgents } from '../constants/AIAgents';
import AgentInfoCube from './AgentInfoCube';

interface AgentTimeline3DProps {
  onAgentSelect?: (agentIndex: number) => void;
}

function AgentPoint({ position, agent, index, onClick, isSelected }: any) {
  const meshRef = useRef<THREE.Mesh>(null);
  // Animate scale if selected
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.scale.setScalar(isSelected ? 1.4 : 1);
    }
  });
  // Canvas texture for emoji/icon
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 128, 128);
  ctx.font = '64px Segoe UI, Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(agent.name[0], 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  return (
    <mesh
      ref={meshRef}
      position={position}
      onClick={() => onClick(index)}
      castShadow
      receiveShadow
    >
      <sphereGeometry args={[0.8, 32, 32]} />
      <meshStandardMaterial map={texture} color={isSelected ? '#FFD700' : '#4ade80'} />
    </mesh>
  );
}

function AgentHalo({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      // Pulse the scale
      const t = clock.getElapsedTime();
      const scale = 1.3 + Math.sin(t * 2) * 0.2;
      ref.current.scale.set(scale, scale, scale);
      // Animate color
      const color = new THREE.Color();
      color.setHSL(0.13 + 0.07 * Math.sin(t * 1.5), 1, 0.6 + 0.2 * Math.sin(t * 2.5));
      (ref.current.material as THREE.MeshBasicMaterial).color = color;
      (ref.current.material as THREE.MeshBasicMaterial).opacity = 0.55 + 0.25 * Math.abs(Math.sin(t * 2));
    }
  });
  return (
    <mesh ref={ref} position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[1.05, 1.35, 48]} />
      <meshBasicMaterial transparent opacity={0.7} color="#ffe066" side={THREE.DoubleSide} />
    </mesh>
  );
}

function FloatingAgentInfo({ agent, position, onNameClick }: { agent: any; position: [number, number, number]; onNameClick?: () => void }) {
  // Simple floating text panel
  const panelRef = useRef<THREE.Group>(null);
  useFrame(() => {
    if (panelRef.current) {
      panelRef.current.position.y += Math.sin(Date.now() * 0.001) * 0.01;
    }
  });
  // Canvas texture for info
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#222';
  ctx.fillRect(0, 0, 512, 192);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 36px Segoe UI, Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(agent.name, 24, 24);
  ctx.font = '24px Segoe UI, Arial';
  ctx.fillText(agent.description, 24, 80);
  const texture = new THREE.CanvasTexture(canvas);
  return (
    <group ref={panelRef} position={position}>
      <mesh position={[0, 2, 0]}>
        <planeGeometry args={[5, 2]} />
        <meshBasicMaterial map={texture} transparent />
      </mesh>
      {/* Transparent clickable plane over the name area */}
      <mesh
        position={[0, 2.7, 0.01]}
        onClick={onNameClick}
        visible={true}
      >
        <planeGeometry args={[3.5, 0.7]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </group>
  );
}

const AgentTimeline3D: React.FC<AgentTimeline3DProps> = ({ onAgentSelect }) => {
  const [selected, setSelected] = useState<number | null>(null);
  const [showAgentCube, setShowAgentCube] = useState(false);
  const [cubeAgent, setCubeAgent] = useState<{ name: string; description: string; icon?: string } | null>(null);
  // Arrange agents along a 3D helix
  const points = AIAgents.map((agent, i) => {
    const angle = i * 0.5;
    const x = Math.cos(angle) * 8;
    const y = i * 2.5 - (AIAgents.length * 1.25);
    const z = Math.sin(angle) * 8;
    return [x, y, z] as [number, number, number];
  });
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 3000, background: 'rgba(0,0,0,0.3)' }}>
      {/* Agent Info 3D Cube Overlay */}
      {showAgentCube && cubeAgent && (
        <AgentInfoCube
          agent={cubeAgent}
          onClose={() => setShowAgentCube(false)}
        />
      )}
      <Canvas camera={{ position: [0, 0, 30], fov: 60 }} style={{ width: '100vw', height: '100vh' }} shadows>
        <ambientLight intensity={0.7} />
        <directionalLight position={[10, 20, 10]} intensity={0.7} />
        {AIAgents.map((agent, i) => (
          <AgentPoint
            key={i}
            position={points[i]}
            agent={agent}
            index={i}
            isSelected={selected === i}
            onClick={(idx: number) => {
              setSelected(idx);
              if (onAgentSelect) onAgentSelect(idx);
            }}
          />
        ))}
        {selected !== null && (
          <>
            <AgentHalo position={points[selected]} />
            <FloatingAgentInfo
              agent={AIAgents[selected]}
              position={points[selected]}
              onNameClick={() => {
                const agent = AIAgents[selected];
                const match = agent.name.match(/^([\p{Emoji}\p{Extended_Pictographic}]+)\s*(.*)$/u);
                const icon = match ? match[1] : '';
                const name = match ? match[2] : agent.name;
                setCubeAgent({ name, description: agent.description, icon });
                setShowAgentCube(true);
              }}
            />
          </>
        )}
      </Canvas>
      <button
        onClick={() => setSelected(null)}
        style={{ position: 'absolute', top: 30, right: 30, zIndex: 3100, background: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontWeight: 'bold', cursor: 'pointer' }}
      >
        Close Info
      </button>
    </div>
  );
};

export default AgentTimeline3D; 