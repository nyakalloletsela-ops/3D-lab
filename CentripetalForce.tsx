import { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import { LineChart, Line as RLine, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import ControlSlider from '../../components/ControlSlider';
import ScenarioSelect from '../../components/ScenarioSelect';
import DataOverlay from '../../components/DataOverlay';

// ── scenarios ─────────────────────────────────────────────────────────────────
const SCENARIOS = [
  { id: 'constant',    label: 'Constant Speed',   description: 'Steady circular motion' },
  { id: 'accelerating', label: 'Accelerating',    description: 'Speed increasing over time' },
  { id: 'snap',        label: 'Snap Wire!',        description: 'Wire breaks when Fc exceeds limit' },
];

// ── 3D scene ──────────────────────────────────────────────────────────────────
function SpinScene({
  speed, radius, mass, scenario,
  onBreak,
}: {
  speed: number; radius: number; mass: number; scenario: string;
  onBreak: () => void;
}) {
  const ballRef = useRef<THREE.Group>(null);
  const angle = useRef(0);
  const accelRef = useRef(0);
  const brokenRef = useRef(false);
  const flightRef = useRef<{ vx: number; vy: number } | null>(null);
  const flightPos = useRef<THREE.Vector3>(new THREE.Vector3());
  const [broken, setBroken] = useState(false);

  const circlePoints: THREE.Vector3[] = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      pts.push(new THREE.Vector3(radius * Math.cos(a), radius * Math.sin(a), 0));
    }
    return pts;
  }, [radius]);

  const FC_LIMIT = 30;

  useFrame((_, delta) => {
    if (!ballRef.current) return;

    if (brokenRef.current && flightRef.current) {
      flightRef.current.vy -= 9.8 * delta * 0.1;
      flightPos.current.x += flightRef.current.vx * delta;
      flightPos.current.y += flightRef.current.vy * delta;
      ballRef.current.position.set(flightPos.current.x, flightPos.current.y, 0);
      return;
    }

    if (scenario === 'accelerating') accelRef.current += delta * 0.3;
    else accelRef.current = 0;

    const currentSpeed = speed + accelRef.current;
    angle.current += delta * currentSpeed;

    const fc = mass * currentSpeed * currentSpeed / radius;
    if (scenario === 'snap' && fc > FC_LIMIT && !brokenRef.current) {
      brokenRef.current = true;
      setBroken(true);
      const vx = -currentSpeed * radius * Math.sin(angle.current);
      const vy = currentSpeed * radius * Math.cos(angle.current);
      flightPos.current.set(
        radius * Math.cos(angle.current),
        radius * Math.sin(angle.current),
        0
      );
      flightRef.current = { vx: vx * 0.5, vy: vy * 0.5 };
      onBreak();
    }

    const x = radius * Math.cos(angle.current);
    const y = radius * Math.sin(angle.current);
    ballRef.current.position.set(x, y, 0);
  });

  const currentSpeed = speed;
  const fc = mass * currentSpeed * currentSpeed / radius;
  const tangVelX = -Math.sin(0);
  const tangVelY = Math.cos(0);

  return (
    <group>
      {/* Orbit circle */}
      <Line points={circlePoints} color="#1e293b" lineWidth={1} dashed dashSize={0.2} gapSize={0.1} />

      {/* Center pivot */}
      <mesh>
        <sphereGeometry args={[0.1, 12, 12]} />
        <meshStandardMaterial color="#475569" />
      </mesh>

      {/* Ball group */}
      <group ref={ballRef} position={[radius, 0, 0]}>
        {/* String / wire */}
        {!broken && (
          <mesh
            position={[-radius / 2, 0, 0]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <cylinderGeometry args={[0.025, 0.025, radius, 6]} />
            <meshStandardMaterial color={scenario === 'snap' && fc > FC_LIMIT * 0.7 ? '#f43f5e' : '#64748b'} />
          </mesh>
        )}

        {/* Ball */}
        <mesh>
          <sphereGeometry args={[0.28, 20, 20]} />
          <meshStandardMaterial
            color="#f59e0b"
            emissive="#d97706"
            emissiveIntensity={Math.min(1, fc / 20)}
          />
        </mesh>

        {/* Centripetal force arrow (toward center) */}
        {!broken && (
          <group>
            <Line points={[[0, 0, 0.1], [-Math.min(fc / 8, 2), 0, 0.1]]} color="#f43f5e" lineWidth={4} />
            <mesh
              position={[-Math.min(fc / 8, 2) - 0.15, 0, 0.1]}
              rotation={[0, 0, Math.PI / 2]}
            >
              <coneGeometry args={[0.1, 0.25, 8]} />
              <meshStandardMaterial color="#f43f5e" emissive="#f43f5e" emissiveIntensity={0.5} />
            </mesh>
            <Html position={[-Math.min(fc / 8, 2) - 0.4, -0.4, 0.1]}>
              <span style={{ color: '#f43f5e', fontSize: 10, fontWeight: 700, pointerEvents: 'none',
                textShadow: '0 0 6px #000' }}>Fc = {fc.toFixed(1)} N</span>
            </Html>
          </group>
        )}

        {/* Velocity tangent arrow (upward in local frame at t=0) */}
        {!broken && (
          <group>
            <Line points={[[0, 0, 0.1], [0, Math.min(currentSpeed * 0.5, 2), 0.1]]} color="#34d399" lineWidth={3} />
            <mesh position={[0, Math.min(currentSpeed * 0.5, 2) + 0.12, 0.1]}>
              <coneGeometry args={[0.08, 0.2, 8]} />
              <meshStandardMaterial color="#34d399" emissive="#34d399" emissiveIntensity={0.5} />
            </mesh>
            <Html position={[0.2, Math.min(currentSpeed * 0.5, 2) + 0.2, 0]}>
              <span style={{ color: '#34d399', fontSize: 10, fontWeight: 700, pointerEvents: 'none',
                textShadow: '0 0 6px #000' }}>v = {(currentSpeed * radius).toFixed(1)} m/s</span>
            </Html>
          </group>
        )}
      </group>

      {broken && (
        <Html position={[0, 3.5, 0]}>
          <div className="bg-rose-900/80 border border-rose-500 text-rose-300 text-xs font-bold px-3 py-1 rounded-lg pointer-events-none">
            Wire snapped! Fc exceeded {FC_LIMIT} N limit
          </div>
        </Html>
      )}
    </group>
  );
}

export default function CentripetalForce() {
  const [speed, setSpeed] = useState(1.5);
  const [radius, setRadius] = useState(2.5);
  const [mass, setMass] = useState(2);
  const [scenario, setScenario] = useState('constant');
  const [snapped, setSnapped] = useState(false);

  const fc = mass * speed * speed / radius;
  const v = speed * radius;
  const period = (2 * Math.PI) / speed;
  const accel = speed * speed * radius;

  const applyScenario = (id: string) => {
    setScenario(id);
    setSnapped(false);
    if (id === 'snap') { setSpeed(1); setMass(5); setRadius(2); }
    if (id === 'accelerating') { setSpeed(0.8); setMass(2); setRadius(2.5); }
    if (id === 'constant') { setSpeed(1.5); setMass(2); setRadius(2.5); }
  };

  const chartData = useMemo(() =>
    Array.from({ length: 60 }, (_, i) => {
      const v2 = (i / 59) * 5;
      return {
        v: parseFloat(v2.toFixed(2)),
        fc: parseFloat((mass * (v2 * radius) * (v2 * radius) / radius).toFixed(2)),
        current: Math.abs(v2 - speed) < 0.05 ? mass * speed * speed * radius / radius : undefined,
      };
    }),
    [mass, radius, speed]
  );

  return (
    <div className="w-full h-full flex overflow-hidden">
      <div className="flex-1 relative min-w-0">
        <Canvas camera={{ position: [0, 0, 9], fov: 45 }} style={{ background: '#030712' }}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 8, 5]} intensity={1.2} />
          <SpinScene
            speed={speed} radius={radius} mass={mass}
            scenario={scenario} onBreak={() => setSnapped(true)}
          />
          <OrbitControls enablePan={false} minDistance={4} maxDistance={16} />
          <gridHelper args={[10, 10, '#0f172a', '#0f172a']} />
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

          <ControlSlider label="Angular Speed (ω)" value={speed} min={0.3} max={4} step={0.1}
            color="#f59e0b" onChange={setSpeed} precision={1} formatValue={v => `${v.toFixed(1)} rad/s`} />
          <ControlSlider label="Radius (r)" value={radius} min={1} max={4} step={0.1}
            color="#22d3ee" onChange={setRadius} precision={1} formatValue={v => `${v.toFixed(1)} m`} />
          <ControlSlider label="Mass (m)" value={mass} min={0.5} max={10} step={0.5}
            color="#34d399" onChange={setMass} precision={1} formatValue={v => `${v.toFixed(1)} kg`} />

          <DataOverlay
            equation={{ text: 'Fc = mv²/r = mω²r', color: '#94a3b8' }}
            readouts={[
              { label: 'Centripetal Force', value: `${fc.toFixed(2)} N`, color: '#f43f5e', highlight: true },
              { label: 'Velocity (v=ωr)', value: `${v.toFixed(2)} m/s`, color: '#34d399', highlight: true },
              { label: 'Centripetal acc.', value: `${accel.toFixed(2)} m/s²`, color: '#22d3ee' },
              { label: 'Period (T=2π/ω)', value: `${period.toFixed(2)} s`, color: '#f59e0b' },
              { label: 'Mass', value: `${mass} kg`, color: '#94a3b8' },
              { label: 'Radius', value: `${radius} m`, color: '#94a3b8' },
              ...(snapped ? [{ label: 'Wire Status', value: 'SNAPPED', color: '#f43f5e' }] : []),
            ]}
          />

          {/* Fc vs ω chart */}
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-3 pt-2 pb-0">
              <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Fc vs Speed</span>
            </div>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={chartData} margin={{ top: 4, right: 10, left: -22, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="v" tick={{ fontSize: 9, fill: '#475569' }} tickLine={false} label={{ value: 'ω (rad/s)', position: 'insideBottom', offset: -2, style: { fontSize: 8, fill: '#475569' } }} />
                <YAxis tick={{ fontSize: 9, fill: '#475569' }} tickLine={false} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 6, fontSize: 10 }} formatter={(v: number) => [`${v.toFixed(1)} N`, 'Fc']} />
                <ReferenceLine x={speed} stroke="#f59e0b" strokeDasharray="3 3" strokeWidth={1.5} />
                <RLine type="monotone" dataKey="fc" stroke="#f43f5e" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-3 text-[11px] text-gray-400 space-y-1">
            <p>Centripetal force always points <span className="text-rose-400 font-semibold">inward</span> — it's not a separate force, but the net inward force.</p>
            <p>Doubling speed <span className="text-amber-300">quadruples</span> the required centripetal force (Fc ∝ v²).</p>
          </div>

        </div>
      </div>
    </div>
  );
}
