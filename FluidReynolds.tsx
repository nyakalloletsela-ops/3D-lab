import { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import {
  LineChart,
  Line as RLine,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import ControlSlider from '../../components/ControlSlider';
import ScenarioSelect from '../../components/ScenarioSelect';
import DataOverlay from '../../components/DataOverlay';

// ── Reynolds calculation ───────────────────────────────────────────────────────
function calcRe(velocity: number, diameter: number, viscosity: number): number {
  return (velocity * diameter) / viscosity;
}

function flowRegime(re: number): string {
  if (re < 2000) return 'Laminar';
  if (re > 4000) return 'Turbulent';
  return 'Transitional';
}

// ── Particle system ───────────────────────────────────────────────────────────
interface Particle {
  r: number;
  theta: number;
  z: number;
  vz: number;
  vr: number;
  vtheta: number;
}

const N_PARTICLES = 40;

function initParticles(): Particle[] {
  return Array.from({ length: N_PARTICLES }, (_, i) => {
    const r = Math.sqrt(Math.random()) * 0.85;
    return {
      r,
      theta: Math.random() * Math.PI * 2,
      z: (Math.random() - 0.5) * 6,
      vz: 0,
      vr: 0,
      vtheta: 0,
    };
  });
}

function FluidParticles({ velocity, re }: { velocity: number; re: number }) {
  const particles = useRef<Particle[]>(initParticles());
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const regime = flowRegime(re);
  const turbulenceStrength = regime === 'Turbulent' ? 1 : regime === 'Transitional' ? 0.4 : 0;

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const dt = Math.min(delta, 0.05);
    const axialSpeed = velocity * 0.3;

    particles.current.forEach((p, i) => {
      // Laminar: steady axial flow, each particle at fixed radial position
      // Turbulent: random perturbations
      if (turbulenceStrength > 0) {
        p.vr += (Math.random() - 0.5) * turbulenceStrength * 0.8 * dt * 10;
        p.vtheta += (Math.random() - 0.5) * turbulenceStrength * 1.2 * dt * 10;
        p.vr *= 0.92;
        p.vtheta *= 0.92;
      } else {
        p.vr *= 0.8;
        p.vtheta *= 0.8;
      }

      const laminarProfile = 1 - p.r * p.r; // parabolic profile
      p.z += (axialSpeed * laminarProfile + p.vr * 0.05) * dt;
      p.theta += p.vtheta * dt;
      p.r += p.vr * dt * 0.05;
      p.r = Math.max(0, Math.min(0.92, p.r));

      // Wrap z
      if (p.z > 3) p.z -= 6;
      if (p.z < -3) p.z += 6;

      const x = p.r * Math.cos(p.theta);
      const y = p.r * Math.sin(p.theta);
      dummy.position.set(x, y, p.z);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);

      // Color: blue for laminar, orange for turbulent
      const t = Math.min(1, Math.max(0, (re - 2000) / 2000));
      const color = new THREE.Color().lerpColors(
        new THREE.Color('#3b82f6'),
        new THREE.Color('#f97316'),
        t
      );
      meshRef.current!.setColorAt(i, color);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, N_PARTICLES]}>
      <sphereGeometry args={[0.06, 8, 8]} />
      <meshStandardMaterial vertexColors emissive="#ffffff" emissiveIntensity={0.2} />
    </instancedMesh>
  );
}

// ── Tube ──────────────────────────────────────────────────────────────────────
function Tube() {
  return (
    <group>
      {/* Outer cylinder shell */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.0, 1.0, 6, 48, 1, true]} />
        <meshStandardMaterial
          color="#22d3ee"
          transparent
          opacity={0.08}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {/* Tube rings for visual clarity */}
      {[-3, -2, -1, 0, 1, 2, 3].map(z => (
        <mesh key={z} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, z]}>
          <torusGeometry args={[1.0, 0.015, 8, 48]} />
          <meshStandardMaterial color="#22d3ee" opacity={0.3} transparent />
        </mesh>
      ))}
      {/* End caps ring */}
      {[-3, 3].map(z => (
        <mesh key={z} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, z]}>
          <torusGeometry args={[1.0, 0.03, 8, 48]} />
          <meshStandardMaterial color="#60a5fa" opacity={0.6} transparent />
        </mesh>
      ))}
    </group>
  );
}

// ── Scene ──────────────────────────────────────────────────────────────────────
function FluidScene({ velocity, re }: { velocity: number; re: number }) {
  return (
    <group rotation={[0, 0, Math.PI / 2]}>
      <Tube />
      <FluidParticles velocity={velocity} re={re} />
    </group>
  );
}

// ── Scenarios ─────────────────────────────────────────────────────────────────
const SCENARIOS = [
  { id: 'laminar',    label: 'Laminar',    description: 'Re < 2000 — smooth parallel flow' },
  { id: 'turbulent',  label: 'Turbulent',  description: 'Re > 4000 — chaotic mixing flow' },
];

const SCENARIO_PARAMS: Record<string, { velocity: number; diameter: number; viscosity: number }> = {
  laminar:   { velocity: 0.1, diameter: 0.05, viscosity: 1e-3 },
  turbulent: { velocity: 5,   diameter: 0.5,  viscosity: 1e-4 },
};

// ── Main ──────────────────────────────────────────────────────────────────────
export default function FluidReynolds() {
  const [velocity,  setVelocity]  = useState(0.1);
  const [diameter,  setDiameter]  = useState(0.05);
  const [viscosity, setViscosity] = useState(1e-3);
  const [scenario,  setScenario]  = useState('laminar');

  const re = calcRe(velocity, diameter, viscosity);
  const regime = flowRegime(re);

  const applyScenario = (id: string) => {
    setScenario(id);
    const p = SCENARIO_PARAMS[id];
    setVelocity(p.velocity);
    setDiameter(p.diameter);
    setViscosity(p.viscosity);
  };

  const chartData = useMemo(() =>
    Array.from({ length: 60 }, (_, i) => {
      const v = 0.1 + (i / 59) * 4.9;
      return { v: parseFloat(v.toFixed(2)), re: parseFloat(calcRe(v, diameter, viscosity).toFixed(0)) };
    }),
    [diameter, viscosity]
  );

  const regimeColor = regime === 'Laminar' ? '#3b82f6' : regime === 'Turbulent' ? '#f97316' : '#a78bfa';

  return (
    <div className="w-full h-full flex overflow-hidden">
      <div className="flex-1 relative min-w-0">
        <Canvas camera={{ position: [3, 2, 5], fov: 45 }} style={{ background: '#030712' }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <pointLight position={[0, 3, 3]} color="#22d3ee" intensity={1.5} distance={12} />
          <FluidScene velocity={velocity} re={re} />
          <OrbitControls enablePan={false} minDistance={3} maxDistance={14} />
        </Canvas>
      </div>

      <div className="w-72 flex-shrink-0 bg-gray-950 border-l border-gray-800 overflow-y-auto scrollbar-thin">
        <div className="p-3 space-y-4">
          <ScenarioSelect
            label="Flow Regime"
            scenarios={SCENARIOS}
            value={scenario}
            onChange={applyScenario}
            color="cyan"
          />

          <ControlSlider
            label="Velocity (v)"
            value={velocity}
            min={0.1}
            max={5}
            step={0.05}
            color="#22d3ee"
            onChange={setVelocity}
            precision={2}
            formatValue={v => `${v.toFixed(2)} m/s`}
          />
          <ControlSlider
            label="Diameter (D)"
            value={diameter}
            min={0.01}
            max={0.5}
            step={0.01}
            color="#34d399"
            onChange={setDiameter}
            precision={3}
            formatValue={v => `${v.toFixed(3)} m`}
          />
          <ControlSlider
            label="Kinematic Viscosity (ν)"
            value={viscosity}
            min={1e-6}
            max={1e-3}
            step={1e-6}
            color="#f59e0b"
            onChange={setViscosity}
            precision={6}
            formatValue={v => `${v.toExponential(1)} m²/s`}
          />

          <DataOverlay
            equation={{ text: 'Re = ρvD/μ = vD/ν', color: '#94a3b8' }}
            readouts={[
              { label: 'Reynolds Number', value: re.toFixed(0), color: regimeColor, highlight: true },
              { label: 'Flow Regime', value: regime, color: regimeColor, highlight: true },
              { label: 'Velocity', value: `${velocity.toFixed(2)} m/s`, color: '#22d3ee' },
              { label: 'Diameter', value: `${diameter.toFixed(3)} m`, color: '#34d399' },
              { label: 'Viscosity (ν)', value: `${viscosity.toExponential(1)} m²/s`, color: '#f59e0b' },
            ]}
          />

          {/* Re vs Velocity chart */}
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-3 pt-2 pb-0">
              <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Re vs Velocity</span>
            </div>
            <ResponsiveContainer width="100%" height={130}>
              <LineChart data={chartData} margin={{ top: 4, right: 10, left: -10, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="v" tick={{ fontSize: 9, fill: '#475569' }} tickLine={false} label={{ value: 'v (m/s)', position: 'insideBottom', offset: -2, style: { fontSize: 8, fill: '#475569' } }} />
                <YAxis tick={{ fontSize: 9, fill: '#475569' }} tickLine={false} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 6, fontSize: 10 }} formatter={(v: number) => [v.toFixed(0), 'Re']} />
                <ReferenceLine y={2000} stroke="#3b82f6" strokeDasharray="3 3" strokeWidth={1} label={{ value: 'Laminar', position: 'right', style: { fontSize: 8, fill: '#3b82f6' } }} />
                <ReferenceLine y={4000} stroke="#f97316" strokeDasharray="3 3" strokeWidth={1} label={{ value: 'Turbulent', position: 'right', style: { fontSize: 8, fill: '#f97316' } }} />
                <ReferenceLine x={velocity} stroke="#ffffff" strokeDasharray="2 2" strokeWidth={1} />
                <RLine type="monotone" dataKey="re" stroke="#22d3ee" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-3 text-[11px] text-gray-400 space-y-1">
            <p>
              {regime === 'Laminar'
                ? 'Laminar flow: fluid moves in smooth parallel layers. Viscous forces dominate.'
                : regime === 'Turbulent'
                ? 'Turbulent flow: chaotic eddies and mixing. Inertial forces dominate.'
                : 'Transitional flow: unstable mix of laminar and turbulent behavior.'}
            </p>
            <p>Re is dimensionless: ratio of <span className="text-amber-300">inertial</span> to <span className="text-blue-400">viscous</span> forces.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
