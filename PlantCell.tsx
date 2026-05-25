import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';

interface Organelle {
  name: string;
  description: string;
  pos: [number, number, number];
  size: [number, number, number];
  color: string;
}

const ORGANELLES: Organelle[] = [
  { name: 'Cell Wall', description: 'Rigid outer box that gives the plant cell its boxy shape', pos: [0, 0, 0], size: [3.8, 3.8, 3.8], color: '#713f12' },
  { name: 'Vacuole', description: 'Large water storage — keeps the plant firm and upright', pos: [0, 0, 0], size: [2, 2, 2], color: '#60a5fa' },
  { name: 'Chloroplast', description: 'Green solar panel — uses sunlight to make food (photosynthesis)', pos: [1.3, 0.8, 0.5], size: [0.5, 0.3, 0.3], color: '#4ade80' },
  { name: 'Chloroplast', description: 'Green solar panel — uses sunlight to make food (photosynthesis)', pos: [-1.2, 0.9, -0.3], size: [0.5, 0.3, 0.3], color: '#4ade80' },
  { name: 'Chloroplast', description: 'Green solar panel — uses sunlight to make food (photosynthesis)', pos: [0.3, -1.1, 0.6], size: [0.5, 0.3, 0.3], color: '#4ade80' },
  { name: 'Nucleus', description: 'Control center — holds DNA blueprints', pos: [-0.6, 0.4, 0.8], size: [0.5, 0.5, 0.5], color: '#f59e0b' },
];

function PlantCellScene({ selected, onSelect }: { selected: number | null; onSelect: (i: number | null) => void }) {
  return (
    <group>
      {ORGANELLES.map((org, i) => (
        <mesh
          key={i}
          position={org.pos}
          onClick={() => onSelect(selected === i ? null : i)}
        >
          <boxGeometry args={org.size} />
          <meshStandardMaterial
            color={org.color}
            emissive={org.color}
            emissiveIntensity={selected === i ? 0.6 : 0.2}
            transparent
            opacity={i === 0 ? 0.12 : 0.8}
            wireframe={i === 0}
          />
        </mesh>
      ))}

      {selected !== null && (
        <Text
          position={[ORGANELLES[selected].pos[0], ORGANELLES[selected].pos[1] + 0.6, ORGANELLES[selected].pos[2]]}
          fontSize={0.22}
          color="#fff"
          anchorX="center"
        >
          {ORGANELLES[selected].name}
        </Text>
      )}

      <Text position={[0, -2.6, 0]} fontSize={0.28} color="#94a3b8" anchorX="center">
        Click parts to identify them
      </Text>
    </group>
  );
}

export default function PlantCell() {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 relative">
        <Canvas camera={{ position: [0, 1, 7], fov: 45 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <PlantCellScene selected={selected} onSelect={setSelected} />
          <OrbitControls enablePan={false} autoRotate autoRotateSpeed={0.5} />
        </Canvas>
        {selected !== null && (
          <div className="absolute top-4 left-4 bg-gray-900/90 border border-gray-700 rounded-lg p-3 max-w-xs">
            <p className="text-sm font-bold text-white mb-1">{ORGANELLES[selected].name}</p>
            <p className="text-xs text-gray-300">{ORGANELLES[selected].description}</p>
          </div>
        )}
      </div>
      <div className="bg-gray-900 border-t border-gray-800 p-3">
        <div className="flex flex-wrap gap-3 justify-center">
          {[...new Set(ORGANELLES.map(o => o.name))].map(name => {
            const org = ORGANELLES.find(o => o.name === name)!;
            return (
              <div key={name} className="flex items-center gap-1.5 text-xs text-gray-400">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: org.color }} />
                {name}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
