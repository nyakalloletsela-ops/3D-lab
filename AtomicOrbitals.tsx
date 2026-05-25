import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import { useState } from 'react';

type Orbital = 's' | 'px' | 'py' | 'pz' | 'dz2';

const ORBITALS: Record<Orbital, { label: string; description: string }> = {
  s: { label: 's orbital (sphere)', description: 'Spherical — electron equally likely anywhere' },
  px: { label: 'px orbital (dumbbell X)', description: 'Dumbbell along X-axis — two lobes' },
  py: { label: 'py orbital (dumbbell Y)', description: 'Dumbbell along Y-axis — two lobes' },
  pz: { label: 'pz orbital (dumbbell Z)', description: 'Dumbbell along Z-axis — two lobes' },
  dz2: { label: 'dz² orbital', description: 'Double lobe + ring — complex shape' },
};

function OrbitalScene({ orbital }: { orbital: Orbital }) {
  return (
    <group>
      {/* Nucleus */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={1} />
      </mesh>

      {orbital === 's' && (
        <mesh>
          <sphereGeometry args={[1.4, 32, 32]} />
          <meshStandardMaterial color="#22d3ee" transparent opacity={0.25} wireframe={false} />
        </mesh>
      )}

      {(orbital === 'px' || orbital === 'py' || orbital === 'pz') && (
        <>
          {[1, -1].map((sign, i) => {
            const pos: [number, number, number] =
              orbital === 'px' ? [sign * 1.1, 0, 0] :
              orbital === 'py' ? [0, sign * 1.1, 0] :
              [0, 0, sign * 1.1];
            return (
              <mesh key={i} position={pos}>
                <sphereGeometry args={[0.7, 24, 24]} />
                <meshStandardMaterial
                  color={i === 0 ? '#22d3ee' : '#f43f5e'}
                  transparent
                  opacity={0.4}
                />
              </mesh>
            );
          })}
        </>
      )}

      {orbital === 'dz2' && (
        <>
          {[1, -1].map((sign, i) => (
            <mesh key={i} position={[0, sign * 1.2, 0]}>
              <sphereGeometry args={[0.6, 24, 24]} />
              <meshStandardMaterial color="#22d3ee" transparent opacity={0.4} />
            </mesh>
          ))}
          <mesh position={[0, 0, 0]}>
            <torusGeometry args={[0.85, 0.25, 16, 32]} />
            <meshStandardMaterial color="#f59e0b" transparent opacity={0.4} />
          </mesh>
        </>
      )}
    </group>
  );
}

export default function AtomicOrbitals() {
  const [orbital, setOrbital] = useState<Orbital>('s');

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1">
        <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <OrbitalScene orbital={orbital} />
          <Text position={[0, -2.2, 0]} fontSize={0.28} color="#94a3b8" anchorX="center">
            {ORBITALS[orbital].description}
          </Text>
          <OrbitControls enablePan={false} autoRotate autoRotateSpeed={1.5} />
        </Canvas>
      </div>
      <div className="bg-gray-900 border-t border-gray-800 p-4">
        <div className="flex flex-wrap gap-2 justify-center">
          {(Object.keys(ORBITALS) as Orbital[]).map(o => (
            <button
              key={o}
              onClick={() => setOrbital(o)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                orbital === o
                  ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                  : 'border-gray-700 text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              }`}
            >
              {o}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
