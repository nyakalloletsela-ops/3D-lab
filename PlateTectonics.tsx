import { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';

function TectonicScene({ phase }: { phase: number }) {
  const plate1Ref = useRef<THREE.Group>(null);
  const plate2Ref = useRef<THREE.Group>(null);
  const volcanoRef = useRef<THREE.Group>(null);
  const lavaRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!plate1Ref.current || !plate2Ref.current || !volcanoRef.current) return;

    if (phase === 0) {
      plate1Ref.current.position.x = THREE.MathUtils.lerp(plate1Ref.current.position.x, -1.5, 0.04);
      plate2Ref.current.position.x = THREE.MathUtils.lerp(plate2Ref.current.position.x, 1.5, 0.04);
    } else if (phase === 1) {
      plate1Ref.current.position.x = THREE.MathUtils.lerp(plate1Ref.current.position.x, 0, 0.04);
      plate1Ref.current.position.y = THREE.MathUtils.lerp(plate1Ref.current.position.y, -0.4, 0.04);
      plate1Ref.current.rotation.z = THREE.MathUtils.lerp(plate1Ref.current.rotation.z, -0.25, 0.04);
      plate2Ref.current.position.x = THREE.MathUtils.lerp(plate2Ref.current.position.x, 0, 0.04);
    } else {
      plate1Ref.current.position.x = THREE.MathUtils.lerp(plate1Ref.current.position.x, 0, 0.04);
      plate1Ref.current.position.y = THREE.MathUtils.lerp(plate1Ref.current.position.y, -0.4, 0.04);
      plate1Ref.current.rotation.z = THREE.MathUtils.lerp(plate1Ref.current.rotation.z, -0.25, 0.04);
      plate2Ref.current.position.x = THREE.MathUtils.lerp(plate2Ref.current.position.x, 0, 0.04);

      // Volcano grows
      const scale = Math.min(1, (clock.getElapsedTime() * 0.1) % 1.5);
      volcanoRef.current.scale.y = scale;

      // Lava pulse
      if (lavaRef.current) {
        (lavaRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
          0.5 + 0.5 * Math.sin(clock.getElapsedTime() * 4);
      }
    }
  });

  return (
    <group>
      {/* Mantle */}
      <mesh position={[0, -2.5, 0]}>
        <cylinderGeometry args={[5, 5, 1, 32]} />
        <meshStandardMaterial color="#9a3412" transparent opacity={0.5} />
      </mesh>

      {/* Plate 1 (oceanic — subducts) */}
      <group ref={plate1Ref} position={[-1.5, 0, 0]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[3.5, 0.5, 2.5]} />
          <meshStandardMaterial color="#1d4ed8" />
        </mesh>
        <Text position={[-0.5, 0.5, 1.3]} fontSize={0.22} color="#93c5fd" anchorX="center">Oceanic Plate</Text>
      </group>

      {/* Plate 2 (continental) */}
      <group ref={plate2Ref} position={[1.5, 0, 0]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[3.5, 0.5, 2.5]} />
          <meshStandardMaterial color="#15803d" />
        </mesh>
        <Text position={[0.5, 0.5, 1.3]} fontSize={0.22} color="#86efac" anchorX="center">Continental Plate</Text>
      </group>

      {/* Volcano (only in eruption phase) */}
      <group ref={volcanoRef} position={[0.8, 0.2, 0]} scale={[1, 0, 1]}>
        <mesh position={[0, 0.6, 0]}>
          <coneGeometry args={[0.6, 1.2, 16]} />
          <meshStandardMaterial color="#374151" />
        </mesh>
        <mesh ref={lavaRef} position={[0, 1.3, 0]}>
          <sphereGeometry args={[0.2, 12, 12]} />
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.8} />
        </mesh>
        {phase === 2 && (
          <pointLight position={[0, 1.5, 0]} color="#ff6b00" intensity={3} distance={4} />
        )}
      </group>

      <Text position={[0, -3.2, 0]} fontSize={0.25} color="#94a3b8" anchorX="center">
        {phase === 0 ? 'Plates moving toward each other' :
         phase === 1 ? 'Subduction: oceanic plate dives under' :
         'Magma bursts up — ERUPTION!'}
      </Text>
    </group>
  );
}

export default function PlateTectonics() {
  const [phase, setPhase] = useState(0);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1">
        <Canvas camera={{ position: [0, 2, 9], fov: 45 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <TectonicScene phase={phase} />
          <OrbitControls enablePan={false} />
        </Canvas>
      </div>
      <div className="bg-gray-900 border-t border-gray-800 p-4">
        <div className="flex gap-2 justify-center">
          {['Approaching', 'Subduction', 'Eruption!'].map((label, i) => (
            <button
              key={i}
              onClick={() => setPhase(i)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                phase === i
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
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
