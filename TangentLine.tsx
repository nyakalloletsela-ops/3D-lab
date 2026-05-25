import { Canvas } from '@react-three/fiber';
import { OrbitControls, Line, Text } from '@react-three/drei';
import { useState } from 'react';
import * as THREE from 'three';

function TangentScene({ t }: { t: number }) {
  const f = (x: number) => 0.3 * x * x * x - x + 1;
  const df = (x: number) => 0.9 * x * x - 1;

  const curvePoints: THREE.Vector3[] = [];
  for (let i = 0; i <= 80; i++) {
    const x = -3 + (i / 80) * 6;
    curvePoints.push(new THREE.Vector3(x, f(x), 0));
  }

  const slope = df(t);
  const yt = f(t);
  const tx1 = t - 1.5;
  const tx2 = t + 1.5;
  const ty1 = yt + slope * (-1.5);
  const ty2 = yt + slope * 1.5;

  return (
    <group>
      <Line points={[[-3.5, 0, 0], [3.5, 0, 0]]} color="#1e293b" lineWidth={1.5} />
      <Line points={[[0, -3.5, 0], [0, 3.5, 0]]} color="#1e293b" lineWidth={1.5} />
      <Line points={curvePoints} color="#22d3ee" lineWidth={3} />

      {/* Tangent line */}
      <Line
        points={[new THREE.Vector3(tx1, ty1, 0.05), new THREE.Vector3(tx2, ty2, 0.05)]}
        color="#f59e0b"
        lineWidth={4}
      />

      {/* Touch point */}
      <mesh position={[t, yt, 0.1]}>
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={1} />
      </mesh>
      <pointLight position={[t, yt, 0.5]} color="#f59e0b" intensity={2} distance={2} />

      <Text position={[t + 0.3, yt + 0.5, 0.1]} fontSize={0.28} color="#f59e0b">
        {`slope = ${slope.toFixed(2)}`}
      </Text>
    </group>
  );
}

export default function TangentLine() {
  const [t, setT] = useState(0);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1">
        <Canvas camera={{ position: [0, 0, 10], fov: 45 }}>
          <ambientLight intensity={0.7} />
          <TangentScene t={t} />
          <OrbitControls enablePan={false} />
        </Canvas>
      </div>
      <div className="bg-gray-900 border-t border-gray-800 p-4">
        <label className="text-xs text-amber-400 mb-1 block">Point on curve x = {t.toFixed(1)}</label>
        <input type="range" min={-2.5} max={2.5} step={0.1} value={t} onChange={e => setT(+e.target.value)} className="w-full accent-amber-400" />
      </div>
    </div>
  );
}
