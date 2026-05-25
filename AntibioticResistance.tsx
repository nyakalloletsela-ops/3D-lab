import { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import ControlSlider from '../../components/ControlSlider';
import ScenarioSelect from '../../components/ScenarioSelect';
import DataOverlay from '../../components/DataOverlay';

const SCENARIOS = [
  { id: 'selection_pressure', label: 'Selection Pressure', description: 'Observe antibiotic selection on mixed population' },
];

const PETRI_RADIUS = 2.8;
const TOTAL_CELLS = 144;
const GRID_SIZE = 12;

function generateBacteriaPositions(): [number, number, number][] {
  const positions: [number, number, number][] = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const x = (col - GRID_SIZE / 2 + 0.5) * 0.42;
      const z = (row - GRID_SIZE / 2 + 0.5) * 0.42;
      if (Math.sqrt(x * x + z * z) < PETRI_RADIUS - 0.3) {
        positions.push([x, 0.12, z]);
      }
    }
  }
  return positions;
}

const ALL_POSITIONS = generateBacteriaPositions();
const RESISTANT_INDICES = new Set([5, 18, 31, 44, 57, 70, 83, 96, 109, 122, 17, 30]);

interface BacteriumProps {
  position: [number, number, number];
  isResistant: boolean;
  dose: number;
  index: number;
  totalPositions: number;
  normalSurvivors: number;
  resistantCount: number;
}

function Bacterium({ position, isResistant, dose, index, totalPositions, normalSurvivors, resistantCount }: BacteriumProps) {
  const ref = useRef<THREE.Mesh>(null);
  const targetPos = useRef(new THREE.Vector3(...position));

  const normalRank = useMemo(() => {
    const normalIndices = Array.from({ length: totalPositions }, (_, i) => i).filter(i => !RESISTANT_INDICES.has(i));
    return normalIndices.indexOf(index);
  }, [index, totalPositions]);

  const resistantRank = useMemo(() => {
    const resistantIndices = Array.from(RESISTANT_INDICES);
    return resistantIndices.indexOf(index);
  }, [index]);

  useFrame(({ clock }) => {
    if (!ref.current) return;

    let visible = true;
    let color = '#4ade80';
    let emissiveIntensity = 0.2;

    if (!isResistant) {
      const alive = normalRank < normalSurvivors;
      visible = alive;
      color = '#4ade80';
    } else {
      visible = true;
      color = '#fb923c';
      emissiveIntensity = 0.5;

      // Resistant bacteria spread to fill available space
      const spreadFraction = dose / 100;
      const spreadRadius = 0.5 + spreadFraction * 2.0;
      const spreadAngle = (resistantRank / resistantCount) * Math.PI * 2;
      targetPos.current.set(
        Math.cos(spreadAngle + clock.elapsedTime * 0.05) * spreadRadius * (resistantRank % 2 === 0 ? 1 : 0.6),
        0.12,
        Math.sin(spreadAngle + clock.elapsedTime * 0.05) * spreadRadius * (resistantRank % 2 === 0 ? 1 : 0.6),
      );
    }

    ref.current.visible = visible;
    ref.current.position.lerp(targetPos.current, 0.03);
    (ref.current.material as THREE.MeshStandardMaterial).color.set(color);
    (ref.current.material as THREE.MeshStandardMaterial).emissive.set(color);
    (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity = emissiveIntensity;
  });

  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[0.08, 8, 8]} />
      <meshStandardMaterial color={isResistant ? '#fb923c' : '#4ade80'} emissive={isResistant ? '#fb923c' : '#4ade80'} emissiveIntensity={0.3} />
    </mesh>
  );
}

interface PetriSceneProps {
  dose: number;
  normalSurvivors: number;
  resistantCount: number;
}

function PetriScene({ dose, normalSurvivors, resistantCount }: PetriSceneProps) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[0, 5, 0]} intensity={1.2} color="#ffffff" />
      <pointLight position={[3, 2, 3]} intensity={0.4} color="#4ade80" />

      {/* Petri dish base */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <circleGeometry args={[PETRI_RADIUS, 48]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>

      {/* Petri dish agar surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <circleGeometry args={[PETRI_RADIUS - 0.1, 48]} />
        <meshStandardMaterial color="#1e2d1a" />
      </mesh>

      {/* Petri dish rim */}
      <mesh position={[0, 0.08, 0]}>
        <torusGeometry args={[PETRI_RADIUS, 0.1, 8, 48]} />
        <meshStandardMaterial color="#374151" opacity={0.7} transparent />
      </mesh>

      {/* Bacteria */}
      {ALL_POSITIONS.slice(0, Math.min(TOTAL_CELLS, ALL_POSITIONS.length)).map((pos, i) => (
        <Bacterium
          key={i}
          index={i}
          position={pos}
          isResistant={RESISTANT_INDICES.has(i)}
          dose={dose}
          totalPositions={ALL_POSITIONS.length}
          normalSurvivors={normalSurvivors}
          resistantCount={resistantCount}
        />
      ))}

      {/* Antibiotic gradient overlay - visible at high doses */}
      {dose > 10 && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
          <circleGeometry args={[PETRI_RADIUS - 0.15, 48]} />
          <meshStandardMaterial color="#7c3aed" opacity={Math.min(0.3, dose * 0.003)} transparent />
        </mesh>
      )}

      <OrbitControls enablePan={false} minDistance={3} maxDistance={14} minPolarAngle={0} maxPolarAngle={Math.PI / 2.2} />
    </>
  );
}

export default function AntibioticResistance() {
  const [antibioticDose, setAntibioticDose] = useState(0);
  const [scenario, setScenario] = useState('selection_pressure');

  const normalSurvivors = Math.round(100 * Math.max(0, 1 - antibioticDose / 80));
  const totalNormal = ALL_POSITIONS.filter((_, i) => !RESISTANT_INDICES.has(i)).length;
  const resistantCount = RESISTANT_INDICES.size;
  const spreadResistant = Math.min(resistantCount + Math.floor((antibioticDose / 100) * (totalNormal - normalSurvivors) * 0.3), totalNormal + resistantCount);
  const totalBacteria = normalSurvivors + resistantCount;
  const percentResistant = totalBacteria > 0 ? ((resistantCount / totalBacteria) * 100).toFixed(1) : '100.0';

  const chartData = useMemo(() => {
    return Array.from({ length: 21 }, (_, i) => {
      const d = i * 5;
      const normal = Math.round(100 * Math.max(0, 1 - d / 80));
      const resistant = Math.min(RESISTANT_INDICES.size + Math.floor(d * 0.5), 100);
      return { dose: d, normal, resistant };
    });
  }, []);

  return (
    <div className="w-full h-full flex overflow-hidden">
      <div className="flex-1">
        <Canvas style={{ background: '#030712' }} camera={{ position: [0, 6, 6], fov: 55 }}>
          <PetriScene dose={antibioticDose} normalSurvivors={normalSurvivors} resistantCount={resistantCount} />
        </Canvas>
      </div>

      <div className="w-72 bg-gray-950 border-l border-gray-800 overflow-y-auto scrollbar-thin p-3 space-y-4">
        <ScenarioSelect
          label="Scenario"
          scenarios={SCENARIOS}
          value={scenario}
          onChange={setScenario}
          color="#fb923c"
        />

        <ControlSlider
          label="Antibiotic Dose"
          value={antibioticDose}
          min={0}
          max={100}
          step={1}
          color="#7c3aed"
          onChange={setAntibioticDose}
          precision={0}
          formatValue={(v) => `${v}%`}
        />

        <DataOverlay
          equation={{ text: 'Selection Pressure → Resistant Fixation', color: '#fb923c' }}
          readouts={[
            { label: 'Dose', value: `${antibioticDose}%`, color: '#7c3aed', highlight: antibioticDose > 60 },
            { label: 'Normal Bacteria', value: `${normalSurvivors}`, color: '#4ade80' },
            { label: 'Resistant Bacteria', value: `${resistantCount}`, color: '#fb923c' },
            { label: 'Total Bacteria', value: `${totalBacteria}`, color: '#94a3b8' },
            { label: '% Resistant', value: `${percentResistant}%`, color: '#f59e0b', highlight: parseFloat(percentResistant) > 50 },
          ]}
        />

        <div className="bg-gray-900 rounded-lg p-3 border border-gray-800">
          <p className="text-xs font-semibold text-orange-400 mb-2">Population vs Dose</p>
          <ResponsiveContainer width="100%" height={130}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: -15, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="dose" tick={{ fill: '#64748b', fontSize: 9 }} tickCount={6} label={{ value: '%', position: 'insideBottomRight', offset: 0, fill: '#64748b', fontSize: 9 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 9 }} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 4 }}
                labelStyle={{ color: '#94a3b8', fontSize: 10 }}
                itemStyle={{ fontSize: 10 }}
              />
              <Legend wrapperStyle={{ fontSize: 9, color: '#94a3b8' }} />
              <Line type="monotone" dataKey="normal" name="Normal" stroke="#4ade80" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="resistant" name="Resistant" stroke="#fb923c" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-900 rounded-lg p-3 border border-gray-800">
          <p className="text-xs font-semibold text-orange-400 mb-1">Insight</p>
          <p className="text-xs text-gray-400 leading-relaxed">
            Antibiotic resistance evolves through natural selection: resistant mutants already exist before treatment. Low doses kill susceptible bacteria while selecting for resistance — the minimum inhibitory concentration (MIC) must be exceeded to prevent this. Sub-therapeutic antibiotic use in agriculture and incomplete treatment courses are major drivers of resistance spread.
          </p>
        </div>
      </div>
    </div>
  );
}
