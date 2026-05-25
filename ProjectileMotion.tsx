import { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line, Text } from '@react-three/drei';
import * as THREE from 'three';
import LiveChart from '../../components/LiveChart';
import DataOverlay from '../../components/DataOverlay';
import ControlSlider from '../../components/ControlSlider';
import ScenarioSelect from '../../components/ScenarioSelect';

// ── physics ──────────────────────────────────────────────────────────────────
interface GravityScenario {
  id: string;
  label: string;
  icon: string;
  g: number;
  description: string;
}

const GRAVITY_SCENARIOS: GravityScenario[] = [
  { id: 'earth', label: 'Earth',  icon: '🌍', g: 9.81,  description: 'g = 9.81 m/s²' },
  { id: 'moon',  label: 'Moon',   icon: '🌕', g: 1.62,  description: 'g = 1.62 m/s² — 6× weaker!' },
  { id: 'mars',  label: 'Mars',   icon: '🔴', g: 3.72,  description: 'g = 3.72 m/s²' },
  { id: 'jupiter', label: 'Jupiter', icon: '🟠', g: 24.79, description: 'g = 24.79 m/s² — crushing!' },
];

function projectile(v0: number, angleDeg: number, g: number, t: number) {
  const rad = (angleDeg * Math.PI) / 180;
  const vx = v0 * Math.cos(rad);
  const vy = v0 * Math.sin(rad);
  const x = vx * t;
  const y = vy * t - 0.5 * g * t * t;
  const vyt = vy - g * t;
  const speed = Math.sqrt(vx * vx + vyt * vyt);
  return { x, y, vx, vy: vyt, speed };
}

function flightTime(v0: number, angleDeg: number, g: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return (2 * v0 * Math.sin(rad)) / g;
}

function maxRange(v0: number, angleDeg: number, g: number) {
  const tf = flightTime(v0, angleDeg, g);
  const rad = (angleDeg * Math.PI) / 180;
  return v0 * Math.cos(rad) * tf;
}

function maxHeight(v0: number, angleDeg: number, g: number) {
  const rad = (angleDeg * Math.PI) / 180;
  const vy0 = v0 * Math.sin(rad);
  return (vy0 * vy0) / (2 * g);
}

// ── arrow helper ──────────────────────────────────────────────────────────────
function Arrow({ from, to, color, label }: {
  from: [number, number, number];
  to: [number, number, number];
  color: string;
  label: string;
}) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.05) return null;
  const angle = Math.atan2(dy, dx);
  return (
    <group>
      <Line points={[from, to]} color={color} lineWidth={3.5} />
      <mesh position={to} rotation={[0, 0, angle - Math.PI / 2]}>
        <coneGeometry args={[0.08, 0.24, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
      </mesh>
      <Text position={[to[0] + 0.15, to[1] + 0.15, 0]} fontSize={0.2} color={color} outlineWidth={0.02} outlineColor="#000">
        {label}
      </Text>
    </group>
  );
}

// ── build trajectory path ─────────────────────────────────────────────────────
function buildPath(v0: number, angleDeg: number, g: number): THREE.Vector3[] {
  const tf = flightTime(v0, angleDeg, g);
  const pts: THREE.Vector3[] = [];
  const STEPS = 80;
  for (let i = 0; i <= STEPS; i++) {
    const t = (i / STEPS) * tf;
    const p = projectile(v0, angleDeg, g, t);
    if (p.y < -0.5) break;
    // scale down for scene: divide x by 2, y by 2
    pts.push(new THREE.Vector3(p.x / 2 - 5, p.y / 2, 0));
  }
  return pts;
}

// ── animator ─────────────────────────────────────────────────────────────────
function Animator({
  playing,
  totalTime,
  onT,
}: {
  playing: boolean;
  totalTime: number;
  onT: (t: number) => void;
}) {
  const tRef = useRef(0);
  useFrame((_, delta) => {
    if (!playing) return;
    tRef.current += delta;
    if (tRef.current > totalTime + 0.3) tRef.current = 0;
    onT(tRef.current);
  });
  return null;
}

// ── 3D scene ─────────────────────────────────────────────────────────────────
function ProjectileScene({
  v0,
  angleDeg,
  g,
  currentT,
}: {
  v0: number;
  angleDeg: number;
  g: number;
  currentT: number;
}) {
  const tf = flightTime(v0, angleDeg, g);
  const t = Math.min(currentT, tf);
  const pos = projectile(v0, angleDeg, g, t);
  const sceneX = pos.x / 2 - 5;
  const sceneY = Math.max(pos.y / 2, 0);
  const path = buildPath(v0, angleDeg, g);

  const scaleV = 0.18;
  const bx = sceneX as number;
  const by = sceneY as number;

  return (
    <group>
      {/* ground */}
      <mesh position={[0, -0.06, 0]}>
        <boxGeometry args={[20, 0.12, 2.5]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>

      {/* ghost trajectory */}
      {path.length >= 2 && (
        <Line points={path} color="#1e3a5f" lineWidth={1.5} dashed dashSize={0.4} gapSize={0.2} />
      )}

      {/* live path so far */}
      {(() => {
        const livePts = buildPath(v0, angleDeg, g).filter(
          p => p.x <= sceneX + 0.1
        );
        return livePts.length >= 2 ? (
          <Line points={livePts} color="#22d3ee" lineWidth={2.5} />
        ) : null;
      })()}

      {/* ball */}
      {pos.y >= -0.5 && (
        <>
          <mesh position={[bx, by, 0]}>
            <sphereGeometry args={[0.22, 16, 16]} />
            <meshStandardMaterial color="#f59e0b" emissive="#d97706" emissiveIntensity={0.6} />
          </mesh>
          <pointLight position={[bx, by, 0.5]} color="#f59e0b" intensity={2} distance={3} />

          {/* vx arrow */}
          <Arrow
            from={[bx, by, 0.1]}
            to={[bx + pos.vx * scaleV, by, 0.1]}
            color="#22d3ee"
            label={`vx=${pos.vx.toFixed(1)}`}
          />

          {/* vy arrow */}
          <Arrow
            from={[bx, by, 0.1]}
            to={[bx, by + pos.vy * scaleV, 0.1]}
            color="#f43f5e"
            label={`vy=${pos.vy.toFixed(1)}`}
          />
        </>
      )}

      {/* launch point marker */}
      <mesh position={[-5, 0.05, 0]}>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshStandardMaterial color="#34d399" emissive="#34d399" emissiveIntensity={0.8} />
      </mesh>
    </group>
  );
}

// ── main component ────────────────────────────────────────────────────────────
export default function ProjectileMotion() {
  const [v0, setV0] = useState(15);
  const [angle, setAngle] = useState(45);
  const [scenarioId, setScenarioId] = useState('earth');
  const [playing, setPlaying] = useState(false);
  const [currentT, setCurrentT] = useState(0);

  const scenario = GRAVITY_SCENARIOS.find(s => s.id === scenarioId)!;
  const g = scenario.g;
  const tf = flightTime(v0, angle, g);
  const range = maxRange(v0, angle, g);
  const hMax = maxHeight(v0, angle, g);
  const pos = projectile(v0, angle, g, Math.min(currentT, tf));

  // reset time when params change
  useEffect(() => {
    setCurrentT(0);
    setPlaying(false);
  }, [v0, angle, scenarioId]);

  // build charts
  const trajectoryPts = (() => {
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i <= 80; i++) {
      const t = (i / 80) * tf;
      const p = projectile(v0, angle, g, t);
      if (p.y < -0.5) break;
      pts.push({ x: p.x, y: p.y });
    }
    return pts;
  })();

  // height vs time
  const heightTimePts: { x: number; y: number }[] = [];
  for (let i = 0; i <= 80; i++) {
    const t = (i / 80) * (tf * 1.02);
    const p = projectile(v0, angle, g, t);
    heightTimePts.push({ x: t, y: Math.max(0, p.y) });
  }

  // speed vs time
  const speedTimePts: { x: number; y: number }[] = [];
  for (let i = 0; i <= 80; i++) {
    const t = (i / 80) * tf;
    const p = projectile(v0, angle, g, t);
    speedTimePts.push({ x: t, y: p.speed });
  }

  // compare gravity sweep (range vs angle for each body)
  const gravitySweep = GRAVITY_SCENARIOS.map(sc => ({
    label: sc.label,
    color:
      sc.id === 'earth' ? '#22d3ee' :
      sc.id === 'moon'  ? '#94a3b8' :
      sc.id === 'mars'  ? '#f87171' : '#f97316',
    points: Array.from({ length: 46 }, (_, i) => {
      const a = i * 2;
      return { x: a, y: maxRange(v0, a || 1, sc.g) };
    }),
  }));

  return (
    <div className="w-full h-full flex overflow-hidden">
      {/* 3D */}
      <div className="flex-1 relative min-w-0">
        <Canvas camera={{ position: [0, 3, 14], fov: 45 }} style={{ background: '#030712' }}>
          <ambientLight intensity={0.4} />
          <directionalLight position={[5, 10, 5]} intensity={1.2} />
          <ProjectileScene v0={v0} angleDeg={angle} g={g} currentT={currentT} />
          <Animator playing={playing} totalTime={tf} onT={setCurrentT} />
          <OrbitControls enablePan={false} minDistance={8} maxDistance={22} />
          <fog attach="fog" args={['#030712', 25, 50]} />
        </Canvas>

        {/* launch button */}
        <div className="absolute top-3 right-3 flex gap-2">
          <button
            onClick={() => { setCurrentT(0); setPlaying(true); }}
            className="px-3 py-1.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-lg text-xs font-bold hover:bg-amber-500/30 transition-colors"
          >
            Launch
          </button>
          <button
            onClick={() => setPlaying(v => !v)}
            className="px-3 py-1.5 bg-gray-800 border border-gray-700 text-gray-300 rounded-lg text-xs font-semibold hover:bg-gray-700 transition-colors"
          >
            {playing ? 'Pause' : 'Resume'}
          </button>
        </div>

        {/* live time overlay */}
        <div className="absolute bottom-3 right-3 bg-gray-950/80 border border-gray-800 rounded-lg px-3 py-1.5 text-xs font-mono pointer-events-none">
          <span className="text-gray-500">t = </span>
          <span className="text-white">{Math.min(currentT, tf).toFixed(2)}</span>
          <span className="text-gray-600"> / {tf.toFixed(2)} s</span>
        </div>
      </div>

      {/* right panel */}
      <div className="w-72 flex-shrink-0 bg-gray-950 border-l border-gray-800 flex flex-col overflow-y-auto scrollbar-thin">
        <div className="p-3 space-y-4">

          <ScenarioSelect
            label="Gravity Environment"
            scenarios={GRAVITY_SCENARIOS}
            value={scenarioId}
            onChange={setScenarioId}
            color="amber"
          />

          <ControlSlider
            label="Initial Speed (v₀)"
            value={v0}
            min={5}
            max={40}
            step={0.5}
            unit=" m/s"
            color="#f59e0b"
            onChange={setV0}
            precision={1}
          />

          <ControlSlider
            label="Launch Angle (θ)"
            value={angle}
            min={5}
            max={85}
            step={1}
            unit="°"
            color="#22d3ee"
            onChange={setAngle}
            precision={0}
          />

          <DataOverlay
            equation={{ text: `y = v₀sinθ·t − ½g·t²`, color: '#94a3b8' }}
            readouts={[
              { label: 'Environment',    value: `${scenario.label} (${g} m/s²)`, color: '#f59e0b' },
              { label: 'v₀',             value: `${v0}`,        unit: 'm/s' },
              { label: 'Angle',          value: `${angle}`,     unit: '°' },
              { label: 'vx (constant)',  value: (v0 * Math.cos(angle * Math.PI / 180)).toFixed(2), unit: 'm/s', color: '#22d3ee' },
              { label: 'vy at launch',   value: (v0 * Math.sin(angle * Math.PI / 180)).toFixed(2), unit: 'm/s', color: '#f43f5e' },
              { label: 'Max height',     value: hMax.toFixed(2), unit: 'm',    highlight: true },
              { label: 'Max range',      value: range.toFixed(2),unit: 'm',    highlight: true },
              { label: 'Flight time',    value: tf.toFixed(3),   unit: 's',    highlight: true },
              { label: '— current t —',  value: Math.min(currentT, tf).toFixed(2), unit: 's',  color: '#f59e0b' },
              { label: 'Current height', value: Math.max(0, pos.y).toFixed(2), unit: 'm' },
              { label: 'Current vy',     value: pos.vy.toFixed(2), unit: 'm/s', color: '#f43f5e' },
              { label: 'Current speed',  value: pos.speed.toFixed(2), unit: 'm/s' },
            ]}
          />

          {/* trajectory chart */}
          <LiveChart
            title="Trajectory (x vs y)"
            series={[{ label: 'path', color: '#22d3ee', points: trajectoryPts }]}
            markers={[
              { x: pos.x, y: Math.max(0, pos.y), color: '#f59e0b', label: '' },
            ]}
            xLabel="x (m)"
            yLabel="y (m)"
            xMin={0}
            xMax={Math.max(range * 1.1, 1)}
            yMin={0}
            yMax={Math.max(hMax * 1.2, 1)}
            width={252}
            height={140}
          />

          {/* height vs time */}
          <LiveChart
            title="Height vs Time"
            series={[{ label: 'height', color: '#f43f5e', points: heightTimePts }]}
            markers={[
              { x: Math.min(currentT, tf), y: Math.max(0, pos.y), color: '#f59e0b', label: '' },
            ]}
            xLabel="t (s)"
            yLabel="h (m)"
            xMin={0}
            xMax={tf * 1.05}
            yMin={0}
            yMax={hMax * 1.2}
            width={252}
            height={120}
          />

          {/* gravity comparison chart */}
          <LiveChart
            title="Range vs Angle — gravity comparison"
            series={gravitySweep}
            markers={[{ x: angle, y: range, color: '#f59e0b', label: '' }]}
            xLabel="angle (°)"
            yLabel="range (m)"
            xMin={0}
            xMax={90}
            yMin={0}
            yMax={undefined}
            width={252}
            height={150}
          />

        </div>
      </div>
    </div>
  );
}
