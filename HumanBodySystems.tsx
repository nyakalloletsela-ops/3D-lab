import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';

type System = 'skeletal' | 'circulatory' | 'digestive';

function SkeletalScene() {
  return (
    <group>
      {/* Skull */}
      <mesh position={[0, 2.5, 0]}>
        <sphereGeometry args={[0.45, 16, 16]} />
        <meshStandardMaterial color="#e2e8f0" />
      </mesh>
      {/* Spine */}
      {Array.from({ length: 12 }).map((_, i) => (
        <mesh key={i} position={[0, 1.8 - i * 0.28, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.18, 8]} />
          <meshStandardMaterial color="#e2e8f0" />
        </mesh>
      ))}
      {/* Ribcage */}
      {[0, 1, 2, 3].map(i => (
        <mesh key={i} position={[0, 1.5 - i * 0.22, 0]}>
          <torusGeometry args={[0.4, 0.04, 8, 20, Math.PI]} />
          <meshStandardMaterial color="#e2e8f0" />
        </mesh>
      ))}
      {/* Arms */}
      {[-1, 1].map((side, i) => (
        <group key={i}>
          <mesh position={[side * 0.7, 1.3, 0]} rotation={[0, 0, side * 0.3]}>
            <cylinderGeometry args={[0.07, 0.07, 1.2, 8]} />
            <meshStandardMaterial color="#e2e8f0" />
          </mesh>
          <mesh position={[side * 0.9, 0.2, 0]} rotation={[0, 0, side * 0.5]}>
            <cylinderGeometry args={[0.06, 0.06, 1, 8]} />
            <meshStandardMaterial color="#e2e8f0" />
          </mesh>
        </group>
      ))}
      {/* Legs */}
      {[-0.35, 0.35].map((side, i) => (
        <group key={i}>
          <mesh position={[side, -0.5, 0]}>
            <cylinderGeometry args={[0.09, 0.09, 1.3, 8]} />
            <meshStandardMaterial color="#e2e8f0" />
          </mesh>
          <mesh position={[side, -1.9, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 1.2, 8]} />
            <meshStandardMaterial color="#e2e8f0" />
          </mesh>
        </group>
      ))}
      <Text position={[0, -2.8, 0]} fontSize={0.3} color="#e2e8f0" anchorX="center">Skeletal System — 206 bones</Text>
    </group>
  );
}

function CirculatoryScene() {
  return (
    <group>
      {/* Body outline */}
      <mesh position={[0, 0, -0.2]}>
        <capsuleGeometry args={[0.6, 3.5, 8, 16]} />
        <meshStandardMaterial color="#1e293b" transparent opacity={0.4} />
      </mesh>
      {/* Heart */}
      <mesh position={[0.15, 0.8, 0]}>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshStandardMaterial color="#f43f5e" emissive="#f43f5e" emissiveIntensity={0.6} />
      </mesh>
      {/* Aorta up */}
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 1.2, 8]} />
        <meshStandardMaterial color="#f43f5e" />
      </mesh>
      {/* Aorta down */}
      <mesh position={[0, -0.2, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 2, 8]} />
        <meshStandardMaterial color="#60a5fa" />
      </mesh>
      {/* Arm arteries */}
      {[-1, 1].map((side, i) => (
        <mesh key={i} position={[side * 0.5, 0.8, 0]} rotation={[0, 0, side * 0.5]}>
          <cylinderGeometry args={[0.05, 0.05, 1.2, 8]} />
          <meshStandardMaterial color={i === 0 ? '#f43f5e' : '#60a5fa'} />
        </mesh>
      ))}
      <Text position={[0, -2.8, 0]} fontSize={0.28} color="#f43f5e" anchorX="center">Circulatory — Heart pumps blood!</Text>
    </group>
  );
}

function DigestiveScene() {
  return (
    <group>
      {/* Esophagus */}
      <mesh position={[0, 1.8, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 1, 8]} />
        <meshStandardMaterial color="#f59e0b" />
      </mesh>
      {/* Stomach */}
      <mesh position={[0.3, 1, 0]}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshStandardMaterial color="#f59e0b" transparent opacity={0.8} />
      </mesh>
      {/* Small intestine */}
      {Array.from({ length: 5 }).map((_, i) => (
        <mesh key={i} position={[(i % 2 === 0 ? 0.3 : -0.3), 0.2 - i * 0.3, 0]}>
          <torusGeometry args={[0.3, 0.06, 8, 20, Math.PI * 1.5]} />
          <meshStandardMaterial color="#f97316" />
        </mesh>
      ))}
      {/* Large intestine */}
      <mesh position={[0, -1.2, 0]}>
        <torusGeometry args={[0.55, 0.12, 8, 20, Math.PI * 1.8]} />
        <meshStandardMaterial color="#ea580c" />
      </mesh>
      <Text position={[0, -2.8, 0]} fontSize={0.28} color="#f59e0b" anchorX="center">Digestive — breaks food to fuel!</Text>
    </group>
  );
}

const SCENES: Record<System, JSX.Element> = {
  skeletal: <SkeletalScene />,
  circulatory: <CirculatoryScene />,
  digestive: <DigestiveScene />,
};

export default function HumanBodySystems() {
  const [system, setSystem] = useState<System>('skeletal');

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1">
        <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          {SCENES[system]}
          <OrbitControls enablePan={false} autoRotate autoRotateSpeed={0.5} />
        </Canvas>
      </div>
      <div className="bg-gray-900 border-t border-gray-800 p-4">
        <div className="flex gap-2 justify-center">
          {(['skeletal', 'circulatory', 'digestive'] as System[]).map(s => (
            <button
              key={s}
              onClick={() => setSystem(s)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors capitalize ${
                system === s
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                  : 'border-gray-700 text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
