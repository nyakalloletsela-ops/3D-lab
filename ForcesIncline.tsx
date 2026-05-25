import { useRef, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Text, OrbitControls, Line } from '@react-three/drei';
import * as THREE from 'three';
import LiveChart from '../../components/LiveChart';
import DataOverlay from '../../components/DataOverlay';
import ControlSlider from '../../components/ControlSlider';
import ScenarioSelect from '../../components/ScenarioSelect';

// ── physics ──────────────────────────────────────────────────────────────────
const MASS = 5; // kg

interface Scenario {
  id: string;
  label: string;
  description: string;
  icon: string;
  mu: number;     // coefficient of kinetic friction
  gravity: number;
}

const SCENARIOS: Scenario[] = [
  { id: 'smooth',  label: 'Smooth Floor',  description: 'μ = 0.1 — nearly frictionless surface', icon: '🧊', mu: 0.10, gravity: 9.8 },
  { id: 'wood',    label: 'Wood Ramp',     description: 'μ = 0.35 — typical wooden surface',      icon: '🪵', mu: 0.35, gravity: 9.8 },
  { id: 'rough',   label: 'Rough Carpet',  description: 'μ = 0.65 — high-friction carpet',         icon: '🟫', mu: 0.65, gravity: 9.8 },
  { id: 'moon',    label: 'Moon Gravity',  description: 'μ = 0.35, g = 1.62 m/s²',                icon: '🌕', mu: 0.35, gravity: 1.62 },
];

function computeForces(angleDeg: number, mass: number, g: number, mu: number) {
  const rad = (angleDeg * Math.PI) / 180;
  const W = mass * g;                        // weight
  const N = W * Math.cos(rad);              // normal force
  const Wp = W * Math.sin(rad);             // weight parallel (down slope)
  const fs = mu * N;                         // max static/kinetic friction (up slope)
  const net = Wp - fs;                       // net force down slope (positive = sliding)
  const accel = net / mass;                  // acceleration
  return { W, N, Wp, fs, net, accel };
}

// ── Arrow helper ─────────────────────────────────────────────────────────────
function Arrow3D({
  from,
  to,
  color,
  label,
  labelOffset = [0.1, 0.1, 0] as [number, number, number],
}: {
  from: [number, number, number];
  to: [number, number, number];
  color: string;
  label: string;
  labelOffset?: [number, number, number];
}) {
  const dir = new THREE.Vector3(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
  const len = dir.length();
  if (len < 0.01) return null;
  const angle = Math.atan2(dir.y, dir.x);

  return (
    <group>
      <Line points={[from, to]} color={color} lineWidth={3.5} />
      <mesh position={[to[0], to[1], to[2]]} rotation={[0, 0, angle - Math.PI / 2]}>
        <coneGeometry args={[0.09, 0.28, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
      </mesh>
      <Text
        position={[to[0] + labelOffset[0], to[1] + labelOffset[1], to[2] + labelOffset[2]]}
        fontSize={0.22}
        color={color}
        anchorX="left"
        outlineWidth={0.02}
        outlineColor="#000"
      >
        {label}
      </Text>
    </group>
  );
}

// ── 3D scene ──────────────────────────────────────────────────────────────────
function InclineScene({
  angle,
  forces,
}: {
  angle: number;
  forces: ReturnType<typeof computeForces>;
}) {
  const rad = (angle * Math.PI) / 180;
  const rampL = 5;

  // ramp endpoint in world space
  const rx = rampL * Math.cos(rad);
  const ry = rampL * Math.sin(rad);

  // block sits at 60% up the ramp
  const t = 0.6;
  const bx = rx * t - 0.3 * Math.sin(rad);
  const by = ry * t + 0.3 * Math.cos(rad);

  // force scale: 1 Newton → 0.12 scene units
  const scale = 0.12;
  const { W, N, Wp, fs, net } = forces;

  return (
    <group>
      {/* ground */}
      <mesh position={[rx / 2, -0.08, 0]}>
        <boxGeometry args={[rx + 2, 0.16, 2.4]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>

      {/* ramp surface */}
      <mesh position={[rx / 2, ry / 2, 0]} rotation={[0, 0, rad]}>
        <boxGeometry args={[rampL, 0.18, 2.2]} />
        <meshStandardMaterial color="#334155" />
      </mesh>

      {/* ramp side triangle */}
      <mesh position={[rx / 2, ry / 4, -1.1]}>
        <boxGeometry args={[rx + 0.1, ry / 2, 0.12]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>

      {/* block */}
      <mesh position={[bx, by, 0]} rotation={[0, 0, rad]}>
        <boxGeometry args={[0.72, 0.72, 0.72]} />
        <meshStandardMaterial color="#f59e0b" emissive="#d97706" emissiveIntensity={0.3} />
      </mesh>

      {/* === Force arrows === */}

      {/* Weight (straight down) */}
      <Arrow3D
        from={[bx, by, 0.05]}
        to={[bx, by - W * scale, 0.05]}
        color="#f43f5e"
        label={`W = ${W.toFixed(1)} N`}
        labelOffset={[-1.6, 0, 0]}
      />

      {/* Normal force (perpendicular to ramp = rotated by rad) */}
      <Arrow3D
        from={[bx, by, 0.05]}
        to={[bx + (-Math.sin(rad)) * N * scale, by + Math.cos(rad) * N * scale, 0.05]}
        color="#22d3ee"
        label={`N = ${N.toFixed(1)} N`}
        labelOffset={[0.1, 0.1, 0]}
      />

      {/* Friction (up the ramp) */}
      <Arrow3D
        from={[bx, by, 0.05]}
        to={[bx - Math.cos(rad) * fs * scale, by - Math.sin(rad) * fs * scale, 0.05]}
        color="#34d399"
        label={`f = ${fs.toFixed(1)} N`}
        labelOffset={[-1.6, 0, 0]}
      />

      {/* Parallel weight component (down the ramp) */}
      <Arrow3D
        from={[bx, by, 0.05]}
        to={[bx + Math.cos(rad) * Wp * scale, by + Math.sin(rad) * Wp * scale, 0.05]}
        color="#f97316"
        label={`W∥ = ${Wp.toFixed(1)} N`}
        labelOffset={[0.1, -0.3, 0]}
      />

      {/* Net force indicator (only if significant) */}
      {Math.abs(net) > 0.5 && (
        <Arrow3D
          from={[bx, by, 0.4]}
          to={[
            bx + Math.cos(rad) * net * scale * (net > 0 ? 1 : -1) * 0.8,
            by + Math.sin(rad) * net * scale * (net > 0 ? 1 : -1) * 0.8,
            0.4,
          ]}
          color="#a78bfa"
          label={`Fₙₑₜ = ${Math.abs(net).toFixed(1)} N`}
          labelOffset={[0.05, 0.25, 0]}
        />
      )}

      {/* Angle arc label */}
      <Text position={[0.8, 0.15, 0.1]} fontSize={0.22} color="#f59e0b">{`${angle}°`}</Text>

      {/* Sliding status */}
      <Text
        position={[rx / 2, ry + 0.7, 0]}
        fontSize={0.28}
        color={net > 0.5 ? '#f43f5e' : '#34d399'}
        anchorX="center"
        outlineWidth={0.025}
        outlineColor="#000"
      >
        {net > 0.5 ? `Sliding! a = ${forces.accel.toFixed(2)} m/s²` : 'Stationary'}
      </Text>
    </group>
  );
}

// ── build angle sweep data for chart ─────────────────────────────────────────
function buildSweepData(mass: number, g: number, mu: number) {
  const normalPts: { x: number; y: number }[] = [];
  const parallelPts: { x: number; y: number }[] = [];
  const frictionPts: { x: number; y: number }[] = [];
  for (let a = 0; a <= 90; a += 2) {
    const f = computeForces(a, mass, g, mu);
    normalPts.push({ x: a, y: f.N });
    parallelPts.push({ x: a, y: f.Wp });
    frictionPts.push({ x: a, y: f.fs });
  }
  return { normalPts, parallelPts, frictionPts };
}

// ── main component ────────────────────────────────────────────────────────────
export default function ForcesIncline() {
  const [angle, setAngle] = useState(30);
  const [scenarioId, setScenarioId] = useState<string>('wood');
  const scenario = SCENARIOS.find(s => s.id === scenarioId)!;

  const forces = computeForces(angle, MASS, scenario.gravity, scenario.mu);
  const { normalPts, parallelPts, frictionPts } = buildSweepData(MASS, scenario.gravity, scenario.mu);

  // critical angle where block starts to slide
  const criticalAngle = (Math.atan(scenario.mu) * 180) / Math.PI;

  return (
    <div className="w-full h-full flex overflow-hidden">
      {/* ── 3-D viewport ── */}
      <div className="flex-1 relative min-w-0">
        <Canvas
          camera={{ position: [3, 2.5, 8], fov: 42 }}
          shadows
          style={{ background: '#030712' }}
        >
          <ambientLight intensity={0.4} />
          <directionalLight position={[6, 10, 6]} intensity={1.2} castShadow />
          <InclineScene angle={angle} forces={forces} />
          <OrbitControls enablePan={false} minDistance={5} maxDistance={18} />
          <fog attach="fog" args={['#030712', 20, 40]} />
        </Canvas>

        {/* canvas legend overlay */}
        <div className="absolute bottom-3 left-3 flex flex-col gap-1 pointer-events-none">
          {[
            { color: '#f43f5e', label: 'Weight (W)' },
            { color: '#22d3ee', label: 'Normal (N)' },
            { color: '#34d399', label: 'Friction (f)' },
            { color: '#f97316', label: 'W∥ parallel' },
            { color: '#a78bfa', label: 'Net Force' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 rounded" style={{ background: item.color, boxShadow: `0 0 4px ${item.color}` }} />
              <span className="text-[10px] text-gray-500">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── right panel ── */}
      <div className="w-72 flex-shrink-0 bg-gray-950 border-l border-gray-800 flex flex-col overflow-y-auto scrollbar-thin">
        <div className="p-3 space-y-4">

          {/* scenario switcher */}
          <ScenarioSelect
            label="Surface Scenario"
            scenarios={SCENARIOS}
            value={scenarioId}
            onChange={setScenarioId}
            color="amber"
          />

          {/* angle slider */}
          <ControlSlider
            label="Ramp Angle"
            value={angle}
            min={0}
            max={90}
            step={1}
            unit="°"
            color="#f59e0b"
            onChange={setAngle}
            precision={0}
          />

          {/* live numerical readouts */}
          <DataOverlay
            equation={{ text: `F_net = W∥ − f = ${forces.net.toFixed(2)} N`, color: '#a78bfa' }}
            readouts={[
              { label: 'Mass (m)',           value: `${MASS}`,                 unit: 'kg' },
              { label: 'Gravity (g)',        value: `${scenario.gravity}`,     unit: 'm/s²' },
              { label: 'Friction coeff (μ)', value: `${scenario.mu}`,          unit: '' },
              { label: 'Weight (W)',         value: forces.W.toFixed(2),       unit: 'N',    color: '#f43f5e' },
              { label: 'Normal (N)',         value: forces.N.toFixed(2),       unit: 'N',    color: '#22d3ee' },
              { label: 'W∥ (down slope)',    value: forces.Wp.toFixed(2),      unit: 'N',    color: '#f97316' },
              { label: 'Friction (up slope)',value: forces.fs.toFixed(2),      unit: 'N',    color: '#34d399' },
              { label: 'Net Force',          value: forces.net.toFixed(2),     unit: 'N',    color: '#a78bfa', highlight: true },
              { label: 'Acceleration',       value: forces.accel.toFixed(2),   unit: 'm/s²', highlight: true,
                color: forces.accel > 0.05 ? '#f43f5e' : '#34d399' },
              { label: 'Critical angle',     value: criticalAngle.toFixed(1),  unit: '°',    color: '#f59e0b' },
            ]}
          />

          {/* live force vs angle chart */}
          <LiveChart
            title="Force vs Angle"
            series={[
              { label: 'Normal',   color: '#22d3ee', points: normalPts },
              { label: 'W∥',       color: '#f97316', points: parallelPts },
              { label: 'Friction', color: '#34d399', points: frictionPts, dashed: true },
            ]}
            xLabel="angle (°)"
            yLabel="force (N)"
            xMin={0} xMax={90}
            yMin={0} yMax={MASS * scenario.gravity * 1.05}
            markers={[
              { x: angle, y: forces.N,  color: '#22d3ee', label: '' },
              { x: angle, y: forces.Wp, color: '#f97316', label: '' },
              { x: angle, y: forces.fs, color: '#34d399', label: '' },
              { x: criticalAngle, y: 0, color: '#f59e0b', label: `${criticalAngle.toFixed(0)}°` },
            ]}
            width={252}
            height={160}
          />

          {/* angle status */}
          <div className={`rounded-lg border px-3 py-2 text-xs font-semibold text-center ${
            angle >= criticalAngle
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          }`}>
            {angle >= criticalAngle
              ? `Block slides! (θ > ${criticalAngle.toFixed(1)}°)`
              : `Block stays (θ < ${criticalAngle.toFixed(1)}° critical angle)`}
          </div>

        </div>
      </div>
    </div>
  );
}
