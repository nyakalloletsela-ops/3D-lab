import { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import ControlSlider from '../../components/ControlSlider';
import ScenarioSelect from '../../components/ScenarioSelect';
import DataOverlay from '../../components/DataOverlay';

const SCENARIOS = [
  { id: 'normal', label: 'Normal Circulation', description: 'Healthy thermohaline conveyor belt' },
  { id: 'stalled', label: 'Stalled Circulation', description: 'Near-collapse from freshwater dilution (9 Sv)' },
];

interface CurrentParticleProps {
  index: number;
  conveyorSpeed: number;
  type: 'warm' | 'cold';
}

function CurrentParticle({ index, conveyorSpeed, type }: CurrentParticleProps) {
  const ref = useRef<THREE.Mesh>(null);
  const offset = index / 12;

  const warmPath = useMemo(() => {
    return [
      new THREE.Vector3(-3.5, 0.15, 0),
      new THREE.Vector3(-2.0, 0.2, 0),
      new THREE.Vector3(0, 0.25, 0),
      new THREE.Vector3(2.0, 0.2, 0),
      new THREE.Vector3(3.0, 0.1, 0),
      new THREE.Vector3(3.5, -0.1, 0),
    ];
  }, []);

  const coldPath = useMemo(() => {
    return [
      new THREE.Vector3(3.5, -0.2, 0),
      new THREE.Vector3(2.0, -0.3, 0),
      new THREE.Vector3(0, -0.3, 0),
      new THREE.Vector3(-2.0, -0.25, 0),
      new THREE.Vector3(-3.5, -0.15, 0),
    ];
  }, []);

  const curve = useMemo(() => {
    const path = type === 'warm' ? warmPath : coldPath;
    return new THREE.CatmullRomCurve3(path);
  }, [type, warmPath, coldPath]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = ((clock.elapsedTime * conveyorSpeed * 0.15 + offset) % 1);
    const pt = curve.getPoint(t);
    ref.current.position.copy(pt);
    ref.current.visible = conveyorSpeed > 0.15;

    const alpha = Math.sin(t * Math.PI);
    (ref.current.material as THREE.MeshStandardMaterial).opacity = alpha * 0.85;
  });

  const color = type === 'warm' ? '#ef4444' : '#38bdf8';

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[type === 'warm' ? 0.08 : 0.07, 8, 8]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} transparent opacity={0.8} />
    </mesh>
  );
}

interface FreshwaterDropProps {
  index: number;
  freshwaterInput: number;
}

function FreshwaterDrop({ index, freshwaterInput }: FreshwaterDropProps) {
  const ref = useRef<THREE.Mesh>(null);
  const offset = index / 8;

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.visible = freshwaterInput > 0;
    if (freshwaterInput <= 0) return;

    const t = (clock.elapsedTime * 0.4 * freshwaterInput * 0.2 + offset) % 1;
    const x = 2.5 + Math.sin(index * 1.2) * 0.8;
    ref.current.position.set(x, THREE.MathUtils.lerp(2.0, 0.0, t), 0.1);
    (ref.current.material as THREE.MeshStandardMaterial).opacity = Math.sin(t * Math.PI) * 0.8;
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.07, 8, 8]} />
      <meshStandardMaterial color="#bae6fd" emissive="#bae6fd" emissiveIntensity={0.3} transparent opacity={0.8} />
    </mesh>
  );
}

function ContinentShape({ side }: { side: 'left' | 'right' }) {
  const xOff = side === 'left' ? -4.8 : 4.8;
  const color = '#374151';

  return (
    <group position={[xOff, 0, 0]}>
      <mesh>
        <boxGeometry args={[1.5, 0.2, 4]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[side === 'left' ? 0.3 : -0.3, 0, 1]}>
        <boxGeometry args={[0.8, 0.2, 1.5]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}

interface ThermohalineSceneProps {
  freshwaterInput: number;
  conveyorSpeed: number;
}

function ThermohalineScene({ freshwaterInput, conveyorSpeed }: ThermohalineSceneProps) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[0, 5, 5]} intensity={1.0} color="#ffffff" />
      <pointLight position={[0, -2, 0]} intensity={0.4} color="#38bdf8" />

      {/* Ocean base */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.35, 0]}>
        <planeGeometry args={[12, 6]} />
        <meshStandardMaterial color="#0c4a6e" />
      </mesh>

      {/* Continents */}
      <ContinentShape side="left" />
      <ContinentShape side="right" />

      {/* Warm current line (surface) */}
      {Array.from({ length: 14 }).map((_, i) => (
        <CurrentParticle key={`w${i}`} index={i} conveyorSpeed={conveyorSpeed} type="warm" />
      ))}

      {/* Cold current line (deep) */}
      {Array.from({ length: 12 }).map((_, i) => (
        <CurrentParticle key={`c${i}`} index={i} conveyorSpeed={conveyorSpeed} type="cold" />
      ))}

      {/* Freshwater drops */}
      {Array.from({ length: 8 }).map((_, i) => (
        <FreshwaterDrop key={i} index={i} freshwaterInput={freshwaterInput} />
      ))}

      {/* North pole ice */}
      <mesh position={[3.0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.8, 16]} />
        <meshStandardMaterial color="#e0f2fe" opacity={0.7} transparent />
      </mesh>

      {/* Labels */}
      <Html position={[-1, 0.6, 0]} center>
        <div className="text-red-400 text-xs font-mono bg-gray-900/70 px-2 py-0.5 rounded" style={{ fontSize: 9 }}>Gulf Stream</div>
      </Html>
      <Html position={[1, -0.7, 0]} center>
        <div className="text-sky-400 text-xs font-mono bg-gray-900/70 px-2 py-0.5 rounded" style={{ fontSize: 9 }}>N. Atlantic Deep Water</div>
      </Html>
      {conveyorSpeed < 0.3 && (
        <Html position={[0, 1.2, 0]} center>
          <div className="text-yellow-400 text-xs font-bold bg-gray-900/80 px-2 py-1 rounded border border-yellow-700 animate-pulse">
            Circulation weakening!
          </div>
        </Html>
      )}

      <OrbitControls enablePan={false} minDistance={4} maxDistance={18} minPolarAngle={0.2} maxPolarAngle={Math.PI / 2.2} />
    </>
  );
}

export default function OceanicThermohaline() {
  const [freshwaterInput, setFreshwaterInput] = useState(0);
  const [scenario, setScenario] = useState('normal');

  const handleScenarioChange = (id: string) => {
    setScenario(id);
    if (id === 'normal') setFreshwaterInput(0);
    if (id === 'stalled') setFreshwaterInput(9);
  };

  const conveyorSpeed = Math.max(0.1, 1 - freshwaterInput * 0.09);
  const salinityEffect = (-freshwaterInput * 2.5).toFixed(1);
  const densityEffect = (-freshwaterInput * 0.015).toFixed(3);
  const status = conveyorSpeed > 0.7 ? 'Flowing' : conveyorSpeed > 0.3 ? 'Weakening' : 'Near-Stalled';

  const chartData = useMemo(() => {
    return Array.from({ length: 21 }, (_, i) => {
      const salinity = 35 - i * 0.25;
      const density = 1025 + salinity * 0.77;
      return { salinity: parseFloat(salinity.toFixed(2)), density: parseFloat(density.toFixed(2)) };
    });
  }, []);

  return (
    <div className="w-full h-full flex overflow-hidden">
      <div className="flex-1">
        <Canvas style={{ background: '#030712' }} camera={{ position: [0, 5, 8], fov: 55 }}>
          <ThermohalineScene freshwaterInput={freshwaterInput} conveyorSpeed={conveyorSpeed} />
        </Canvas>
      </div>

      <div className="w-72 bg-gray-950 border-l border-gray-800 overflow-y-auto scrollbar-thin p-3 space-y-4">
        <ScenarioSelect
          label="Scenario"
          scenarios={SCENARIOS}
          value={scenario}
          onChange={handleScenarioChange}
          color="#38bdf8"
        />

        <ControlSlider
          label="Freshwater Input"
          value={freshwaterInput}
          min={0}
          max={10}
          step={0.5}
          color="#bae6fd"
          onChange={setFreshwaterInput}
          precision={1}
          formatValue={(v) => `${v.toFixed(1)} Sv`}
        />

        <DataOverlay
          equation={{ text: 'ρ = ρ₀(1 + β×salinity − α×temp)', color: '#38bdf8' }}
          readouts={[
            { label: 'Freshwater Input', value: `${freshwaterInput.toFixed(1)} Sv`, color: '#bae6fd', highlight: freshwaterInput > 5 },
            { label: 'Conveyor Speed', value: `${(conveyorSpeed * 100).toFixed(0)}%`, color: '#38bdf8' },
            { label: 'Salinity Effect', value: `${salinityEffect} psu`, color: '#7dd3fc' },
            { label: 'Density Effect', value: `${densityEffect} kg/m³`, color: '#94a3b8' },
            { label: 'Status', value: status, color: conveyorSpeed > 0.7 ? '#4ade80' : conveyorSpeed > 0.3 ? '#f59e0b' : '#ef4444', highlight: conveyorSpeed < 0.3 },
          ]}
        />

        <div className="bg-gray-900 rounded-lg p-3 border border-gray-800">
          <p className="text-xs font-semibold text-sky-400 mb-2">Salinity vs Density</p>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: -15, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="salinity" tick={{ fill: '#64748b', fontSize: 9 }} tickCount={5} label={{ value: 'psu', position: 'insideBottomRight', offset: 0, fill: '#64748b', fontSize: 9 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 9 }} domain={[1018, 1030]} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 4 }}
                labelStyle={{ color: '#94a3b8', fontSize: 10 }}
                itemStyle={{ color: '#38bdf8', fontSize: 10 }}
              />
              <Line type="monotone" dataKey="density" stroke="#38bdf8" strokeWidth={2} dot={false} name="Density" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-900 rounded-lg p-3 border border-gray-800">
          <p className="text-xs font-semibold text-sky-400 mb-1">Insight</p>
          <p className="text-xs text-gray-400 leading-relaxed">
            The thermohaline circulation transports 20× the flow of all Earth's rivers, distributing heat and nutrients globally. As Arctic ice melts, freshwater dilutes North Atlantic salinity, reducing the density needed for deep water formation. Paleoclimate records show past disruptions caused rapid cooling in Europe and drought in the tropics.
          </p>
        </div>
      </div>
    </div>
  );
}
