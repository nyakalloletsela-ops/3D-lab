import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';

function WaterParticle({ yStart, speed }: { yStart: number; speed: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const y = useRef(yStart);

  useFrame((_, delta) => {
    y.current += delta * speed;
    if (y.current > 3.5) y.current = -3;
    if (ref.current) ref.current.position.y = y.current;
  });

  return (
    <mesh ref={ref} position={[-0.25, yStart, 0]}>
      <sphereGeometry args={[0.08, 8, 8]} />
      <meshStandardMaterial color="#60a5fa" emissive="#3b82f6" emissiveIntensity={0.8} />
    </mesh>
  );
}

function SugarParticle({ yStart, speed }: { yStart: number; speed: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const y = useRef(yStart);

  useFrame((_, delta) => {
    y.current -= delta * speed;
    if (y.current < -3) y.current = 3.5;
    if (ref.current) ref.current.position.y = y.current;
  });

  return (
    <mesh ref={ref} position={[0.25, yStart, 0]}>
      <sphereGeometry args={[0.08, 8, 8]} />
      <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.8} />
    </mesh>
  );
}

function PlantScene() {
  return (
    <group>
      {/* Stem */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.35, 0.45, 7, 16]} />
        <meshStandardMaterial color="#166534" />
      </mesh>

      {/* Xylem tube (left) */}
      <mesh position={[-0.25, 0, 0.2]}>
        <cylinderGeometry args={[0.07, 0.07, 7, 8]} />
        <meshStandardMaterial color="#93c5fd" transparent opacity={0.6} />
      </mesh>

      {/* Phloem tube (right) */}
      <mesh position={[0.25, 0, 0.2]}>
        <cylinderGeometry args={[0.07, 0.07, 7, 8]} />
        <meshStandardMaterial color="#fcd34d" transparent opacity={0.6} />
      </mesh>

      {/* Roots */}
      {[-0.5, 0, 0.5].map((x, i) => (
        <mesh key={i} position={[x, -4.5, 0]} rotation={[0, 0, (i - 1) * 0.4]}>
          <cylinderGeometry args={[0.08, 0.04, 2, 6]} />
          <meshStandardMaterial color="#92400e" />
        </mesh>
      ))}

      {/* Leaves */}
      {[1.5, -1.5, 2.5, -2.5].map((y, i) => (
        <mesh key={i} position={[i % 2 === 0 ? 0.8 : -0.8, y, 0]} rotation={[0, 0, i % 2 === 0 ? -0.5 : 0.5]}>
          <sphereGeometry args={[0.6, 12, 8]} />
          <meshStandardMaterial color="#22c55e" transparent opacity={0.9} />
        </mesh>
      ))}

      {/* Top flower */}
      <mesh position={[0, 3.8, 0]}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshStandardMaterial color="#f9a8d4" />
      </mesh>

      {/* Water particles going UP */}
      {[0, 1, 2, 3, 4].map(i => (
        <WaterParticle key={i} yStart={-3 + i * 1.4} speed={1.5} />
      ))}

      {/* Sugar particles going DOWN */}
      {[0, 1, 2, 3, 4].map(i => (
        <SugarParticle key={i} yStart={3 - i * 1.4} speed={1.2} />
      ))}

      {/* Labels */}
      <Text position={[-1.5, 1, 0.3]} fontSize={0.25} color="#60a5fa" anchorX="center">Xylem</Text>
      <Text position={[-1.5, 0.5, 0.3]} fontSize={0.18} color="#64748b" anchorX="center">Water ↑</Text>
      <Text position={[1.5, 1, 0.3]} fontSize={0.25} color="#fbbf24" anchorX="center">Phloem</Text>
      <Text position={[1.5, 0.5, 0.3]} fontSize={0.18} color="#64748b" anchorX="center">Sugar ↓</Text>
    </group>
  );
}

export default function PlantSystems() {
  return (
    <div className="w-full h-full">
      <Canvas camera={{ position: [0, 0, 10], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <PlantScene />
        <OrbitControls enablePan={false} />
      </Canvas>
    </div>
  );
}
