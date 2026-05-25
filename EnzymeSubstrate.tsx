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

// ── kinetics model ────────────────────────────────────────────────────────────
function computeRate(temp: number, pH: number): number {
  const tempFactor = Math.exp(-Math.pow((temp - 37) / 15, 2));
  const pHFactor = Math.exp(-Math.pow((pH - 7) / 2, 2));
  return 10 * tempFactor * pHFactor;
}

function rateStatus(rate: number): string {
  if (rate >= 5) return 'Active';
  if (rate >= 2) return 'Reduced';
  return 'Denatured';
}

function enzymeColor(rate: number): string {
  if (rate >= 5) return '#22c55e';
  if (rate >= 2) return '#eab308';
  return '#ef4444';
}

// ── substrate state machine ────────────────────────────────────────────────────
// Phase: approach → bind → react → release → retreat → approach
const PHASE_DURATIONS = {
  approach: 1.2,
  bind: 0.5,
  react: 0.8,
  release: 0.4,
  retreat: 1.0,
};

// ── enzyme mesh (torus + gap illusion via arc) ────────────────────────────────
interface EnzymeProps {
  rate: number;
}

function EnzymeMesh({ rate }: EnzymeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const color = enzymeColor(rate);
  const isDenatured = rate < 2;

  useFrame((state) => {
    if (!groupRef.current) return;
    if (isDenatured) {
      // Distorted wobble
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 2.3) * 0.25;
      groupRef.current.rotation.z = Math.cos(state.clock.elapsedTime * 1.7) * 0.2;
    } else {
      // Gentle idle rotation
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.3;
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, 0.05);
      groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, 0, 0.05);
    }
  });

  return (
    <group ref={groupRef}>
      {/* Main torus body */}
      <mesh>
        <torusGeometry args={[0.8, 0.28, 16, 48, Math.PI * 1.75]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.25}
          roughness={0.4}
          metalness={0.1}
        />
      </mesh>

      {/* Left arm endpoint */}
      <mesh position={[-0.8, 0, 0]}>
        <sphereGeometry args={[0.28, 12, 12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.25} roughness={0.4} />
      </mesh>
      {/* Right arm endpoint */}
      <mesh position={[0.56, -0.56, 0]}>
        <sphereGeometry args={[0.28, 12, 12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.25} roughness={0.4} />
      </mesh>

      {/* Active site label */}
      <Html position={[0, 0, 0]}>
        <div className="text-[9px] text-gray-500 pointer-events-none font-semibold tracking-wider text-center whitespace-nowrap">
          ACTIVE SITE
        </div>
      </Html>
    </group>
  );
}

// ── substrate ─────────────────────────────────────────────────────────────────
interface SubstrateProps {
  rate: number;
}

function SubstrateSphere({ rate }: SubstrateProps) {
  const ref = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const phase = useRef<keyof typeof PHASE_DURATIONS>('approach');
  const phaseT = useRef(0);
  const isDenatured = rate < 2;

  // Positions
  const startPos = new THREE.Vector3(2.5, 1.5, 0);
  const activePos = new THREE.Vector3(0, 0, 0);
  const exitPos = new THREE.Vector3(-2.5, 1.8, 0);

  useFrame((_, delta) => {
    if (!ref.current) return;
    const speed = Math.max(0.2, rate / 10);
    phaseT.current += delta * speed;

    const dur = PHASE_DURATIONS[phase.current];
    if (phaseT.current >= dur) {
      phaseT.current -= dur;
      const seq: (keyof typeof PHASE_DURATIONS)[] = isDenatured
        ? ['approach', 'retreat']
        : ['approach', 'bind', 'react', 'release', 'retreat'];
      const idx = seq.indexOf(phase.current);
      phase.current = seq[(idx + 1) % seq.length];
    }

    const t = Math.min(1, phaseT.current / PHASE_DURATIONS[phase.current]);
    const mat = ref.current.material as THREE.MeshStandardMaterial;

    if (isDenatured) {
      // Substrate bounces off — arcs toward enzyme then retreats
      if (phase.current === 'approach') {
        const midPos = new THREE.Vector3(0.6, 0.8, 0);
        if (t < 0.5) {
          ref.current.position.lerpVectors(startPos, midPos, t * 2);
        } else {
          ref.current.position.lerpVectors(midPos, startPos, (t - 0.5) * 2);
        }
        mat.emissiveIntensity = 0.1;
      } else {
        ref.current.position.copy(startPos);
      }
    } else {
      if (phase.current === 'approach') {
        ref.current.position.lerpVectors(startPos, activePos, t);
        mat.emissiveIntensity = 0.2;
      } else if (phase.current === 'bind') {
        ref.current.position.copy(activePos);
        mat.emissiveIntensity = 0.8;
      } else if (phase.current === 'react') {
        ref.current.position.copy(activePos);
        mat.emissiveIntensity = 0.5 + 0.5 * Math.sin(t * Math.PI * 6);
        // Reaction glow
        if (glowRef.current) {
          (glowRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5 + 0.5 * Math.sin(t * Math.PI * 6);
          glowRef.current.scale.setScalar(1 + 0.3 * Math.sin(t * Math.PI * 4));
        }
      } else if (phase.current === 'release') {
        ref.current.position.lerpVectors(activePos, exitPos, t * 0.3);
        mat.emissiveIntensity = 0.3;
      } else if (phase.current === 'retreat') {
        const releaseStart = new THREE.Vector3().lerpVectors(activePos, exitPos, 0.3);
        ref.current.position.lerpVectors(releaseStart, exitPos, t);
        mat.emissiveIntensity = 0.1;
      }

      if (phase.current !== 'react' && glowRef.current) {
        (glowRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0;
      }
    }
  });

  return (
    <group>
      <mesh ref={ref} position={[2.5, 1.5, 0]}>
        <sphereGeometry args={[0.22, 14, 14]} />
        <meshStandardMaterial
          color="#f1f5f9"
          emissive="#f1f5f9"
          emissiveIntensity={0.2}
          roughness={0.3}
        />
      </mesh>
      {/* Reaction glow sphere */}
      <mesh ref={glowRef} position={[0, 0, 0]}>
        <sphereGeometry args={[0.45, 14, 14]} />
        <meshStandardMaterial
          color="#fbbf24"
          emissive="#fbbf24"
          emissiveIntensity={0}
          transparent
          opacity={0.25}
        />
      </mesh>
    </group>
  );
}

// ── scene ─────────────────────────────────────────────────────────────────────
interface SceneProps {
  rate: number;
}

function EnzymeScene({ rate }: SceneProps) {
  const color = enzymeColor(rate);
  return (
    <group>
      <pointLight position={[0, 2, 2]} color={color} intensity={1.5} distance={8} />
      <EnzymeMesh rate={rate} />
      <SubstrateSphere rate={rate} />
    </group>
  );
}

// ── scenarios ─────────────────────────────────────────────────────────────────
const SCENARIOS = [
  { id: 'optimal', label: 'Optimal', description: 'T=37°C, pH=7 — peak enzyme activity' },
  { id: 'denatured', label: 'Denatured', description: 'T=80°C, pH=2 — enzyme denatured' },
];

type EnzymeScenario = 'optimal' | 'denatured';

// ── main component ────────────────────────────────────────────────────────────
export default function EnzymeSubstrate() {
  const [scenario, setScenario] = useState<EnzymeScenario>('optimal');
  const [temperature, setTemperature] = useState(37);
  const [pH, setPH] = useState(7);

  const rate = computeRate(temperature, pH);
  const status = rateStatus(rate);
  const color = enzymeColor(rate);

  const handleScenario = (id: EnzymeScenario) => {
    setScenario(id);
    if (id === 'optimal') { setTemperature(37); setPH(7); }
    else { setTemperature(80); setPH(2); }
  };

  // Rate vs temperature curve for current pH
  const rateVsTempData = useMemo(() => {
    const pts = [];
    for (let t = 0; t <= 100; t += 2) {
      pts.push({ temp: t, rate: computeRate(t, pH) });
    }
    return pts;
  }, [pH]);

  return (
    <div className="w-full h-full flex overflow-hidden">
      {/* 3D Canvas */}
      <div className="flex-1 relative min-w-0">
        <Canvas camera={{ position: [0, 1, 5.5], fov: 45 }} style={{ background: '#030712' }}>
          <ambientLight intensity={0.4} />
          <directionalLight position={[3, 5, 4]} intensity={0.8} />
          <EnzymeScene rate={rate} />
          <OrbitControls enablePan={false} minDistance={3} maxDistance={10} />
        </Canvas>
      </div>

      {/* Right panel */}
      <div className="w-72 flex-shrink-0 bg-gray-950 border-l border-gray-800 overflow-y-auto scrollbar-thin p-3 space-y-4">

        <ScenarioSelect
          label="Scenario"
          scenarios={SCENARIOS}
          value={scenario}
          onChange={handleScenario}
          color="emerald"
        />

        <ControlSlider
          label="Temperature (°C)"
          value={temperature}
          min={0}
          max={100}
          step={1}
          color="#f97316"
          onChange={setTemperature}
          precision={0}
        />

        <ControlSlider
          label="pH"
          value={pH}
          min={0}
          max={14}
          step={0.1}
          color="#22d3ee"
          onChange={setPH}
          precision={1}
        />

        <DataOverlay
          equation={{ text: 'Rate ∝ e^(-((T-T_opt)/σ)²)', color: '#86efac' }}
          readouts={[
            { label: 'Temperature', value: `${temperature}°C`, color: '#f97316' },
            { label: 'pH', value: pH.toFixed(1), color: '#22d3ee' },
            { label: 'Reaction Rate', value: `${rate.toFixed(2)} U`, color, highlight: true },
            { label: 'Vmax', value: '10.00 U', color: '#94a3b8' },
            { label: '% of Vmax', value: `${(rate / 10 * 100).toFixed(1)}%`, color: '#a78bfa' },
            { label: 'Status', value: status, color, highlight: status === 'Active' },
          ]}
        />

        {/* Rate vs temperature chart */}
        <div>
          <p className="text-[10px] text-gray-600 font-semibold uppercase tracking-wider mb-2">Rate vs Temperature (at pH {pH.toFixed(1)})</p>
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-2">
            <ResponsiveContainer width="100%" height={130}>
              <LineChart data={rateVsTempData} margin={{ top: 8, right: 8, bottom: 4, left: -18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="temp"
                  tick={{ fill: '#6b7280', fontSize: 9 }}
                  tickLine={false}
                  axisLine={false}
                  label={{ value: '°C', position: 'insideBottomRight', offset: -4, fill: '#4b5563', fontSize: 9 }}
                />
                <YAxis
                  domain={[0, 10.5]}
                  tick={{ fill: '#6b7280', fontSize: 9 }}
                  tickLine={false}
                  axisLine={false}
                  label={{ value: 'Rate', angle: -90, position: 'insideLeft', fill: '#4b5563', fontSize: 9 }}
                />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11 }}
                  labelStyle={{ color: '#94a3b8' }}
                  itemStyle={{ color: '#e2e8f0' }}
                  formatter={(v: number) => [v.toFixed(2), 'Rate']}
                  labelFormatter={(v) => `T = ${v}°C`}
                />
                <ReferenceLine x={temperature} stroke="#fbbf24" strokeWidth={1.5} strokeDasharray="3 3" />
                <ReferenceLine x={37} stroke="#22c55e" strokeDasharray="4 2" strokeOpacity={0.5} />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: '#22c55e' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-3 text-[11px] text-gray-400 space-y-1">
          <p>Enzymes are <span className="text-green-400 font-semibold">most active</span> at their optimal temperature (~37°C) and pH (~7).</p>
          <p>At high temperatures or extreme pH, the enzyme <span className="text-red-400 font-semibold">denatures</span> — its 3D shape unfolds, blocking the active site.</p>
        </div>

      </div>
    </div>
  );
}
