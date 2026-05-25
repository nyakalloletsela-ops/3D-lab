import { Canvas } from '@react-three/fiber';
import { OrbitControls, Line, Text } from '@react-three/drei';
import { useState } from 'react';

function TorqueScene({ distance }: { distance: number }) {
  const torque = distance * 10;

  return (
    <group>
      {/* Pivot */}
      <mesh position={[-3.5, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.8, 16]} />
        <meshStandardMaterial color="#475569" />
      </mesh>

      {/* Wrench handle */}
      <mesh position={[-3.5 + distance / 2, 0, 0]}>
        <boxGeometry args={[distance, 0.25, 0.4]} />
        <meshStandardMaterial color="#64748b" />
      </mesh>

      {/* Wrench head */}
      <mesh position={[-3.5, 0, 0]}>
        <torusGeometry args={[0.4, 0.12, 8, 16, Math.PI]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>

      {/* Force arrow (downward at hand position) */}
      <Line
        points={[[-3.5 + distance, 0.1, 0.1], [-3.5 + distance, -1.6, 0.1]]}
        color="#f59e0b"
        lineWidth={5}
      />
      <mesh position={[-3.5 + distance, -1.7, 0.1]} rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[0.12, 0.35, 8]} />
        <meshStandardMaterial color="#f59e0b" />
      </mesh>
      <Text position={[-3.5 + distance + 0.3, -1.2, 0]} fontSize={0.28} color="#f59e0b">F</Text>

      {/* Arc showing rotation */}
      {(() => {
        const pts = [];
        for (let i = 0; i <= 20; i++) {
          const a = -Math.PI / 2 + (i / 20) * (Math.PI / 2);
          pts.push([-3.5 + 0.9 * Math.cos(a), 0.9 * Math.sin(a), 0.2] as [number,number,number]);
        }
        return <Line points={pts} color="#22d3ee" lineWidth={3} />;
      })()}

      {/* Distance label */}
      <Line points={[[-3.5, 0.6, 0.1], [-3.5 + distance, 0.6, 0.1]]} color="#34d399" lineWidth={2} />
      <Text position={[-3.5 + distance / 2, 0.9, 0]} fontSize={0.28} color="#34d399" anchorX="center">
        {`d = ${distance.toFixed(1)}`}
      </Text>

      {/* Torque label */}
      <Text position={[1, 1.5, 0]} fontSize={0.35} color="#22d3ee" anchorX="center">
        {`Torque = F × d = 10 × ${distance.toFixed(1)} = ${torque.toFixed(0)} Nm`}
      </Text>
    </group>
  );
}

export default function Torque() {
  const [distance, setDistance] = useState(3);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1">
        <Canvas camera={{ position: [0, 1, 10], fov: 45 }}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <TorqueScene distance={distance} />
          <OrbitControls enablePan={false} />
        </Canvas>
      </div>
      <div className="bg-gray-900 border-t border-gray-800 p-4">
        <label className="text-xs text-emerald-400 mb-1 block">Hand position (distance from bolt): {distance.toFixed(1)}</label>
        <input type="range" min={0.5} max={6} step={0.1} value={distance} onChange={e => setDistance(+e.target.value)} className="w-full accent-emerald-400" />
      </div>
    </div>
  );
}
