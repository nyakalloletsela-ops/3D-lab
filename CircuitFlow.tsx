import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';

const CIRCUIT: [number, number][] = [
  [-2.5, -1.5], [-2.5, 1.5], [2.5, 1.5], [2.5, -1.5], [-2.5, -1.5]
];

function Electron({ offset }: { offset: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const t = useRef(offset);

  useFrame((_, delta) => {
    t.current = (t.current + delta * 0.3) % 1;
    if (!ref.current) return;

    const totalPts = CIRCUIT.length - 1;
    const seg = Math.floor(t.current * totalPts);
    const frac = (t.current * totalPts) % 1;
    const p0 = CIRCUIT[seg];
    const p1 = CIRCUIT[Math.min(seg + 1, CIRCUIT.length - 1)];
    ref.current.position.set(
      p0[0] + (p1[0] - p0[0]) * frac,
      p0[1] + (p1[1] - p0[1]) * frac,
      0.1
    );
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.12, 10, 10]} />
      <meshStandardMaterial color="#60a5fa" emissive="#3b82f6" emissiveIntensity={1} />
    </mesh>
  );
}

function CircuitScene() {
  return (
    <group>
      {/* Wires */}
      {CIRCUIT.slice(0, -1).map((p, i) => {
        const p1 = CIRCUIT[i + 1];
        const mx = (p[0] + p1[0]) / 2;
        const my = (p[1] + p1[1]) / 2;
        const len = Math.sqrt((p1[0] - p[0]) ** 2 + (p1[1] - p[1]) ** 2);
        const angle = Math.atan2(p1[1] - p[1], p1[0] - p[0]);
        return (
          <mesh key={i} position={[mx, my, 0]} rotation={[0, 0, angle]}>
            <boxGeometry args={[len, 0.08, 0.08]} />
            <meshStandardMaterial color="#475569" />
          </mesh>
        );
      })}

      {/* Battery */}
      <mesh position={[-2.5, 0, 0.1]}>
        <boxGeometry args={[0.5, 1.2, 0.4]} />
        <meshStandardMaterial color="#34d399" emissive="#10b981" emissiveIntensity={0.3} />
      </mesh>
      <Text position={[-2.5, 0, 0.4]} fontSize={0.22} color="#fff" anchorX="center">BATT</Text>
      <Text position={[-2.5, 0.75, 0.4]} fontSize={0.3} color="#fff" anchorX="center">+</Text>
      <Text position={[-2.5, -0.75, 0.4]} fontSize={0.3} color="#fff" anchorX="center">−</Text>

      {/* Bulb */}
      <mesh position={[2.5, 0, 0.1]}>
        <sphereGeometry args={[0.45, 16, 16]} />
        <meshStandardMaterial color="#fef08a" emissive="#fbbf24" emissiveIntensity={1} transparent opacity={0.9} />
      </mesh>
      <pointLight position={[2.5, 0, 0.5]} color="#fbbf24" intensity={3} distance={3} />
      <Text position={[2.5, -0.8, 0.4]} fontSize={0.22} color="#fbbf24" anchorX="center">BULB</Text>

      {/* Electrons */}
      {Array.from({ length: 6 }).map((_, i) => (
        <Electron key={i} offset={i / 6} />
      ))}

      <Text position={[0, 2.3, 0]} fontSize={0.28} color="#94a3b8" anchorX="center">
        Electrons flow from − to + (conventional current: + to −)
      </Text>
    </group>
  );
}

export default function CircuitFlow() {
  return (
    <div className="w-full h-full">
      <Canvas camera={{ position: [0, 0, 7], fov: 45 }}>
        <ambientLight intensity={0.4} />
        <CircuitScene />
        <OrbitControls enablePan={false} />
      </Canvas>
    </div>
  );
}
