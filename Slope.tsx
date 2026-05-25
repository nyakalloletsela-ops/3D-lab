import { useState, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Line, Text } from '@react-three/drei';
import * as THREE from 'three';
import LiveChart from '../../components/LiveChart';
import DataOverlay from '../../components/DataOverlay';
import ControlSlider from '../../components/ControlSlider';
import ScenarioSelect from '../../components/ScenarioSelect';

// ── scenario definitions ──────────────────────────────────────────────────────
interface Scenario {
  id: string;
  label: string;
  icon: string;
  description: string;
  m: number;
  c: number;
  locked?: 'none' | 'm' | 'c';  // which param is locked
}

const SCENARIOS: Scenario[] = [
  { id: 'positive',  label: 'Positive Slope',  icon: '📈', description: 'Line rises left → right', m: 1.5, c: 1, locked: 'none' },
  { id: 'negative',  label: 'Negative Slope',  icon: '📉', description: 'Line falls left → right', m: -1.5, c: 2, locked: 'none' },
  { id: 'zero',      label: 'Zero Slope',       icon: '⟷',  description: 'Horizontal line (y = c)', m: 0, c: 2, locked: 'm' },
  { id: 'steep',     label: 'Steep Slope',      icon: '🏔️', description: 'm > 3: very steep rise',  m: 3.5, c: 0, locked: 'none' },
  { id: 'parallel',  label: 'Parallel Lines',   icon: '∥',  description: 'Same slope, different c', m: 1, c: 0, locked: 'none' },
];

// ── math helpers ──────────────────────────────────────────────────────────────
function lineY(m: number, c: number, x: number) { return m * x + c; }

function findIntersection(m1: number, c1: number, m2: number, c2: number) {
  if (m1 === m2) return null;
  const x = (c2 - c1) / (m1 - m2);
  const y = m1 * x + c1;
  return { x, y };
}

// ── 3D scene ─────────────────────────────────────────────────────────────────
function SlopeScene({
  m,
  c,
  c2,
  showSecond,
  probeX,
}: {
  m: number;
  c: number;
  c2: number;
  showSecond: boolean;
  probeX: number;
}) {
  const X_MIN = -5, X_MAX = 5;
  const GRID_STEP = 1;

  // primary line points
  const linePts: THREE.Vector3[] = [
    new THREE.Vector3(X_MIN, lineY(m, c, X_MIN), 0),
    new THREE.Vector3(X_MAX, lineY(m, c, X_MAX), 0),
  ];

  // secondary line for parallel scenario
  const line2Pts: THREE.Vector3[] = [
    new THREE.Vector3(X_MIN, lineY(m, c2, X_MIN), 0),
    new THREE.Vector3(X_MAX, lineY(m, c2, X_MAX), 0),
  ];

  // probe point
  const py = lineY(m, c, probeX);
  const slopeIndicatorDx = 1;
  const slopeIndicatorDy = m;

  // ramp mesh along the line
  const lineLen = Math.sqrt((X_MAX - X_MIN) ** 2 + (lineY(m, c, X_MAX) - lineY(m, c, X_MIN)) ** 2);
  const rampAngle = Math.atan2(lineY(m, c, X_MAX) - lineY(m, c, X_MIN), X_MAX - X_MIN);
  const midY = lineY(m, c, 0);

  return (
    <group>
      {/* grid */}
      {Array.from({ length: 11 }, (_, i) => i - 5).map(v => (
        <group key={v}>
          <Line points={[[-5, v, -0.05], [5, v, -0.05]]} color="#0f172a" lineWidth={1} />
          <Line points={[[v, -5, -0.05], [v, 5, -0.05]]} color="#0f172a" lineWidth={1} />
        </group>
      ))}

      {/* axes */}
      <Line points={[[-5.5, 0, 0], [5.5, 0, 0]]} color="#1e293b" lineWidth={2} />
      <Line points={[[0, -5.5, 0], [0, 5.5, 0]]} color="#1e293b" lineWidth={2} />
      {/* axis labels */}
      <Text position={[5.5, 0.3, 0]} fontSize={0.22} color="#475569">x</Text>
      <Text position={[0.3, 5.5, 0]} fontSize={0.22} color="#475569">y</Text>

      {/* 3D ramp representing the line */}
      <mesh position={[0, midY, -0.08]} rotation={[0, 0, rampAngle]}>
        <boxGeometry args={[lineLen, 0.1, 0.4]} />
        <meshStandardMaterial color="#22d3ee" emissive="#0891b2" emissiveIntensity={0.35} />
      </mesh>

      {/* primary line */}
      <Line points={linePts} color="#22d3ee" lineWidth={3} />

      {/* secondary (parallel) line */}
      {showSecond && (
        <Line points={line2Pts} color="#f59e0b" lineWidth={2.5} dashed dashSize={0.3} gapSize={0.15} />
      )}

      {/* y-intercept marker */}
      <mesh position={[0, c, 0.1]}>
        <sphereGeometry args={[0.13, 12, 12]} />
        <meshStandardMaterial color="#f43f5e" emissive="#f43f5e" emissiveIntensity={0.8} />
      </mesh>
      <pointLight position={[0, c, 0.5]} color="#f43f5e" intensity={1.5} distance={2} />
      <Text position={[0.35, c + 0.25, 0.1]} fontSize={0.2} color="#f43f5e">y-int = {c.toFixed(1)}</Text>

      {/* probe point */}
      <mesh position={[probeX, py, 0.15]}>
        <sphereGeometry args={[0.15, 12, 12]} />
        <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={1} />
      </mesh>
      <pointLight position={[probeX, py, 0.6]} color="#fbbf24" intensity={2} distance={2} />
      <Text position={[probeX + 0.3, py + 0.3, 0.15]} fontSize={0.2} color="#fbbf24" outlineWidth={0.02} outlineColor="#000">
        ({probeX.toFixed(1)}, {py.toFixed(2)})
      </Text>

      {/* rise / run arrows from probe */}
      {m !== 0 && (
        <>
          {/* run (horizontal) */}
          <Line
            points={[
              new THREE.Vector3(probeX, py, 0.2),
              new THREE.Vector3(probeX + slopeIndicatorDx, py, 0.2),
            ]}
            color="#34d399"
            lineWidth={3}
          />
          {/* rise (vertical) */}
          <Line
            points={[
              new THREE.Vector3(probeX + slopeIndicatorDx, py, 0.2),
              new THREE.Vector3(probeX + slopeIndicatorDx, py + slopeIndicatorDy, 0.2),
            ]}
            color="#f97316"
            lineWidth={3}
          />
          <Text position={[probeX + 0.5, py - 0.3, 0.2]} fontSize={0.18} color="#34d399">run=1</Text>
          <Text position={[probeX + slopeIndicatorDx + 0.2, py + slopeIndicatorDy / 2, 0.2]} fontSize={0.18} color="#f97316">
            rise={m.toFixed(1)}
          </Text>
        </>
      )}

      {/* equation */}
      <Text
        position={[-5, 5.6, 0]}
        fontSize={0.32}
        color="#fff"
        outlineWidth={0.03}
        outlineColor="#000"
      >
        {`y = ${m === 0 ? '' : m === 1 ? '' : m === -1 ? '−' : `${m}·`}x ${c >= 0 ? '+' : ''}${c.toFixed(1)}`}
      </Text>
    </group>
  );
}

// ── main component ────────────────────────────────────────────────────────────
export default function Slope() {
  const [scenarioId, setScenarioId] = useState('positive');
  const [m, setM] = useState(1.5);
  const [c, setC] = useState(1.0);
  const [c2, setC2] = useState(-1.0);   // second line intercept for parallel scenario
  const [probeX, setProbeX] = useState(2.0);

  const scenario = SCENARIOS.find(s => s.id === scenarioId)!;
  const showSecond = scenarioId === 'parallel';

  // apply scenario presets
  const applyScenario = (id: string) => {
    setScenarioId(id);
    const s = SCENARIOS.find(sc => sc.id === id)!;
    setM(s.m);
    setC(s.c);
  };

  const py = lineY(m, c, probeX);

  // chart: y = mx + c across x range
  const linePlotPts = useMemo(() =>
    Array.from({ length: 101 }, (_, i) => {
      const x = -5 + i * 0.1;
      return { x, y: lineY(m, c, x) };
    }), [m, c]);

  const line2PlotPts = useMemo(() =>
    Array.from({ length: 101 }, (_, i) => {
      const x = -5 + i * 0.1;
      return { x, y: lineY(m, c2, x) };
    }), [m, c2]);

  // slope comparison chart: slope angle effect
  const slopeAngle = (Math.atan(m) * 180) / Math.PI;

  return (
    <div className="w-full h-full flex overflow-hidden">
      {/* 3D */}
      <div className="flex-1 relative min-w-0">
        <Canvas camera={{ position: [0, 0, 12], fov: 42 }} style={{ background: '#030712' }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 8, 6]} intensity={1} />
          <SlopeScene m={m} c={c} c2={c2} showSecond={showSecond} probeX={probeX} />
          <OrbitControls enablePan={false} minDistance={6} maxDistance={20} />
        </Canvas>
      </div>

      {/* right panel */}
      <div className="w-72 flex-shrink-0 bg-gray-950 border-l border-gray-800 flex flex-col overflow-y-auto scrollbar-thin">
        <div className="p-3 space-y-4">

          <ScenarioSelect
            label="Line Scenario"
            scenarios={SCENARIOS}
            value={scenarioId}
            onChange={applyScenario}
            color="cyan"
          />

          <ControlSlider
            label="Slope (m)"
            value={m}
            min={-5}
            max={5}
            step={0.1}
            color="#22d3ee"
            onChange={setM}
            precision={1}
            formatValue={v => v === 0 ? '0 (flat)' : v > 0 ? `+${v.toFixed(1)} ↗` : `${v.toFixed(1)} ↘`}
          />

          <ControlSlider
            label="Y-Intercept (c)"
            value={c}
            min={-5}
            max={5}
            step={0.1}
            color="#f43f5e"
            onChange={setC}
            precision={1}
          />

          {showSecond && (
            <ControlSlider
              label="2nd Line Y-Intercept (c₂)"
              value={c2}
              min={-5}
              max={5}
              step={0.1}
              color="#f59e0b"
              onChange={setC2}
              precision={1}
            />
          )}

          <ControlSlider
            label="Probe point (x)"
            value={probeX}
            min={-4.5}
            max={4.5}
            step={0.1}
            color="#fbbf24"
            onChange={setProbeX}
            precision={1}
          />

          <DataOverlay
            equation={{ text: `y = ${m.toFixed(1)}x ${c >= 0 ? '+' : ''}${c.toFixed(1)}`, color: '#22d3ee' }}
            readouts={[
              { label: 'Slope (m)',          value: m.toFixed(2),              color: '#22d3ee', highlight: true },
              { label: 'Y-intercept (c)',     value: c.toFixed(2),              color: '#f43f5e' },
              { label: 'Angle of incline',    value: `${slopeAngle.toFixed(1)}`, unit: '°' },
              { label: 'Probe x',             value: probeX.toFixed(1) },
              { label: 'Probe y = mx+c',      value: py.toFixed(3),              color: '#fbbf24', highlight: true },
              ...(showSecond ? [
                { label: '2nd intercept c₂',   value: c2.toFixed(2),            color: '#f59e0b' },
                { label: 'Gap (c − c₂)',        value: (c - c2).toFixed(2) },
                { label: 'Parallel?',           value: 'Yes (same slope!)',      color: '#34d399' },
              ] : []),
              { label: 'Rises/run ratio',     value: `${m >= 0 ? '+' : ''}${m.toFixed(2)} per unit x` },
            ]}
          />

          {/* live line chart */}
          <LiveChart
            title="y = mx + c  (live)"
            series={[
              { label: 'primary', color: '#22d3ee', points: linePlotPts },
              ...(showSecond ? [{ label: 'parallel', color: '#f59e0b', points: line2PlotPts, dashed: true }] : []),
            ]}
            markers={[
              { x: 0, y: c,    color: '#f43f5e', label: `c=${c.toFixed(1)}` },
              { x: probeX, y: py, color: '#fbbf24', label: `(${probeX.toFixed(1)},${py.toFixed(1)})` },
            ]}
            xLabel="x"
            yLabel="y"
            xMin={-5}
            xMax={5}
            yMin={-6}
            yMax={6}
            width={252}
            height={160}
          />

          {/* insight card */}
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-3 text-[11px] text-gray-400 leading-relaxed">
            {m > 0 && <p><span className="text-cyan-400 font-semibold">Positive slope:</span> every step right, y increases by <span className="text-white">{m.toFixed(1)}</span></p>}
            {m < 0 && <p><span className="text-rose-400 font-semibold">Negative slope:</span> every step right, y decreases by <span className="text-white">{Math.abs(m).toFixed(1)}</span></p>}
            {m === 0 && <p><span className="text-gray-300 font-semibold">Zero slope:</span> perfectly horizontal — y never changes</p>}
            {showSecond && <p className="mt-1"><span className="text-amber-400 font-semibold">Parallel lines</span> have identical slopes but different y-intercepts — they never meet!</p>}
          </div>

        </div>
      </div>
    </div>
  );
}
