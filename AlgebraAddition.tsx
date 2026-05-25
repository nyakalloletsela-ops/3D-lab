import { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

function Scale({ xLeft, numRight, tipped }: { xLeft: number; numRight: number; tipped: boolean }) {
  const armRef = useRef<THREE.Group>(null);
  const targetTilt = tipped ? (xLeft > numRight ? 0.3 : -0.3) : 0;

  useFrame(() => {
    if (armRef.current) {
      armRef.current.rotation.z = THREE.MathUtils.lerp(armRef.current.rotation.z, targetTilt, 0.05);
    }
  });

  return (
    <group>
      {/* Pole */}
      <mesh position={[0, -0.5, 0]}>
        <cylinderGeometry args={[0.05, 0.1, 2, 12]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>

      {/* Arm */}
      <group ref={armRef}>
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[4, 0.08, 0.2]} />
          <meshStandardMaterial color="#64748b" />
        </mesh>

        {/* Left pan (X blocks) */}
        <mesh position={[-2, 0.3, 0]}>
          <boxGeometry args={[0.8, 0.05, 0.8]} />
          <meshStandardMaterial color="#475569" />
        </mesh>
        {Array.from({ length: Math.min(xLeft, 4) }).map((_, i) => (
          <mesh key={i} position={[-2, 0.5 + i * 0.35, 0]}>
            <boxGeometry args={[0.5, 0.3, 0.5]} />
            <meshStandardMaterial color="#22d3ee" emissive="#0891b2" emissiveIntensity={0.3} />
          </mesh>
        ))}
        <Text position={[-2, 0.5 + Math.min(xLeft, 4) * 0.35 + 0.3, 0]} fontSize={0.25} color="#22d3ee">
          {`x = ${xLeft}`}
        </Text>

        {/* Right pan (number weights) */}
        <mesh position={[2, 0.3, 0]}>
          <boxGeometry args={[0.8, 0.05, 0.8]} />
          <meshStandardMaterial color="#475569" />
        </mesh>
        {Array.from({ length: Math.min(numRight, 6) }).map((_, i) => (
          <mesh key={i} position={[2, 0.5 + i * 0.28, 0]}>
            <sphereGeometry args={[0.18, 12, 12]} />
            <meshStandardMaterial color="#f59e0b" emissive="#d97706" emissiveIntensity={0.3} />
          </mesh>
        ))}
        <Text position={[2, 0.5 + Math.min(numRight, 6) * 0.28 + 0.3, 0]} fontSize={0.25} color="#f59e0b">
          {numRight}
        </Text>
      </group>

      {/* Base */}
      <mesh position={[0, -1.6, 0]}>
        <boxGeometry args={[1.2, 0.2, 0.6]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
    </group>
  );
}

export default function AlgebraAddition() {
  const [xVal, setXVal] = useState(3);
  const [rightVal, setRightVal] = useState(5);
  const balanced = xVal === rightVal;

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 relative">
        <Canvas camera={{ position: [0, 1, 7], fov: 45 }} shadows>
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 8, 5]} intensity={1} castShadow />
          <Scale xLeft={xVal} numRight={rightVal} tipped={!balanced} />
          <OrbitControls enablePan={false} minDistance={4} maxDistance={12} />
          <fog attach="fog" args={['#0f172a', 15, 30]} />
        </Canvas>
        <div className={`absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm font-bold border ${balanced ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-rose-500/20 border-rose-500/40 text-rose-300'}`}>
          {balanced ? 'BALANCED! x = ' + xVal : `x ≠ ${rightVal} — Not balanced!`}
        </div>
      </div>
      <div className="bg-gray-900 border-t border-gray-800 p-4 grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-gray-400 mb-1 block">X value (left pan): {xVal}</label>
          <input type="range" min={1} max={6} value={xVal} onChange={e => setXVal(+e.target.value)} className="w-full accent-cyan-400" />
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Number weights (right pan): {rightVal}</label>
          <input type="range" min={1} max={6} value={rightVal} onChange={e => setRightVal(+e.target.value)} className="w-full accent-amber-400" />
        </div>
      </div>
    </div>
  );
}
