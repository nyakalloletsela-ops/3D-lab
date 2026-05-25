import { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';

function IonicScene({ phase }: { phase: number }) {
  const electronRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!electronRef.current) return;
    if (phase === 0) {
      // Orbit around metal (left)
      const t = Date.now() * 0.002;
      electronRef.current.position.set(-2 + Math.cos(t) * 0.7, Math.sin(t) * 0.7, 0.2);
    } else if (phase === 1) {
      // Transfer
      const t = (Date.now() * 0.001) % 1;
      electronRef.current.position.set(-2 + t * 4, 0, 0.2);
    } else {
      // Orbiting non-metal
      const t = Date.now() * 0.002;
      electronRef.current.position.set(2 + Math.cos(t) * 0.7, Math.sin(t) * 0.7, 0.2);
    }
  });

  const separation = phase === 2 ? 2.5 : 2;

  return (
    <group>
      {/* Metal atom */}
      <mesh position={[-separation, 0, 0]}>
        <sphereGeometry args={[0.7, 24, 24]} />
        <meshStandardMaterial color="#f59e0b" emissive="#d97706" emissiveIntensity={phase === 2 ? 0.8 : 0.3} />
      </mesh>
      <Text position={[-separation, 0, 0.75]} fontSize={0.32} color="#fff" anchorX="center">Na{phase === 2 ? '+' : ''}</Text>

      {/* Non-metal atom */}
      <mesh position={[separation, 0, 0]}>
        <sphereGeometry args={[0.7, 24, 24]} />
        <meshStandardMaterial color="#22d3ee" emissive="#0891b2" emissiveIntensity={phase === 2 ? 0.8 : 0.3} />
      </mesh>
      <Text position={[separation, 0, 0.75]} fontSize={0.32} color="#fff" anchorX="center">Cl{phase === 2 ? '−' : ''}</Text>

      {/* Electron */}
      <mesh ref={electronRef} position={[-2 + 0.7, 0, 0.2]}>
        <sphereGeometry args={[0.15, 12, 12]} />
        <meshStandardMaterial color="#f43f5e" emissive="#f43f5e" emissiveIntensity={1} />
      </mesh>

      {/* Attraction arrows when bonded */}
      {phase === 2 && (
        <>
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 1.5, 6]} rotation={[0, 0, Math.PI / 2] as unknown as undefined} />
            <meshStandardMaterial color="#34d399" />
          </mesh>
          <Text position={[0, -1.2, 0]} fontSize={0.28} color="#34d399" anchorX="center">
            Ionic Bond!
          </Text>
        </>
      )}

      <Text position={[0, 1.8, 0]} fontSize={0.28} color="#94a3b8" anchorX="center">
        {phase === 0 ? 'Na has 1 outer electron' : phase === 1 ? 'Electron transferring...' : 'Na⁺ and Cl⁻ attract!'}
      </Text>
    </group>
  );
}

export default function IonicBonding() {
  const [phase, setPhase] = useState(0);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1">
        <Canvas camera={{ position: [0, 0, 7], fov: 45 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <IonicScene phase={phase} />
          <OrbitControls enablePan={false} />
        </Canvas>
      </div>
      <div className="bg-gray-900 border-t border-gray-800 p-4">
        <div className="flex gap-2 justify-center">
          {['Initial', 'Transfer', 'Bonded'].map((label, i) => (
            <button
              key={i}
              onClick={() => setPhase(i)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                phase === i
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'border-gray-700 text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
