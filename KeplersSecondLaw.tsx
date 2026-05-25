import { useRef, useState, useCallback, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import {
  LineChart,
  Line as RechartsLine,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import ControlSlider from '../../components/ControlSlider';
import ScenarioSelect from '../../components/ScenarioSelect';
import DataOverlay from '../../components/DataOverlay';

const SEMI_MAJOR = 3;
const AREA_SWEEP_DURATION = 1.2;
const AREA_SEGMENTS = 24;

function keplerian(t: number, a: number, b: number, c: number): [number, number] {
  const x = a * Math.cos(t) - c;
  const y = b * Math.sin(t);
  return [x, y];
}

function orbitSpeed(x: number, y: number, c: number, a: number): number {
  const r = Math.sqrt((x + c) ** 2 + y ** 2);
  return a / (r * r + 0.001);
}

function buildOrbitLine(a: number, b: number, c: number, segs = 128): [number, number, number][] {
  return Array.from({ length: segs + 1 }, (_, i) => {
    const t = (i / segs) * 2 * Math.PI;
    const [x, y] = keplerian(t, a, b, c);
    return [x, y, 0] as [number, number, number];
  });
}

function buildWedge(
  focusX: number,
  focusY: number,
  t0: number,
  t1: number,
  a: number,
  b: number,
  c: number,
  segs = AREA_SEGMENTS,
): [number, number, number][] {
  const pts: [number, number, number][] = [[focusX, focusY, 0]];
  for (let i = 0; i <= segs; i++) {
    const t = t0 + (t1 - t0) * (i / segs);
    const [x, y] = keplerian(t, a, b, c);
    pts.push([x, y, 0]);
  }
  pts.push([focusX, focusY, 0]);
  return pts;
}

interface SceneProps {
  eccentricity: number;
}

function KeplerScene({ eccentricity: ecc }: SceneProps) {
  const paramTRef = useRef(0);
  const trueAngleRef = useRef(0);
  const planetRef = useRef<THREE.Mesh>(null);

  const wedge1StartTRef = useRef(0);
  const wedge1EndTRef = useRef(0);
  const wedge2StartTRef = useRef(AREA_SWEEP_DURATION);
  const wedge2EndTRef = useRef(AREA_SWEEP_DURATION * 2);

  const phaseRef = useRef<'sweep1' | 'pause' | 'sweep2' | 'done'>('sweep1');
  const phaseTimerRef = useRef(0);
  const localTAtPhaseStartRef = useRef(0);

  const [renderTick, setRenderTick] = useState(0);

  const a = SEMI_MAJOR;
  const b = a * Math.sqrt(Math.max(0.001, 1 - ecc * ecc));
  const c = a * ecc;
  const focusX = -c;

  const orbitLine = useMemo(() => buildOrbitLine(a, b, c), [a, b, c]);

  const perihelionDist = a * (1 - ecc);
  const aphelionDist = a * (1 + ecc);

  useFrame((_, delta) => {
    const scale = 0.6;
    const [cx, cy] = keplerian(paramTRef.current, a, b, c);
    const speed = orbitSpeed(cx, cy, c, a) * scale;
    paramTRef.current += speed * delta;

    const [px, py] = keplerian(paramTRef.current, a, b, c);

    if (planetRef.current) {
      planetRef.current.position.set(px, py, 0);
    }

    const dx = px - focusX;
    const dy = py;
    trueAngleRef.current = Math.atan2(dy, dx);

    phaseTimerRef.current += delta;

    if (phaseRef.current === 'sweep1') {
      wedge1EndTRef.current = paramTRef.current;
      if (phaseTimerRef.current >= AREA_SWEEP_DURATION) {
        phaseRef.current = 'pause';
        phaseTimerRef.current = 0;
        localTAtPhaseStartRef.current = paramTRef.current;
      }
    } else if (phaseRef.current === 'pause') {
      if (phaseTimerRef.current >= AREA_SWEEP_DURATION * 0.8) {
        phaseRef.current = 'sweep2';
        phaseTimerRef.current = 0;
        wedge2StartTRef.current = paramTRef.current;
        wedge2EndTRef.current = paramTRef.current;
      }
    } else if (phaseRef.current === 'sweep2') {
      wedge2EndTRef.current = paramTRef.current;
      if (phaseTimerRef.current >= AREA_SWEEP_DURATION) {
        phaseRef.current = 'sweep1';
        phaseTimerRef.current = 0;
        wedge1StartTRef.current = paramTRef.current;
        wedge1EndTRef.current = paramTRef.current;
      }
    }

    setRenderTick(t => t + 1);
  });

  const wedge1Pts = buildWedge(focusX, 0, wedge1StartTRef.current, wedge1EndTRef.current, a, b, c);
  const wedge2Pts = buildWedge(focusX, 0, wedge2StartTRef.current, wedge2EndTRef.current, a, b, c);

  const [px, py] = keplerian(paramTRef.current, a, b, c);
  const currentR = Math.sqrt((px - focusX) ** 2 + py ** 2);
  const currentV = orbitSpeed(px, py, c, a);

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[focusX, 0, 0]} intensity={3} color="#fbbf24" distance={15} decay={2} />
      <pointLight position={[0, 5, 5]} intensity={0.5} />

      <Line points={orbitLine} color="white" lineWidth={1} transparent opacity={0.4} />

      <mesh position={[focusX, 0, 0]}>
        <sphereGeometry args={[0.35, 32, 32]} />
        <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={4} toneMapped={false} />
      </mesh>

      <mesh ref={planetRef} position={[px, py, 0]}>
        <sphereGeometry args={[0.18, 32, 32]} />
        <meshStandardMaterial color="#60a5fa" emissive="#60a5fa" emissiveIntensity={3} toneMapped={false} />
      </mesh>

      {wedge1Pts.length > 2 && (
        <Line points={wedge1Pts} color="#22d3ee" lineWidth={1.5} transparent opacity={0.7} />
      )}
      {wedge2Pts.length > 2 && (
        <Line points={wedge2Pts} color="#f97316" lineWidth={1.5} transparent opacity={0.7} />
      )}

      {wedge1Pts.length > 3 && (
        <mesh>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[
                new Float32Array(
                  wedge1Pts.flatMap(([x, y, z]) => [x, y, z ?? 0])
                ),
                3,
              ]}
            />
          </bufferGeometry>
          <meshBasicMaterial color="#22d3ee" transparent opacity={0.12} side={THREE.DoubleSide} />
        </mesh>
      )}

      {wedge2Pts.length > 3 && (
        <mesh>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[
                new Float32Array(
                  wedge2Pts.flatMap(([x, y, z]) => [x, y, z ?? 0])
                ),
                3,
              ]}
            />
          </bufferGeometry>
          <meshBasicMaterial color="#f97316" transparent opacity={0.12} side={THREE.DoubleSide} />
        </mesh>
      )}

      <Html position={[-c + perihelionDist, 0.5, 0]} center style={{ pointerEvents: 'none', fontSize: 10, color: '#a3e635', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
        perihelion
      </Html>
      <Html position={[-c - aphelionDist, 0.5, 0]} center style={{ pointerEvents: 'none', fontSize: 10, color: '#f87171', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
        aphelion
      </Html>

      <OrbitControls enableDamping dampingFactor={0.1} />
    </>
  );
}

const scenarios = [
  { id: 'circular', label: 'Circular Orbit', description: 'e=0 — constant speed, equal arcs' },
  { id: 'elliptical', label: 'Elliptical Orbit', description: 'e=0.7 — faster at perihelion' },
];

export default function KeplersSecondLaw() {
  const [eccentricity, setEccentricity] = useState(0.7);
  const [scenario, setScenario] = useState('elliptical');

  const handleScenario = useCallback((id: string) => {
    setScenario(id);
    if (id === 'circular') setEccentricity(0);
    if (id === 'elliptical') setEccentricity(0.7);
  }, []);

  const a = SEMI_MAJOR;
  const ecc = eccentricity;
  const b = a * Math.sqrt(Math.max(0.001, 1 - ecc * ecc));
  const c = a * ecc;
  const perihelion = a * (1 - ecc);
  const aphelion = a * (1 + ecc);

  const velocityChartData = useMemo(() => {
    return Array.from({ length: 72 }, (_, i) => {
      const angleDeg = i * 5;
      const trueAnom = (angleDeg * Math.PI) / 180;
      const r = (a * (1 - ecc * ecc)) / (1 + ecc * Math.cos(trueAnom));
      const v_rel = a / (r * r + 0.001);
      return { angle: angleDeg, velocity: parseFloat(v_rel.toFixed(4)) };
    });
  }, [a, ecc]);

  const equation = { text: 'dA/dt = L/2m = const', color: '#fbbf24' };
  const readouts = [
    { label: 'Eccentricity', value: ecc.toFixed(3), color: '#fbbf24' },
    { label: 'Semi-major a', value: `${a.toFixed(2)} AU`, color: '#a78bfa' },
    { label: 'Semi-minor b', value: `${b.toFixed(2)} AU`, color: '#a78bfa' },
    { label: 'Perihelion', value: `${perihelion.toFixed(3)} AU`, color: '#a3e635', highlight: true },
    { label: 'Aphelion', value: `${aphelion.toFixed(3)} AU`, color: '#f87171' },
  ];

  return (
    <div className="w-full h-full flex overflow-hidden">
      <div className="flex-1">
        <Canvas
          camera={{ position: [0, 0, 12], fov: 50 }}
          style={{ background: '#030712' }}
        >
          <KeplerScene eccentricity={eccentricity} />
        </Canvas>
      </div>

      <div className="w-72 bg-gray-950 border-l border-gray-800 overflow-y-auto scrollbar-thin">
        <div className="p-3 space-y-4">
          <ScenarioSelect
            label="Orbit Type"
            scenarios={scenarios}
            value={scenario}
            onChange={handleScenario}
            color="#fbbf24"
          />

          <ControlSlider
            label="Eccentricity"
            value={eccentricity}
            min={0}
            max={0.9}
            step={0.01}
            color="#fbbf24"
            onChange={setEccentricity}
            precision={2}
            formatValue={(v) => v.toFixed(2)}
          />

          <DataOverlay equation={equation} readouts={readouts} />

          <div className="bg-gray-900 rounded-lg p-3 border border-gray-800">
            <div className="text-xs font-semibold text-yellow-400 mb-2">Velocity vs True Anomaly</div>
            <ResponsiveContainer width="100%" height={110}>
              <LineChart data={velocityChartData} margin={{ top: 4, right: 8, left: -22, bottom: 4 }}>
                <XAxis dataKey="angle" tick={{ fontSize: 9, fill: '#6b7280' }} tickFormatter={(v) => `${v}°`} interval={17} />
                <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} />
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid #374151', fontSize: 10 }}
                  labelFormatter={(l) => `θ = ${l}°`}
                  formatter={(v: number) => [v.toFixed(4), 'v (norm.)']}
                />
                <RechartsLine type="monotone" dataKey="velocity" stroke="#fbbf24" dot={false} strokeWidth={1.5} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-gray-900 rounded-lg p-3 border border-gray-800">
            <div className="text-xs font-semibold text-yellow-400 mb-2">Kepler's Laws</div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Kepler's Second Law (1609): a line from the sun to a planet sweeps out equal areas
              in equal times. This is a consequence of conservation of angular momentum. Near
              perihelion the planet moves fastest; near aphelion it moves slowest. The cyan and
              orange wedges above have the same area despite different shapes, demonstrating this
              law directly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
