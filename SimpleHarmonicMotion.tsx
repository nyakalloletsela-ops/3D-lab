import { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';

function PendulumScene({ length, amplitude }: { length: number; amplitude: number }) {
  const bobRef = useRef<THREE.Group>(null);
  const time = useRef(0);
  const trail = useRef<[number, number, number][]>([]);

  function Trail() {
    const lineRef = useRef<THREE.Line>(null);
    useFrame(() => {
      if (lineRef.current && trail.current.length >= 2) {
        const pos = new Float32Array(trail.current.flatMap(p => p));
        (lineRef.current.geometry as THREE.BufferGeometry).setAttribute(
          'position',
          new THREE.BufferAttribute(pos, 3)
        );
        lineRef.current.geometry.computeBoundingSphere();
      }
    });
    return (
      <line ref={lineRef}>
        <bufferGeometry />
        <lineBasicMaterial color="#22d3ee" transparent opacity={0.7} />
      </line>
    );
  }

  useFrame((_, delta) => {
    time.current += delta;
    const angle = amplitude * Math.cos(Math.sqrt(9.8 / length) * time.current);
    const bx = length * Math.sin(angle);
    const by = -length * Math.cos(angle);
    if (bobRef.current) bobRef.current.position.set(bx, by, 0);
    trail.current.push([time.current * 1.2 - 6, by - 0.5, -0.5]);
    if (trail.current.length > 100) trail.current.shift();
  });

  return (
    <group position={[0, 1.5, 0]}>
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshStandardMaterial color="#64748b" />
      </mesh>
      <group ref={bobRef} position={[0, -length, 0]}>
        <mesh position={[0, length / 2, 0]}>
          <cylinderGeometry args={[0.03, 0.03, length, 6]} />
          <meshStandardMaterial color="#94a3b8" />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.28, 16, 16]} />
          <meshStandardMaterial color="#f59e0b" emissive="#d97706" emissiveIntensity={0.5} />
        </mesh>
      </group>
      <Trail />
      <Text position={[3.5, -length, 0]} fontSize={0.25} color="#22d3ee">sine wave</Text>
    </group>
  );
}

export default function SimpleHarmonicMotion() {
  const [length, setLength] = useState(2);
  const [amplitude, setAmplitude] = useState(0.4);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1">
        <Canvas camera={{ position: [0, 0, 8], fov: 50 }}>
          <ambientLight intensity={0.6} />
          <PendulumScene length={length} amplitude={amplitude} />
          <OrbitControls enablePan={false} />
        </Canvas>
      </div>
      <div className="bg-gray-900 border-t border-gray-800 p-4 grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-amber-400 mb-1 block">Pendulum length: {length.toFixed(1)} m</label>
          <input type="range" min={0.5} max={3} step={0.1} value={length} onChange={e => setLength(+e.target.value)} className="w-full accent-amber-400" />
        </div>
        <div>
          <label className="text-xs text-cyan-400 mb-1 block">Amplitude: {amplitude.toFixed(2)} rad</label>
          <input type="range" min={0.1} max={0.8} step={0.05} value={amplitude} onChange={e => setAmplitude(+e.target.value)} className="w-full accent-cyan-400" />
        </div>
      </div>
    </div>
  );
}
