import { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer, LabelList,
} from 'recharts';
import ControlSlider from '../../components/ControlSlider';
import ScenarioSelect from '../../components/ScenarioSelect';
import DataOverlay from '../../components/DataOverlay';

// ── helpers ───────────────────────────────────────────────────────────────────
function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function computeKFactor(pressure: number, temperature: number): number {
  return clamp(50 + (pressure - 100) * 0.2 - (temperature - 500) * 0.15, 5, 95);
}

function computeKeq(pressure: number, temperature: number): number {
  return Math.exp((92000 / 8.314) * (1 / temperature - 1 / 500)) * Math.pow(pressure / 100, 2);
}

// ── particle ──────────────────────────────────────────────────────────────────
interface ParticleProps {
  type: 'N2' | 'H2' | 'NH3';
  bounds: number;
}

function Particle({ type, bounds }: ParticleProps) {
  const ref = useRef<THREE.Mesh>(null);
  const vel = useRef<THREE.Vector3>(
    new THREE.Vector3(
      (Math.random() - 0.5) * 3,
      (Math.random() - 0.5) * 3,
      (Math.random() - 0.5) * 3,
    ),
  );
  const pos = useRef<THREE.Vector3>(
    new THREE.Vector3(
      (Math.random() - 0.5) * bounds * 1.6,
      (Math.random() - 0.5) * 1.2,
      (Math.random() - 0.5) * bounds * 1.6,
    ),
  );

  const color = type === 'N2' ? '#3b82f6' : type === 'H2' ? '#e2e8f0' : '#22c55e';
  const radius = type === 'N2' ? 0.13 : type === 'H2' ? 0.08 : 0.11;

  useFrame((_, delta) => {
    if (!ref.current) return;
    pos.current.addScaledVector(vel.current, delta);
    const bx = bounds;
    const by = 1.0;
    const bz = bounds;
    if (Math.abs(pos.current.x) > bx) vel.current.x *= -1;
    if (Math.abs(pos.current.y) > by) vel.current.y *= -1;
    if (Math.abs(pos.current.z) > bz) vel.current.z *= -1;
    pos.current.x = clamp(pos.current.x, -bx, bx);
    pos.current.y = clamp(pos.current.y, -by, by);
    pos.current.z = clamp(pos.current.z, -bz, bz);
    ref.current.position.copy(pos.current);
  });

  return (
    <mesh ref={ref} position={[pos.current.x, pos.current.y, pos.current.z]}>
      <sphereGeometry args={[radius, 10, 10]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
    </mesh>
  );
}

// ── piston scene ──────────────────────────────────────────────────────────────
interface PistonSceneProps {
  pressure: number;
  kFactor: number;
}

function PistonScene({ pressure, kFactor }: PistonSceneProps) {
  const pistonRef = useRef<THREE.Mesh>(null);

  // piston Y position: at 1 atm piston is high (y=1.8), at 300 atm it compresses down to y=0.2
  const pistonY = 1.8 - (pressure / 300) * 1.6;
  // cylinder bounds in x/z
  const bounds = 0.8;

  useFrame(() => {
    if (pistonRef.current) {
      pistonRef.current.position.y = THREE.MathUtils.lerp(
        pistonRef.current.position.y,
        pistonY,
        0.05,
      );
    }
  });

  // particle counts proportional to reactant vs product %
  const productFrac = kFactor / 100;
  const reactantFrac = 1 - productFrac;
  const n2Count = Math.round(clamp(reactantFrac * 4, 1, 4));
  const h2Count = Math.round(clamp(reactantFrac * 8, 2, 8));
  const nh3Count = Math.round(clamp(productFrac * 8, 0, 8));

  const particles = useMemo(() => {
    const arr: { type: 'N2' | 'H2' | 'NH3'; id: string }[] = [];
    for (let i = 0; i < n2Count; i++) arr.push({ type: 'N2', id: `n2-${i}` });
    for (let i = 0; i < h2Count; i++) arr.push({ type: 'H2', id: `h2-${i}` });
    for (let i = 0; i < nh3Count; i++) arr.push({ type: 'NH3', id: `nh3-${i}` });
    return arr;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n2Count, h2Count, nh3Count]);

  return (
    <group>
      {/* cylinder walls */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[1.0, 1.0, 4, 32, 1, true]} />
        <meshStandardMaterial color="#475569" transparent opacity={0.25} side={THREE.BackSide} />
      </mesh>
      {/* cylinder bottom */}
      <mesh position={[0, -2, 0]}>
        <cylinderGeometry args={[1.0, 1.0, 0.12, 32]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
      {/* piston */}
      <mesh ref={pistonRef} position={[0, pistonY, 0]}>
        <cylinderGeometry args={[0.96, 0.96, 0.18, 32]} />
        <meshStandardMaterial color="#94a3b8" emissive="#475569" emissiveIntensity={0.3} />
      </mesh>

      {/* particles */}
      {particles.map(p => (
        <Particle key={p.id} type={p.type} bounds={bounds} />
      ))}

      {/* legend */}
      <Html position={[1.3, 1.5, 0]}>
        <div className="bg-gray-950/80 border border-gray-700 rounded-lg p-1.5 text-[10px] space-y-0.5 pointer-events-none">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
            <span className="text-gray-300">N₂</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-gray-100 inline-block" />
            <span className="text-gray-300">H₂</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
            <span className="text-gray-300">NH₃</span>
          </div>
        </div>
      </Html>

      <Html position={[0, -2.6, 0]}>
        <div className="text-[10px] text-gray-500 pointer-events-none text-center whitespace-nowrap">
          {pressure.toFixed(0)} atm
        </div>
      </Html>
    </group>
  );
}

// ── scenarios ─────────────────────────────────────────────────────────────────
const SCENARIOS = [
  { id: 'haber', label: 'Haber Process', description: 'Industrial NH₃ synthesis: high P, moderate T' },
  { id: 'generic', label: 'Generic', description: 'Baseline equilibrium conditions' },
];

// ── main component ────────────────────────────────────────────────────────────
export default function LeChatelier() {
  const [scenario, setScenario] = useState<'haber' | 'generic'>('haber');
  const [pressure, setPressure] = useState(200);
  const [temperature, setTemperature] = useState(450);

  const handleScenario = (id: 'haber' | 'generic') => {
    setScenario(id);
    if (id === 'haber') { setPressure(200); setTemperature(450); }
    else { setPressure(100); setTemperature(500); }
  };

  const kFactor = computeKFactor(pressure, temperature);
  const keq = computeKeq(pressure, temperature);
  const productPct = kFactor;
  const reactantPct = 100 - kFactor;

  const shiftDirection =
    pressure > 150 && temperature < 450
      ? 'Forward (↑ NH₃)'
      : temperature > 550
      ? 'Reverse (↓ NH₃)'
      : pressure < 50
      ? 'Reverse (↓ NH₃)'
      : 'Near equilibrium';

  const chartData = [
    { name: 'Reactants (N₂+H₂)', value: reactantPct, fill: '#3b82f6' },
    { name: 'Product (NH₃)', value: productPct, fill: '#22c55e' },
  ];

  return (
    <div className="w-full h-full flex overflow-hidden">
      {/* 3D Canvas */}
      <div className="flex-1 relative min-w-0">
        <Canvas camera={{ position: [0, 0, 7], fov: 42 }} style={{ background: '#030712' }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[4, 6, 4]} intensity={1.2} />
          <pointLight position={[-3, 2, 2]} color="#22c55e" intensity={0.6} distance={8} />
          <PistonScene pressure={pressure} kFactor={kFactor} />
          <OrbitControls enablePan={false} minDistance={4} maxDistance={12} />
        </Canvas>
      </div>

      {/* Right panel */}
      <div className="w-72 flex-shrink-0 bg-gray-950 border-l border-gray-800 overflow-y-auto scrollbar-thin p-3 space-y-4">

        <ScenarioSelect
          label="Scenario"
          scenarios={SCENARIOS}
          value={scenario}
          onChange={handleScenario}
          color="emerald"
        />

        <ControlSlider
          label="Pressure (atm)"
          value={pressure}
          min={1}
          max={300}
          step={1}
          color="#22d3ee"
          onChange={setPressure}
          precision={0}
        />

        <ControlSlider
          label="Temperature (K)"
          value={temperature}
          min={300}
          max={800}
          step={5}
          color="#f97316"
          onChange={setTemperature}
          precision={0}
        />

        <DataOverlay
          equation={{ text: 'N₂ + 3H₂ ⇌ 2NH₃  ΔH = -92 kJ/mol', color: '#6ee7b7' }}
          readouts={[
            { label: 'Pressure', value: `${pressure} atm`, color: '#22d3ee' },
            { label: 'Temperature', value: `${temperature} K`, color: '#f97316' },
            { label: 'NH₃ Yield', value: `${productPct.toFixed(1)}%`, color: '#22c55e', highlight: true },
            { label: 'K_eq (approx)', value: keq < 1e-3 ? keq.toExponential(2) : keq > 1e4 ? keq.toExponential(2) : keq.toFixed(3), color: '#a78bfa' },
            { label: 'Shift Direction', value: shiftDirection, color: '#fbbf24', highlight: true },
          ]}
        />

        {/* Bar chart */}
        <div>
          <p className="text-[10px] text-gray-600 font-semibold uppercase tracking-wider mb-2">Equilibrium Composition</p>
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-2">
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={chartData} margin={{ top: 14, right: 8, bottom: 4, left: -20 }}>
                <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 9 }} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 9 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11 }}
                  labelStyle={{ color: '#94a3b8' }}
                  itemStyle={{ color: '#e2e8f0' }}
                  formatter={(v: number) => [`${v.toFixed(1)}%`, 'Mole fraction']}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                  <LabelList dataKey="value" position="top" style={{ fill: '#94a3b8', fontSize: 10 }} formatter={(v: number) => `${v.toFixed(0)}%`} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-3 text-[11px] text-gray-400 space-y-1">
          <p><span className="text-cyan-400 font-semibold">↑ Pressure</span> shifts equilibrium toward fewer moles (forward → more NH₃).</p>
          <p><span className="text-orange-400 font-semibold">↑ Temperature</span> shifts equilibrium toward endothermic direction (reverse → less NH₃).</p>
        </div>

      </div>
    </div>
  );
}
