import { useState, useRef, useEffect, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import { LineChart, Line as RLine, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import ControlSlider from '../../components/ControlSlider';
import ScenarioSelect from '../../components/ScenarioSelect';
import DataOverlay from '../../components/DataOverlay';

// ── PID simulation state ──────────────────────────────────────────────────────
interface PIDState {
  altitude: number;
  velocity: number;
  integral: number;
  prevError: number;
  time: number;
  history: { t: number; alt: number; setpoint: number; error: number }[];
}

const SETPOINT = 3;
const DT = 1 / 60;
const MAX_HISTORY = 300;

function stepPID(
  state: PIDState,
  kp: number, ki: number, kd: number,
  disturbed: boolean,
): PIDState {
  const error = SETPOINT - state.altitude;
  const newIntegral = state.integral + error * DT;
  const derivative = (error - state.prevError) / DT;

  const thrust = kp * error + ki * newIntegral + kd * derivative;
  const gravity = -9.8;
  const disturbance = disturbed ? (Math.random() - 0.5) * 8 : 0;
  const acc = thrust + gravity + disturbance;

  const newVelocity = state.velocity + acc * DT;
  const newAltitude = Math.max(0, state.altitude + newVelocity * DT);

  const newHistory = [
    ...state.history.slice(-MAX_HISTORY + 1),
    { t: parseFloat(state.time.toFixed(2)), alt: parseFloat(newAltitude.toFixed(3)), setpoint: SETPOINT, error: parseFloat(error.toFixed(3)) },
  ];

  return {
    altitude: newAltitude,
    velocity: newVelocity,
    integral: newIntegral,
    prevError: error,
    time: state.time + DT,
    history: newHistory,
  };
}

// ── Drone 3D ──────────────────────────────────────────────────────────────────
function Drone({ altitude, velocity }: { altitude: number; velocity: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const blade1 = useRef<THREE.Mesh>(null);
  const blade2 = useRef<THREE.Mesh>(null);
  const blade3 = useRef<THREE.Mesh>(null);
  const blade4 = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.position.y = altitude;
      groupRef.current.rotation.z = Math.sin(Date.now() * 0.002) * 0.05;
    }
    const bladeSpeed = 12;
    [blade1, blade2, blade3, blade4].forEach(ref => {
      if (ref.current) ref.current.rotation.y += delta * bladeSpeed;
    });
  });

  const armColor = '#334155';
  const propColor = '#22d3ee';

  return (
    <group ref={groupRef} position={[0, altitude, 0]}>
      {/* Body */}
      <mesh>
        <boxGeometry args={[0.6, 0.2, 0.6]} />
        <meshStandardMaterial color="#1e293b" emissive="#0f172a" />
      </mesh>
      {/* Camera belly */}
      <mesh position={[0, -0.15, 0]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color="#0f172a" emissive="#22d3ee" emissiveIntensity={0.4} />
      </mesh>
      {/* Arms */}
      {[[-0.6, 0, -0.6], [0.6, 0, -0.6], [-0.6, 0, 0.6], [0.6, 0, 0.6]].map(([x, y, z], i) => (
        <group key={i}>
          <mesh position={[x * 0.5, 0, z * 0.5]} rotation={[0, Math.atan2(x, z), 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.85, 6]} />
            <meshStandardMaterial color={armColor} />
          </mesh>
          {/* Motor */}
          <mesh position={[x, 0.05, z]}>
            <cylinderGeometry args={[0.08, 0.08, 0.1, 10]} />
            <meshStandardMaterial color="#475569" />
          </mesh>
          {/* Propeller */}
          <mesh
            ref={i === 0 ? blade1 : i === 1 ? blade2 : i === 2 ? blade3 : blade4}
            position={[x, 0.12, z]}
          >
            <boxGeometry args={[0.5, 0.015, 0.06]} />
            <meshStandardMaterial color={propColor} emissive={propColor} emissiveIntensity={0.3} transparent opacity={0.7} />
          </mesh>
        </group>
      ))}

      {/* Thrust indicator */}
      {velocity > 0.1 && (
        <pointLight position={[0, -0.3, 0]} color="#22d3ee" intensity={velocity * 0.5} distance={1.5} />
      )}
    </group>
  );
}

// ── ground and setpoint marker ────────────────────────────────────────────────
function Environment() {
  return (
    <group>
      {/* Ground */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      {/* Setpoint ring */}
      <mesh position={[0, SETPOINT, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.8, 2, 48]} />
        <meshStandardMaterial color="#34d399" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
      <Html position={[2.2, SETPOINT, 0]}>
        <span className="text-emerald-400 text-[10px] font-semibold pointer-events-none">Target: {SETPOINT}m</span>
      </Html>
      {/* Grid lines */}
      {[1, 2, 3, 4, 5].map(h => (
        <Line
          key={h}
          points={[new THREE.Vector3(-5, h, 0), new THREE.Vector3(5, h, 0)]}
          color="#0f172a"
          lineWidth={1}
          dashed
          dashSize={0.2}
          gapSize={0.1}
        />
      ))}
    </group>
  );
}

// ── scenarios ─────────────────────────────────────────────────────────────────
const SCENARIOS = [
  { id: 'critical',   label: 'Critically Damped', description: 'Fast, no overshoot' },
  { id: 'under',      label: 'Underdamped',        description: 'Fast but oscillates' },
  { id: 'over',       label: 'Overdamped',         description: 'Slow, no overshoot' },
];

const SCENARIO_GAINS: Record<string, [number, number, number]> = {
  critical: [12, 0.5, 3.5],
  under:    [20, 0,   0.5],
  over:     [3,  0.1, 2],
};

// ── Simulation ticker (must live inside Canvas) ────────────────────────────────
function SimTicker({
  kp, ki, kd, disturbed, pidStateRef, onUpdate,
}: {
  kp: number; ki: number; kd: number; disturbed: boolean;
  pidStateRef: React.MutableRefObject<PIDState>;
  onUpdate: (alt: number, hist: PIDState['history']) => void;
}) {
  useFrame(() => {
    pidStateRef.current = stepPID(pidStateRef.current, kp, ki, kd, disturbed);
    onUpdate(pidStateRef.current.altitude, pidStateRef.current.history);
  });
  return null;
}

export default function PIDController() {
  const [kp, setKp] = useState(12);
  const [ki, setKi] = useState(0.5);
  const [kd, setKd] = useState(3.5);
  const [scenario, setScenario] = useState('critical');
  const [disturbed, setDisturbed] = useState(false);

  const pidState = useRef<PIDState>({
    altitude: 0, velocity: 0, integral: 0, prevError: SETPOINT, time: 0, history: [],
  });
  const [displayState, setDisplayState] = useState({ altitude: 0, history: [] as PIDState['history'] });

  const handleUpdate = useCallback((alt: number, hist: PIDState['history']) => {
    setDisplayState({ altitude: alt, history: hist });
  }, []);

  const reset = () => {
    pidState.current = { altitude: 0, velocity: 0, integral: 0, prevError: SETPOINT, time: 0, history: [] };
  };

  const applyScenario = (id: string) => {
    setScenario(id);
    const [p, i, d] = SCENARIO_GAINS[id];
    setKp(p); setKi(i); setKd(d);
    reset();
  };

  const error = SETPOINT - displayState.altitude;
  const settled = Math.abs(error) < 0.05;

  return (
    <div className="w-full h-full flex overflow-hidden">
      <div className="flex-1 relative min-w-0">
        <Canvas camera={{ position: [5, 3, 7], fov: 45 }} style={{ background: '#030712' }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 10, 5]} intensity={1} />
          <Environment />
          <Drone altitude={displayState.altitude} velocity={pidState.current.velocity} />
          <SimTicker kp={kp} ki={ki} kd={kd} disturbed={disturbed} pidStateRef={pidState} onUpdate={handleUpdate} />
          <OrbitControls enablePan={false} minDistance={4} maxDistance={16} />
        </Canvas>
        {/* Disturb button */}
        <div className="absolute bottom-3 left-3">
          <button
            onMouseDown={() => setDisturbed(true)}
            onMouseUp={() => setDisturbed(false)}
            onMouseLeave={() => setDisturbed(false)}
            className="bg-rose-900/80 border border-rose-600 text-rose-300 text-xs font-semibold px-4 py-2 rounded-lg hover:bg-rose-800 active:scale-95 transition-all select-none"
          >
            Hold: Disturb
          </button>
        </div>
      </div>

      <div className="w-72 flex-shrink-0 bg-gray-950 border-l border-gray-800 overflow-y-auto scrollbar-thin">
        <div className="p-3 space-y-4">

          <ScenarioSelect label="Preset Tuning" scenarios={SCENARIOS} value={scenario} onChange={applyScenario} color="cyan" />

          <ControlSlider label="Kp (Proportional)" value={kp} min={0} max={30} step={0.5} color="#22d3ee" onChange={v => { setKp(v); reset(); }} precision={1} />
          <ControlSlider label="Ki (Integral)" value={ki} min={0} max={5} step={0.05} color="#f59e0b" onChange={v => { setKi(v); reset(); }} precision={2} />
          <ControlSlider label="Kd (Derivative)" value={kd} min={0} max={10} step={0.1} color="#34d399" onChange={v => { setKd(v); reset(); }} precision={1} />

          <button onClick={reset} className="w-full py-1.5 rounded-lg text-xs font-semibold border border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800 transition-all">
            Reset Simulation
          </button>

          <DataOverlay
            equation={{ text: 'u = Kp·e + Ki·∫e dt + Kd·(de/dt)', color: '#94a3b8' }}
            readouts={[
              { label: 'Altitude', value: `${displayState.altitude.toFixed(3)} m`, color: '#22d3ee', highlight: true },
              { label: 'Error', value: `${error.toFixed(3)} m`, color: Math.abs(error) < 0.05 ? '#34d399' : '#f43f5e', highlight: true },
              { label: 'Setpoint', value: `${SETPOINT} m`, color: '#34d399' },
              { label: 'Status', value: settled ? 'Settled' : disturbed ? 'Disturbed!' : 'Tracking', color: settled ? '#34d399' : disturbed ? '#f43f5e' : '#f59e0b' },
              { label: 'Kp', value: kp.toFixed(1), color: '#22d3ee' },
              { label: 'Ki', value: ki.toFixed(2), color: '#f59e0b' },
              { label: 'Kd', value: kd.toFixed(1), color: '#34d399' },
            ]}
          />

          {/* Altitude chart */}
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-3 pt-2 pb-0">
              <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Altitude vs Time</span>
            </div>
            <ResponsiveContainer width="100%" height={130}>
              <LineChart data={displayState.history} margin={{ top: 4, right: 10, left: -20, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="t" tick={{ fontSize: 8, fill: '#475569' }} tickLine={false} tickFormatter={v => `${v.toFixed(1)}s`} />
                <YAxis tick={{ fontSize: 8, fill: '#475569' }} tickLine={false} domain={[0, 6]} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 6, fontSize: 10 }} formatter={(v: number) => [`${v.toFixed(3)} m`]} />
                <ReferenceLine y={SETPOINT} stroke="#34d399" strokeDasharray="3 3" strokeWidth={1.5} label={{ value: 'Target', position: 'right', style: { fontSize: 8, fill: '#34d399' } }} />
                <RLine type="monotone" dataKey="alt" stroke="#22d3ee" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-3 text-[11px] text-gray-400 space-y-1">
            <p><span className="text-cyan-400 font-semibold">Kp</span>: Makes drone react to current error. Too high → oscillates.</p>
            <p><span className="text-amber-400 font-semibold">Ki</span>: Corrects persistent error. Too high → slow wobble.</p>
            <p><span className="text-emerald-400 font-semibold">Kd</span>: Dampens rate of change. Too high → sluggish.</p>
          </div>

        </div>
      </div>
    </div>
  );
}
