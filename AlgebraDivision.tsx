import { Canvas } from '@react-three/fiber';
import { Text, OrbitControls } from '@react-three/drei';
import { useState } from 'react';

function DivisionScene({ total, divisor }: { total: number; divisor: number }) {
  const sections = divisor;
  const sectionSize = 4 / sections;

  return (
    <group>
      {/* Full block */}
      <Text position={[0, 1.8, 0]} fontSize={0.35} color="#94a3b8" anchorX="center">
        {`${total}x² ÷ ${divisor}x = ${total / divisor}x`}
      </Text>

      {Array.from({ length: sections }).map((_, i) => (
        <group key={i} position={[-2 + sectionSize * i + sectionSize / 2, 0, 0]}>
          <mesh>
            <boxGeometry args={[sectionSize - 0.05, 1.5, 1]} />
            <meshStandardMaterial
              color={`hsl(${(i * 360) / sections}, 70%, 55%)`}
              transparent
              opacity={0.85}
            />
          </mesh>
          <Text position={[0, 0, 0.55]} fontSize={0.3} color="#fff" anchorX="center">
            {total / divisor}x
          </Text>
        </group>
      ))}

      {/* Brace */}
      <mesh position={[0, -1.2, 0]}>
        <boxGeometry args={[4, 0.05, 0.05]} />
        <meshStandardMaterial color="#64748b" />
      </mesh>
      <Text position={[0, -1.5, 0]} fontSize={0.28} color="#22d3ee" anchorX="center">
        {`${divisor} equal sections`}
      </Text>
    </group>
  );
}

export default function AlgebraDivision() {
  const [total, setTotal] = useState(12);
  const [divisor, setDivisor] = useState(3);

  const validTotal = Math.round(total / divisor) * divisor;

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1">
        <Canvas camera={{ position: [0, 0.5, 7], fov: 45 }}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <DivisionScene total={validTotal} divisor={divisor} />
          <OrbitControls enablePan={false} />
        </Canvas>
      </div>
      <div className="bg-gray-900 border-t border-gray-800 p-4 grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-cyan-400 mb-1 block">Coefficient (total): {validTotal}</label>
          <input type="range" min={4} max={24} step={1} value={total} onChange={e => setTotal(+e.target.value)} className="w-full accent-cyan-400" />
        </div>
        <div>
          <label className="text-xs text-amber-400 mb-1 block">Divisor: {divisor}</label>
          <input type="range" min={1} max={6} value={divisor} onChange={e => setDivisor(+e.target.value)} className="w-full accent-amber-400" />
        </div>
      </div>
    </div>
  );
}
