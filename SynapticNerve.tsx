import { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import ControlSlider from '../../components/ControlSlider';
import ScenarioSelect from '../../components/ScenarioSelect';
import DataOverlay from '../../components/DataOverlay';

const SCENARIOS = [
  { id: 'resting', label: 'Resting State', description: 'Low frequency baseline activity' },
  { id: 'firing', label: 'Active Firing', description: 'High frequency stimulation at 8 Hz' },
];

interface VesicleProps {
  freq: number;
  index: number;
}

function Vesicle({ freq, index }: VesicleProps) {
  const ref = useRef<THREE.Mesh>(null);
  const offset = (index / 8) * Math.PI * 2;
  const speed = freq * 0.12;

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = ((clock.elapsedTime * speed + offset) % 1);
    const x = THREE.MathUtils.lerp(-0.5, 0.5, t) + (Math.sin(index * 2.3) * 0.3);
    const y = THREE.MathUtils.lerp(0.55, 0.0, t);
    const z = Math.sin(index * 1.7) * 0.3;
    ref.current.position.set(x, y, z);
    ref.current.scale.setScalar(t < 0.9 ? 1 : 1 - (t - 0.9) * 10);
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.07, 10, 10]} />
      <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.5} />
    </mesh>
  );
}

interface CalciumIonProps {
  freq: number;
  index: number;
}

function CalciumIon({ freq, index }: CalciumIonProps) {
  const ref = useRef<THREE.Mesh>(null);
  const offset = (index / 5) * Math.PI * 2;
  const speed = freq * 0.1;

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = (clock.elapsedTime * speed + offset) % 1;
    const angle = t * Math.PI * 2;
    const r = 0.3 + t * 0.2;
    ref.current.position.set(
      Math.cos(angle) * r - 0.8,
      0.4 + Math.sin(t * Math.PI) * 0.3,
      Math.sin(angle) * r * 0.3,
    );
    ref.current.scale.setScalar(freq > 2 ? 1 : 0.3);
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.05, 8, 8]} />
      <meshStandardMaterial color="#fb923c" emissive="#fb923c" emissiveIntensity={0.7} />
    </mesh>
  );
}

interface RippleProps {
  freq: number;
}

function AxonRipple({ freq }: RippleProps) {
  const ref = useRef<THREE.Mesh>(null);
  const speed = freq * 0.15;

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = (clock.elapsedTime * speed) % 1;
    ref.current.position.x = THREE.MathUtils.lerp(-2.5, -0.9, t);
    const brightness = Math.sin(t * Math.PI);
    (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity = brightness * 1.2;
    ref.current.scale.setScalar(0.5 + brightness * 0.5);
  });

  return (
    <mesh ref={ref} position={[-2.5, 0.3, 0]}>
      <sphereGeometry args={[0.12, 10, 10]} />
      <meshStandardMaterial color="#a78bfa" emissive="#a78bfa" emissiveIntensity={0} />
    </mesh>
  );
}

interface SynapticSceneProps {
  freq: number;
  scenario: string;
}

function SynapticScene({ freq, scenario }: SynapticSceneProps) {
  const firing = scenario === 'firing' || freq > 3;

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[3, 3, 3]} intensity={1} color="#ffffff" />
      <pointLight position={[-3, 0, 0]} intensity={0.6} color="#a78bfa" />

      {/* Axon stub */}
      <mesh position={[-1.8, 0.3, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.12, 0.18, 1.5, 12]} />
        <meshStandardMaterial color="#64748b" />
      </mesh>

      {/* Presynaptic terminal dome */}
      <mesh position={[-0.6, 0.3, 0]}>
        <sphereGeometry args={[0.45, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
        <meshStandardMaterial color="#475569" side={THREE.DoubleSide} />
      </mesh>

      {/* Synaptic cleft label */}
      <Html position={[0, -0.2, 0]} center>
        <div className="text-yellow-400 text-xs font-mono opacity-70">cleft</div>
      </Html>

      {/* Postsynaptic membrane */}
      <mesh position={[0.65, 0.3, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.55, 0.55, 0.08, 24]} />
        <meshStandardMaterial color="#334155" />
      </mesh>

      {/* Receptor dots on postsynaptic */}
      {Array.from({ length: 6 }).map((_, i) => {
        const angle = (i / 6) * Math.PI * 2;
        return (
          <mesh key={i} position={[0.68, 0.3 + Math.cos(angle) * 0.3, Math.sin(angle) * 0.3]}>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshStandardMaterial color="#7c3aed" emissive="#7c3aed" emissiveIntensity={firing ? 0.8 : 0.1} />
          </mesh>
        );
      })}

      {/* Vesicles in presynaptic */}
      {Array.from({ length: 8 }).map((_, i) => (
        <Vesicle key={i} freq={freq} index={i} />
      ))}

      {/* Calcium ions */}
      {Array.from({ length: 5 }).map((_, i) => (
        <CalciumIon key={i} freq={freq} index={i} />
      ))}

      {/* Axon ripple */}
      <AxonRipple freq={freq} />

      <OrbitControls enablePan={false} minDistance={2} maxDistance={10} />
    </>
  );
}

export default function SynapticNerve() {
  const [stimulusFreq, setStimulusFreq] = useState(0.5);
  const [scenario, setScenario] = useState('resting');

  const handleScenarioChange = (id: string) => {
    setScenario(id);
    if (id === 'resting') setStimulusFreq(0.5);
    if (id === 'firing') setStimulusFreq(8);
  };

  const releaseRate = (stimulusFreq * 12).toFixed(1);
  const calciumInflux = (stimulusFreq * 8).toFixed(1);
  const postsynapticPotential = Math.min(70, stimulusFreq * 8).toFixed(1);

  const chartData = useMemo(() => {
    return Array.from({ length: 80 }, (_, i) => ({
      t: i * 0.1,
      concentration: Math.max(0, Math.sin(i * 0.1 * stimulusFreq * Math.PI * 2 * 0.1) * 0.5 + 0.5),
    }));
  }, [stimulusFreq]);

  return (
    <div className="w-full h-full flex overflow-hidden">
      <div className="flex-1">
        <Canvas style={{ background: '#030712' }} camera={{ position: [0, 1, 5], fov: 50 }}>
          <SynapticScene freq={stimulusFreq} scenario={scenario} />
        </Canvas>
      </div>

      <div className="w-72 bg-gray-950 border-l border-gray-800 overflow-y-auto scrollbar-thin p-3 space-y-4">
        <ScenarioSelect
          label="Scenario"
          scenarios={SCENARIOS}
          value={scenario}
          onChange={handleScenarioChange}
          color="#22d3ee"
        />

        <ControlSlider
          label="Stimulus Frequency"
          value={stimulusFreq}
          min={0.5}
          max={10}
          step={0.5}
          color="#22d3ee"
          onChange={setStimulusFreq}
          precision={1}
          formatValue={(v) => `${v.toFixed(1)} Hz`}
        />

        <DataOverlay
          equation={{ text: 'Release ∝ [Ca²⁺]² × Frequency', color: '#22d3ee' }}
          readouts={[
            { label: 'Stimulus Freq', value: `${stimulusFreq.toFixed(1)} Hz`, color: '#22d3ee', highlight: true },
            { label: 'NT Release Rate', value: `${releaseRate} vesicles/s`, color: '#a78bfa' },
            { label: 'Ca²⁺ Influx', value: `${calciumInflux} mM/s`, color: '#fb923c' },
            { label: 'Postsynaptic Pot.', value: `${postsynapticPotential} mV`, color: '#34d399' },
          ]}
        />

        <div className="bg-gray-900 rounded-lg p-3 border border-gray-800">
          <p className="text-xs font-semibold text-cyan-400 mb-2">NT Concentration vs Time</p>
          <ResponsiveContainer width="100%" height={110}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="t" tick={{ fill: '#64748b', fontSize: 9 }} tickCount={5} />
              <YAxis tick={{ fill: '#64748b', fontSize: 9 }} domain={[0, 1.1]} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 4 }}
                labelStyle={{ color: '#94a3b8', fontSize: 10 }}
                itemStyle={{ color: '#22d3ee', fontSize: 10 }}
              />
              <Line type="monotone" dataKey="concentration" stroke="#22d3ee" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-900 rounded-lg p-3 border border-gray-800">
          <p className="text-xs font-semibold text-cyan-400 mb-1">Insight</p>
          <p className="text-xs text-gray-400 leading-relaxed">
            Calcium influx through voltage-gated Ca²⁺ channels triggers vesicle fusion via SNARE proteins. Higher firing frequencies cause calcium accumulation (facilitation), increasing neurotransmitter release probability — the basis of short-term synaptic plasticity.
          </p>
        </div>
      </div>
    </div>
  );
}
