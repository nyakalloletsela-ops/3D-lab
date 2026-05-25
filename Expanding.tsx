import { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

const PIECES = [
  { label: 'x·x = x²', color: '#22d3ee', size: [1.5, 1.5, 0.5] as [number, number, number], startPos: [-2.5, 1.5, 0] as [number,number,number], endPos: [-1, 0.75, 0] as [number,number,number] },
  { label: 'x·3', color: '#f59e0b', size: [0.9, 1.5, 0.5] as [number, number, number], startPos: [0, 1.5, 0] as [number,number,number], endPos: [1, 0.75, 0] as [number,number,number] },
  { label: '2·x', color: '#a78bfa', size: [1.5, 0.6, 0.5] as [number, number, number], startPos: [-2.5, -1, 0] as [number,number,number], endPos: [-1, -0.3, 0] as [number,number,number] },
  { label: '2·3 = 6', color: '#34d399', size: [0.9, 0.6, 0.5] as [number, number, number], startPos: [0, -1, 0] as [number,number,number], endPos: [1, -0.3, 0] as [number,number,number] },
];

function Piece({ label, color, size, startPos, endPos, merged }: {
  label: string; color: string; size: [number,number,number]; startPos: [number,number,number]; endPos: [number,number,number]; merged: boolean;
}) {
  const ref = useRef<THREE.Group>(null);

  useFrame(() => {
    if (ref.current) {
      const target = merged ? endPos : startPos;
      ref.current.position.x = THREE.MathUtils.lerp(ref.current.position.x, target[0], 0.06);
      ref.current.position.y = THREE.MathUtils.lerp(ref.current.position.y, target[1], 0.06);
    }
  });

  return (
    <group ref={ref} position={startPos}>
      <mesh>
        <boxGeometry args={size} />
        <meshStandardMaterial color={color} transparent opacity={0.85} />
      </mesh>
      <Text position={[0, 0, size[2] / 2 + 0.05]} fontSize={0.22} color="#fff" anchorX="center">
        {label}
      </Text>
    </group>
  );
}

export default function Expanding() {
  const [merged, setMerged] = useState(false);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 relative">
        <Canvas camera={{ position: [0, 0.5, 7], fov: 45 }}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          {PIECES.map((p, i) => (
            <Piece key={i} {...p} merged={merged} />
          ))}
          {merged && (
            <Text position={[0, -2, 0]} fontSize={0.3} color="#fff" anchorX="center">
              (x+2)(x+3) = x² + 5x + 6
            </Text>
          )}
          <OrbitControls enablePan={false} />
        </Canvas>
        <button
          onClick={() => setMerged(v => !v)}
          className="absolute top-4 right-4 px-4 py-2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-lg text-sm font-semibold hover:bg-emerald-500/30 transition-colors"
        >
          {merged ? 'Separate Pieces' : 'Merge Together!'}
        </button>
      </div>
      <div className="bg-gray-900 border-t border-gray-800 p-4">
        <div className="text-center text-sm font-mono text-white">
          (x + 2)(x + 3) = x² + 2x + 3x + 6 = x² + 5x + 6
        </div>
      </div>
    </div>
  );
}
