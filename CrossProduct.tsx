import { useState, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import ControlSlider from '../../components/ControlSlider';
import ScenarioSelect from '../../components/ScenarioSelect';
import DataOverlay from '../../components/DataOverlay';

// ── vector math ───────────────────────────────────────────────────────────────
type Vec3 = [number, number, number];

function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function magnitude(v: Vec3): number {
  return Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2);
}

function normalize(v: Vec3): Vec3 {
  const m = magnitude(v);
  if (m < 1e-9) return [0, 0, 0];
  return [v[0] / m, v[1] / m, v[2] / m];
}

function angleBetween(a: Vec3, b: Vec3): number {
  const ma = magnitude(a), mb = magnitude(b);
  if (ma < 1e-9 || mb < 1e-9) return 0;
  return Math.acos(Math.max(-1, Math.min(1, dot(a, b) / (ma * mb))));
}

// ── arrow component ────────────────────────────────────────────────────────────
function Arrow({ from, to, color, label }: { from: Vec3; to: Vec3; color: string; label: string }) {
  const start = new THREE.Vector3(...from);
  const end = new THREE.Vector3(...to);
  const dir = end.clone().sub(start);
  const len = dir.length();
  if (len < 0.01) return null;

  const coneH = Math.min(0.22, len * 0.25);
  const coneBase = new THREE.Vector3(...to).addScaledVector(dir.clone().normalize(), -coneH);

  return (
    <group>
      <Line points={[start, coneBase]} color={color} lineWidth={3} />
      <mesh
        position={[to[0], to[1], to[2]]}
        quaternion={new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          dir.clone().normalize()
        )}
      >
        <coneGeometry args={[0.07, coneH, 10]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} />
      </mesh>
      <Html position={[to[0] + 0.1, to[1] + 0.1, to[2] + 0.1]}>
        <span style={{ color, fontSize: 12, fontWeight: 700, pointerEvents: 'none',
          textShadow: '0 0 6px #000, 0 0 12px #000' }}>{label}</span>
      </Html>
    </group>
  );
}

// ── arc showing angle between A and B ─────────────────────────────────────────
function AngleArc({ a, b, color }: { a: Vec3; b: Vec3; color: string }) {
  const ma = magnitude(a), mb = magnitude(b);
  if (ma < 0.01 || mb < 0.01) return null;
  const na = normalize(a);
  const nb = normalize(b);
  const r = 0.6;
  const angle = angleBetween(a, b);
  if (angle < 0.01) return null;

  const pts: THREE.Vector3[] = [];
  const steps = 32;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const ax = na[0] + (nb[0] - na[0]) * t;
    const ay = na[1] + (nb[1] - na[1]) * t;
    const az = na[2] + (nb[2] - na[2]) * t;
    const m = Math.sqrt(ax * ax + ay * ay + az * az);
    pts.push(new THREE.Vector3(ax / m * r, ay / m * r, az / m * r));
  }

  return <Line points={pts} color={color} lineWidth={1.5} dashed dashSize={0.08} gapSize={0.05} />;
}

// ── right-hand rule visualization (rotating hand indicator) ───────────────────
function RightHandPlane({ a, b, c }: { a: Vec3; b: Vec3; c: Vec3 }) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.z = clock.getElapsedTime() * 0.4;
    }
  });

  const ma = magnitude(a), mb = magnitude(b), mc = magnitude(c);
  if (ma < 0.01 || mb < 0.01 || mc < 0.01) return null;

  const normal = normalize(c);
  const quat = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(...normal)
  );

  return (
    <mesh ref={meshRef} quaternion={quat}>
      <circleGeometry args={[0.35, 32]} />
      <meshStandardMaterial color="#4ade80" transparent opacity={0.12} side={THREE.DoubleSide} />
    </mesh>
  );
}

// ── 3D scene ─────────────────────────────────────────────────────────────────
function CrossScene({ a, b }: { a: Vec3; b: Vec3 }) {
  const c = cross(a, b);
  const origin: Vec3 = [0, 0, 0];

  return (
    <group>
      {/* Axes */}
      <Line points={[[-3.5, 0, 0], [3.5, 0, 0]]} color="#1e293b" lineWidth={1.5} />
      <Line points={[[0, -3.5, 0], [0, 3.5, 0]]} color="#1e293b" lineWidth={1.5} />
      <Line points={[[0, 0, -3.5], [0, 0, 3.5]]} color="#1e293b" lineWidth={1.5} />

      {/* Axis labels */}
      <Html position={[3.6, 0, 0]}><span style={{ color: '#334155', fontSize: 11, pointerEvents: 'none' }}>x</span></Html>
      <Html position={[0, 3.6, 0]}><span style={{ color: '#334155', fontSize: 11, pointerEvents: 'none' }}>y</span></Html>
      <Html position={[0, 0, 3.6]}><span style={{ color: '#334155', fontSize: 11, pointerEvents: 'none' }}>z</span></Html>

      {/* Plane of A and B */}
      <RightHandPlane a={a} b={b} c={c} />

      {/* Angle arc */}
      <AngleArc a={a} b={b} color="#94a3b8" />

      {/* Vectors */}
      <Arrow from={origin} to={a} color="#f43f5e" label="A" />
      <Arrow from={origin} to={b} color="#60a5fa" label="B" />
      {magnitude(c) > 0.01 && <Arrow from={origin} to={c} color="#4ade80" label="A×B" />}

      {/* Origin sphere */}
      <mesh>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshStandardMaterial color="#64748b" />
      </mesh>
    </group>
  );
}

// ── scenarios ─────────────────────────────────────────────────────────────────
const SCENARIOS = [
  { id: 'standard',   label: 'Standard',           description: 'General non-parallel vectors' },
  { id: 'orthogonal', label: 'Orthogonal',          description: 'A · B = 0 — max cross product magnitude' },
  { id: 'parallel',   label: 'Parallel (Zero)',     description: 'A × B = 0 — same direction' },
  { id: 'basis',      label: 'Standard Basis î×ĵ', description: 'î × ĵ = k̂ — the classic result' },
];

const SCENARIO_VALS: Record<string, { a: Vec3; b: Vec3 }> = {
  standard:   { a: [2, 1, 0],   b: [1, 2, 0] },
  orthogonal: { a: [2, 0, 0],   b: [0, 2, 0] },
  parallel:   { a: [1.5, 1, 0], b: [3, 2, 0] },
  basis:      { a: [1, 0, 0],   b: [0, 1, 0] },
};

export default function CrossProduct() {
  const [scenario, setScenario] = useState('standard');
  const [ax, setAx] = useState(2); const [ay, setAy] = useState(1); const [az, setAz] = useState(0);
  const [bx, setBx] = useState(1); const [by, setBy] = useState(2); const [bz, setBz] = useState(0);

  const a: Vec3 = [ax, ay, az];
  const b: Vec3 = [bx, by, bz];
  const c = cross(a, b);
  const dotAB = dot(a, b);
  const magA = magnitude(a);
  const magB = magnitude(b);
  const magC = magnitude(c);
  const angle = angleBetween(a, b) * (180 / Math.PI);
  const isParallel = magC < 0.001;

  const applyScenario = (id: string) => {
    setScenario(id);
    const v = SCENARIO_VALS[id];
    setAx(v.a[0]); setAy(v.a[1]); setAz(v.a[2]);
    setBx(v.b[0]); setBy(v.b[1]); setBz(v.b[2]);
  };

  return (
    <div className="w-full h-full flex overflow-hidden">
      <div className="flex-1 relative min-w-0">
        <Canvas camera={{ position: [4, 3, 6], fov: 45 }} style={{ background: '#030712' }}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 8, 5]} intensity={1.2} />
          <CrossScene a={a} b={b} />
          <OrbitControls enablePan={false} minDistance={3} maxDistance={14} />
          <gridHelper args={[8, 8, '#0f172a', '#0f172a']} />
        </Canvas>
      </div>

      <div className="w-72 flex-shrink-0 bg-gray-950 border-l border-gray-800 overflow-y-auto scrollbar-thin">
        <div className="p-3 space-y-4">

          <ScenarioSelect
            label="Scenario"
            scenarios={SCENARIOS}
            value={scenario}
            onChange={applyScenario}
            color="cyan"
          />

          {/* Vector A inputs */}
          <div>
            <p className="text-[10px] text-gray-600 font-semibold uppercase tracking-wider mb-2">
              Vector A <span className="text-rose-400">(red)</span>
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {[['x', ax, setAx], ['y', ay, setAy], ['z', az, setAz]].map(([label, val, setter]) => (
                <div key={label as string}>
                  <p className="text-[9px] text-gray-600 text-center mb-0.5">{label as string}</p>
                  <input
                    type="number" step={0.5} value={val as number}
                    onChange={e => (setter as (v: number) => void)(parseFloat(e.target.value) || 0)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white text-center outline-none focus:border-rose-500 transition-colors font-mono"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Vector B inputs */}
          <div>
            <p className="text-[10px] text-gray-600 font-semibold uppercase tracking-wider mb-2">
              Vector B <span className="text-blue-400">(blue)</span>
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {[['x', bx, setBx], ['y', by, setBy], ['z', bz, setBz]].map(([label, val, setter]) => (
                <div key={label as string}>
                  <p className="text-[9px] text-gray-600 text-center mb-0.5">{label as string}</p>
                  <input
                    type="number" step={0.5} value={val as number}
                    onChange={e => (setter as (v: number) => void)(parseFloat(e.target.value) || 0)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white text-center outline-none focus:border-blue-500 transition-colors font-mono"
                  />
                </div>
              ))}
            </div>
          </div>

          <DataOverlay
            equation={{ text: 'A×B = (AyBz−AzBy, AzBx−AxBz, AxBy−AyBx)', color: '#94a3b8' }}
            readouts={[
              { label: 'A×B (x)', value: c[0].toFixed(3), color: '#4ade80', highlight: true },
              { label: 'A×B (y)', value: c[1].toFixed(3), color: '#4ade80', highlight: true },
              { label: 'A×B (z)', value: c[2].toFixed(3), color: '#4ade80', highlight: true },
              { label: '|A×B|', value: magC.toFixed(4), color: isParallel ? '#f43f5e' : '#22d3ee' },
              { label: '|A|', value: magA.toFixed(3), color: '#f43f5e' },
              { label: '|B|', value: magB.toFixed(3), color: '#60a5fa' },
              { label: 'Angle θ', value: `${angle.toFixed(1)}°`, color: '#f59e0b' },
              { label: 'A · B (dot)', value: dotAB.toFixed(3), color: '#94a3b8' },
              { label: 'Parallel?', value: isParallel ? 'YES — zero cross' : 'No', color: isParallel ? '#f43f5e' : '#34d399' },
            ]}
          />

          {/* Step-by-step computation */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-3 space-y-2">
            <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Computation Steps</p>
            <div className="font-mono text-[10px] space-y-1 text-gray-400">
              <div className="flex justify-between">
                <span className="text-rose-400">A = ({ax}, {ay}, {az})</span>
                <span className="text-blue-400">B = ({bx}, {by}, {bz})</span>
              </div>
              <div className="border-t border-gray-800 pt-1 space-y-0.5">
                <p><span className="text-green-400">x:</span> ({ay})({bz}) − ({az})({by}) = <span className="text-white">{c[0].toFixed(3)}</span></p>
                <p><span className="text-green-400">y:</span> ({az})({bx}) − ({ax})({bz}) = <span className="text-white">{c[1].toFixed(3)}</span></p>
                <p><span className="text-green-400">z:</span> ({ax})({by}) − ({ay})({bx}) = <span className="text-white">{c[2].toFixed(3)}</span></p>
              </div>
              <p className="text-[10px] border-t border-gray-800 pt-1">
                <span className="text-green-400">|A×B|</span> = |A||B|sin(θ) = {magA.toFixed(2)} × {magB.toFixed(2)} × sin({angle.toFixed(1)}°) = <span className="text-white">{(magA * magB * Math.sin(angle * Math.PI / 180)).toFixed(4)}</span>
              </p>
            </div>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-3 text-[11px] text-gray-400 space-y-1">
            {isParallel
              ? <p><span className="text-rose-400 font-semibold">Parallel vectors!</span> Cross product = 0. They span only 1D — no perpendicular direction exists.</p>
              : <p><span className="text-green-400 font-semibold">A × B</span> is perpendicular to both A and B. Its magnitude equals the area of the parallelogram they form: <span className="text-cyan-300">{magC.toFixed(4)}</span></p>
            }
            <p className="text-gray-500">Right-hand rule: curl fingers from A toward B — thumb points along A × B.</p>
          </div>

        </div>
      </div>
    </div>
  );
}
