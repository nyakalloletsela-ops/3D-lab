import { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';

function Particle({ startX, speed, narrow }: { startX: number; speed: number; narrow: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  const offset = useRef(startX);

  useFrame((_, delta) => {
    if (!ref.current) return;
    const inNarrow = offset.current > -0.5 && offset.current < 0.5;
    const s = narrow && inNarrow ? speed * 2.5 : speed;
    offset.current += delta * s;
    if (offset.current > 4) offset.current = -4;
    const r = inNarrow ? 0.25 : 0.6;
    ref.current.position.set(
      offset.current,
      (Math.random() < 0.01 ? (Math.random() - 0.5) * 2 * r : ref.current.position.y),
      0
    );
    ref.current.position.x = offset.current;
  });

  return (
    <mesh ref={ref} position={[startX, (Math.random() - 0.5) * 0.8, 0]}>
      <sphereGeometry args={[0.06, 8, 8]} />
      <meshStandardMaterial color="#60a5fa" emissive="#3b82f6" emissiveIntensity={0.5} />
    </mesh>
  );
}

function PipeScene() {
  return (
    <group>
      {/* Wide left pipe */}
      <mesh position={[-2.5, 0, 0]}>
        <cylinderGeometry args={[0.7, 0.7, 3, 24, 1, true]} rotation={[0, 0, Math.PI / 2] as unknown as undefined} />
        <meshStandardMaterial color="#334155" transparent opacity={0.3} side={2} />
      </mesh>

      {/* Narrow middle */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 1, 24, 1, true]} rotation={[0, 0, Math.PI / 2] as unknown as undefined} />
        <meshStandardMaterial color="#334155" transparent opacity={0.3} side={2} />
      </mesh>

      {/* Wide right */}
      <mesh position={[2.5, 0, 0]}>
        <cylinderGeometry args={[0.7, 0.7, 3, 24, 1, true]} rotation={[0, 0, Math.PI / 2] as unknown as undefined} />
        <meshStandardMaterial color="#334155" transparent opacity={0.3} side={2} />
      </mesh>

      {/* Pressure indicators */}
      <mesh position={[-2, 0, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 1.2, 8]} />
        <meshStandardMaterial color="#f43f5e" />
      </mesh>
      <Text position={[-2, 1, 0]} fontSize={0.22} color="#f43f5e" anchorX="center">High P</Text>

      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.4, 8]} />
        <meshStandardMaterial color="#22d3ee" />
      </mesh>
      <Text position={[0, 0.7, 0]} fontSize={0.22} color="#22d3ee" anchorX="center">Low P</Text>

      {/* Particles */}
      {Array.from({ length: 16 }).map((_, i) => (
        <Particle key={i} startX={-4 + i * 0.5} speed={1.2} narrow={true} />
      ))}

      <Text position={[0, -1.5, 0]} fontSize={0.28} color="#94a3b8" anchorX="center">
        Narrow = faster flow = LOWER pressure
      </Text>
    </group>
  );
}

export default function Bernoulli() {
  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1">
        <Canvas camera={{ position: [0, 1, 7], fov: 45 }}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <PipeScene />
          <OrbitControls enablePan={false} />
        </Canvas>
      </div>
      <div className="bg-gray-900 border-t border-gray-800 p-4">
        <div className="flex gap-6 justify-center text-xs">
          <span className="text-rose-400">Red column = High Pressure (wide pipe)</span>
          <span className="text-cyan-400">Blue column = Low Pressure (narrow pipe)</span>
        </div>
      </div>
    </div>
  );
}
