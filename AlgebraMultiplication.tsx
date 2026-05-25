import { Canvas } from '@react-three/fiber';
import { Text, OrbitControls } from '@react-three/drei';
import { useState } from 'react';

function AreaModel({ a, b }: { a: number; b: number }) {
  const x = 2;
  const totalW = x + a;
  const totalH = x + b;

  return (
    <group>
      {/* Main area x*x */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[x, x, 0.2]} />
        <meshStandardMaterial color="#22d3ee" transparent opacity={0.85} />
      </mesh>
      <Text position={[0, 0, 0.2]} fontSize={0.35} color="#fff">x²</Text>

      {/* Area a*x */}
      {a > 0 && (
        <>
          <mesh position={[x / 2 + a / 2, 0, 0]}>
            <boxGeometry args={[a, x, 0.2]} />
            <meshStandardMaterial color="#f59e0b" transparent opacity={0.85} />
          </mesh>
          <Text position={[x / 2 + a / 2, 0, 0.2]} fontSize={0.3} color="#fff">{a}x</Text>
        </>
      )}

      {/* Area b*x */}
      {b > 0 && (
        <>
          <mesh position={[0, -(x / 2 + b / 2), 0]}>
            <boxGeometry args={[x, b, 0.2]} />
            <meshStandardMaterial color="#a78bfa" transparent opacity={0.85} />
          </mesh>
          <Text position={[0, -(x / 2 + b / 2), 0.2]} fontSize={0.3} color="#fff">{b}x</Text>
        </>
      )}

      {/* Area a*b */}
      {a > 0 && b > 0 && (
        <>
          <mesh position={[x / 2 + a / 2, -(x / 2 + b / 2), 0]}>
            <boxGeometry args={[a, b, 0.2]} />
            <meshStandardMaterial color="#34d399" transparent opacity={0.85} />
          </mesh>
          <Text position={[x / 2 + a / 2, -(x / 2 + b / 2), 0.2]} fontSize={0.3} color="#fff">{a * b}</Text>
        </>
      )}

      {/* Dimension labels */}
      <Text position={[-x / 2 - 0.4, 0, 0.2]} fontSize={0.25} color="#94a3b8">x</Text>
      <Text position={[x / 2 + a / 2, x / 2 + 0.4, 0.2]} fontSize={0.25} color="#f59e0b">{a > 0 ? `+${a}` : ''}</Text>
      <Text position={[-x / 2 - 0.4, -(x / 2 + b / 2), 0.2]} fontSize={0.25} color="#a78bfa">{b > 0 ? `+${b}` : ''}</Text>
      <Text position={[0, x / 2 + 0.4, 0.2]} fontSize={0.25} color="#94a3b8">x</Text>

      {/* Total label */}
      <Text position={[totalW / 2 - x / 2 + 0.3, -(totalH / 2 - x / 2) - 0.6, 0.2]} fontSize={0.28} color="#fff" anchorX="center">
        {`Area = x² + ${a + b}x + ${a * b}`}
      </Text>
    </group>
  );
}

export default function AlgebraMultiplication() {
  const [a, setA] = useState(2);
  const [b, setB] = useState(3);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1">
        <Canvas camera={{ position: [2, -1, 8], fov: 45 }}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <AreaModel a={a} b={b} />
          <OrbitControls enablePan={false} />
        </Canvas>
      </div>
      <div className="bg-gray-900 border-t border-gray-800 p-4">
        <div className="text-center text-sm font-mono text-white mb-3">
          (x + {a})(x + {b}) = x² + {a + b}x + {a * b}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-amber-400 mb-1 block">Value of a: {a}</label>
            <input type="range" min={1} max={5} value={a} onChange={e => setA(+e.target.value)} className="w-full accent-amber-400" />
          </div>
          <div>
            <label className="text-xs text-purple-400 mb-1 block">Value of b: {b}</label>
            <input type="range" min={1} max={5} value={b} onChange={e => setB(+e.target.value)} className="w-full accent-purple-400" />
          </div>
        </div>
      </div>
    </div>
  );
}
