import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import { useState } from 'react';

function PlaneScene({ m1, c1, m2, c2 }: { m1: number; c1: number; m2: number; c2: number }) {
  // Intersection: m1*x + c1 = m2*x + c2 => x = (c2-c1)/(m1-m2)
  const ix = m1 !== m2 ? (c2 - c1) / (m1 - m2) : null;
  const iy = ix !== null ? m1 * ix + c1 : null;

  return (
    <group>
      {/* Plane 1 */}
      <mesh rotation={[0, 0, Math.atan2(m1, 1)]} position={[0, c1 * 0.5, 0]}>
        <planeGeometry args={[10, 8]} />
        <meshStandardMaterial color="#22d3ee" transparent opacity={0.3} side={2} />
      </mesh>

      {/* Plane 2 */}
      <mesh rotation={[0, 0, Math.atan2(m2, 1)]} position={[0, c2 * 0.5, 0]}>
        <planeGeometry args={[10, 8]} />
        <meshStandardMaterial color="#f59e0b" transparent opacity={0.3} side={2} />
      </mesh>

      {/* Intersection glow */}
      {ix !== null && iy !== null && Math.abs(ix) < 4 && Math.abs(iy) < 4 && (
        <>
          <mesh position={[ix, iy, 0]}>
            <sphereGeometry args={[0.25, 16, 16]} />
            <meshStandardMaterial color="#fff" emissive="#22d3ee" emissiveIntensity={2} />
          </mesh>
          <pointLight position={[ix, iy, 0.5]} color="#22d3ee" intensity={3} distance={3} />
          <Text position={[ix + 0.5, iy + 0.5, 0]} fontSize={0.28} color="#fff">
            {`(${ix.toFixed(1)}, ${iy.toFixed(1)})`}
          </Text>
        </>
      )}

      <Text position={[-3, 3.5, 0]} fontSize={0.28} color="#22d3ee">{`y = ${m1}x + ${c1}`}</Text>
      <Text position={[-3, 3, 0]} fontSize={0.28} color="#f59e0b">{`y = ${m2}x + ${c2}`}</Text>
    </group>
  );
}

export default function SystemsOfEquations() {
  const [m1, setM1] = useState(1);
  const [c1, setC1] = useState(1);
  const [m2, setM2] = useState(-1);
  const [c2, setC2] = useState(3);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1">
        <Canvas camera={{ position: [0, 2, 10], fov: 45 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <PlaneScene m1={m1} c1={c1} m2={m2} c2={c2} />
          <OrbitControls enablePan={false} />
        </Canvas>
      </div>
      <div className="bg-gray-900 border-t border-gray-800 p-4 grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <p className="text-xs text-cyan-400 font-semibold">Equation 1 (blue)</p>
          <div>
            <label className="text-xs text-gray-400">Slope m₁: {m1}</label>
            <input type="range" min={-3} max={3} step={0.5} value={m1} onChange={e => setM1(+e.target.value)} className="w-full accent-cyan-400" />
          </div>
          <div>
            <label className="text-xs text-gray-400">Intercept c₁: {c1}</label>
            <input type="range" min={-4} max={4} step={0.5} value={c1} onChange={e => setC1(+e.target.value)} className="w-full accent-cyan-400" />
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs text-amber-400 font-semibold">Equation 2 (orange)</p>
          <div>
            <label className="text-xs text-gray-400">Slope m₂: {m2}</label>
            <input type="range" min={-3} max={3} step={0.5} value={m2} onChange={e => setM2(+e.target.value)} className="w-full accent-amber-400" />
          </div>
          <div>
            <label className="text-xs text-gray-400">Intercept c₂: {c2}</label>
            <input type="range" min={-4} max={4} step={0.5} value={c2} onChange={e => setC2(+e.target.value)} className="w-full accent-amber-400" />
          </div>
        </div>
      </div>
    </div>
  );
}
