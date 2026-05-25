import { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import ControlSlider from '../../components/ControlSlider';
import ScenarioSelect from '../../components/ScenarioSelect';
import DataOverlay from '../../components/DataOverlay';

// ── Physics ───────────────────────────────────────────────────────────────────
const I_FLYWHEEL = 0.05; // moment of inertia (kg·m²) — simplified constant

function computePrecession(spinRPM: number, appliedForce: number): {
  omega: number;
  L: number;
  tau: number;
  precRate: number;
  precPeriod: number;
} {
  const omega   = (spinRPM / 60) * 2 * Math.PI;
  const L       = I_FLYWHEEL * omega;
  const r       = 0.5; // torque arm length
  const tau     = r * appliedForce;
  const precRate  = L > 0.001 ? tau / L : 0;
  const precPeriod = precRate > 0.001 ? (2 * Math.PI) / precRate : Infinity;
  return { omega, L, tau, precRate, precPeriod };
}

// ── Gyroscope Scene ───────────────────────────────────────────────────────────
function GyroScene({
  spinRPM,
  appliedForce,
}: {
  spinRPM: number;
  appliedForce: number;
}) {
  const { omega, precRate } = computePrecession(spinRPM, appliedForce);

  const assemblyRef  = useRef<THREE.Group>(null);
  const flywheelRef  = useRef<THREE.Mesh>(null);
  const spinAngle    = useRef(0);
  const precAngle    = useRef(0);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    spinAngle.current  += omega * dt;
    precAngle.current  += precRate * dt;

    if (flywheelRef.current) {
      flywheelRef.current.rotation.z = spinAngle.current;
    }
    if (assemblyRef.current) {
      assemblyRef.current.rotation.y = precAngle.current;
    }
  });

  // Angular momentum vector length: visual scale
  const Lvis = Math.min(Math.max(omega * 0.08, 0.3), 2.5);
  // Torque vector
  const tauVis = Math.min(appliedForce * 0.12, 1.5);

  return (
    <group>
      {/* Entire assembly precesses around Y */}
      <group ref={assemblyRef}>
        {/* Stand / axle */}
        <mesh position={[0, -1.2, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 1.0, 16]} />
          <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Base plate */}
        <mesh position={[0, -1.72, 0]}>
          <cylinderGeometry args={[0.4, 0.5, 0.08, 24]} />
          <meshStandardMaterial color="#334155" metalness={0.5} roughness={0.5} />
        </mesh>
        {/* Axle horizontal arm */}
        <mesh position={[0, -0.7, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.04, 0.04, 1.2, 12]} />
          <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.3} />
        </mesh>

        {/* Flywheel (torus) — spins around Z axis */}
        <group position={[0, -0.7, 0]}>
          <mesh ref={flywheelRef}>
            <torusGeometry args={[0.55, 0.16, 20, 48]} />
            <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.15} metalness={0.6} roughness={0.3} />
          </mesh>

          {/* Angular momentum vector (cyan, along spin axis = Z) */}
          <group>
            <Line
              points={[new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, Lvis)]}
              color="#22d3ee"
              lineWidth={3}
            />
            <mesh position={[0, 0, Lvis + 0.15]}>
              <coneGeometry args={[0.07, 0.22, 8]} />
              <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.8} />
            </mesh>
            <Html position={[0.15, 0, Lvis + 0.3]}>
              <span style={{ color: '#22d3ee', fontSize: 10, fontWeight: 700, pointerEvents: 'none', textShadow: '0 0 6px #000' }}>L</span>
            </Html>
          </group>

          {/* Applied torque arrow (red, downward) */}
          {appliedForce > 0 && (
            <group>
              <Line
                points={[new THREE.Vector3(0, 0.2, 0), new THREE.Vector3(0, 0.2 + tauVis, 0)]}
                color="#f43f5e"
                lineWidth={3}
              />
              <mesh position={[0, 0.05, 0]} rotation={[Math.PI, 0, 0]}>
                <coneGeometry args={[0.07, 0.22, 8]} />
                <meshStandardMaterial color="#f43f5e" emissive="#f43f5e" emissiveIntensity={0.8} />
              </mesh>
              <Html position={[0.2, 0.35, 0]}>
                <span style={{ color: '#f43f5e', fontSize: 10, fontWeight: 700, pointerEvents: 'none', textShadow: '0 0 6px #000' }}>τ</span>
              </Html>
            </group>
          )}
        </group>
      </group>

      {/* Precession direction indicator (horizontal circle) */}
      {precRate > 0.01 && (
        <mesh position={[0, -0.7, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.1, 0.015, 8, 64]} />
          <meshStandardMaterial color="#f59e0b" transparent opacity={0.5} />
        </mesh>
      )}
    </group>
  );
}

// ── Scenarios ─────────────────────────────────────────────────────────────────
const SCENARIOS = [
  { id: 'high_rpm', label: 'High RPM', description: 'Fast spin — slow, stable precession' },
  { id: 'low_rpm',  label: 'Low RPM',  description: 'Slow spin — fast, unstable precession' },
];

// ── Main ──────────────────────────────────────────────────────────────────────
export default function GyroscopicPrecession() {
  const [spinRPM,      setSpinRPM]      = useState(2000);
  const [appliedForce, setAppliedForce] = useState(5);
  const [scenario,     setScenario]     = useState('high_rpm');

  const { omega, L, tau, precRate, precPeriod } = computePrecession(spinRPM, appliedForce);

  const applyScenario = (id: string) => {
    setScenario(id);
    if (id === 'high_rpm') { setSpinRPM(2000); setAppliedForce(5); }
    if (id === 'low_rpm')  { setSpinRPM(200);  setAppliedForce(5); }
  };

  return (
    <div className="w-full h-full flex overflow-hidden">
      <div className="flex-1 relative min-w-0">
        <Canvas camera={{ position: [3, 2, 5], fov: 45 }} style={{ background: '#030712' }}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[4, 6, 4]} intensity={1} />
          <pointLight position={[0, 3, 3]} color="#22d3ee" intensity={1.5} distance={10} />
          <GyroScene spinRPM={spinRPM} appliedForce={appliedForce} />
          <OrbitControls enablePan={false} minDistance={3} maxDistance={12} />
          <gridHelper args={[6, 6, '#0f172a', '#0f172a']} />
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
            label="Spin Speed"
            value={spinRPM}
            min={100}
            max={3000}
            step={50}
            color="#22d3ee"
            onChange={setSpinRPM}
            precision={0}
            formatValue={v => `${v.toFixed(0)} RPM`}
          />
          <ControlSlider
            label="Applied Force"
            value={appliedForce}
            min={0}
            max={20}
            step={0.5}
            color="#f43f5e"
            onChange={setAppliedForce}
            precision={1}
            formatValue={v => `${v.toFixed(1)} N`}
          />

          <DataOverlay
            equation={{ text: 'Ω = τ/L = τ/(Iω)', color: '#94a3b8' }}
            readouts={[
              { label: 'Spin RPM', value: `${spinRPM} RPM`, color: '#22d3ee' },
              { label: 'Applied Force', value: `${appliedForce.toFixed(1)} N`, color: '#f43f5e' },
              { label: 'Angular Momentum L', value: `${L.toFixed(3)} kg·m²/s`, color: '#22d3ee', highlight: true },
              { label: 'Torque τ', value: `${tau.toFixed(3)} N·m`, color: '#f43f5e' },
              { label: 'Precession Rate', value: `${precRate.toFixed(3)} rad/s`, color: '#f59e0b', highlight: true },
              { label: 'Precession Period', value: precPeriod < 999 ? `${precPeriod.toFixed(1)} s` : '∞', color: '#34d399' },
            ]}
          />

          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-3 text-[11px] text-gray-400 space-y-1">
            <p>
              A gyroscope responds to torque by precessing <span className="text-amber-300">perpendicularly</span> — not in the direction of the torque.
            </p>
            <p>
              Higher spin speed → larger angular momentum L → <span className="text-cyan-300">slower precession</span>. This is why spinning tops stay upright.
            </p>
            <p>
              Used in navigation (gyrocompasses), spacecraft attitude control, and self-balancing vehicles.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
