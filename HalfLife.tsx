import { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, CartesianGrid,
} from 'recharts';
import ControlSlider from '../../components/ControlSlider';
import ScenarioSelect from '../../components/ScenarioSelect';
import DataOverlay from '../../components/DataOverlay';

// ── constants ─────────────────────────────────────────────────────────────────
const N0 = 64;
const GRID_SIZE = 8;

// Build grid positions (8×8 in XZ plane)
const GRID_POSITIONS: [number, number, number][] = [];
for (let row = 0; row < GRID_SIZE; row++) {
  for (let col = 0; col < GRID_SIZE; col++) {
    const x = (col - (GRID_SIZE - 1) / 2) * 0.55;
    const z = (row - (GRID_SIZE - 1) / 2) * 0.55;
    GRID_POSITIONS.push([x, 0, z]);
  }
}

// Deterministic "decayed" set based on time
function computeDecayedSet(timeFraction: number): Set<number> {
  const nRemaining = Math.round(N0 * Math.pow(0.5, timeFraction));
  const decayed = new Set<number>();
  // Use a seeded permutation so decayed atoms are consistent
  const order = Array.from({ length: N0 }, (_, i) => i);
  // Deterministic shuffle using a simple LCG
  let seed = 42;
  for (let i = order.length - 1; i > 0; i--) {
    seed = (seed * 1664525 + 1013904223) & 0x7fffffff;
    const j = seed % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  const numDecayed = N0 - nRemaining;
  for (let i = 0; i < numDecayed; i++) {
    decayed.add(order[i]);
  }
  return decayed;
}

// ── atom mesh ─────────────────────────────────────────────────────────────────
interface AtomProps {
  position: [number, number, number];
  decayed: boolean;
  justDecayed: boolean;
}

function Atom({ position, decayed, justDecayed }: AtomProps) {
  const ref = useRef<THREE.Mesh>(null);
  const flashTime = useRef(justDecayed ? 0 : 1);
  const scaleTarget = decayed ? 0.72 : 1.0;

  useFrame((_, delta) => {
    if (!ref.current) return;
    const mat = ref.current.material as THREE.MeshStandardMaterial;

    // Scale lerp
    const currentScale = ref.current.scale.x;
    const newScale = THREE.MathUtils.lerp(currentScale, scaleTarget, delta * 4);
    ref.current.scale.setScalar(newScale);

    if (justDecayed && flashTime.current < 1) {
      flashTime.current = Math.min(1, flashTime.current + delta * 3);
    }

    if (!decayed) {
      // Active: amber glow pulse
      mat.emissiveIntensity = 0.4 + 0.3 * Math.sin(Date.now() * 0.003 + position[0] + position[2]);
    } else {
      // Decayed: fade to gray
      if (flashTime.current < 1) {
        // brief white flash then gray
        const t = flashTime.current;
        mat.emissiveIntensity = t < 0.3 ? (1 - t / 0.3) * 1.5 : 0;
      } else {
        mat.emissiveIntensity = 0;
      }
    }
  });

  const color = decayed ? '#4b5563' : '#f59e0b';
  const emissive = decayed ? (justDecayed ? '#ffffff' : '#000000') : '#f59e0b';

  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[0.2, 12, 12]} />
      <meshStandardMaterial
        color={color}
        emissive={emissive}
        emissiveIntensity={decayed ? 0 : 0.4}
        roughness={0.4}
      />
    </mesh>
  );
}

// ── grid scene ─────────────────────────────────────────────────────────────────
interface GridSceneProps {
  timeFraction: number;
}

function DecayGrid({ timeFraction }: GridSceneProps) {
  const decayed = useMemo(() => computeDecayedSet(timeFraction), [timeFraction]);
  const prevDecayed = useRef<Set<number>>(new Set());

  const justDecayedSet = useMemo(() => {
    const jd = new Set<number>();
    decayed.forEach(id => {
      if (!prevDecayed.current.has(id)) jd.add(id);
    });
    prevDecayed.current = decayed;
    return jd;
  }, [decayed]);

  return (
    <group position={[0, 0, 0]}>
      {GRID_POSITIONS.map((pos, i) => (
        <Atom
          key={i}
          position={pos}
          decayed={decayed.has(i)}
          justDecayed={justDecayedSet.has(i)}
        />
      ))}
    </group>
  );
}

// ── scenarios ─────────────────────────────────────────────────────────────────
const SCENARIOS = [
  { id: 'carbon14', label: 'Carbon-14', description: 'Half-life: 5,730 years (shown symbolically)' },
  { id: 'uranium238', label: 'Uranium-238', description: 'Half-life: 4.5 billion years (shown symbolically)' },
];

type DecayScenario = 'carbon14' | 'uranium238';

const SCENARIO_HALFLIVES: Record<DecayScenario, { display: string; symbol: string }> = {
  carbon14: { display: '5,730 years', symbol: '¹⁴C' },
  uranium238: { display: '4.5 × 10⁹ years', symbol: '²³⁸U' },
};

// ── main component ────────────────────────────────────────────────────────────
export default function HalfLife() {
  const [scenario, setScenario] = useState<DecayScenario>('carbon14');
  const [timeFraction, setTimeFraction] = useState(0);
  const [halfLifeFactor, setHalfLifeFactor] = useState(5);

  const nRemaining = Math.round(N0 * Math.pow(0.5, timeFraction));
  const pctRemaining = (nRemaining / N0) * 100;
  const activity = nRemaining > 0 ? (nRemaining * Math.log(2) / halfLifeFactor).toFixed(2) : '0.00';

  const handleScenario = (id: DecayScenario) => {
    setScenario(id);
    setTimeFraction(0);
  };

  // Decay curve data
  const curveData = useMemo(() => {
    const pts = [];
    for (let t = 0; t <= 10; t += 0.25) {
      pts.push({ t, N: N0 * Math.pow(0.5, t) });
    }
    return pts;
  }, []);

  return (
    <div className="w-full h-full flex overflow-hidden">
      {/* 3D Canvas */}
      <div className="flex-1 relative min-w-0">
        <Canvas camera={{ position: [0, 5, 6], fov: 50 }} style={{ background: '#030712' }}>
          <ambientLight intensity={0.4} />
          <directionalLight position={[3, 6, 4]} intensity={0.8} />
          <pointLight position={[0, 3, 0]} color="#f59e0b" intensity={1.0} distance={8} />
          <DecayGrid timeFraction={timeFraction} />
          <OrbitControls enablePan={false} minDistance={4} maxDistance={14} />
        </Canvas>
      </div>

      {/* Right panel */}
      <div className="w-72 flex-shrink-0 bg-gray-950 border-l border-gray-800 overflow-y-auto scrollbar-thin p-3 space-y-4">

        <ScenarioSelect
          label="Isotope"
          scenarios={SCENARIOS}
          value={scenario}
          onChange={handleScenario}
          color="amber"
        />

        <ControlSlider
          label="Time (half-lives)"
          value={timeFraction}
          min={0}
          max={10}
          step={0.05}
          color="#f59e0b"
          onChange={setTimeFraction}
          precision={2}
          formatValue={(v) => `${v.toFixed(2)} t½`}
        />

        <ControlSlider
          label="Half-life Factor (units)"
          value={halfLifeFactor}
          min={1}
          max={10}
          step={0.5}
          color="#a78bfa"
          onChange={setHalfLifeFactor}
          precision={1}
        />

        <DataOverlay
          equation={{ text: 'N = N₀ × (½)^(t/t½)', color: '#fcd34d' }}
          readouts={[
            { label: 'Isotope', value: SCENARIO_HALFLIVES[scenario].symbol, color: '#f59e0b' },
            { label: 't (half-lives)', value: `${timeFraction.toFixed(2)} t½`, color: '#fbbf24' },
            { label: 'N remaining', value: `${nRemaining}`, color: '#4ade80', highlight: true },
            { label: 'N₀', value: '64', color: '#94a3b8' },
            { label: '% Remaining', value: `${pctRemaining.toFixed(1)}%`, color: '#22d3ee' },
            { label: 'Activity', value: `${activity} decays/unit`, color: '#f87171' },
            { label: 'Real half-life', value: SCENARIO_HALFLIVES[scenario].display, color: '#6b7280' },
          ]}
        />

        {/* Decay curve chart */}
        <div>
          <p className="text-[10px] text-gray-600 font-semibold uppercase tracking-wider mb-2">Decay Curve</p>
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-2">
            <ResponsiveContainer width="100%" height={130}>
              <LineChart data={curveData} margin={{ top: 8, right: 8, bottom: 4, left: -18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="t"
                  tick={{ fill: '#6b7280', fontSize: 9 }}
                  tickLine={false}
                  axisLine={false}
                  label={{ value: 't½', position: 'insideBottomRight', offset: -4, fill: '#4b5563', fontSize: 9 }}
                />
                <YAxis
                  domain={[0, 64]}
                  tick={{ fill: '#6b7280', fontSize: 9 }}
                  tickLine={false}
                  axisLine={false}
                  label={{ value: 'N', angle: -90, position: 'insideLeft', fill: '#4b5563', fontSize: 9 }}
                />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11 }}
                  labelStyle={{ color: '#94a3b8' }}
                  itemStyle={{ color: '#e2e8f0' }}
                  formatter={(v: number) => [v.toFixed(1), 'N']}
                  labelFormatter={(v) => `t = ${v} t½`}
                />
                <ReferenceLine x={timeFraction} stroke="#fbbf24" strokeWidth={1.5} strokeDasharray="3 3" />
                <Line
                  type="monotone"
                  dataKey="N"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: '#f59e0b' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-[11px] text-gray-400">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
            <span>Active</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-gray-600 inline-block" />
            <span>Decayed</span>
          </div>
        </div>

        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-3 text-[11px] text-gray-400 space-y-1">
          <p>After each <span className="text-amber-400 font-semibold">half-life</span>, exactly half the remaining atoms decay.</p>
          <p>Activity is proportional to the number of <span className="text-amber-400 font-semibold">remaining atoms</span>.</p>
        </div>

      </div>
    </div>
  );
}
