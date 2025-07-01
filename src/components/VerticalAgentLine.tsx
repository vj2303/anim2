import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { AIAgents } from '../constants/AIAgents';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';

interface VerticalAgentLineProps {
  scrollPosition: number;
  scene: THREE.Scene;
  onAgentClick?: (agentIndex: number) => void;
}

export const VerticalAgentLine: React.FC<VerticalAgentLineProps> = ({ scrollPosition, scene, onAgentClick }) => {
  const groupRef = useRef<THREE.Group | null>(null);
  const textMeshesRef = useRef<THREE.Mesh[]>([]);
  const lineRef = useRef<THREE.Line | null>(null);
  const raycasterRef = useRef<THREE.Raycaster | null>(null);

  // Parameters
  const lineHeight = 80; // Total height of the vertical line
  const lineOffsetX = -18; // Distance to the left of the path
  const baseY = 0; // Base Y position
  const agentSpacing = lineHeight / (AIAgents.length - 1);

  // Music player state
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    if (!audioRef.current) return;
    const handleEnded = () => setIsPlaying(false);
    audioRef.current.addEventListener('ended', handleEnded);
    return () => {
      audioRef.current?.removeEventListener('ended', handleEnded);
    };
  }, []);

  useEffect(() => {
    // Create group if not exists
    if (!groupRef.current) {
      groupRef.current = new THREE.Group();
      scene.add(groupRef.current);
    }

    // Remove previous line and text
    if (lineRef.current) {
      groupRef.current.remove(lineRef.current);
    }
    textMeshesRef.current.forEach(mesh => groupRef.current?.remove(mesh));
    textMeshesRef.current = [];

    // Create vertical line geometry
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(lineOffsetX, baseY, 0),
      new THREE.Vector3(lineOffsetX, baseY + lineHeight, 0)
    ]);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x222222 });
    const line = new THREE.Line(lineGeometry, lineMaterial);
    groupRef.current.add(line);
    lineRef.current = line;

    // Load font and create agent name texts
    const loader = new FontLoader();
    loader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', (font) => {
      AIAgents.forEach((agent, idx) => {
        const textGeo = new TextGeometry(agent.name, {
          font,
          size: 1.1,
          height: 0.1,
        });
        const textMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
        const textMesh = new THREE.Mesh(textGeo, textMaterial);
        // Animate Y position based on scroll
        const y = baseY + idx * agentSpacing - (scrollPosition % agentSpacing);
        textMesh.position.set(lineOffsetX - 3, y, 0);
        // Set userData for picking
        textMesh.userData = { isAgentName: true, agentIndex: idx };
        textMeshesRef.current.push(textMesh);
        groupRef.current?.add(textMesh);
      });
    });

    // Clean up on unmount
    return () => {
      if (groupRef.current) {
        scene.remove(groupRef.current);
      }
    };
  }, [scrollPosition, scene, agentSpacing, lineOffsetX]);

  // Add click event listener for raycasting
  useEffect(() => {
    if (!onAgentClick) return;
    if (!raycasterRef.current) raycasterRef.current = new THREE.Raycaster();

    const handleClick = (event: MouseEvent) => {
      if (!groupRef.current) return;
      // Get mouse position normalized
      const rect = (scene as unknown as { renderer?: { domElement?: { getBoundingClientRect?: () => DOMRect } } }).renderer?.domElement?.getBoundingClientRect?.() || { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
      const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );
      const camera =
        (scene as unknown as { camera?: THREE.Camera }).camera ||
        (window as unknown as { mainCamera?: THREE.Camera }).mainCamera;
      if (!camera) {
        console.error('No camera found for raycasting!');
        return;
      }
      raycasterRef.current!.setFromCamera(
        mouse,
        camera
      );
      const intersects = raycasterRef.current!.intersectObjects(textMeshesRef.current, false);
      if (intersects.length > 0) {
        const mesh = intersects[0].object;
        if (mesh.userData && mesh.userData.isAgentName && typeof mesh.userData.agentIndex === 'number') {
          onAgentClick(mesh.userData.agentIndex);
        }
      }
    };
    window.addEventListener('click', handleClick);
    return () => {
      window.removeEventListener('click', handleClick);
    };
  }, [onAgentClick, scene]);

  return (
    <>
      {/* Music Play/Pause Button */}
      <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 2000 }}>
        <button
          onClick={handlePlayPause}
          style={{
            background: isPlaying ? '#ef4444' : '#22c55e',
            border: 'none',
            borderRadius: '6px',
            color: 'white',
            padding: '8px 16px',
            fontSize: '14px',
            cursor: 'pointer',
            fontWeight: 'bold',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            transition: 'all 0.2s ease'
          }}
        >
          {isPlaying ? '⏸️ Pause Music' : '▶️ Play Music'}
        </button>
        <audio ref={audioRef} src="/bg-music.mp3" loop preload="auto" />
      </div>
    </>
  );
}; 