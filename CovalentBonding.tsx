import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';

function CovalentScene({ separation }: { separation: number }) {
  const cloudRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (cloudRef.current) {
      cloudRef.current.material = cloudRef.current.material as THREE.MeshStandardMaterial;
      (cloudRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        0.4 + 0.3 * Math.sin(clock.getElapsedTime() * 2);
    }
  });

  return (
    <group>
      {/* Atom 1 */}
      <mesh position={[-separation / 2, 0, 0]}>
        <sphereGeometry args={[0.65, 24, 24]} />
        <meshStandardMaterial color="#22d3ee" emissive="#0891b2" emissiveIntensity={0.3} transparent opacity={0.9} />
      </mesh>
      <Text position={[-separation / 2, 0, 0.7]} fontSize={0.32} color="#fff" anchorX="center">H</Text>

      {/* Atom 2 */}
      <mesh position={[separation / 2, 0, 0]}>
        <sphereGeometry args={[0.65, 24, 24]} />
        <meshStandardMaterial color="#22d3ee" emissive="#0891b2" emissiveIntensity={0.3} transparent opacity={0.9} />
      </mesh>
      <Text position={[separation / 2, 0, 0.7]} fontSize={0.32} color="#fff" anchorX="center">H</Text>

      {/* Shared electron cloud */}
      <mesh ref={cloudRef} position={[0, 0, 0]}>
        <sphereGeometry args={[0.5, 24, 24]} />
        <meshStandardMaterial
          color="#f59e0b"
          emissive="#f59e0b"
          emissiveIntensity={0.5}
          transparent
          opacity={0.6}
        />
      </mesh>

      {/* Orbiting electrons */}
      {[0, 1].map(i => (
        <ElectronOrbit key={i} offset={i * Math.PI} />
      ))}

      <Text position={[0, -1.5, 0]} fontSize={0.28} color="#94a3b8" anchorX="center">
        H₂: Two hydrogen atoms sharing electrons
      </Text>
      <Text position={[0, -2, 0]} fontSize={0.28} color="#f59e0b" anchorX="center">
        Shared cloud holds them together!
      </Text>
    </group>
  );
}

function ElectronOrbit({ offset }: { offset: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      const t = clock.getElapsedTime() * 3 + offset;
      ref.current.position.set(Math.cos(t) * 0.5, Math.sin(t) * 0.3, Math.sin(t * 1.5) * 0.3);
    }
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.1, 10, 10]} />
      <meshStandardMaterial color="#f43f5e" emissive="#f43f5e" emissiveIntensity={1} />
    </mesh>
  );
}

export default function CovalentBonding() {
  return (
    <div className="w-full h-full">
      <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <pointLight position={[0, 0, 2]} color="#f59e0b" intensity={3} distance={4} />
        <CovalentScene separation={1.4} />
        <OrbitControls enablePan={false} />
      </Canvas>
    </div>
  );
}
