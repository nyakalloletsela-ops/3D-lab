import { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import ControlSlider from '../../components/ControlSlider';
import ScenarioSelect from '../../components/ScenarioSelect';
import DataOverlay from '../../components/DataOverlay';

const SCENARIOS = [
  { id: 'normal', label: 'Normal BP', description: 'Healthy blood pressure ~80 mmHg' },
  { id: 'high_bp', label: 'High BP', description: 'Hypertension at 160 mmHg — risk of damage' },
];

interface RBCProps {
  index: number;
  bp: number;
}

function RBC({ index, bp }: RBCProps) {
  const ref = useRef<THREE.Mesh>(null);
  const angle = (index / 8) * Math.PI * 2;
  const radius = 0.25 + (index % 3) * 0.1;
  const speed = bp * 0.003;

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime * speed + (index * 0.7);
    ref.current.position.set(
      Math.cos(t + angle) * radius,
      Math.sin(t * 0.7 + angle) * radius * 0.6,
      Math.sin(t + angle * 1.3) * radius * 0.3,
    );
  });

  const leaked = bp > 130 && index < Math.floor((bp - 130) / 10);

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.07, 10, 10]} />
      <meshStandardMaterial
        color={leaked ? '#ef4444' : '#dc2626'}
        emissive={leaked ? '#ef4444' : '#7f1d1d'}
        emissiveIntensity={leaked ? 1.0 : 0.2}
      />
    </mesh>
  );
}

interface WasteParticleProps {
  index: number;
  bp: number;
}

function WasteParticle({ index, bp }: WasteParticleProps) {
  const ref = useRef<THREE.Mesh>(null);
  const offset = (index / 12) * Math.PI * 2;
  const gfr = Math.min(180, bp * 0.8);
  const speed = gfr * 0.004;

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = ((clock.elapsedTime * speed + offset) % 1);
    ref.current.position.set(
      THREE.MathUtils.lerp(0.6, 3.5, t),
      THREE.MathUtils.lerp(0, -0.1 + Math.sin(index * 1.2) * 0.2, t),
      Math.sin(index * 0.9) * 0.15,
    );
    ref.current.visible = bp > 40;
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.045, 8, 8]} />
      <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.6} />
    </mesh>
  );
}

interface NephronSceneProps {
  bp: number;
}

function NephronScene({ bp }: NephronSceneProps) {
  const highPressureWarning = bp > 140;

  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[4, 4, 4]} intensity={1.2} />
      <pointLight position={[-2, 2, 2]} intensity={0.5} color="#22d3ee" />
      {highPressureWarning && (
        <pointLight position={[0, 0, 2]} intensity={0.8} color="#ef4444" distance={3} />
      )}

      {/* Bowman's capsule - outer translucent sphere */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.75, 32, 32]} />
        <meshStandardMaterial color="#bae6fd" opacity={0.12} transparent side={THREE.FrontSide} />
      </mesh>

      {/* Bowman's capsule wireframe outline */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.75, 16, 16]} />
        <meshStandardMaterial color="#38bdf8" opacity={0.25} transparent wireframe />
      </mesh>

      {/* Glomerulus capillary cluster */}
      {Array.from({ length: 14 }).map((_, i) => {
        const a = (i / 14) * Math.PI * 2;
        const r = 0.18 + (i % 3) * 0.08;
        return (
          <mesh key={i} position={[Math.cos(a) * r, Math.sin(a) * r * 0.7, Math.sin(a * 1.5) * r * 0.4]}>
            <torusGeometry args={[0.09, 0.03, 6, 12]} />
            <meshStandardMaterial color="#f87171" />
          </mesh>
        );
      })}

      {/* Red blood cells in glomerulus */}
      {Array.from({ length: 8 }).map((_, i) => (
        <RBC key={i} index={i} bp={bp} />
      ))}

      {/* Afferent arteriole (incoming) */}
      <mesh position={[-1.2, 0.2, 0]} rotation={[0, 0, -0.3]}>
        <cylinderGeometry args={[0.1, 0.1, 1.0, 10]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>

      {/* Efferent arteriole (outgoing) */}
      <mesh position={[-0.6, -0.55, 0]} rotation={[0, 0, 0.5]}>
        <cylinderGeometry args={[0.07, 0.07, 0.8, 10]} />
        <meshStandardMaterial color="#f97316" />
      </mesh>

      {/* Bowman's space exit */}
      <mesh position={[0.65, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.07, 0.07, 0.3, 10]} />
        <meshStandardMaterial color="#22d3ee" />
      </mesh>

      {/* Proximal tubule */}
      <mesh position={[2.0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.07, 0.07, 2.2, 10]} />
        <meshStandardMaterial color="#34d399" opacity={0.7} transparent />
      </mesh>

      {/* Waste particles flowing */}
      {Array.from({ length: 12 }).map((_, i) => (
        <WasteParticle key={i} index={i} bp={bp} />
      ))}

      {/* Labels */}
      <Html position={[0, 0.9, 0]} center>
        <div className="text-blue-300 text-xs font-mono bg-gray-900/70 px-2 py-0.5 rounded">Bowman&apos;s Capsule</div>
      </Html>
      <Html position={[3.5, 0, 0]} center>
        <div className="text-emerald-400 text-xs font-mono bg-gray-900/70 px-2 py-0.5 rounded">Filtrate</div>
      </Html>
      {highPressureWarning && (
        <Html position={[0, -1.0, 0]} center>
          <div className="text-red-400 text-xs font-bold bg-gray-900/80 px-2 py-1 rounded border border-red-700 animate-pulse">
            HIGH BP — RBC leaking!
          </div>
        </Html>
      )}

      <OrbitControls enablePan={false} minDistance={3} maxDistance={12} />
    </>
  );
}

export default function NephronFiltration() {
  const [bloodPressure, setBloodPressure] = useState(80);
  const [scenario, setScenario] = useState('normal');

  const handleScenarioChange = (id: string) => {
    setScenario(id);
    if (id === 'normal') setBloodPressure(80);
    if (id === 'high_bp') setBloodPressure(160);
  };

  const gfr = Math.min(180, Math.max(0, bloodPressure * 0.8));
  const dailyFiltrate = ((gfr * 60 * 24) / 1000).toFixed(1);
  const status = gfr < 60 ? 'Reduced' : gfr < 120 ? 'Normal' : 'Elevated';
  const warning = bloodPressure > 140 ? 'Hypertension — glomerular damage risk!' : null;

  const chartData = useMemo(() => {
    return Array.from({ length: 25 }, (_, i) => {
      const bp = 60 + i * 5;
      return { bp, gfr: Math.min(180, bp * 0.8) };
    });
  }, []);

  return (
    <div className="w-full h-full flex overflow-hidden">
      <div className="flex-1">
        <Canvas style={{ background: '#030712' }} camera={{ position: [2, 1, 6], fov: 50 }}>
          <NephronScene bp={bloodPressure} />
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
          label="Blood Pressure"
          value={bloodPressure}
          min={60}
          max={180}
          step={5}
          color="#38bdf8"
          onChange={setBloodPressure}
          precision={0}
          formatValue={(v) => `${v} mmHg`}
        />

        <DataOverlay
          equation={{ text: 'GFR = K_f × (P_glom - P_bowman)', color: '#38bdf8' }}
          readouts={[
            { label: 'Blood Pressure', value: `${bloodPressure} mmHg`, color: '#38bdf8', highlight: bloodPressure > 140 },
            { label: 'GFR', value: `${gfr.toFixed(0)} mL/min`, color: '#22d3ee' },
            { label: 'Daily Filtrate', value: `${dailyFiltrate} L/day`, color: '#34d399' },
            { label: 'Filtration Status', value: status, color: '#94a3b8' },
            ...(warning ? [{ label: 'Warning', value: warning, color: '#ef4444', highlight: true as const }] : []),
          ]}
        />

        <div className="bg-gray-900 rounded-lg p-3 border border-gray-800">
          <p className="text-xs font-semibold text-sky-400 mb-2">GFR vs Blood Pressure</p>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: -15, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="bp" tick={{ fill: '#64748b', fontSize: 9 }} tickCount={6} />
              <YAxis tick={{ fill: '#64748b', fontSize: 9 }} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 4 }}
                labelStyle={{ color: '#94a3b8', fontSize: 10 }}
                itemStyle={{ color: '#38bdf8', fontSize: 10 }}
              />
              <ReferenceLine x={bloodPressure} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={1.5} />
              <Line type="monotone" dataKey="gfr" stroke="#38bdf8" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-900 rounded-lg p-3 border border-gray-800">
          <p className="text-xs font-semibold text-sky-400 mb-1">Insight</p>
          <p className="text-xs text-gray-400 leading-relaxed">
            The glomerular filtration rate is directly tied to blood pressure. Hypertension forces excess fluid through the glomerular basement membrane, initially increasing filtration but causing scarring (glomerulosclerosis) over time. The kidneys lose roughly 1% of nephrons per year under chronic hypertension.
          </p>
        </div>
      </div>
    </div>
  );
}
