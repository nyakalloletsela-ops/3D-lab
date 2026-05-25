import { useMemo, useRef, useState, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { LineChart, Line as RechartsLine, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import ControlSlider from '../../components/ControlSlider';
import ScenarioSelect from '../../components/ScenarioSelect';
import DataOverlay from '../../components/DataOverlay';

const GRID_W = 30;
const GRID_H = 20;
const GRID_X_MIN = -6;
const GRID_X_MAX = 4;
const GRID_Y_MIN = -3;
const GRID_Y_MAX = 3;
const WALL_X = 5;
const WALL_POINTS = 30;

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) / 255, ((n >> 8) & 0xff) / 255, (n & 0xff) / 255];
}

const darkRgb = hexToRgb('#0f172a');
const brightRgb = hexToRgb('#22d3ee');

interface SceneProps {
  slitSeparation: number;
  wavelength: number;
  time: number;
}

function InterferenceScene({ slitSeparation, wavelength, time }: SceneProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const wallMeshRef = useRef<THREE.InstancedMesh>(null);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  const gridData = useMemo(() => {
    const pts: { x: number; y: number; intensity: number }[] = [];
    const s1y = slitSeparation / 2;
    const s2y = -slitSeparation / 2;
    for (let ix = 0; ix < GRID_W; ix++) {
      for (let iy = 0; iy < GRID_H; iy++) {
        const x = lerp(GRID_X_MIN, GRID_X_MAX, ix / (GRID_W - 1));
        const y = lerp(GRID_Y_MIN, GRID_Y_MAX, iy / (GRID_H - 1));
        const r1 = Math.sqrt(x * x + (y - s1y) ** 2);
        const r2 = Math.sqrt(x * x + (y - s2y) ** 2);
        const pathDiff = r1 - r2;
        const intensity = Math.cos((Math.PI * pathDiff) / wavelength) ** 2;
        pts.push({ x, y, intensity });
      }
    }
    return pts;
  }, [slitSeparation, wavelength]);

  const wallData = useMemo(() => {
    const s1y = slitSeparation / 2;
    const s2y = -slitSeparation / 2;
    const L = WALL_X;
    return Array.from({ length: WALL_POINTS }, (_, i) => {
      const y = lerp(GRID_Y_MIN, GRID_Y_MAX, i / (WALL_POINTS - 1));
      const r1 = Math.sqrt(L * L + (y - s1y) ** 2);
      const r2 = Math.sqrt(L * L + (y - s2y) ** 2);
      const pathDiff = r1 - r2;
      const intensity = Math.cos((Math.PI * pathDiff) / wavelength) ** 2;
      return { y, intensity };
    });
  }, [slitSeparation, wavelength]);

  useFrame(() => {
    if (!meshRef.current || !wallMeshRef.current) return;

    for (let i = 0; i < gridData.length; i++) {
      const { x, y, intensity } = gridData[i];
      dummy.position.set(x, y, 0);
      dummy.scale.setScalar(0.18);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
      const r = lerp(darkRgb[0], brightRgb[0], intensity);
      const g = lerp(darkRgb[1], brightRgb[1], intensity);
      const b = lerp(darkRgb[2], brightRgb[2], intensity);
      color.setRGB(r, g, b);
      meshRef.current.setColorAt(i, color);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;

    for (let i = 0; i < wallData.length; i++) {
      const { y, intensity } = wallData[i];
      dummy.position.set(WALL_X, y, 0);
      dummy.scale.setScalar(0.22);
      dummy.updateMatrix();
      wallMeshRef.current.setMatrixAt(i, dummy.matrix);
      const r = lerp(darkRgb[0], brightRgb[0], intensity);
      const g = lerp(darkRgb[1], brightRgb[1], intensity);
      const b = lerp(darkRgb[2], brightRgb[2], intensity);
      color.setRGB(r, g, b);
      wallMeshRef.current.setColorAt(i, color);
    }
    wallMeshRef.current.instanceMatrix.needsUpdate = true;
    if (wallMeshRef.current.instanceColor) wallMeshRef.current.instanceColor.needsUpdate = true;
  });

  const source1Y = slitSeparation / 2;
  const source2Y = -slitSeparation / 2;

  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[0, 5, 5]} intensity={1.5} />

      <instancedMesh ref={meshRef} args={[undefined, undefined, GRID_W * GRID_H]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshStandardMaterial vertexColors toneMapped={false} />
      </instancedMesh>

      <instancedMesh ref={wallMeshRef} args={[undefined, undefined, WALL_POINTS]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshStandardMaterial vertexColors emissiveIntensity={0.5} toneMapped={false} />
      </instancedMesh>

      <mesh position={[0, source1Y, 0]}>
        <sphereGeometry args={[0.2, 32, 32]} />
        <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={3} toneMapped={false} />
      </mesh>
      <mesh position={[0, source2Y, 0]}>
        <sphereGeometry args={[0.2, 32, 32]} />
        <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={3} toneMapped={false} />
      </mesh>

      <OrbitControls enableDamping dampingFactor={0.1} />
    </>
  );
}

const scenarios = [
  { id: 'constructive', label: 'Constructive', description: 'Slit sep=1, λ=1.0 — bright fringes' },
  { id: 'destructive', label: 'Destructive', description: 'Slit sep=2, λ=0.5 — narrow dark gaps' },
];

export default function WaveInterference() {
  const [slitSeparation, setSlitSeparation] = useState(1.0);
  const [wavelength, setWavelength] = useState(1.0);
  const [scenario, setScenario] = useState('constructive');

  const handleScenario = useCallback((id: string) => {
    setScenario(id);
    if (id === 'constructive') { setSlitSeparation(1.0); setWavelength(1.0); }
    if (id === 'destructive') { setSlitSeparation(2.0); setWavelength(0.5); }
  }, []);

  const L = WALL_X;
  const fringeSpacing = (wavelength * L) / slitSeparation;
  const constructiveOrders = Math.floor(slitSeparation / wavelength);

  const wallChartData = useMemo(() => {
    const s1y = slitSeparation / 2;
    const s2y = -slitSeparation / 2;
    return Array.from({ length: WALL_POINTS }, (_, i) => {
      const y = lerp(GRID_Y_MIN, GRID_Y_MAX, i / (WALL_POINTS - 1));
      const r1 = Math.sqrt(L * L + (y - s1y) ** 2);
      const r2 = Math.sqrt(L * L + (y - s2y) ** 2);
      const pathDiff = r1 - r2;
      const intensity = Math.cos((Math.PI * pathDiff) / wavelength) ** 2;
      return { y: y.toFixed(2), intensity: parseFloat(intensity.toFixed(3)) };
    });
  }, [slitSeparation, wavelength]);

  const equation = { text: 'Δr = d sinθ = mλ', color: '#22d3ee' };
  const readouts = [
    { label: 'Slit separation', value: `${slitSeparation.toFixed(2)} m`, color: '#22d3ee' },
    { label: 'Wavelength', value: `${wavelength.toFixed(2)} m`, color: '#a78bfa' },
    { label: 'Fringe spacing', value: `${fringeSpacing.toFixed(3)} m`, color: '#34d399' },
    { label: 'Orders (m)', value: `±${constructiveOrders}`, color: '#f59e0b' },
  ];

  return (
    <div className="w-full h-full flex overflow-hidden">
      <div className="flex-1">
        <Canvas
          camera={{ position: [0, 0, 12], fov: 55 }}
          style={{ background: '#030712' }}
        >
          <InterferenceScene slitSeparation={slitSeparation} wavelength={wavelength} time={0} />
        </Canvas>
      </div>

      <div className="w-72 bg-gray-950 border-l border-gray-800 overflow-y-auto scrollbar-thin">
        <div className="p-3 space-y-4">
          <ScenarioSelect
            label="Scenario"
            scenarios={scenarios}
            value={scenario}
            onChange={handleScenario}
            color="#22d3ee"
          />

          <ControlSlider
            label="Slit Separation"
            value={slitSeparation}
            min={0.5}
            max={4}
            step={0.05}
            color="#22d3ee"
            onChange={setSlitSeparation}
            precision={2}
            formatValue={(v) => `${v.toFixed(2)} m`}
          />

          <ControlSlider
            label="Wavelength"
            value={wavelength}
            min={0.3}
            max={2.0}
            step={0.05}
            color="#a78bfa"
            onChange={setWavelength}
            precision={2}
            formatValue={(v) => `${v.toFixed(2)} m`}
          />

          <DataOverlay equation={equation} readouts={readouts} />

          <div className="bg-gray-900 rounded-lg p-3 border border-gray-800">
            <div className="text-xs font-semibold text-cyan-400 mb-2">Screen Intensity Pattern</div>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={wallChartData} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
                <XAxis dataKey="y" tick={{ fontSize: 9, fill: '#6b7280' }} />
                <YAxis domain={[0, 1]} tick={{ fontSize: 9, fill: '#6b7280' }} />
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid #374151', fontSize: 10 }}
                  labelFormatter={(l) => `y = ${l}`}
                  formatter={(v: number) => [v.toFixed(3), 'intensity']}
                />
                <RechartsLine type="monotone" dataKey="intensity" stroke="#22d3ee" dot={false} strokeWidth={1.5} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-gray-900 rounded-lg p-3 border border-gray-800">
            <div className="text-xs font-semibold text-cyan-400 mb-2">About Wave Interference</div>
            <p className="text-xs text-gray-400 leading-relaxed">
              When two coherent wave sources emit waves of the same frequency, they interfere.
              Where path differences are integer multiples of λ, constructive interference creates
              bright fringes. Half-integer multiples cause destructive interference — dark bands.
              Young's double-slit experiment confirmed the wave nature of light.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
