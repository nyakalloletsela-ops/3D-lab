import { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';

type State = 'solid' | 'liquid' | 'gas';

const STATE_COLORS: Record<State, string> = {
  solid: '#60a5fa',
  liquid: '#34d399',
  gas: '#f87171',
};

const GRID_POS: [number, number, number][] = [];
for (let x = -1; x <= 1; x++) {
  for (let y = -1; y <= 1; y++) {
    for (let z = -1; z <= 1; z++) {
      GRID_POS.push([x * 0.8, y * 0.8, z * 0.8]);
    }
  }
}

function Atom({ basePos, state }: { basePos: [number, number, number]; state: State }) {
  const ref = useRef<THREE.Mesh>(null);
  const offset = useRef(Math.random() * Math.PI * 2);
  const vel = useRef<[number, number, number]>([
    (Math.random() - 0.5) * 4,
    (Math.random() - 0.5) * 4,
    (Math.random() - 0.5) * 4,
  ]);
  const pos = useRef<[number, number, number]>([...basePos]);

  useFrame((_, delta) => {
    if (!ref.current) return;
    offset.current += delta;

    if (state === 'solid') {
      const amp = 0.06;
      ref.current.position.set(
        basePos[0] + Math.sin(offset.current * 8) * amp,
        basePos[1] + Math.cos(offset.current * 7) * amp,
        basePos[2] + Math.sin(offset.current * 9) * amp
      );
    } else if (state === 'liquid') {
      pos.current[0] += vel.current[0] * delta * 0.3;
      pos.current[1] += vel.current[1] * delta * 0.3;
      pos.current[2] += vel.current[2] * delta * 0.1;
      const R = 1.8;
      if (Math.abs(pos.current[0]) > R) vel.current[0] *= -1;
      if (Math.abs(pos.current[1]) > R) vel.current[1] *= -1;
      if (Math.abs(pos.current[2]) > 0.5) vel.current[2] *= -1;
      ref.current.position.set(...pos.current);
    } else {
      pos.current[0] += vel.current[0] * delta;
      pos.current[1] += vel.current[1] * delta;
      pos.current[2] += vel.current[2] * delta;
      const R = 2.2;
      if (Math.abs(pos.current[0]) > R) vel.current[0] *= -1;
      if (Math.abs(pos.current[1]) > R) vel.current[1] *= -1;
      if (Math.abs(pos.current[2]) > R) vel.current[2] *= -1;
      ref.current.position.set(...pos.current);
    }
  });

  return (
    <mesh ref={ref} position={basePos}>
      <sphereGeometry args={[0.18, 12, 12]} />
      <meshStandardMaterial
        color={STATE_COLORS[state]}
        emissive={STATE_COLORS[state]}
        emissiveIntensity={0.4}
      />
    </mesh>
  );
}

export default function StatesOfMatter() {
  const [state, setState] = useState<State>('solid');

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1">
        <Canvas camera={{ position: [0, 0, 7], fov: 45 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          {GRID_POS.map((p, i) => (
            <Atom key={`${i}-${state}`} basePos={p} state={state} />
          ))}
          <Text position={[0, 2.8, 0]} fontSize={0.4} color={STATE_COLORS[state]} anchorX="center">
            {state.charAt(0).toUpperCase() + state.slice(1)}
          </Text>
          <Text position={[0, 2.2, 0]} fontSize={0.22} color="#64748b" anchorX="center">
            {state === 'solid' ? 'Particles vibrate in place' : state === 'liquid' ? 'Particles flow past each other' : 'Particles zoom around freely!'}
          </Text>
          <OrbitControls enablePan={false} />
        </Canvas>
      </div>
      <div className="bg-gray-900 border-t border-gray-800 p-4">
        <div className="flex gap-3 justify-center">
          {(['solid', 'liquid', 'gas'] as State[]).map(s => (
            <button
              key={s}
              onClick={() => setState(s)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                state === s
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'border-gray-700 text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
