import { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import ControlSlider from '../../components/ControlSlider';
import ScenarioSelect from '../../components/ScenarioSelect';
import DataOverlay from '../../components/DataOverlay';

const SCENARIOS = [
  { id: 'resting', label: 'Resting State', description: 'Below threshold — no action potential' },
  { id: 'threshold_met', label: 'Threshold Met', description: 'Above 55 mV — action potential fires' },
];

function getActionPotentialVoltage(t: number, aboveTreshold: boolean): number {
  if (!aboveTreshold) return -70;
  if (t < 1) return -70 + (110 * t);
  if (t < 2) return 40 - (110 * (t - 1));
  if (t < 3) return -70 - (10 * (t - 2));
  if (t < 4) return -80 + (10 * (t - 3));
  return -70;
}

interface IonProps {
  index: number;
  type: 'na' | 'k';
  phase: number;
  aboveThreshold: boolean;
}

function Ion({ index, type, phase, aboveThreshold }: IonProps) {
  const ref = useRef<THREE.Mesh>(null);
  const offset = index * 0.4;

  useFrame(({ clock }) => {
    if (!ref.current) return;
    if (!aboveThreshold) {
      ref.current.visible = false;
      return;
    }

    const t = ((clock.elapsedTime * 0.8 + offset) % 4);
    ref.current.visible = true;

    if (type === 'na') {
      if (t < 1 || t > 3.5) {
        ref.current.visible = false;
        return;
      }
      const progress = Math.min(1, (t - 1) / 1);
      const x = -1.5 + (index % 5) * 0.6;
      ref.current.position.set(x, THREE.MathUtils.lerp(0.3, -0.3, progress), (index * 0.3) % 1 - 0.5);
    } else {
      if (t < 1.5 || t > 3.0) {
        ref.current.visible = false;
        return;
      }
      const progress = Math.min(1, (t - 1.5) / 1.5);
      const x = -1.2 + (index % 4) * 0.7;
      ref.current.position.set(x, THREE.MathUtils.lerp(-0.3, 0.3, progress), (index * 0.4) % 1 - 0.5);
    }
  });

  const color = type === 'na' ? '#22d3ee' : '#f59e0b';
  const size = type === 'na' ? 0.06 : 0.08;

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[size, 10, 10]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.7} />
    </mesh>
  );
}

interface ChannelProps {
  x: number;
  type: 'na' | 'k';
  phase: number;
  aboveThreshold: boolean;
}

function Channel({ x, type, phase, aboveThreshold }: ChannelProps) {
  const ref = useRef<THREE.Mesh>(null);
  const color = type === 'na' ? '#22d3ee' : '#f59e0b';

  const naOpen = aboveThreshold && phase > 0 && phase < 2;
  const kOpen = aboveThreshold && phase >= 1 && phase < 3;
  const isOpen = type === 'na' ? naOpen : kOpen;

  useFrame(() => {
    if (!ref.current) return;
    (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity = isOpen ? 0.8 : 0.05;
  });

  return (
    <group position={[x, 0, 0]}>
      <mesh ref={ref} position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.35, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.05} />
      </mesh>
      <mesh position={[0, -0.2, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.35, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.05} />
      </mesh>
      {!isOpen && (
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.1, 8]} />
          <meshStandardMaterial color="#374151" />
        </mesh>
      )}
      <Html position={[0, 0.5, 0]} center>
        <div className={`text-xs font-mono px-1 rounded ${type === 'na' ? 'text-cyan-400' : 'text-amber-400'}`} style={{ fontSize: 9 }}>
          {type === 'na' ? 'Na⁺' : 'K⁺'}
        </div>
      </Html>
    </group>
  );
}

interface ActionPotentialSceneProps {
  stimulus: number;
  aboveThreshold: boolean;
  phase: number;
}

function ActionPotentialScene({ aboveThreshold, phase }: ActionPotentialSceneProps) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[3, 3, 3]} intensity={1} />
      <pointLight position={[-3, -3, 3]} intensity={0.4} color="#22d3ee" />

      {/* Membrane plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[5, 2]} />
        <meshStandardMaterial color="#374151" opacity={0.5} transparent side={THREE.DoubleSide} />
      </mesh>

      {/* Outside label */}
      <Html position={[-2.3, 0.5, 0]} center>
        <div className="text-blue-300 text-xs font-mono bg-gray-900/70 px-2 py-0.5 rounded">Outside (+)</div>
      </Html>

      {/* Inside label */}
      <Html position={[-2.3, -0.5, 0]} center>
        <div className="text-purple-300 text-xs font-mono bg-gray-900/70 px-2 py-0.5 rounded">Inside (−)</div>
      </Html>

      {/* Na+ channels */}
      {[-1.5, -0.5, 0.5, 1.5].map((x, i) => (
        <Channel key={`na-${i}`} x={x} type="na" phase={phase} aboveThreshold={aboveThreshold} />
      ))}

      {/* K+ channels */}
      {[-1.0, 0.0, 1.0].map((x, i) => (
        <Channel key={`k-${i}`} x={x + 2.5} type="k" phase={phase} aboveThreshold={aboveThreshold} />
      ))}

      {/* Ion particles */}
      {Array.from({ length: 10 }).map((_, i) => (
        <Ion key={`na-ion-${i}`} index={i} type="na" phase={phase} aboveThreshold={aboveThreshold} />
      ))}
      {Array.from({ length: 8 }).map((_, i) => (
        <Ion key={`k-ion-${i}`} index={i} type="k" phase={phase} aboveThreshold={aboveThreshold} />
      ))}

      {!aboveThreshold && (
        <Html position={[0, -1.2, 0]} center>
          <div className="text-gray-400 text-xs bg-gray-900/80 px-3 py-1 rounded border border-gray-700">
            Resting — no action potential
          </div>
        </Html>
      )}

      <OrbitControls enablePan={false} minDistance={4} maxDistance={14} />
    </>
  );
}

export default function ActionPotential() {
  const [stimulus, setStimulus] = useState(30);
  const [scenario, setScenario] = useState('resting');

  const handleScenarioChange = (id: string) => {
    setScenario(id);
    if (id === 'resting') setStimulus(30);
    if (id === 'threshold_met') setStimulus(70);
  };

  const aboveThreshold = stimulus >= 55;
  const THRESHOLD = 55;

  const phaseRef = useRef(0);
  const [displayPhase, setDisplayPhase] = useState(0);

  // For visualization purposes, phase cycles when above threshold
  const animPhase = useMemo(() => {
    return aboveThreshold ? (Date.now() / 1000) % 4 : 0;
  }, [aboveThreshold]);

  const voltageData = useMemo(() => {
    return Array.from({ length: 100 }, (_, i) => {
      const t = i * 0.05;
      return { t: parseFloat(t.toFixed(2)), v: getActionPotentialVoltage(t, aboveThreshold) };
    });
  }, [aboveThreshold]);

  const peakVoltage = aboveThreshold ? '+40 mV' : '-70 mV';
  const statusText = aboveThreshold ? 'ACTION POTENTIAL' : 'Resting';

  const naState = aboveThreshold ? 'Opening / Closing' : 'Closed';
  const kState = aboveThreshold ? 'Open' : 'Closed';

  return (
    <div className="w-full h-full flex overflow-hidden">
      <div className="flex-1">
        <Canvas style={{ background: '#030712' }} camera={{ position: [0, 2, 7], fov: 50 }}>
          <ActionPotentialScene stimulus={stimulus} aboveThreshold={aboveThreshold} phase={animPhase} />
        </Canvas>
      </div>

      <div className="w-72 bg-gray-950 border-l border-gray-800 overflow-y-auto scrollbar-thin p-3 space-y-4">
        <ScenarioSelect
          label="Scenario"
          scenarios={SCENARIOS}
          value={scenario}
          onChange={handleScenarioChange}
          color="#a78bfa"
        />

        <ControlSlider
          label="Stimulus Strength"
          value={stimulus}
          min={0}
          max={100}
          step={1}
          color="#a78bfa"
          onChange={setStimulus}
          precision={0}
          formatValue={(v) => `${v} mV`}
        />

        <DataOverlay
          equation={{ text: 'Threshold: −55 mV', color: '#a78bfa' }}
          readouts={[
            { label: 'Stimulus', value: `${stimulus} mV`, color: '#a78bfa', highlight: aboveThreshold },
            { label: 'Threshold', value: `${THRESHOLD} mV`, color: '#64748b' },
            { label: 'Status', value: statusText, color: aboveThreshold ? '#22d3ee' : '#94a3b8', highlight: aboveThreshold },
            { label: 'Peak Voltage', value: peakVoltage, color: '#f59e0b' },
            { label: 'Na⁺ Channels', value: naState, color: '#22d3ee' },
            { label: 'K⁺ Channels', value: kState, color: '#f59e0b' },
          ]}
        />

        <div className="bg-gray-900 rounded-lg p-3 border border-gray-800">
          <p className="text-xs font-semibold text-violet-400 mb-2">Voltage vs Time</p>
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={voltageData} margin={{ top: 4, right: 8, left: -15, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="t" tick={{ fill: '#64748b', fontSize: 9 }} tickCount={6} label={{ value: 'ms', position: 'insideBottom', offset: -2, fill: '#64748b', fontSize: 9 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 9 }} domain={[-90, 50]} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 4 }}
                labelStyle={{ color: '#94a3b8', fontSize: 10 }}
                itemStyle={{ color: '#a78bfa', fontSize: 10 }}
              />
              <ReferenceLine y={-55} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1} label={{ value: 'threshold', fill: '#ef4444', fontSize: 8, position: 'right' }} />
              <ReferenceLine y={-70} stroke="#475569" strokeDasharray="3 3" strokeWidth={1} />
              <Line type="monotone" dataKey="v" stroke="#a78bfa" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-900 rounded-lg p-3 border border-gray-800">
          <p className="text-xs font-semibold text-violet-400 mb-1">Insight</p>
          <p className="text-xs text-gray-400 leading-relaxed">
            The action potential follows the all-or-nothing principle: below threshold, no response; above threshold, a full spike always occurs at the same amplitude. Refractory periods (absolute and relative) prevent backward propagation and limit maximum firing rates to ~500 Hz.
          </p>
        </div>
      </div>
    </div>
  );
}
