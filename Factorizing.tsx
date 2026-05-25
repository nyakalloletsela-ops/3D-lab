import { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

function FactorPuzzle({ exploded, a, b }: { exploded: boolean; a: number; b: number }) {
  const leftRef = useRef<THREE.Group>(null);
  const rightRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const target = exploded ? 2.2 : 0;
    if (leftRef.current) leftRef.current.position.x = THREE.MathUtils.lerp(leftRef.current.position.x, -target, 0.06);
    if (rightRef.current) rightRef.current.position.x = THREE.MathUtils.lerp(rightRef.current.position.x, target, 0.06);
  });

  return (
    <group>
      {/* Combined block */}
      {!exploded && (
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[3, 1.2, 1]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
      )}

      <group ref={leftRef} position={[0, 0, 0]}>
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[1.4, 1.2, 1]} />
          <meshStandardMaterial color="#22d3ee" emissive="#0891b2" emissiveIntensity={0.4} />
        </mesh>
        <Text position={[0, 0.5, 0.55]} fontSize={0.35} color="#fff" anchorX="center">
          {`(x+${a})`}
        </Text>
      </group>

      <group ref={rightRef} position={[0, 0, 0]}>
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[1.4, 1.2, 1]} />
          <meshStandardMaterial color="#f59e0b" emissive="#d97706" emissiveIntensity={0.4} />
        </mesh>
        <Text position={[0, 0.5, 0.55]} fontSize={0.35} color="#fff" anchorX="center">
          {`(x+${b})`}
        </Text>
      </group>

      <Text position={[0, -0.7, 0]} fontSize={0.28} color="#94a3b8" anchorX="center">
        {`x² + ${a + b}x + ${a * b} = (x+${a})(x+${b})`}
      </Text>
    </group>
  );
}

export default function Factorizing() {
  const [exploded, setExploded] = useState(false);
  const [a, setA] = useState(2);
  const [b, setB] = useState(3);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 relative">
        <Canvas camera={{ position: [0, 1, 7], fov: 45 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <FactorPuzzle exploded={exploded} a={a} b={b} />
          <OrbitControls enablePan={false} />
        </Canvas>
        <button
          onClick={() => setExploded(v => !v)}
          className="absolute top-4 right-4 px-4 py-2 bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 rounded-lg text-sm font-semibold hover:bg-cyan-500/30 transition-colors"
        >
          {exploded ? 'Combine Factors' : 'Break Apart!'}
        </button>
      </div>
      <div className="bg-gray-900 border-t border-gray-800 p-4 grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-cyan-400 mb-1 block">Factor a: {a}</label>
          <input type="range" min={1} max={6} value={a} onChange={e => setA(+e.target.value)} className="w-full accent-cyan-400" />
        </div>
        <div>
          <label className="text-xs text-amber-400 mb-1 block">Factor b: {b}</label>
          <input type="range" min={1} max={6} value={b} onChange={e => setB(+e.target.value)} className="w-full accent-amber-400" />
        </div>
      </div>
    </div>
  );
}
