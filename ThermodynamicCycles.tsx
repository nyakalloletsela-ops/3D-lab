import { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import {
  LineChart,
  Line as RLine,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import ControlSlider from '../../components/ControlSlider';
import ScenarioSelect from '../../components/ScenarioSelect';
import DataOverlay from '../../components/DataOverlay';

// ── Thermodynamic calculations ────────────────────────────────────────────────
function carnotEfficiency(Thot: number, Tcold: number): number {
  return 1 - Tcold / Thot;
}

function ottoEfficiency(r: number, gamma = 1.4): number {
  return 1 - Math.pow(1 / r, gamma - 1);
}

function computeOttoPV(compressionRatio: number, gamma = 1.4) {
  const V1 = 1.0;
  const V2 = V1 / compressionRatio;
  const P1 = 1.0;
  // 1→2 adiabatic compression
  const P2 = P1 * Math.pow(V1 / V2, gamma);
  // 2→3 isochoric heat add (P rises at V2)
  const P3 = P2 * 3.0;
  // 3→4 adiabatic expansion
  const P4 = P3 * Math.pow(V2 / V1, gamma);

  return [
    { v: V1, p: P1 },
    { v: V2, p: P2 },
    { v: V2, p: P3 },
    { v: V1, p: P4 },
    { v: V1, p: P1 }, // close loop
  ];
}

function computeCarnotPV(compressionRatio: number) {
  const V1 = 1.0;
  const V2 = V1 / compressionRatio;
  const V3 = V2 * 1.6;
  const V4 = V1 * 0.8;
  const P1 = 1.0;
  const P2 = P1 * compressionRatio * 0.8;
  const P3 = P2 * 0.45;
  const P4 = P1 * 0.55;

  return [
    { v: parseFloat(V1.toFixed(3)), p: parseFloat(P1.toFixed(3)) },
    { v: parseFloat(V2.toFixed(3)), p: parseFloat(P2.toFixed(3)) },
    { v: parseFloat(V3.toFixed(3)), p: parseFloat(P3.toFixed(3)) },
    { v: parseFloat(V4.toFixed(3)), p: parseFloat(P4.toFixed(3)) },
    { v: parseFloat(V1.toFixed(3)), p: parseFloat(P1.toFixed(3)) },
  ];
}

// ── Piston + Cylinder Scene ───────────────────────────────────────────────────
function CycleScene({
  compressionRatio,
  heatAdded,
  scenario,
}: {
  compressionRatio: number;
  heatAdded: number;
  scenario: string;
}) {
  const pistonRef = useRef<THREE.Mesh>(null);
  const phase = useRef(0);
  const particles = useRef<{ x: number; y: number; z: number; vx: number; vy: number; vz: number }[]>(
    Array.from({ length: 20 }, () => ({
      x: (Math.random() - 0.5) * 0.6,
      y: (Math.random() - 0.5) * 0.6 - 0.5,
      z: (Math.random() - 0.5) * 0.6,
      vx: (Math.random() - 0.5) * 0.02,
      vy: (Math.random() - 0.5) * 0.02,
      vz: (Math.random() - 0.5) * 0.02,
    }))
  );
  const particleMeshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((_, delta) => {
    phase.current += delta * 0.6;
    const cyclePos = (Math.sin(phase.current) * 0.5 + 0.5); // 0..1

    // Piston position: top = -0.3 (TDC), bottom = 0.8 (BDC)
    const pistonY = -0.3 + cyclePos * 1.1;
    if (pistonRef.current) pistonRef.current.position.y = pistonY;

    // Heat phase: compression = hot (0→0.5 going up), expansion = cool
    const isHot = cyclePos < 0.5;
    const tempFraction = isHot ? (0.5 - cyclePos) * 2 : 0;
    const speed = 0.01 + tempFraction * heatAdded * 0.0003;
    const chamberTop = pistonY - 0.05;

    if (!particleMeshRef.current) return;

    particles.current.forEach((p, i) => {
      p.x += p.vx * (1 + speed * 8);
      p.y += p.vy * (1 + speed * 8);
      p.z += p.vz * (1 + speed * 8);

      const limit = 0.35;
      if (Math.abs(p.x) > limit) p.vx *= -1;
      if (Math.abs(p.z) > limit) p.vz *= -1;
      if (p.y > chamberTop) { p.y = chamberTop; p.vy = -Math.abs(p.vy); }
      if (p.y < -1.1) { p.y = -1.1; p.vy = Math.abs(p.vy); }

      dummy.position.set(p.x, p.y, p.z);
      dummy.updateMatrix();
      particleMeshRef.current!.setMatrixAt(i, dummy.matrix);

      const cold = new THREE.Color('#3b82f6');
      const hot  = new THREE.Color('#f43f5e');
      const col  = new THREE.Color().lerpColors(cold, hot, tempFraction * 0.8 + 0.1);
      particleMeshRef.current!.setColorAt(i, col);
    });

    particleMeshRef.current.instanceMatrix.needsUpdate = true;
    if (particleMeshRef.current.instanceColor) particleMeshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      {/* Cylinder body */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 2.4, 32, 1, true]} />
        <meshStandardMaterial color="#475569" transparent opacity={0.15} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {/* Cylinder rings */}
      {[-1.2, 1.2].map((z, i) => (
        <mesh key={i} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, z]}>
          <torusGeometry args={[0.5, 0.025, 8, 32]} />
          <meshStandardMaterial color="#64748b" />
        </mesh>
      ))}
      {/* Cylinder bottom cap */}
      <mesh position={[0, -1.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.5, 32]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
      {/* Cylinder head (top cap) */}
      <mesh position={[0, 1.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.5, 32]} />
        <meshStandardMaterial color="#334155" />
      </mesh>

      {/* Piston */}
      <mesh ref={pistonRef} position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.46, 0.46, 0.22, 32]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Gas particles */}
      <instancedMesh ref={particleMeshRef} args={[undefined, undefined, 20]}>
        <sphereGeometry args={[0.045, 8, 8]} />
        <meshStandardMaterial vertexColors emissive="#ffffff" emissiveIntensity={0.3} />
      </instancedMesh>

      {/* Temperature label */}
      <Html position={[0.7, 0.3, 0]}>
        <div style={{ color: '#f59e0b', fontSize: 10, fontWeight: 700, pointerEvents: 'none', textShadow: '0 0 6px #000', whiteSpace: 'nowrap' }}>
          {scenario === 'carnot' ? 'Carnot Cycle' : 'Otto Cycle'}
        </div>
      </Html>
    </group>
  );
}

// ── Scenarios ─────────────────────────────────────────────────────────────────
const SCENARIOS = [
  { id: 'carnot', label: 'Carnot', description: 'Ideal reversible cycle — maximum efficiency' },
  { id: 'otto',   label: 'Otto',   description: 'Gasoline engine cycle — adiabatic compression' },
];

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ThermodynamicCycles() {
  const [heatAdded,        setHeatAdded]        = useState(400);
  const [compressionRatio, setCompressionRatio] = useState(6);
  const [scenario,         setScenario]         = useState('otto');

  const gamma = 1.4;
  const Tcold = 300;
  const Thot  = Tcold + heatAdded / 1.5;

  const eta =
    scenario === 'carnot'
      ? carnotEfficiency(Thot, Tcold)
      : ottoEfficiency(compressionRatio, gamma);

  const workOut   = heatAdded * eta;
  const heatRej   = heatAdded - workOut;

  const pvData = useMemo(
    () => (scenario === 'carnot' ? computeCarnotPV(compressionRatio) : computeOttoPV(compressionRatio, gamma)),
    [scenario, compressionRatio]
  );

  const applyScenario = (id: string) => setScenario(id);

  return (
    <div className="w-full h-full flex overflow-hidden">
      <div className="flex-1 relative min-w-0">
        <Canvas camera={{ position: [2, 1, 4], fov: 45 }} style={{ background: '#030712' }}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[4, 6, 4]} intensity={1} />
          <pointLight position={[0, 2, 3]} color="#f59e0b" intensity={1.5} distance={10} />
          <CycleScene compressionRatio={compressionRatio} heatAdded={heatAdded} scenario={scenario} />
          <OrbitControls enablePan={false} minDistance={3} maxDistance={10} />
        </Canvas>
      </div>

      <div className="w-72 flex-shrink-0 bg-gray-950 border-l border-gray-800 overflow-y-auto scrollbar-thin">
        <div className="p-3 space-y-4">
          <ScenarioSelect
            label="Cycle Type"
            scenarios={SCENARIOS}
            value={scenario}
            onChange={applyScenario}
            color="amber"
          />

          <ControlSlider
            label="Heat Added (Q_in)"
            value={heatAdded}
            min={100}
            max={1000}
            step={10}
            color="#f59e0b"
            onChange={setHeatAdded}
            precision={0}
            formatValue={v => `${v.toFixed(0)} J`}
          />
          <ControlSlider
            label="Compression Ratio (r)"
            value={compressionRatio}
            min={2}
            max={10}
            step={0.5}
            color="#22d3ee"
            onChange={setCompressionRatio}
            precision={1}
            formatValue={v => `${v.toFixed(1)} : 1`}
          />

          <DataOverlay
            equation={{ text: 'η = 1 − T_cold/T_hot', color: '#94a3b8' }}
            readouts={[
              { label: 'Efficiency', value: `${(eta * 100).toFixed(1)}%`, color: '#34d399', highlight: true },
              { label: 'Work Output', value: `${workOut.toFixed(1)} J`, color: '#f59e0b', highlight: true },
              { label: 'Heat Added', value: `${heatAdded.toFixed(0)} J`, color: '#f43f5e' },
              { label: 'Heat Rejected', value: `${heatRej.toFixed(1)} J`, color: '#3b82f6' },
              { label: 'T_hot', value: `${Thot.toFixed(0)} K`, color: '#f97316' },
              { label: 'T_cold', value: `${Tcold.toFixed(0)} K`, color: '#60a5fa' },
            ]}
          />

          {/* P-V Diagram */}
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-3 pt-2 pb-0">
              <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">P–V Diagram</span>
            </div>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={pvData} margin={{ top: 8, right: 10, left: -14, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="v" tick={{ fontSize: 9, fill: '#475569' }} tickLine={false} label={{ value: 'V', position: 'insideRight', style: { fontSize: 9, fill: '#475569' } }} />
                <YAxis dataKey="p" tick={{ fontSize: 9, fill: '#475569' }} tickLine={false} label={{ value: 'P', angle: -90, position: 'insideLeft', style: { fontSize: 9, fill: '#475569' } }} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 6, fontSize: 10 }} formatter={(v: number) => [v.toFixed(3)]} />
                <RLine type="monotone" dataKey="p" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, fill: '#f59e0b' }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-3 text-[11px] text-gray-400 space-y-1">
            <p>
              {scenario === 'carnot'
                ? 'Carnot efficiency is the theoretical maximum — no real engine can exceed it.'
                : 'Otto cycle efficiency increases with compression ratio, but too high causes knock.'}
            </p>
            <p>Energy conservation: Q_in = W_out + Q_rejected. No perpetual motion exists.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
