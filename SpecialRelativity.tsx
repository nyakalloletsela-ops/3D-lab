import { useState, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import { LineChart, Line as RLine, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import ControlSlider from '../../components/ControlSlider';
import ScenarioSelect from '../../components/ScenarioSelect';
import DataOverlay from '../../components/DataOverlay';

// ── Lorentz factor ────────────────────────────────────────────────────────────
const C = 1; // normalized
function gamma(beta: number): number {
  return 1 / Math.sqrt(1 - beta * beta);
}

// ── Light clock component ─────────────────────────────────────────────────────
function LightClock({
  x, y, z, height, beta, label, color, speed,
}: {
  x: number; y: number; z: number;
  height: number; beta: number; label: string; color: string; speed: number;
}) {
  const photonRef = useRef<THREE.Mesh>(null);
  const tRef = useRef(0);
  const dirRef = useRef(1);

  useFrame((_, delta) => {
    tRef.current += delta * speed * 0.8;
    if (!photonRef.current) return;
    const t = (tRef.current % 2);
    const pos = t < 1 ? t : 2 - t;
    photonRef.current.position.set(x, y + pos * height, z);
    if (t < 1) dirRef.current = 1; else dirRef.current = -1;
  });

  const lc = 1 - beta; // lorentz contraction (length in travel direction)

  return (
    <group>
      {/* Top mirror */}
      <mesh position={[x, y + height, z]}>
        <boxGeometry args={[0.5, 0.05, 0.05]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} />
      </mesh>
      {/* Bottom mirror */}
      <mesh position={[x, y, z]}>
        <boxGeometry args={[0.5, 0.05, 0.05]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} />
      </mesh>
      {/* Sides */}
      <Line
        points={[new THREE.Vector3(x - 0.25, y, z), new THREE.Vector3(x - 0.25, y + height, z)]}
        color={color} lineWidth={1.5}
      />
      <Line
        points={[new THREE.Vector3(x + 0.25, y, z), new THREE.Vector3(x + 0.25, y + height, z)]}
        color={color} lineWidth={1.5}
      />
      {/* Photon */}
      <mesh ref={photonRef} position={[x, y, z]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={1.5} />
      </mesh>
      <pointLight position={[x, y, z + 0.3]} color="#fef08a" intensity={1} distance={1.5} />
      <Html position={[x, y - 0.5, z]}>
        <div style={{ color, fontSize: 10, fontWeight: 700, pointerEvents: 'none',
          textShadow: '0 0 6px #000', whiteSpace: 'nowrap', textAlign: 'center' }}>
          {label}
        </div>
      </Html>
    </group>
  );
}

// ── Rocket with Lorentz contraction ───────────────────────────────────────────
function Rocket({ beta }: { beta: number }) {
  const g = gamma(beta);
  const contractedLength = 3 / g;
  const moveRef = useRef<THREE.Group>(null);
  const xRef = useRef(-5);

  useFrame((_, delta) => {
    xRef.current += delta * beta * 4;
    if (xRef.current > 6) xRef.current = -5;
    if (moveRef.current) moveRef.current.position.x = xRef.current;
  });

  return (
    <group ref={moveRef}>
      {/* Rocket body */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.25, 0.25, contractedLength, 12]} />
        <meshStandardMaterial color="#64748b" emissive="#475569" emissiveIntensity={0.3} />
      </mesh>
      {/* Nose cone */}
      <mesh position={[contractedLength / 2 + 0.25, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.25, 0.5, 12]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>
      {/* Exhaust glow */}
      <pointLight position={[-contractedLength / 2 - 0.3, 0, 0]} color="#f97316" intensity={2} distance={1.5} />
      <Html position={[0, 0.5, 0]}>
        <div className="bg-slate-900/80 border border-slate-600 text-slate-300 text-[9px] font-mono px-1.5 py-0.5 rounded pointer-events-none whitespace-nowrap">
          L = L₀/{g.toFixed(2)} = {contractedLength.toFixed(2)}u
        </div>
      </Html>
    </group>
  );
}

// ── main scene ────────────────────────────────────────────────────────────────
function RelScene({ beta, clockSpeed }: { beta: number; clockSpeed: number }) {
  const g = gamma(beta);
  const stationarySpeed = clockSpeed;
  const movingSpeed = clockSpeed / g;

  return (
    <group>
      {/* Grid */}
      <gridHelper args={[14, 14, '#0f172a', '#0f172a']} />

      {/* Stationary clock (Earth frame) */}
      <LightClock
        x={-3} y={-1.2} z={0}
        height={2} beta={0}
        label="Earth Clock" color="#34d399"
        speed={stationarySpeed}
      />

      {/* Moving clock (rocket frame, slower) */}
      <LightClock
        x={3} y={-1.2} z={0}
        height={2} beta={beta}
        label="Rocket Clock (dilated)" color="#f59e0b"
        speed={movingSpeed}
      />

      {/* Moving rocket */}
      <group position={[0, -2.5, 0]}>
        <Rocket beta={beta} />
      </group>

      {/* Divider line */}
      <Line
        points={[new THREE.Vector3(0, -3.5, 0), new THREE.Vector3(0, 3.5, 0)]}
        color="#1e293b" lineWidth={1} dashed dashSize={0.3} gapSize={0.15}
      />

      {/* Labels */}
      <Html position={[-3, 2, 0]}>
        <div className="text-emerald-400 text-[10px] font-semibold pointer-events-none">Stationary</div>
      </Html>
      <Html position={[3, 2, 0]}>
        <div className="text-amber-400 text-[10px] font-semibold pointer-events-none">Moving at {(beta * 100).toFixed(0)}% c</div>
      </Html>
    </group>
  );
}

// ── scenarios ─────────────────────────────────────────────────────────────────
const SCENARIOS = [
  { id: 'pedestrian', label: 'Pedestrian',      description: 'β = 0.01 — imperceptible' },
  { id: 'satellite',  label: 'GPS Satellite',   description: 'β = 0.13 — measurable' },
  { id: 'near_light', label: 'Near Light Speed', description: 'β = 0.99 — extreme effects' },
];

const SCENARIO_BETAS: Record<string, number> = {
  pedestrian: 0.01,
  satellite:  0.13,
  near_light: 0.99,
};

export default function SpecialRelativity() {
  const [beta, setBeta] = useState(0.5);
  const [scenario, setScenario] = useState('custom');
  const [clockSpeed] = useState(1.5);

  const g = gamma(beta);
  const timeDilationFactor = g;
  const lengthContraction = 1 / g;
  const rocketTime = 60 / g;

  const applyScenario = (id: string) => {
    setScenario(id);
    setBeta(SCENARIO_BETAS[id]);
  };

  const chartData = useMemo(() =>
    Array.from({ length: 100 }, (_, i) => {
      const b = 0.01 + (i / 99) * 0.989;
      const g2 = gamma(b);
      return {
        beta: parseFloat(b.toFixed(3)),
        gamma: parseFloat(g2.toFixed(3)),
        timeRatio: parseFloat((1 / g2).toFixed(3)),
      };
    }),
    []
  );

  return (
    <div className="w-full h-full flex overflow-hidden">
      <div className="flex-1 relative min-w-0">
        <Canvas camera={{ position: [0, 0, 10], fov: 50 }} style={{ background: '#030712' }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 8, 5]} intensity={1} />
          <RelScene beta={beta} clockSpeed={clockSpeed} />
          <OrbitControls enablePan={false} minDistance={5} maxDistance={18} />
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

          <ControlSlider
            label="Speed (β = v/c)"
            value={beta}
            min={0.01}
            max={0.999}
            step={0.001}
            color="#f59e0b"
            onChange={v => { setBeta(v); setScenario('custom'); }}
            precision={3}
            formatValue={v => `${(v * 100).toFixed(1)}% c`}
          />

          <DataOverlay
            equation={{ text: 'γ = 1/√(1−β²)', color: '#94a3b8' }}
            readouts={[
              { label: 'Speed (β)', value: `${(beta * 100).toFixed(2)}% c`, color: '#f59e0b', highlight: true },
              { label: 'Lorentz γ', value: g.toFixed(4), color: '#22d3ee', highlight: true },
              { label: 'Time dilation', value: `${timeDilationFactor.toFixed(4)}×`, color: '#34d399' },
              { label: 'Length contraction', value: `${(lengthContraction * 100).toFixed(2)}%`, color: '#f43f5e' },
              { label: 'Rocket time per 60s Earth', value: `${rocketTime.toFixed(2)} s`, color: '#fbbf24' },
              { label: 'Rocket clock rate', value: `1/${g.toFixed(2)} of Earth`, color: '#94a3b8' },
            ]}
          />

          {/* γ vs β chart */}
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-3 pt-2 pb-0">
              <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">γ vs Speed (β)</span>
            </div>
            <ResponsiveContainer width="100%" height={130}>
              <LineChart data={chartData} margin={{ top: 4, right: 10, left: -20, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="beta" tick={{ fontSize: 9, fill: '#475569' }} tickLine={false} domain={[0, 1]} />
                <YAxis tick={{ fontSize: 9, fill: '#475569' }} tickLine={false} domain={[1, 8]} />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 6, fontSize: 10 }}
                  formatter={(v: number, name: string) => [v.toFixed(3), name === 'gamma' ? 'γ' : 'τ/T']}
                />
                <ReferenceLine x={beta} stroke="#f59e0b" strokeDasharray="3 3" strokeWidth={1.5} />
                <RLine type="monotone" dataKey="gamma" stroke="#22d3ee" strokeWidth={2} dot={false} isAnimationActive={false} />
                <RLine type="monotone" dataKey="timeRatio" stroke="#34d399" strokeWidth={1.5} dot={false} isAnimationActive={false} strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
            <div className="px-3 pb-2 flex gap-3 text-[9px]">
              <span className="text-cyan-400">— γ (gamma)</span>
              <span className="text-emerald-400">-- τ/T (clock ratio)</span>
            </div>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-3 text-[11px] text-gray-400 space-y-1">
            <p>The <span className="text-amber-300 font-semibold">yellow (rocket) clock ticks slower</span> than the green Earth clock. This is real — GPS satellites must correct for it daily!</p>
            <p>At β = 0.99: <span className="text-cyan-300">{gamma(0.99).toFixed(2)}×</span> time dilation — 1 second on rocket = {gamma(0.99).toFixed(2)} seconds on Earth.</p>
          </div>

        </div>
      </div>
    </div>
  );
}
