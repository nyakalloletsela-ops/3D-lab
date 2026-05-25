import { useState, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Line, Text } from '@react-three/drei';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, LineChart, Line as RLine } from 'recharts';
import * as THREE from 'three';
import ControlSlider from '../../components/ControlSlider';
import ScenarioSelect from '../../components/ScenarioSelect';
import DataOverlay from '../../components/DataOverlay';

// ── function definitions ──────────────────────────────────────────────────────
type FuncId = 'x2' | 'sinx' | 'ex' | 'x3';

const FUNCTIONS: Record<FuncId, { label: string; fn: (x: number) => number; integral: (a: number, b: number) => number; display: string }> = {
  x2:   { label: 'x²',    display: 'f(x) = x²',    fn: x => x * x,            integral: (a, b) => b**3/3 - a**3/3 },
  sinx: { label: 'sin(x)', display: 'f(x) = sin(x)', fn: x => Math.sin(x),     integral: (a, b) => -Math.cos(b) + Math.cos(a) },
  ex:   { label: 'eˣ',    display: 'f(x) = eˣ',    fn: x => Math.exp(x),       integral: (a, b) => Math.exp(b) - Math.exp(a) },
  x3:   { label: 'x³−2x', display: 'f(x) = x³−2x', fn: x => x**3 - 2*x,       integral: (a, b) => (b**4/4 - b**2) - (a**4/4 - a**2) },
};

const METHODS = [
  { id: 'left',  label: 'Left Endpoint',  icon: '⬅', description: 'Rectangle height = f(left edge)' },
  { id: 'right', label: 'Right Endpoint', icon: '➡', description: 'Rectangle height = f(right edge)' },
  { id: 'mid',   label: 'Midpoint',       icon: '⬆', description: 'Rectangle height = f(midpoint) — most accurate' },
];

// ── compute riemann sum ───────────────────────────────────────────────────────
function riemannSum(fn: (x: number) => number, a: number, b: number, n: number, method: string): number {
  const dx = (b - a) / n;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const xL = a + i * dx;
    const xR = xL + dx;
    const xM = (xL + xR) / 2;
    const x = method === 'left' ? xL : method === 'right' ? xR : xM;
    sum += fn(x) * dx;
  }
  return sum;
}

// ── 3D scene ─────────────────────────────────────────────────────────────────
function RiemannScene({ funcId, n, method }: { funcId: FuncId; n: number; method: string }) {
  const { fn } = FUNCTIONS[funcId];
  const A = 0, B = 4;
  const dx = (B - A) / n;

  const curvePts: THREE.Vector3[] = [];
  for (let i = 0; i <= 100; i++) {
    const x = A + (i / 100) * (B - A);
    const y = fn(x);
    if (Math.abs(y) < 8) curvePts.push(new THREE.Vector3(x - 2, y, 0));
  }

  const colors = ['#22d3ee', '#34d399', '#f59e0b', '#f43f5e', '#a78bfa', '#60a5fa'];

  return (
    <group>
      {/* Axes */}
      <Line points={[[-2.5, 0, 0], [2.5, 0, 0]]} color="#334155" lineWidth={2} />
      <Line points={[[-2, -1.5, 0], [-2, 6, 0]]} color="#334155" lineWidth={2} />

      {/* Rectangles */}
      {Array.from({ length: n }).map((_, i) => {
        const xL = A + i * dx;
        const xR = xL + dx;
        const xM = (xL + xR) / 2;
        const xSample = method === 'left' ? xL : method === 'right' ? xR : xM;
        const height = fn(xSample);
        if (!isFinite(height) || Math.abs(height) > 8) return null;
        const rectX = xL + dx / 2 - 2;
        const rectY = height / 2;
        const color = colors[i % colors.length];
        return (
          <mesh key={i} position={[rectX, height >= 0 ? rectY : rectY, 0]}>
            <boxGeometry args={[dx - 0.01, Math.abs(height), 0.35]} />
            <meshStandardMaterial color={color} transparent opacity={0.7} />
          </mesh>
        );
      })}

      {/* Curve */}
      {curvePts.length >= 2 && <Line points={curvePts} color="#fff" lineWidth={3} />}

      {/* Labels */}
      <Text position={[0, 6.2, 0]} fontSize={0.28} color="#94a3b8" anchorX="center">
        {FUNCTIONS[funcId].display} · {n} rectangles · {method}
      </Text>
    </group>
  );
}

// ── error convergence data ────────────────────────────────────────────────────
function useConvergenceData(funcId: FuncId, method: string) {
  const { fn, integral } = FUNCTIONS[funcId];
  const exact = integral(0, 4);
  return useMemo(() =>
    [2, 4, 8, 16, 32, 64, 128].map(n => ({
      n,
      error: Math.abs(riemannSum(fn, 0, 4, n, method) - exact),
    })),
    [fn, exact, method]
  );
}

export default function RiemannSums() {
  const [n, setN] = useState(6);
  const [funcId, setFuncId] = useState<FuncId>('x2');
  const [method, setMethod] = useState('mid');

  const { fn, integral, display } = FUNCTIONS[funcId];
  const exact = integral(0, 4);
  const estimated = riemannSum(fn, 0, 4, n, method);
  const error = Math.abs(estimated - exact);
  const errorPct = Math.abs((estimated - exact) / (exact || 1)) * 100;
  const convergence = useConvergenceData(funcId, method);

  const funcOptions = (Object.keys(FUNCTIONS) as FuncId[]).map(k => ({
    id: k, label: FUNCTIONS[k].label, description: FUNCTIONS[k].display,
  }));

  return (
    <div className="w-full h-full flex overflow-hidden">
      <div className="flex-1 relative min-w-0">
        <Canvas camera={{ position: [0, 2, 10], fov: 42 }} style={{ background: '#030712' }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 8, 5]} intensity={1} />
          <RiemannScene funcId={funcId} n={n} method={method} />
          <OrbitControls enablePan={false} minDistance={5} maxDistance={18} />
        </Canvas>
      </div>

      <div className="w-72 flex-shrink-0 bg-gray-950 border-l border-gray-800 overflow-y-auto scrollbar-thin">
        <div className="p-3 space-y-4">

          <ScenarioSelect label="Method" scenarios={METHODS} value={method} onChange={setMethod} color="cyan" />

          <div>
            <p className="text-[10px] text-gray-600 font-semibold uppercase tracking-wider mb-1.5">Function</p>
            <div className="grid grid-cols-2 gap-1.5">
              {funcOptions.map(f => (
                <button key={f.id} onClick={() => setFuncId(f.id as FuncId)}
                  className={`px-2 py-1.5 rounded-lg text-xs font-semibold border transition-all ${funcId === f.id ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300' : 'border-gray-800 text-gray-500 hover:text-gray-300 hover:bg-gray-800'}`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <ControlSlider label="Rectangles (n)" value={n} min={2} max={200} step={1} color="#22d3ee" onChange={setN} precision={0} formatValue={v => `${v} rects`} />

          <DataOverlay
            equation={{ text: `∫₀⁴ ${display} dx`, color: '#94a3b8' }}
            readouts={[
              { label: 'Exact area',     value: exact.toFixed(5),     color: '#34d399', highlight: true },
              { label: `Estimated (n=${n})`, value: estimated.toFixed(5), color: '#22d3ee', highlight: true },
              { label: 'Absolute error', value: error.toFixed(6),     color: error < 0.01 ? '#34d399' : '#f59e0b' },
              { label: 'Error %',        value: `${errorPct.toFixed(3)}%`, color: errorPct < 1 ? '#34d399' : '#f43f5e' },
              { label: 'Method',         value: method.charAt(0).toUpperCase() + method.slice(1) },
            ]}
          />

          {/* Error vs n chart */}
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-3 pt-2">
              <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Error Convergence (n → ∞)</span>
            </div>
            <ResponsiveContainer width="100%" height={130}>
              <LineChart data={convergence} margin={{ top: 4, right: 12, left: -20, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="n" tick={{ fontSize: 9, fill: '#475569' }} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#475569' }} tickLine={false} tickFormatter={v => v.toFixed(2)} />
                <Tooltip formatter={(v: number) => v.toFixed(5)} contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }} />
                <RLine type="monotone" dataKey="error" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 3 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-3 text-[11px] text-gray-400 space-y-1">
            <p>Midpoint rule converges fastest — halving error for each doubling of n</p>
            <p>At <span className="text-white">n = {n}</span>, error is <span className={error < 0.01 ? 'text-emerald-400' : 'text-amber-400'}>{errorPct.toFixed(3)}%</span></p>
          </div>

        </div>
      </div>
    </div>
  );
}
