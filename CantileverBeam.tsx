import { useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import {
  LineChart,
  Line as RLine,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import ControlSlider from '../../components/ControlSlider';
import ScenarioSelect from '../../components/ScenarioSelect';
import DataOverlay from '../../components/DataOverlay';

// ── Material presets ──────────────────────────────────────────────────────────
const MATERIALS = {
  steel: { E: 210e9, I: 8.33e-6, label: 'Steel',  color: '#22d3ee' },
  wood:  { E: 12e9,  I: 8.33e-6, label: 'Wood',   color: '#f59e0b' },
};

// ── Deflection math ───────────────────────────────────────────────────────────
// y(x) = (F / 6EI) * (3Lx² - x³)
// normalized to visual units by dividing by actual EI and scaling

function deflection(x: number, F: number, L: number, EI: number): number {
  if (EI < 1) return 0;
  return (F / (6 * EI)) * (3 * L * x * x - x * x * x);
}

const VISUAL_SCALE = 150; // scale to make deflection visible in 3D units
const BEAM_SEGMENTS = 60;

// ── 3D Scene ──────────────────────────────────────────────────────────────────
function BeamScene({
  load,
  length,
  EI,
  material,
}: {
  load: number;
  length: number;
  EI: number;
  material: 'steel' | 'wood';
}) {
  const matColor = MATERIALS[material].color;

  // Compute deflected beam points
  const beamPoints = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= BEAM_SEGMENTS; i++) {
      const frac = i / BEAM_SEGMENTS;
      const xReal = frac * length;
      const yDeflect = -deflection(xReal, load, length, EI) * VISUAL_SCALE;
      const xScene = frac * 5 - 0.0; // beam from x=0 to x=5 in scene
      pts.push(new THREE.Vector3(xScene, yDeflect, 0));
    }
    return pts;
  }, [load, length, EI]);

  // Undeflected reference line
  const refPoints = useMemo(() => [
    new THREE.Vector3(0, 0, 0.05),
    new THREE.Vector3(5, 0, 0.05),
  ], []);

  // Color gradient points (green near wall → red at tip)
  const colorSegments = useMemo(() => {
    const segments: { pts: THREE.Vector3[]; color: string }[] = [];
    const n = 10;
    for (let i = 0; i < n; i++) {
      const pts: THREE.Vector3[] = [];
      for (let j = 0; j <= 3; j++) {
        const frac = (i * 3 + j) / (n * 3);
        if (frac > 1) break;
        const xReal = frac * length;
        const yDeflect = -deflection(xReal, load, length, EI) * VISUAL_SCALE;
        pts.push(new THREE.Vector3(frac * 5, yDeflect, 0));
      }
      const t = i / (n - 1);
      const r = Math.round(50 + t * 200);
      const g = Math.round(220 - t * 180);
      segments.push({ pts, color: `rgb(${r},${g},50)` });
    }
    return segments;
  }, [load, length, EI]);

  const tipDeflect = deflection(length, load, length, EI) * VISUAL_SCALE;
  const tipDeflectReal = deflection(length, load, length, EI) * 1000; // mm

  const arrowLen = Math.min(load / 3000 * 1.5, 1.5);

  return (
    <group position={[-2.5, 0.5, 0]}>
      {/* Wall block */}
      <mesh position={[-0.5, -0.3, 0]}>
        <boxGeometry args={[0.6, 1.4, 0.5]} />
        <meshStandardMaterial color="#334155" metalness={0.4} roughness={0.6} />
      </mesh>
      {/* Wall hatching lines */}
      {[-0.8, -0.5, -0.2, 0.1, 0.4].map((y, i) => (
        <Line
          key={i}
          points={[new THREE.Vector3(-0.85, y, 0.26), new THREE.Vector3(-0.55, y + 0.2, 0.26)]}
          color="#1e293b"
          lineWidth={1}
        />
      ))}

      {/* Undeflected reference */}
      <Line points={refPoints} color="#1e293b" lineWidth={1} dashed dashSize={0.2} gapSize={0.1} />

      {/* Beam colored segments */}
      {colorSegments.map((seg, i) =>
        seg.pts.length >= 2 ? (
          <Line key={i} points={seg.pts} color={seg.color} lineWidth={5} />
        ) : null
      )}

      {/* Tip force arrow */}
      {load > 0 && (
        <group position={[5, -tipDeflect, 0]}>
          <Line
            points={[new THREE.Vector3(0, 0.1, 0.1), new THREE.Vector3(0, 0.1 + arrowLen, 0.1)]}
            color="#f43f5e"
            lineWidth={4}
          />
          <mesh position={[0, 0, 0.1]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.1, 0.25, 8]} />
            <meshStandardMaterial color="#f43f5e" emissive="#f43f5e" emissiveIntensity={0.7} />
          </mesh>
          <Html position={[0.25, 0.4, 0.1]}>
            <div style={{ color: '#f43f5e', fontSize: 10, fontWeight: 700, pointerEvents: 'none', textShadow: '0 0 6px #000', whiteSpace: 'nowrap' }}>
              F = {load.toFixed(0)} N
            </div>
          </Html>
        </group>
      )}

      {/* Deflection label at tip */}
      {load > 0 && (
        <Html position={[5.2, -tipDeflect - 0.3, 0]}>
          <div style={{ color: '#34d399', fontSize: 10, fontWeight: 700, pointerEvents: 'none', textShadow: '0 0 6px #000', whiteSpace: 'nowrap' }}>
            δ = {tipDeflectReal.toFixed(2)} mm
          </div>
        </Html>
      )}

      {/* Node spheres along beam */}
      {beamPoints.filter((_, i) => i % 12 === 0).map((p, i) => (
        <mesh key={i} position={[p.x, p.y, p.z]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshStandardMaterial color={matColor} emissive={matColor} emissiveIntensity={0.3} />
        </mesh>
      ))}
    </group>
  );
}

// ── Scenarios ─────────────────────────────────────────────────────────────────
const SCENARIOS = [
  { id: 'steel', label: 'Steel', description: 'E = 210 GPa — stiff, minimal deflection' },
  { id: 'wood',  label: 'Wood',  description: 'E = 12 GPa — flexible, larger deflection' },
];

// ── Main ──────────────────────────────────────────────────────────────────────
export default function CantileverBeam() {
  const [load,     setLoad]     = useState(5000);
  const [length,   setLength]   = useState(3);
  const [material, setMaterial] = useState<'steel' | 'wood'>('steel');

  const mat = MATERIALS[material];
  const EI = mat.E * mat.I;

  const deflMax = deflection(length, load, length, EI) * 1000; // mm
  const bendingMomentWall = load * length; // N·m
  const reactionForce = load;

  const applyScenario = (id: string) => setMaterial(id as 'steel' | 'wood');

  // Chart data: deflection profile
  const chartData = useMemo(() =>
    Array.from({ length: 40 }, (_, i) => {
      const frac = i / 39;
      const xReal = frac * length;
      const d = deflection(xReal, load, length, EI) * 1000; // mm
      return { x: parseFloat((xReal).toFixed(2)), deflection: parseFloat((-d).toFixed(3)) };
    }),
    [load, length, EI]
  );

  return (
    <div className="w-full h-full flex overflow-hidden">
      <div className="flex-1 relative min-w-0">
        <Canvas camera={{ position: [0, 1.5, 8], fov: 45 }} style={{ background: '#030712' }}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[4, 6, 4]} intensity={1.1} />
          <pointLight position={[-2, 3, 4]} color="#22d3ee" intensity={1} distance={12} />
          <BeamScene load={load} length={length} EI={EI} material={material} />
          <OrbitControls enablePan={false} minDistance={4} maxDistance={16} />
          <gridHelper args={[12, 12, '#0f172a', '#0f172a']} />
        </Canvas>
      </div>

      <div className="w-72 flex-shrink-0 bg-gray-950 border-l border-gray-800 overflow-y-auto scrollbar-thin">
        <div className="p-3 space-y-4">
          <ScenarioSelect
            label="Material"
            scenarios={SCENARIOS}
            value={material}
            onChange={applyScenario}
            color="cyan"
          />

          <ControlSlider
            label="Tip Load (F)"
            value={load}
            min={0}
            max={10000}
            step={100}
            color="#f43f5e"
            onChange={setLoad}
            precision={0}
            formatValue={v => `${v.toFixed(0)} N`}
          />
          <ControlSlider
            label="Beam Length (L)"
            value={length}
            min={1}
            max={5}
            step={0.1}
            color="#22d3ee"
            onChange={setLength}
            precision={1}
            formatValue={v => `${v.toFixed(1)} m`}
          />

          <DataOverlay
            equation={{ text: 'δ = FL³/3EI', color: '#94a3b8' }}
            readouts={[
              { label: 'Max Deflection', value: `${deflMax.toFixed(2)} mm`, color: '#34d399', highlight: true },
              { label: 'Bending Moment (wall)', value: `${(bendingMomentWall / 1000).toFixed(2)} kN·m`, color: '#f59e0b', highlight: true },
              { label: 'Reaction Force', value: `${(reactionForce / 1000).toFixed(2)} kN`, color: '#f43f5e' },
              { label: 'EI Value', value: `${(EI / 1e6).toFixed(0)} kN·m²`, color: '#94a3b8' },
              { label: 'Material', value: mat.label, color: mat.color },
            ]}
          />

          {/* Deflection profile chart */}
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-3 pt-2 pb-0">
              <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Deflection Profile</span>
            </div>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={chartData} margin={{ top: 4, right: 10, left: -10, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="x" tick={{ fontSize: 9, fill: '#475569' }} tickLine={false} label={{ value: 'x (m)', position: 'insideRight', style: { fontSize: 8, fill: '#475569' } }} />
                <YAxis tick={{ fontSize: 9, fill: '#475569' }} tickLine={false} label={{ value: 'δ (mm)', angle: -90, position: 'insideLeft', style: { fontSize: 8, fill: '#475569' } }} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 6, fontSize: 10 }} formatter={(v: number) => [`${v.toFixed(3)} mm`, 'Deflection']} />
                <RLine type="monotone" dataKey="deflection" stroke="#34d399" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-3 text-[11px] text-gray-400 space-y-1">
            <p>Deflection scales with <span className="text-rose-400 font-semibold">L³</span> — doubling length increases deflection 8×.</p>
            <p>Steel is <span className="text-cyan-300 font-semibold">{(210 / 12).toFixed(1)}×</span> stiffer than wood (E ratio). Maximum stress occurs at the fixed wall.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
