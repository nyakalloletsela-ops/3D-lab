import { Canvas } from '@react-three/fiber';
import { OrbitControls, Line, Text } from '@react-three/drei';
import * as THREE from 'three';

const PATH: [number, number, number][] = [
  [-3, -1.5, 0], [-2, -0.5, 0], [-1, 1, 0], [0, 0.5, 0],
  [1, 1.5, 0], [2, 0, 0], [2.5, -1, 0], [1.5, -2, 0],
];

function pathLength() {
  let d = 0;
  for (let i = 1; i < PATH.length; i++) {
    const dx = PATH[i][0] - PATH[i - 1][0];
    const dy = PATH[i][1] - PATH[i - 1][1];
    d += Math.sqrt(dx * dx + dy * dy);
  }
  return d.toFixed(2);
}

export default function DisplacementDistance() {
  const start = PATH[0];
  const end = PATH[PATH.length - 1];
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const displacement = Math.sqrt(dx * dx + dy * dy).toFixed(2);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1">
        <Canvas camera={{ position: [0, 0, 10], fov: 45 }}>
          <ambientLight intensity={0.7} />

          {/* Winding path */}
          <Line points={PATH} color="#f59e0b" lineWidth={4} />

          {/* Displacement arrow */}
          <Line points={[start, end]} color="#22d3ee" lineWidth={3} dashed dashSize={0.3} gapSize={0.15} />
          <mesh position={end} rotation={[0, 0, Math.atan2(dy, dx) - Math.PI / 2]}>
            <coneGeometry args={[0.12, 0.35, 8]} />
            <meshStandardMaterial color="#22d3ee" />
          </mesh>

          {/* Start / End markers */}
          <mesh position={start}>
            <sphereGeometry args={[0.15, 12, 12]} />
            <meshStandardMaterial color="#34d399" emissive="#34d399" emissiveIntensity={0.8} />
          </mesh>
          <Text position={[start[0] - 0.4, start[1] + 0.3, 0]} fontSize={0.3} color="#34d399">Start</Text>

          <mesh position={end}>
            <sphereGeometry args={[0.15, 12, 12]} />
            <meshStandardMaterial color="#f43f5e" emissive="#f43f5e" emissiveIntensity={0.8} />
          </mesh>
          <Text position={[end[0] + 0.2, end[1] + 0.3, 0]} fontSize={0.3} color="#f43f5e">End</Text>

          <Text position={[-1, 2.5, 0]} fontSize={0.28} color="#f59e0b" anchorX="center">
            {`Distance (path) = ${pathLength()} units`}
          </Text>
          <Text position={[0, -2.8, 0]} fontSize={0.28} color="#22d3ee" anchorX="center">
            {`Displacement (straight) = ${displacement} units`}
          </Text>

          <OrbitControls enablePan={false} />
        </Canvas>
      </div>
      <div className="bg-gray-900 border-t border-gray-800 p-4">
        <div className="flex gap-6 justify-center text-sm">
          <span className="text-amber-400">Yellow = actual path (Distance)</span>
          <span className="text-cyan-400">Blue = straight line (Displacement)</span>
        </div>
      </div>
    </div>
  );
}
