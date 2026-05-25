import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';

interface Organelle {
  name: string;
  description: string;
  pos: [number, number, number];
  radius: number;
  color: string;
}

const ORGANELLES: Organelle[] = [
  { name: 'Nucleus', description: 'Control center of the cell — holds DNA', pos: [0, 0, 0], radius: 0.55, color: '#f59e0b' },
  { name: 'Mitochondria', description: 'Power plant — makes energy (ATP)', pos: [1.2, 0.5, 0.3], radius: 0.32, color: '#f43f5e' },
  { name: 'Mitochondria', description: 'Power plant — makes energy (ATP)', pos: [-1, 0.8, -0.2], radius: 0.28, color: '#f43f5e' },
  { name: 'Ribosome', description: 'Makes proteins from DNA instructions', pos: [0.6, -0.8, 0.4], radius: 0.15, color: '#a78bfa' },
  { name: 'Ribosome', description: 'Makes proteins from DNA instructions', pos: [-0.5, -1.0, 0.1], radius: 0.15, color: '#a78bfa' },
  { name: 'Golgi Body', description: 'Packages and ships proteins', pos: [-1.1, -0.5, 0.5], radius: 0.28, color: '#34d399' },
  { name: 'Vacuole', description: 'Small storage sac', pos: [0.8, -0.3, -0.6], radius: 0.22, color: '#60a5fa' },
];

function CellScene({ selected, onSelect }: { selected: number | null; onSelect: (i: number | null) => void }) {
  return (
    <group>
      {/* Cell membrane */}
      <mesh>
        <sphereGeometry args={[2.2, 32, 32]} />
        <meshStandardMaterial color="#1e3a5f" transparent opacity={0.15} side={2} />
      </mesh>

      {/* Cytoplasm glow */}
      <mesh>
        <sphereGeometry args={[2.18, 32, 32]} />
        <meshStandardMaterial color="#0ea5e9" transparent opacity={0.05} />
      </mesh>

      {ORGANELLES.map((org, i) => (
        <mesh
          key={i}
          position={org.pos}
          onClick={() => onSelect(selected === i ? null : i)}
        >
          <sphereGeometry args={[org.radius, 16, 16]} />
          <meshStandardMaterial
            color={org.color}
            emissive={org.color}
            emissiveIntensity={selected === i ? 0.8 : 0.3}
            transparent
            opacity={0.85}
          />
        </mesh>
      ))}

      {selected !== null && (
        <Text position={[ORGANELLES[selected].pos[0], ORGANELLES[selected].pos[1] + ORGANELLES[selected].radius + 0.3, ORGANELLES[selected].pos[2]]} fontSize={0.22} color="#fff" anchorX="center">
          {ORGANELLES[selected].name}
        </Text>
      )}

      <Text position={[0, -2.8, 0]} fontSize={0.28} color="#94a3b8" anchorX="center">
        Click an organelle to learn about it
      </Text>
    </group>
  );
}

export default function AnimalCell() {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 relative">
        <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <CellScene selected={selected} onSelect={setSelected} />
          <OrbitControls enablePan={false} />
        </Canvas>
        {selected !== null && (
          <div className="absolute top-4 left-4 bg-gray-900/90 border border-gray-700 rounded-lg p-3 max-w-xs">
            <p className="text-sm font-bold text-white mb-1">{ORGANELLES[selected].name}</p>
            <p className="text-xs text-gray-300">{ORGANELLES[selected].description}</p>
          </div>
        )}
      </div>
      <div className="bg-gray-900 border-t border-gray-800 p-3">
        <div className="flex flex-wrap gap-2 justify-center">
          {[...new Set(ORGANELLES.map(o => o.name))].map(name => {
            const org = ORGANELLES.find(o => o.name === name)!;
            return (
              <div key={name} className="flex items-center gap-1.5 text-xs text-gray-400">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: org.color }} />
                {name}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
