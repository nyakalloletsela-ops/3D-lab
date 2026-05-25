import { useState, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import { LineChart, Line as RLine, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';
import ControlSlider from '../../components/ControlSlider';
import ScenarioSelect from '../../components/ScenarioSelect';
import DataOverlay from '../../components/DataOverlay';

// ── aerodynamics ──────────────────────────────────────────────────────────────
function computeCoeffs(aoa: number): { cl: number; cd: number; stalled: boolean } {
  const aoaRad = (aoa * Math.PI) / 180;
  const stallAngle = 15;
  const stalled = Math.abs(aoa) > stallAngle;

  let cl: number;
  if (!stalled) {
    cl = 2 * Math.PI * aoaRad * 0.9;
  } else {
    const past = Math.abs(aoa) - stallAngle;
    cl = Math.sign(aoa) * Math.max(0, 0.8 * Math.cos(((past * Math.PI) / 30)));
  }

  let cd: number;
  if (!stalled) {
    cd = 0.012 + 0.05 * aoaRad * aoaRad;
  } else {
    cd = 0.05 + 0.15 * Math.sin(((Math.abs(aoa) - stallAngle) * Math.PI) / 90);
  }

  return { cl, cd, stalled };
}

function liftForce(cl: number, velocity: number, area: number): number {
  const rho = 1.225;
  return 0.5 * rho * velocity * velocity * cl * area;
}

function dragForce(cd: number, velocity: number, area: number): number {
  const rho = 1.225;
  return 0.5 * rho * velocity * velocity * cd * area;
}

// ── airfoil shape (NACA-ish) ───────────────────────────────────────────────────
function naca4412(x: number): number {
  const m = 0.04, p = 0.4, t = 0.12;
  const yc = x < p ? (m / p / p) * (2 * p * x - x * x) : (m / (1 - p) / (1 - p)) * (1 - 2 * p + 2 * p * x - x * x);
  const yt = (t / 0.2) * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x * x * x - 0.1015 * x * x * x * x);
  return { top: yc + yt, bot: yc - yt };
}

// ── flow particles ─────────────────────────────────────────────────────────────
function FlowParticles({ velocity, aoa, stalled }: { velocity: number; aoa: number; stalled: boolean }) {
  const NUM = 18;
  const particles = useRef(
    Array.from({ length: NUM }, (_, i) => ({
      x: -4 + Math.random() * 8,
      y: -1.2 + (i / NUM) * 2.4,
      phase: Math.random() * 6,
    }))
  );
  const meshRefs = useRef<(THREE.Mesh | null)[]>(Array(NUM).fill(null));

  useFrame((_, delta) => {
    particles.current.forEach((p, i) => {
      const mesh = meshRefs.current[i];
      if (!mesh) return;

      const speedMult = velocity / 50;
      p.x += delta * 3 * speedMult;

      if (stalled && p.y > -0.2 && p.y < 0.8) {
        p.y += Math.sin(p.phase + p.x * 3) * delta * 0.8;
        p.phase += delta;
      }

      if (p.x > 5) {
        p.x = -4;
        p.y = -1.2 + Math.random() * 2.4;
      }

      const aoaEffect = stalled ? 0 : -Math.sin((aoa * Math.PI) / 180) * 0.2;
      mesh.position.set(p.x, p.y + aoaEffect * (p.y > 0 ? 1 : 0), 0.1);
    });
  });

  return (
    <>
      {particles.current.map((_, i) => (
        <mesh
          key={i}
          ref={(el) => { meshRefs.current[i] = el; }}
          position={[0, 0, 0.1]}
        >
          <sphereGeometry args={[0.04, 6, 6]} />
          <meshStandardMaterial color={stalled ? '#f43f5e' : '#22d3ee'} emissive={stalled ? '#f43f5e' : '#22d3ee'} emissiveIntensity={0.8} />
        </mesh>
      ))}
    </>
  );
}

// ── airfoil 3D ─────────────────────────────────────────────────────────────────
function Airfoil({ aoa, cl, cd, stalled }: { aoa: number; cl: number; cd: number; stalled: boolean }) {
  const aoaRad = (aoa * Math.PI) / 180;

  const topPts: THREE.Vector3[] = [];
  const botPts: THREE.Vector3[] = [];

  for (let i = 0; i <= 40; i++) {
    const x = i / 40;
    const { top, bot } = naca4412(x);
    topPts.push(new THREE.Vector3((x - 0.5) * 3, top * 3, 0));
    botPts.push(new THREE.Vector3((x - 0.5) * 3, bot * 3, 0));
  }

  const liftLen = Math.min(Math.abs(cl) * 1.5, 3);
  const dragLen = Math.min(cd * 6, 2);

  return (
    <group rotation={[0, 0, -aoaRad]}>
      <Line points={topPts} color={stalled ? '#f43f5e' : '#22d3ee'} lineWidth={2.5} />
      <Line points={botPts} color={stalled ? '#f43f5e' : '#22d3ee'} lineWidth={2.5} />
      <Line
        points={[topPts[0], botPts[0]]}
        color={stalled ? '#f43f5e' : '#22d3ee'} lineWidth={2.5}
      />

      {/* Lift vector (perpendicular to velocity = upward in aircraft frame) */}
      {liftLen > 0.1 && (
        <group>
          <Line
            points={[new THREE.Vector3(0, 0, 0.1), new THREE.Vector3(0, liftLen, 0.1)]}
            color={cl > 0 ? '#34d399' : '#f59e0b'} lineWidth={3}
          />
          <mesh position={[0, liftLen + 0.12, 0.1]}>
            <coneGeometry args={[0.1, 0.25, 8]} />
            <meshStandardMaterial color={cl > 0 ? '#34d399' : '#f59e0b'} emissive={cl > 0 ? '#34d399' : '#f59e0b'} emissiveIntensity={0.5} />
          </mesh>
          <Html position={[0.2, liftLen + 0.3, 0]}>
            <span style={{ color: cl > 0 ? '#34d399' : '#f59e0b', fontSize: 10, fontWeight: 700, pointerEvents: 'none',
              textShadow: '0 0 6px #000' }}>L</span>
          </Html>
        </group>
      )}

      {/* Drag vector (opposite to flow direction) */}
      {dragLen > 0.05 && (
        <group>
          <Line
            points={[new THREE.Vector3(0, 0, 0.1), new THREE.Vector3(-dragLen, 0, 0.1)]}
            color="#f43f5e" lineWidth={2.5}
          />
          <mesh position={[-dragLen - 0.12, 0, 0.1]} rotation={[0, 0, Math.PI / 2]}>
            <coneGeometry args={[0.08, 0.22, 8]} />
            <meshStandardMaterial color="#f43f5e" emissive="#f43f5e" emissiveIntensity={0.5} />
          </mesh>
          <Html position={[-dragLen - 0.3, -0.3, 0]}>
            <span style={{ color: '#f43f5e', fontSize: 10, fontWeight: 700, pointerEvents: 'none',
              textShadow: '0 0 6px #000' }}>D</span>
          </Html>
        </group>
      )}

      {stalled && (
        <Html position={[0, 1.5, 0]}>
          <div className="bg-red-900/80 border border-red-500 text-red-300 text-[10px] font-bold px-2 py-0.5 rounded pointer-events-none whitespace-nowrap">
            STALL! Flow separated
          </div>
        </Html>
      )}
    </group>
  );
}

// ── scenarios ─────────────────────────────────────────────────────────────────
const SCENARIOS = [
  { id: 'cruise',   label: 'Cruising',  description: 'Optimal efficiency, low drag' },
  { id: 'takeoff',  label: 'Takeoff',   description: 'High AoA for max lift' },
  { id: 'stall',    label: 'Stall',     description: 'Flow separation at high AoA' },
];

const SCENARIO_PARAMS: Record<string, { velocity: number; aoa: number }> = {
  cruise:  { velocity: 70, aoa: 3 },
  takeoff: { velocity: 40, aoa: 12 },
  stall:   { velocity: 30, aoa: 20 },
};

export default function AerodynamicLift() {
  const [velocity, setVelocity] = useState(70);
  const [aoa, setAoa] = useState(3);
  const [scenario, setScenario] = useState('cruise');
  const area = 20;

  const { cl, cd, stalled } = computeCoeffs(aoa);
  const lift = liftForce(cl, velocity, area);
  const drag = dragForce(cd, velocity, area);
  const liftDragRatio = cd > 0.001 ? Math.abs(cl / cd) : 0;

  const applyScenario = (id: string) => {
    setScenario(id);
    const p = SCENARIO_PARAMS[id];
    setVelocity(p.velocity);
    setAoa(p.aoa);
  };

  const chartData = useMemo(() =>
    Array.from({ length: 61 }, (_, i) => {
      const a = -10 + i * 0.5;
      const { cl: c, cd: d, stalled: s } = computeCoeffs(a);
      const l = liftForce(c, velocity, area);
      const dr = dragForce(d, velocity, area);
      return {
        aoa: a,
        lift: parseFloat(l.toFixed(1)),
        drag: parseFloat(dr.toFixed(1)),
        ld: parseFloat((d > 0.001 ? Math.abs(c / d) : 0).toFixed(2)),
        stalled: s,
      };
    }),
    [velocity]
  );

  return (
    <div className="w-full h-full flex overflow-hidden">
      <div className="flex-1 relative min-w-0">
        <Canvas camera={{ position: [0, 0, 8], fov: 45 }} style={{ background: '#030712' }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 8, 5]} intensity={1.2} />
          <FlowParticles velocity={velocity} aoa={aoa} stalled={stalled} />
          <Airfoil aoa={aoa} cl={cl} cd={cd} stalled={stalled} />
          <OrbitControls enablePan={false} minDistance={4} maxDistance={16} />
          <gridHelper args={[12, 12, '#0f172a', '#0f172a']} />
        </Canvas>
      </div>

      <div className="w-72 flex-shrink-0 bg-gray-950 border-l border-gray-800 overflow-y-auto scrollbar-thin">
        <div className="p-3 space-y-4">

          <ScenarioSelect label="Flight Condition" scenarios={SCENARIOS} value={scenario} onChange={applyScenario} color="cyan" />

          <ControlSlider label="Wind Speed (v)" value={velocity} min={10} max={120} step={1} color="#22d3ee"
            onChange={setVelocity} precision={0} formatValue={v => `${v} m/s`} />
          <ControlSlider label="Angle of Attack" value={aoa} min={-10} max={25} step={0.5} color="#f59e0b"
            onChange={setAoa} precision={1} formatValue={v => `${v.toFixed(1)}°`} />

          <DataOverlay
            equation={{ text: 'L = ½ρv²CₗA,  D = ½ρv²CdA', color: '#94a3b8' }}
            readouts={[
              { label: 'Lift (L)', value: `${lift.toFixed(0)} N`, color: '#34d399', highlight: true },
              { label: 'Drag (D)', value: `${drag.toFixed(0)} N`, color: '#f43f5e', highlight: true },
              { label: 'L/D ratio', value: liftDragRatio.toFixed(2), color: stalled ? '#f43f5e' : '#22d3ee' },
              { label: 'Cl', value: cl.toFixed(3), color: '#34d399' },
              { label: 'Cd', value: cd.toFixed(4), color: '#f43f5e' },
              { label: 'Status', value: stalled ? 'STALLED' : 'Normal flow', color: stalled ? '#f43f5e' : '#34d399' },
            ]}
          />

          {/* Lift & Drag vs AoA chart */}
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-3 pt-2 pb-0">
              <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Lift & Drag vs AoA</span>
            </div>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={chartData} margin={{ top: 4, right: 10, left: -18, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="aoa" tick={{ fontSize: 8, fill: '#475569' }} tickLine={false} label={{ value: 'AoA (°)', position: 'insideBottom', offset: -2, style: { fontSize: 8, fill: '#475569' } }} />
                <YAxis tick={{ fontSize: 8, fill: '#475569' }} tickLine={false} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 6, fontSize: 10 }} />
                <ReferenceLine x={aoa} stroke="#f59e0b" strokeDasharray="3 3" strokeWidth={1.5} />
                <ReferenceLine x={15} stroke="#f43f5e" strokeDasharray="3 3" strokeWidth={1} label={{ value: 'Stall', position: 'top', style: { fontSize: 8, fill: '#f43f5e' } }} />
                <RLine type="monotone" dataKey="lift" stroke="#34d399" strokeWidth={2} dot={false} isAnimationActive={false} name="Lift (N)" />
                <RLine type="monotone" dataKey="drag" stroke="#f43f5e" strokeWidth={1.5} dot={false} isAnimationActive={false} name="Drag (N)" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-3 text-[11px] text-gray-400 space-y-1">
            {stalled
              ? <p><span className="text-rose-400 font-semibold">Stall!</span> At high AoA, airflow separates from the top surface — lift collapses and drag surges.</p>
              : <p>Optimal L/D at ~4–6° AoA. Higher speed gives <span className="text-cyan-300">quadratic</span> lift and drag increase (F ∝ v²).</p>
            }
          </div>

        </div>
      </div>
    </div>
  );
}
