import { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';

const BASE_PAIRS = ['A-T', 'C-G', 'T-A', 'G-C', 'A-T', 'C-G', 'T-A', 'G-C'];
const BASE_COLORS: Record<string, string> = {
  'A': '#f43f5e', 'T': '#22d3ee', 'C': '#f59e0b', 'G': '#34d399',
};

function HelixScene({ unzipped }: { unzipped: boolean }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.3;
    }
  });

  const n = BASE_PAIRS.length;

  return (
    <group ref={groupRef}>
      {BASE_PAIRS.map((pair, i) => {
        const t = i / (n - 1);
        const angle = t * Math.PI * 3;
        const y = (t - 0.5) * 5;
        const R = 1.0;

        const x1 = R * Math.cos(angle);
        const z1 = R * Math.sin(angle);
        const [base1, base2] = pair.split('-');

        const x2 = unzipped ? R * Math.cos(angle) + (i % 2 === 0 ? -1.5 : -2) : -x1;
        const z2 = unzipped ? -R * Math.sin(angle) + (i % 2 === 0 ? 1.5 : 2) : -z1;

        return (
          <group key={i}>
            {/* Backbone sphere 1 */}
            <mesh position={[x1, y, z1]}>
              <sphereGeometry args={[0.1, 10, 10]} />
              <meshStandardMaterial color="#94a3b8" />
            </mesh>
            {/* Base 1 */}
            <mesh position={[x1 * 0.5, y, z1 * 0.5]}>
              <sphereGeometry args={[0.13, 10, 10]} />
              <meshStandardMaterial color={BASE_COLORS[base1]} emissive={BASE_COLORS[base1]} emissiveIntensity={0.5} />
            </mesh>

            {/* Base 2 */}
            <mesh position={[x2 * 0.5, y, z2 * 0.5]}>
              <sphereGeometry args={[0.13, 10, 10]} />
              <meshStandardMaterial color={BASE_COLORS[base2]} emissive={BASE_COLORS[base2]} emissiveIntensity={0.5} />
            </mesh>
            {/* Backbone sphere 2 */}
            <mesh position={[x2, y, z2]}>
              <sphereGeometry args={[0.1, 10, 10]} />
              <meshStandardMaterial color="#94a3b8" />
            </mesh>

            {/* Rung (if not unzipped) */}
            {!unzipped && (
              <mesh position={[0, y, 0]}>
                <cylinderGeometry args={[0.04, 0.04, R * 2, 6]} rotation={[0, 0, Math.PI / 2] as unknown as undefined} />
                <meshStandardMaterial color="#475569" transparent opacity={0.5} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

export default function DNADoubleHelix() {
  const [unzipped, setUnzipped] = useState(false);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 relative">
        <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <HelixScene unzipped={unzipped} />
          <Text position={[0, 3.2, 0]} fontSize={0.3} color="#94a3b8" anchorX="center">
            {unzipped ? 'Unzipped — each strand becomes a template!' : 'DNA Double Helix — twisted ladder'}
          </Text>
          <OrbitControls enablePan={false} />
        </Canvas>
        <button
          onClick={() => setUnzipped(v => !v)}
          className="absolute top-4 right-4 px-4 py-2 bg-rose-500/20 border border-rose-500/40 text-rose-300 rounded-lg text-sm font-semibold hover:bg-rose-500/30 transition-colors"
        >
          {unzipped ? 'Re-zip!' : 'Unzip DNA!'}
        </button>
      </div>
      <div className="bg-gray-900 border-t border-gray-800 p-3">
        <div className="flex gap-4 justify-center text-xs">
          {Object.entries(BASE_COLORS).map(([base, color]) => (
            <div key={base} className="flex items-center gap-1.5 text-gray-400">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
              {base === 'A' ? 'Adenine' : base === 'T' ? 'Thymine' : base === 'C' ? 'Cytosine' : 'Guanine'}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
