import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import { useState } from 'react';

type Shape = 'tetrahedral' | 'trigonal-bipyramidal' | 'bent' | 'linear';

const SHAPES: Record<Shape, { bonds: [number, number, number][]; name: string; angle: string }> = {
  tetrahedral: {
    name: 'Tetrahedral (CH₄)',
    angle: '109.5°',
    bonds: [
      [0, 1.2, 0],
      [1.13, -0.4, 0],
      [-0.56, -0.4, 0.97],
      [-0.56, -0.4, -0.97],
    ],
  },
  'trigonal-bipyramidal': {
    name: 'Trigonal Bipyramidal (PCl₅)',
    angle: '90°/120°',
    bonds: [
      [0, 1.3, 0],
      [0, -1.3, 0],
      [1.2, 0, 0],
      [-0.6, 0, 1.04],
      [-0.6, 0, -1.04],
    ],
  },
  bent: {
    name: 'Bent (H₂O)',
    angle: '104.5°',
    bonds: [
      [0.9, 0.7, 0],
      [-0.9, 0.7, 0],
    ],
  },
  linear: {
    name: 'Linear (CO₂)',
    angle: '180°',
    bonds: [
      [1.4, 0, 0],
      [-1.4, 0, 0],
    ],
  },
};

function GeometryScene({ shape }: { shape: Shape }) {
  const data = SHAPES[shape];

  return (
    <group>
      {/* Central atom */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.35, 24, 24]} />
        <meshStandardMaterial color="#f59e0b" emissive="#d97706" emissiveIntensity={0.5} />
      </mesh>

      {data.bonds.map((pos, i) => {
        const [x, y, z] = pos;
        const len = Math.sqrt(x * x + y * y + z * z);
        return (
          <group key={i}>
            {/* Bond */}
            <mesh
              position={[x / 2, y / 2, z / 2]}
              rotation={[
                Math.atan2(Math.sqrt(x*x+z*z), y) - Math.PI/2,
                0,
                Math.atan2(x, z),
              ]}
            >
              <cylinderGeometry args={[0.06, 0.06, len, 8]} />
              <meshStandardMaterial color="#94a3b8" />
            </mesh>
            {/* Terminal atom */}
            <mesh position={pos}>
              <sphereGeometry args={[0.25, 16, 16]} />
              <meshStandardMaterial color="#22d3ee" emissive="#0891b2" emissiveIntensity={0.4} />
            </mesh>
          </group>
        );
      })}

      <Text position={[0, -2, 0]} fontSize={0.3} color="#fff" anchorX="center">{data.name}</Text>
      <Text position={[0, -2.5, 0]} fontSize={0.25} color="#f59e0b" anchorX="center">Bond angle: {data.angle}</Text>
    </group>
  );
}

export default function MolecularGeometry() {
  const [shape, setShape] = useState<Shape>('tetrahedral');

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1">
        <Canvas camera={{ position: [0, 1, 6], fov: 45 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <GeometryScene shape={shape} />
          <OrbitControls enablePan={false} autoRotate autoRotateSpeed={1} />
        </Canvas>
      </div>
      <div className="bg-gray-900 border-t border-gray-800 p-4">
        <div className="flex flex-wrap gap-2 justify-center">
          {(Object.keys(SHAPES) as Shape[]).map(s => (
            <button
              key={s}
              onClick={() => setShape(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                shape === s
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'border-gray-700 text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              }`}
            >
              {SHAPES[s].name.split('(')[0].trim()}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
