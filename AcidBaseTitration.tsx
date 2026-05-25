import { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, CartesianGrid,
} from 'recharts';
import ControlSlider from '../../components/ControlSlider';
import ScenarioSelect from '../../components/ScenarioSelect';
import DataOverlay from '../../components/DataOverlay';

// ── pH model ──────────────────────────────────────────────────────────────────
type TitrationScenario = 'strong_strong' | 'weak_strong';

function computePH(volume: number, scenario: TitrationScenario): number {
  const eq = 25;
  const eps = 0.01;
  if (scenario === 'strong_strong') {
    if (Math.abs(volume - eq) < eps) return 7;
    if (volume < eq) {
      const ratio = (eq - volume) / eq;
      return Math.max(0, 1 + Math.log10(ratio));
    }
    const ratio = (volume - eq) / eq;
    return Math.min(14, 13 - Math.log10(ratio + eps));
  } else {
    // weak acid / strong base — buffer region before eq, then basic
    if (Math.abs(volume - eq) < eps) return 9;
    if (volume < eq) {
      // Henderson-Hasselbalch simplified: pKa = 4.75
      const pKa = 4.75;
      const alpha = volume / eq; // fraction neutralised
      if (alpha < 0.02) {
        // initial pH of weak acid
        return 2.87;
      }
      if (alpha > 0.98) {
        return pKa + 2;
      }
      return pKa + Math.log10(alpha / (1 - alpha));
    }
    // after equivalence: excess OH-
    const ratio = (volume - eq) / eq;
    return Math.min(14, 13 - Math.log10(ratio + 0.001));
  }
}

function pHtoColor(pH: number): string {
  if (pH < 3) return '#ef4444';
  if (pH < 6) return '#f97316';
  if (pH < 7.5) return '#eab308';
  if (pH < 9) return '#86efac';
  if (pH < 11) return '#22c55e';
  return '#1d4ed8';
}

// ── drip particle ─────────────────────────────────────────────────────────────
function DripParticle({ startY, active }: { startY: number; active: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  const y = useRef(startY);
  const speed = useRef(1.5 + Math.random() * 1.0);

  useFrame((_, delta) => {
    if (!ref.current || !active) return;
    y.current -= speed.current * delta;
    if (y.current < -2.5) y.current = startY;
    ref.current.position.y = y.current;
    ref.current.position.x = Math.sin(y.current * 3) * 0.04;
  });

  return (
    <mesh ref={ref} position={[0, startY, 0]} visible={active}>
      <sphereGeometry args={[0.06, 8, 8]} />
      <meshStandardMaterial color="#93c5fd" emissive="#93c5fd" emissiveIntensity={0.6} transparent opacity={0.85} />
    </mesh>
  );
}

// ── 3D scene ──────────────────────────────────────────────────────────────────
interface SceneProps {
  volume: number;
  pH: number;
}

function TitrationScene({ volume, pH }: SceneProps) {
  const flaskColor = pHtoColor(pH);
  const nearEquiv = Math.abs(pH - 7) < 0.8;

  const glowRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (glowRef.current) {
      const pulse = 0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 4);
      (glowRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = nearEquiv ? pulse * 1.2 : 0;
      (glowRef.current.material as THREE.MeshStandardMaterial).opacity = nearEquiv ? 0.25 + pulse * 0.15 : 0;
    }
  });

  return (
    <group>
      {/* Burette tube */}
      <mesh position={[0, 2.6, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 1.8, 16]} />
        <meshStandardMaterial color="#94a3b8" transparent opacity={0.5} />
      </mesh>
      {/* Burette tip */}
      <mesh position={[0, 1.65, 0]}>
        <cylinderGeometry args={[0.04, 0.01, 0.25, 8]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>

      {/* Drip particles */}
      {[0, 0.3, 0.6].map((offset, i) => (
        <DripParticle key={i} startY={1.52 - offset * 0.6} active={volume > 0} />
      ))}

      {/* Flask body: sphere lower + cone neck */}
      <mesh position={[0, -1.1, 0]}>
        <sphereGeometry args={[0.8, 24, 24]} />
        <meshStandardMaterial color={flaskColor} transparent opacity={0.55} roughness={0.1} metalness={0.05} />
      </mesh>
      {/* Flask neck */}
      <mesh position={[0, -0.35, 0]}>
        <cylinderGeometry args={[0.16, 0.38, 0.6, 20, 1, true]} />
        <meshStandardMaterial color={flaskColor} transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>

      {/* Equivalence point glow ring */}
      <mesh ref={glowRef} position={[0, -1.1, 0]}>
        <torusGeometry args={[0.9, 0.08, 8, 32]} />
        <meshStandardMaterial
          color="#fbbf24"
          emissive="#fbbf24"
          emissiveIntensity={0}
          transparent
          opacity={0}
        />
      </mesh>

      {/* Html readout */}
      <Html position={[1.1, -0.5, 0]}>
        <div className="bg-gray-950/85 border border-gray-700 rounded-xl p-2 text-[11px] pointer-events-none min-w-[110px]">
          <div className="flex items-center justify-between gap-3 mb-1">
            <span className="text-gray-400">pH</span>
            <span className="font-mono font-bold" style={{ color: flaskColor }}>{pH.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-gray-400">Vol</span>
            <span className="font-mono text-gray-300">{volume.toFixed(1)} mL</span>
          </div>
          {nearEquiv && (
            <div className="mt-1 text-center text-[9px] text-amber-400 animate-pulse font-semibold">
              ≈ Equivalence!
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}

// ── scenarios ─────────────────────────────────────────────────────────────────
const SCENARIOS = [
  { id: 'strong_strong', label: 'Strong/Strong', description: 'Strong acid + strong base, equivalence at pH 7' },
  { id: 'weak_strong', label: 'Weak/Strong', description: 'Weak acid + strong base, equivalence at pH ~9' },
];

// ── main component ────────────────────────────────────────────────────────────
export default function AcidBaseTitration() {
  const [scenario, setScenario] = useState<TitrationScenario>('strong_strong');
  const [volume, setVolume] = useState(0);

  const pH = computePH(volume, scenario);
  const flaskColor = pHtoColor(pH);
  const neutralPct = Math.min(100, (volume / 25) * 100);

  const handleScenario = (id: TitrationScenario) => {
    setScenario(id);
    setVolume(0);
  };

  // Pre-compute full curve
  const curveData = useMemo(() => {
    const pts = [];
    for (let v = 0; v <= 50; v += 0.5) {
      pts.push({ volume: v, pH: Math.max(0, Math.min(14, computePH(v, scenario))) });
    }
    return pts;
  }, [scenario]);

  return (
    <div className="w-full h-full flex overflow-hidden">
      {/* 3D Canvas */}
      <div className="flex-1 relative min-w-0">
        <Canvas camera={{ position: [0, 0, 6], fov: 45 }} style={{ background: '#030712' }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[4, 6, 3]} intensity={1.0} />
          <pointLight position={[0, -1.1, 2]} color={flaskColor} intensity={1.5} distance={5} />
          <TitrationScene volume={volume} pH={pH} />
          <OrbitControls enablePan={false} minDistance={4} maxDistance={10} />
        </Canvas>
      </div>

      {/* Right panel */}
      <div className="w-72 flex-shrink-0 bg-gray-950 border-l border-gray-800 overflow-y-auto scrollbar-thin p-3 space-y-4">

        <ScenarioSelect
          label="Scenario"
          scenarios={SCENARIOS}
          value={scenario}
          onChange={handleScenario}
          color="cyan"
        />

        <ControlSlider
          label="Volume Added (mL)"
          value={volume}
          min={0}
          max={50}
          step={0.1}
          color="#22d3ee"
          onChange={setVolume}
          precision={1}
        />

        <DataOverlay
          equation={{ text: 'pH = -log[H⁺]', color: '#94a3b8' }}
          readouts={[
            { label: 'Volume Added', value: `${volume.toFixed(1)} mL`, color: '#22d3ee' },
            { label: 'Current pH', value: pH.toFixed(2), color: flaskColor, highlight: true },
            { label: 'Equivalence Point', value: '25.0 mL', color: '#a78bfa' },
            { label: 'Neutralization', value: `${neutralPct.toFixed(1)}%`, color: '#fbbf24' },
          ]}
        />

        {/* pH curve chart */}
        <div>
          <p className="text-[10px] text-gray-600 font-semibold uppercase tracking-wider mb-2">Titration Curve</p>
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-2">
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={curveData} margin={{ top: 8, right: 8, bottom: 4, left: -18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="volume"
                  tick={{ fill: '#6b7280', fontSize: 9 }}
                  tickLine={false}
                  axisLine={false}
                  label={{ value: 'mL', position: 'insideBottomRight', offset: -4, fill: '#4b5563', fontSize: 9 }}
                />
                <YAxis
                  domain={[0, 14]}
                  tick={{ fill: '#6b7280', fontSize: 9 }}
                  tickLine={false}
                  axisLine={false}
                  label={{ value: 'pH', angle: -90, position: 'insideLeft', fill: '#4b5563', fontSize: 9 }}
                />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11 }}
                  labelStyle={{ color: '#94a3b8' }}
                  itemStyle={{ color: '#e2e8f0' }}
                  formatter={(v: number) => [v.toFixed(2), 'pH']}
                  labelFormatter={(v) => `${v} mL`}
                />
                <ReferenceLine y={7} stroke="#64748b" strokeDasharray="4 3" label={{ value: 'pH 7', fill: '#64748b', fontSize: 9 }} />
                <ReferenceLine x={volume} stroke="#fbbf24" strokeWidth={1.5} strokeDasharray="3 3" />
                <Line
                  type="monotone"
                  dataKey="pH"
                  stroke="#22d3ee"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: '#22d3ee' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-3 text-[11px] text-gray-400 space-y-1">
          <p>The <span className="text-amber-400 font-semibold">steep inflection</span> marks the equivalence point where moles of acid = moles of base.</p>
          <p>Weak acid titrations show a <span className="text-cyan-400 font-semibold">buffer region</span> giving a more gradual curve.</p>
        </div>

      </div>
    </div>
  );
}
