import { useState, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Line, Text, Html } from '@react-three/drei';
import { LineChart, Line as RLine, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import * as THREE from 'three';
import ControlSlider from '../../components/ControlSlider';
import ScenarioSelect from '../../components/ScenarioSelect';
import DataOverlay from '../../components/DataOverlay';

// ── math helpers ──────────────────────────────────────────────────────────────
function discriminant(a: number, b: number, c: number) { return b * b - 4 * a * c; }
function vertexX(a: number, b: number) { return a !== 0 ? -b / (2 * a) : 0; }
function vertexY(a: number, b: number, c: number) { const vx = vertexX(a, b); return a * vx * vx + b * vx + c; }
function roots(a: number, b: number, c: number): number[] {
  if (a === 0) return [];
  const disc = discriminant(a, b, c);
  if (disc < 0) return [];
  if (disc === 0) return [-b / (2 * a)];
  const sq = Math.sqrt(disc);
  return [(-b - sq) / (2 * a), (-b + sq) / (2 * a)];
}

const SCENARIOS = [
  { id: 'standard', label: 'Standard Form', icon: '📐', description: 'y = ax² + bx + c — most common form' },
  { id: 'vertex',   label: 'Vertex View',   icon: '⬆️', description: 'Focus on the turning point' },
  { id: 'roots',    label: 'Roots View',    icon: '🎯', description: 'Where does y = 0? Find the x-intercepts' },
];

// ── 3D scene ─────────────────────────────────────────────────────────────────
function ParabolaScene({ a, b, c, scenario }: { a: number; b: number; c: number; scenario: string }) {
  const vx = vertexX(a, b);
  const vy = vertexY(a, b, c);
  const rs = roots(a, b, c);
  const disc = discriminant(a, b, c);

  // curve points
  const curvePts: THREE.Vector3[] = [];
  for (let i = 0; i <= 120; i++) {
    const x = -5 + (i / 120) * 10;
    const y = a * x * x + b * x + c;
    if (Math.abs(y) < 8) curvePts.push(new THREE.Vector3(x, y, 0));
  }

  // axis of symmetry
  const symPts: THREE.Vector3[] = [new THREE.Vector3(vx, -6, 0), new THREE.Vector3(vx, 8, 0)];

  return (
    <group>
      {/* Grid */}
      {[-4, -2, 0, 2, 4].map(v => (
        <group key={v}>
          <Line points={[[-5, v, -0.1], [5, v, -0.1]]} color="#0f172a" lineWidth={1} />
          <Line points={[[v, -5, -0.1], [v, 5, -0.1]]} color="#0f172a" lineWidth={1} />
        </group>
      ))}
      {/* Axes */}
      <Line points={[[-5.5, 0, 0], [5.5, 0, 0]]} color="#1e293b" lineWidth={2} />
      <Line points={[[0, -5.5, 0], [0, 5.5, 0]]} color="#1e293b" lineWidth={2} />
      <Text position={[5.5, 0.3, 0]} fontSize={0.2} color="#334155">x</Text>
      <Text position={[0.3, 5.5, 0]} fontSize={0.2} color="#334155">y</Text>

      {/* Axis of symmetry (always) */}
      {curvePts.length >= 2 && (
        <Line points={symPts} color="#334155" lineWidth={1} dashed dashSize={0.25} gapSize={0.12} />
      )}

      {/* Parabola curve */}
      {curvePts.length >= 2 && (
        <Line points={curvePts} color="#22d3ee" lineWidth={3} />
      )}

      {/* Vertex glow sphere */}
      {Math.abs(vy) < 7 && (
        <>
          <mesh position={[vx, vy, 0.15]}>
            <sphereGeometry args={[0.18, 16, 16]} />
            <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={1.2} />
          </mesh>
          <pointLight position={[vx, vy, 0.8]} color="#f59e0b" intensity={4} distance={3} />
          {(scenario === 'vertex' || scenario === 'standard') && (
            <Html position={[vx + 0.25, vy + 0.35, 0.2]}>
              <div className="bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-mono px-2 py-0.5 rounded-lg whitespace-nowrap pointer-events-none">
                V ({vx.toFixed(2)}, {vy.toFixed(2)})
              </div>
            </Html>
          )}
        </>
      )}

      {/* X-intercept dashed drop lines + labels */}
      {scenario === 'roots' && rs.map((r, i) => (
        <group key={i}>
          <Line
            points={[new THREE.Vector3(r, 0, 0.1), new THREE.Vector3(r, a * r * r + b * r + c, 0.1)]}
            color="#f43f5e"
            lineWidth={2}
            dashed
            dashSize={0.2}
            gapSize={0.1}
          />
          <mesh position={[r, 0, 0.2]}>
            <sphereGeometry args={[0.14, 12, 12]} />
            <meshStandardMaterial color="#f43f5e" emissive="#f43f5e" emissiveIntensity={0.8} />
          </mesh>
          <Html position={[r + 0.1, 0.4, 0.2]}>
            <div className="bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] font-mono px-2 py-0.5 rounded-lg whitespace-nowrap pointer-events-none">
              x = {r.toFixed(2)}
            </div>
          </Html>
        </group>
      ))}

      {/* Y-intercept */}
      <mesh position={[0, c, 0.15]}>
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshStandardMaterial color="#34d399" emissive="#34d399" emissiveIntensity={0.8} />
      </mesh>

      {/* Equation label */}
      <Html position={[-5, 6.5, 0]}>
        <div className="text-white font-mono text-sm bg-gray-950/80 px-2 py-1 rounded-lg border border-gray-700 whitespace-nowrap pointer-events-none">
          y = {a}x² {b >= 0 ? '+' : ''}{b}x {c >= 0 ? '+' : ''}{c}
        </div>
      </Html>
    </group>
  );
}

// ── recharts tooltip ──────────────────────────────────────────────────────────
function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-white">
      <p>x = {payload[0]?.payload?.x?.toFixed(2)}</p>
      <p className="text-cyan-400">y = {payload[0]?.value?.toFixed(3)}</p>
    </div>
  );
}

// ── main ─────────────────────────────────────────────────────────────────────
export default function Parabolas() {
  const [a, setA] = useState(1);
  const [b, setB] = useState(0);
  const [c, setC] = useState(-2);
  const [scenario, setScenario] = useState('standard');

  const vx = vertexX(a, b);
  const vy = vertexY(a, b, c);
  const rs = roots(a, b, c);
  const disc = discriminant(a, b, c);

  const chartData = useMemo(() =>
    Array.from({ length: 101 }, (_, i) => {
      const x = -5 + i * 0.1;
      return { x: parseFloat(x.toFixed(2)), y: parseFloat((a * x * x + b * x + c).toFixed(3)) };
    }).filter(p => Math.abs(p.y) < 20),
    [a, b, c]
  );

  const applyScenario = (id: string) => {
    setScenario(id);
    if (id === 'vertex') { setA(1); setB(-4); setC(3); }
    if (id === 'roots')  { setA(1); setB(-1); setC(-6); }
    if (id === 'standard') { setA(1); setB(0); setC(-2); }
  };

  return (
    <div className="w-full h-full flex overflow-hidden">
      {/* 3D */}
      <div className="flex-1 relative min-w-0">
        <Canvas camera={{ position: [0, 1, 13], fov: 42 }} style={{ background: '#030712' }}>
          <ambientLight intensity={0.4} />
          <directionalLight position={[5, 8, 6]} intensity={1} />
          <ParabolaScene a={a} b={b} c={c} scenario={scenario} />
          <OrbitControls enablePan={false} minDistance={5} maxDistance={22} />
        </Canvas>
      </div>

      {/* Right panel */}
      <div className="w-72 flex-shrink-0 bg-gray-950 border-l border-gray-800 overflow-y-auto scrollbar-thin">
        <div className="p-3 space-y-4">

          <ScenarioSelect label="View Mode" scenarios={SCENARIOS} value={scenario} onChange={applyScenario} color="cyan" />

          <ControlSlider label="a (opens up/down, width)" value={a} min={-4} max={4} step={0.1} color="#22d3ee" onChange={v => setA(v || 0.01)} precision={1} />
          <ControlSlider label="b (tilts/shifts)" value={b} min={-6} max={6} step={0.1} color="#f59e0b" onChange={setB} precision={1} />
          <ControlSlider label="c (y-intercept)" value={c} min={-6} max={6} step={0.1} color="#34d399" onChange={setC} precision={1} />

          <DataOverlay
            equation={{ text: `y = ${a}x² ${b >= 0 ? '+' : ''}${b}x ${c >= 0 ? '+' : ''}${c}`, color: '#22d3ee' }}
            readouts={[
              { label: 'Vertex x',       value: vx.toFixed(3), color: '#f59e0b', highlight: true },
              { label: 'Vertex y',       value: vy.toFixed(3), color: '#f59e0b', highlight: true },
              { label: 'Discriminant',   value: disc.toFixed(2), color: disc > 0 ? '#34d399' : disc === 0 ? '#f59e0b' : '#f43f5e' },
              { label: 'Roots',          value: rs.length === 0 ? 'None (complex)' : rs.map(r => r.toFixed(2)).join(', '),
                color: rs.length > 0 ? '#f43f5e' : '#64748b' },
              { label: 'Y-intercept',    value: c.toFixed(2), color: '#34d399' },
              { label: 'Opens',          value: a > 0 ? 'Upward ∪' : a < 0 ? 'Downward ∩' : 'Flat line', color: '#94a3b8' },
              { label: 'Axis of sym.',   value: `x = ${vx.toFixed(2)}`, color: '#334155' },
            ]}
          />

          {/* Live recharts graph */}
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-3 pt-2 pb-1">
              <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Live Graph</span>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={chartData} margin={{ top: 4, right: 12, left: -20, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="x" tick={{ fontSize: 9, fill: '#475569' }} tickLine={false} domain={[-5, 5]} type="number" />
                <YAxis tick={{ fontSize: 9, fill: '#475569' }} tickLine={false} domain={[-6, 8]} />
                <Tooltip content={<ChartTooltip />} />
                <ReferenceLine y={0} stroke="#334155" strokeDasharray="3 3" />
                <ReferenceLine x={vx} stroke="#f59e0b" strokeDasharray="3 3" strokeWidth={1.5} />
                {rs.map((r, i) => (
                  <ReferenceLine key={i} x={r} stroke="#f43f5e" strokeDasharray="3 3" strokeWidth={1} />
                ))}
                <RLine type="monotone" dataKey="y" stroke="#22d3ee" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Insight */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-3 text-[11px] text-gray-400 space-y-1">
            {disc > 0 && <p><span className="text-emerald-400 font-semibold">2 real roots</span> — crosses x-axis twice</p>}
            {disc === 0 && <p><span className="text-amber-400 font-semibold">1 real root</span> — vertex touches x-axis</p>}
            {disc < 0 && <p><span className="text-rose-400 font-semibold">No real roots</span> — never crosses x-axis</p>}
            <p>Vertex at <span className="text-amber-300">({vx.toFixed(2)}, {vy.toFixed(2)})</span> is the {a > 0 ? 'minimum' : 'maximum'}</p>
          </div>

        </div>
      </div>
    </div>
  );
}
