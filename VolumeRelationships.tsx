import { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';

function ConePouring({ fillLevel, coneIndex }: { fillLevel: number; coneIndex: number }) {
  const ref = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = clock.getElapsedTime() * 0.3;
    }
  });

  const R = 1.2, H = 2;

  return (
    <group ref={ref}>
      {/* Cylinder */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[R, R, H, 32, 1, true]} />
        <meshStandardMaterial color="#94a3b8" transparent opacity={0.2} side={2} />
      </mesh>

      {/* Water fill */}
      <mesh position={[0, -H / 2 + (fillLevel * H) / 2, 0]}>
        <cylinderGeometry args={[R * 0.98, R * 0.98, fillLevel * H, 32]} />
        <meshStandardMaterial color="#3b82f6" transparent opacity={0.7} />
      </mesh>

      {/* Three cones positioned around */}
      {[0, 1, 2].map(i => {
        const done = i < coneIndex || (i === coneIndex && fillLevel >= (i + 1) / 3);
        return (
          <group key={i} position={[(i - 1) * 1.5, -1.8, -3]}>
            <mesh>
              <coneGeometry args={[R / 2, H / 1.5, 24]} />
              <meshStandardMaterial color={done ? '#22d3ee' : '#334155'} transparent opacity={done ? 0.9 : 0.4} />
            </mesh>
            <Text position={[0, -1, 0]} fontSize={0.22} color={done ? '#22d3ee' : '#64748b'} anchorX="center">
              {done ? 'poured!' : `cone ${i + 1}`}
            </Text>
          </group>
        );
      })}

      <Text position={[0, 1.6, 0]} fontSize={0.28} color="#fff" anchorX="center">
        {`${Math.round(fillLevel * 100)}% full`}
      </Text>
    </group>
  );
}

export default function VolumeRelationships() {
  const [fillLevel, setFillLevel] = useState(0);
  const coneIndex = Math.floor(fillLevel * 3);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1">
        <Canvas camera={{ position: [0, 1, 8], fov: 45 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <ConePouring fillLevel={fillLevel} coneIndex={coneIndex} />
          <OrbitControls enablePan={false} />
        </Canvas>
      </div>
      <div className="bg-gray-900 border-t border-gray-800 p-4">
        <div className="text-center text-sm font-mono text-white mb-3">
          Volume of Cylinder = 3 × Volume of Cone
        </div>
        <label className="text-xs text-blue-400 mb-1 block">Pour water: {Math.round(fillLevel * 100)}%</label>
        <input type="range" min={0} max={100} value={fillLevel * 100} onChange={e => setFillLevel(+e.target.value / 100)} className="w-full accent-blue-400" />
      </div>
    </div>
  );
}
