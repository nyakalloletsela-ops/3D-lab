import { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import ControlSlider from '../../components/ControlSlider';
import ScenarioSelect from '../../components/ScenarioSelect';
import DataOverlay from '../../components/DataOverlay';

const SCENARIOS = [
  { id: 'pre_industrial', label: 'Pre-Industrial', description: 'Low emissions, dense forests (1800s baseline)' },
  { id: 'modern', label: 'Modern Day', description: 'High emissions, significant deforestation' },
];

interface CarbonParticleProps {
  index: number;
  emissions: number;
  deforestation: number;
  type: 'factory' | 'tree' | 'ocean';
}

function CarbonParticle({ index, emissions, deforestation, type }: CarbonParticleProps) {
  const ref = useRef<THREE.Mesh>(null);
  const offset = (index / 20) * Math.PI * 2;
  const speed = type === 'factory' ? emissions * 0.08 : 0.05;

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = ((clock.elapsedTime * speed + offset) % 1);

    if (type === 'factory') {
      const fx = -1.5 + (index % 3) * 1.0;
      ref.current.position.set(fx + Math.sin(t * 10) * 0.1, THREE.MathUtils.lerp(0, 2.5, t), 0.5);
      ref.current.visible = emissions > 1;
    } else if (type === 'tree') {
      const tx = -2 + (index % 5) * 0.8;
      ref.current.position.set(tx, THREE.MathUtils.lerp(0.5, 2.5, 1 - t), Math.sin(index) * 0.5);
      ref.current.visible = deforestation < 8;
    } else {
      ref.current.position.set(
        THREE.MathUtils.lerp(2.5, 1.5, t),
        THREE.MathUtils.lerp(2, 0.3, t),
        Math.sin(index * 0.8) * 0.4,
      );
    }
  });

  const color = type === 'factory' ? '#f59e0b' : type === 'tree' ? '#4ade80' : '#38bdf8';

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.06, 8, 8]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
    </mesh>
  );
}

interface TreeProps {
  x: number;
  z: number;
  deforestation: number;
  index: number;
}

function Tree({ x, z, deforestation, index }: TreeProps) {
  const threshold = (index / 12) * 10;
  const dead = deforestation > threshold;

  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.05, 0.07, 0.5, 6]} />
        <meshStandardMaterial color={dead ? '#78350f' : '#713f12'} />
      </mesh>
      <mesh position={[0, 0.75, 0]}>
        <coneGeometry args={[0.25, 0.6, 8]} />
        <meshStandardMaterial color={dead ? '#44403c' : '#16a34a'} />
      </mesh>
    </group>
  );
}

interface FactoryProps {
  x: number;
  emissions: number;
}

function Factory({ x, emissions }: FactoryProps) {
  const active = emissions > 0;
  return (
    <group position={[x, 0, -1.5]}>
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[0.4, 0.4, 0.4]} />
        <meshStandardMaterial color="#374151" />
      </mesh>
      <mesh position={[0.1, 0.55, 0]}>
        <cylinderGeometry args={[0.05, 0.07, 0.3, 8]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>
      {active && (
        <pointLight position={[0, 0.7, 0]} intensity={emissions * 0.05} color="#f59e0b" distance={1} />
      )}
    </group>
  );
}

interface CarbonSceneProps {
  emissions: number;
  deforestation: number;
}

function CarbonScene({ emissions, deforestation }: CarbonSceneProps) {
  const atmosphereOpacity = 0.03 + emissions * 0.015 + deforestation * 0.008;

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 8, 3]} intensity={1.2} color="#fffbeb" />

      {/* Ocean */}
      <mesh position={[2, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3, 5]} />
        <meshStandardMaterial color="#0369a1" />
      </mesh>

      {/* Land */}
      <mesh position={[-1, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[5, 5]} />
        <meshStandardMaterial color="#78716c" />
      </mesh>

      {/* Trees */}
      {Array.from({ length: 12 }).map((_, i) => (
        <Tree
          key={i}
          x={-2.5 + (i % 6) * 0.8}
          z={-1.5 + Math.floor(i / 6) * 1.5}
          deforestation={deforestation}
          index={i}
        />
      ))}

      {/* Factories */}
      {[-1.5, 0, 1.5].map((x, i) => (
        <Factory key={i} x={x} emissions={emissions} />
      ))}

      {/* Atmosphere sphere */}
      <mesh position={[0, 1, 0]}>
        <sphereGeometry args={[4.5, 32, 32]} />
        <meshStandardMaterial color="#f59e0b" opacity={atmosphereOpacity} transparent side={THREE.FrontSide} />
      </mesh>

      {/* Carbon particles from factories */}
      {Array.from({ length: 15 }).map((_, i) => (
        <CarbonParticle key={`f${i}`} index={i} emissions={emissions} deforestation={deforestation} type="factory" />
      ))}

      {/* Carbon absorbed by trees */}
      {Array.from({ length: 10 }).map((_, i) => (
        <CarbonParticle key={`t${i}`} index={i} emissions={emissions} deforestation={deforestation} type="tree" />
      ))}

      {/* Ocean absorption */}
      {Array.from({ length: 8 }).map((_, i) => (
        <CarbonParticle key={`o${i}`} index={i} emissions={emissions} deforestation={deforestation} type="ocean" />
      ))}

      <OrbitControls enablePan={false} minDistance={5} maxDistance={18} />
    </>
  );
}

export default function CarbonCycle() {
  const [humanEmissions, setHumanEmissions] = useState(1);
  const [deforestation, setDeforestation] = useState(1);
  const [scenario, setScenario] = useState('pre_industrial');

  const handleScenarioChange = (id: string) => {
    setScenario(id);
    if (id === 'pre_industrial') { setHumanEmissions(1); setDeforestation(1); }
    if (id === 'modern') { setHumanEmissions(8); setDeforestation(7); }
  };

  const absorption = Math.max(0, (10 - deforestation) * 1.5 + 4);
  const co2ppm = Math.round(280 + humanEmissions * 28 - absorption * 2);
  const netChange = (humanEmissions * 3 - absorption * 0.5).toFixed(1);
  const yearEstimate = Math.round(1800 + (co2ppm - 280) * 0.8);

  const chartData = useMemo(() => {
    return Array.from({ length: 31 }, (_, i) => {
      const year = 1800 + i * 10;
      const progress = Math.min(1, Math.max(0, (year - 1850) / 150));
      const ppm = 280 + humanEmissions * 28 * progress * progress + deforestation * 8 * progress;
      return { year, ppm: Math.round(ppm) };
    });
  }, [humanEmissions, deforestation]);

  return (
    <div className="w-full h-full flex overflow-hidden">
      <div className="flex-1">
        <Canvas style={{ background: '#030712' }} camera={{ position: [0, 5, 8], fov: 55 }}>
          <CarbonScene emissions={humanEmissions} deforestation={deforestation} />
        </Canvas>
      </div>

      <div className="w-72 bg-gray-950 border-l border-gray-800 overflow-y-auto scrollbar-thin p-3 space-y-4">
        <ScenarioSelect
          label="Scenario"
          scenarios={SCENARIOS}
          value={scenario}
          onChange={handleScenarioChange}
          color="#f59e0b"
        />

        <ControlSlider
          label="Human Emissions"
          value={humanEmissions}
          min={0}
          max={10}
          step={0.5}
          color="#f59e0b"
          onChange={setHumanEmissions}
          precision={1}
          formatValue={(v) => `${v.toFixed(1)} GtC/yr`}
        />

        <ControlSlider
          label="Deforestation"
          value={deforestation}
          min={0}
          max={10}
          step={0.5}
          color="#ef4444"
          onChange={setDeforestation}
          precision={1}
          formatValue={(v) => `${v.toFixed(1)} / 10`}
        />

        <DataOverlay
          equation={{ text: 'CO₂_ppm ≈ 280 + emissions×28 - absorption', color: '#f59e0b' }}
          readouts={[
            { label: 'CO₂ Concentration', value: `${co2ppm} ppm`, color: '#f59e0b', highlight: co2ppm > 400 },
            { label: 'Emission Rate', value: `${(humanEmissions * 3).toFixed(1)} GtC/yr`, color: '#ef4444' },
            { label: 'Absorption Rate', value: `${absorption.toFixed(1)} GtC/yr`, color: '#4ade80' },
            { label: 'Net Change', value: `${netChange} GtC/yr`, color: '#94a3b8' },
            { label: 'Year Estimate', value: `~${yearEstimate}`, color: '#38bdf8' },
          ]}
        />

        <div className="bg-gray-900 rounded-lg p-3 border border-gray-800">
          <p className="text-xs font-semibold text-amber-400 mb-2">CO₂ ppm vs Year</p>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: -15, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 9 }} tickCount={6} />
              <YAxis tick={{ fill: '#64748b', fontSize: 9 }} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 4 }}
                labelStyle={{ color: '#94a3b8', fontSize: 10 }}
                itemStyle={{ color: '#f59e0b', fontSize: 10 }}
              />
              <ReferenceLine y={350} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1} />
              <Line type="monotone" dataKey="ppm" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-900 rounded-lg p-3 border border-gray-800">
          <p className="text-xs font-semibold text-amber-400 mb-1">Insight</p>
          <p className="text-xs text-gray-400 leading-relaxed">
            Forests and oceans absorb about half of human CO₂ emissions. Deforestation reduces this sink capacity while adding emissions from burning. The resulting CO₂ increase drives warming through the greenhouse effect, creating positive feedback loops.
          </p>
        </div>
      </div>
    </div>
  );
}
