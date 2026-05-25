import { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Line } from '@react-three/drei';
import * as THREE from 'three';

function UnitCircleScene({ angle }: { angle: number }) {
  const rad = (angle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const R = 2;

  const circlePoints: THREE.Vector3[] = [];
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    circlePoints.push(new THREE.Vector3(R * Math.cos(a), R * Math.sin(a), 0));
  }

  const steps = Math.max(2, Math.abs(Math.round(angle / 3)));
  const arcPts: THREE.Vector3[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * rad;
    arcPts.push(new THREE.Vector3(0.6 * Math.cos(a), 0.6 * Math.sin(a), 0.1));
  }

  return (
    <group>
      <Line points={circlePoints} color="#334155" lineWidth={2} />
      <Line points={[[-2.5, 0, 0], [2.5, 0, 0]]} color="#1e293b" lineWidth={1.5} />
      <Line points={[[0, -2.5, 0], [0, 2.5, 0]]} color="#1e293b" lineWidth={1.5} />
      <Line points={[[0, 0, 0], [R * cos, R * sin, 0]]} color="#fff" lineWidth={2} />
      <mesh position={[R * cos, R * sin, 0]}>
        <sphereGeometry args={[0.1, 12, 12]} />
        <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={1} />
      </mesh>
      <Line points={[[R * cos, 0, 0.1], [R * cos, R * sin, 0.1]]} color="#f43f5e" lineWidth={4} />
      <Text position={[R * cos + 0.5, R * sin / 2, 0]} fontSize={0.25} color="#f43f5e">
        {`sin=${sin.toFixed(2)}`}
      </Text>
      <Line points={[[0, 0, 0.1], [R * cos, 0, 0.1]]} color="#22d3ee" lineWidth={4} />
      <Text position={[R * cos / 2, -0.4, 0]} fontSize={0.25} color="#22d3ee">
        {`cos=${cos.toFixed(2)}`}
      </Text>
      {arcPts.length >= 2 && <Line points={arcPts} color="#f59e0b" lineWidth={2} />}
      <Text position={[0.8, 0.3, 0]} fontSize={0.25} color="#f59e0b">{angle}°</Text>
    </group>
  );
}

function Animator({ playing, onAngle }: { playing: boolean; onAngle: (a: number) => void }) {
  const ref = useRef(0);
  useFrame(() => {
    if (playing) {
      ref.current = (ref.current + 0.5) % 360;
      onAngle(Math.round(ref.current));
    }
  });
  return null;
}

export default function UnitCircle() {
  const [angle, setAngle] = useState(45);
  const [playing, setPlaying] = useState(false);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 relative">
        <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
          <ambientLight intensity={0.8} />
          <UnitCircleScene angle={angle} />
          <Animator playing={playing} onAngle={setAngle} />
          <OrbitControls enablePan={false} />
        </Canvas>
        <button
          onClick={() => setPlaying(v => !v)}
          className="absolute top-4 right-4 px-4 py-2 bg-blue-500/20 border border-blue-500/40 text-blue-300 rounded-lg text-sm font-semibold hover:bg-blue-500/30 transition-colors"
        >
          {playing ? 'Pause' : 'Rotate'}
        </button>
      </div>
      <div className="bg-gray-900 border-t border-gray-800 p-4">
        <label className="text-xs text-amber-400 mb-1 block">Angle: {angle}°</label>
        <input type="range" min={0} max={360} value={angle} onChange={e => { setAngle(+e.target.value); }} className="w-full accent-amber-400" />
      </div>
    </div>
  );
}
