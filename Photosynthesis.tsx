import { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot } from 'recharts';
import ControlSlider from '../../components/ControlSlider';
import ScenarioSelect from '../../components/ScenarioSelect';
import DataOverlay from '../../components/DataOverlay';

const SCENARIOS = [
  { id: 'light_dependent', label: 'Light Reactions', description: 'PSII water splitting and electron transport' },
  { id: 'calvin_cycle', label: 'Calvin Cycle', description: 'CO₂ fixation and sugar synthesis (stroma)' },
];

interface PhotonProps {
  index: number;
  lightIntensity: number;
}

function Photon({ index, lightIntensity }: PhotonProps) {
  const ref = useRef<THREE.Mesh>(null);
  const offset = index * 0.3;
  const xSpread = (index % 5) * 0.5 - 1.0;

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const speed = 0.5 + lightIntensity * 0.012;
    const t = ((clock.elapsedTime * speed + offset) % 1);
    ref.current.position.set(
      xSpread + Math.sin(t * 10 + index) * 0.05,
      THREE.MathUtils.lerp(2.5, 0.3, t),
      0,
    );
    ref.current.visible = lightIntensity > 5;
    (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity = (1 - t) * 1.5;
    ref.current.scale.setScalar(1 - t * 0.3);
  });

  const colors = ['#fde047', '#fef08a', '#fffbeb', '#fbbf24'];
  const color = colors[index % colors.length];

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.07, 8, 8]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.5} />
    </mesh>
  );
}

interface WaterMoleculeProps {
  lightIntensity: number;
  index: number;
}

function WaterMolecule({ lightIntensity, index }: WaterMoleculeProps) {
  const ref = useRef<THREE.Group>(null);
  const splitting = lightIntensity > 20;
  const offset = index * 0.7;

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = splitting ? ((clock.elapsedTime * 0.3 + offset) % 1) : 0;
    ref.current.position.set(
      -1.5 + index * 0.6,
      splitting ? THREE.MathUtils.lerp(-0.5, 0.05, t) : -0.5,
      0.2,
    );
  });

  return (
    <group ref={ref} position={[-1.5 + index * 0.6, -0.5, 0.2]}>
      <mesh>
        <sphereGeometry args={[0.09, 8, 8]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>
      <mesh position={[0.15, 0.1, 0]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#e0f2fe" />
      </mesh>
      <mesh position={[-0.15, 0.1, 0]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#e0f2fe" />
      </mesh>
    </group>
  );
}

interface OxygenReleaseProps {
  lightIntensity: number;
  index: number;
}

function OxygenRelease({ lightIntensity, index }: OxygenReleaseProps) {
  const ref = useRef<THREE.Mesh>(null);
  const offset = index * 0.6;

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.visible = lightIntensity > 20;
    if (lightIntensity <= 20) return;

    const speed = 0.3 + lightIntensity * 0.005;
    const t = ((clock.elapsedTime * speed + offset) % 1);
    const angle = (index / 4) * Math.PI * 2 + t * 2;
    ref.current.position.set(
      Math.cos(angle) * t * 1.5,
      THREE.MathUtils.lerp(0.0, 1.5, t),
      Math.sin(angle) * t * 0.5,
    );
    (ref.current.material as THREE.MeshStandardMaterial).opacity = 1 - t;
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.07, 8, 8]} />
      <meshStandardMaterial color="#4ade80" emissive="#4ade80" emissiveIntensity={0.6} transparent opacity={0.9} />
    </mesh>
  );
}

interface ATPRotorProps {
  lightIntensity: number;
}

function ATPRotor({ lightIntensity }: ATPRotorProps) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * lightIntensity * 0.05;
  });

  return (
    <group position={[1.5, 0.2, 0.2]}>
      {/* Stator */}
      <mesh>
        <cylinderGeometry args={[0.2, 0.2, 0.5, 12]} />
        <meshStandardMaterial color="#0f766e" />
      </mesh>
      {/* Rotor blades */}
      <mesh ref={ref} position={[0, 0.1, 0]}>
        <torusGeometry args={[0.22, 0.04, 6, 16]} />
        <meshStandardMaterial color="#2dd4bf" emissive="#2dd4bf" emissiveIntensity={0.4} />
      </mesh>
      <Html position={[0, 0.6, 0]} center>
        <div className="text-teal-400 text-xs font-mono" style={{ fontSize: 8 }}>ATP Synthase</div>
      </Html>
    </group>
  );
}

interface PhotosynthesisSceneProps {
  lightIntensity: number;
  scenario: string;
}

function PhotosynthesisScene({ lightIntensity, scenario }: PhotosynthesisSceneProps) {
  const thylakoidColor = scenario === 'calvin_cycle' ? '#15803d' : '#0d9488';

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[3, 4, 3]} intensity={1.0} color="#fde68a" />
      <pointLight position={[-3, 2, 2]} intensity={0.5} color="#4ade80" />
      {lightIntensity > 20 && (
        <pointLight position={[0, 2, 0]} intensity={lightIntensity * 0.01} color="#fde047" distance={5} />
      )}

      {/* Thylakoid membrane */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[2.5, 2.5, 0.25, 48]} />
        <meshStandardMaterial color={thylakoidColor} opacity={0.85} transparent />
      </mesh>

      {/* Thylakoid lumen interior */}
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[2.3, 2.3, 0.1, 48]} />
        <meshStandardMaterial color="#0f4c35" />
      </mesh>

      {/* Photosystem II complex */}
      <group position={[-1.0, 0.2, 0]}>
        <mesh>
          <boxGeometry args={[0.6, 0.35, 0.5]} />
          <meshStandardMaterial color="#7c3aed" emissive="#7c3aed" emissiveIntensity={lightIntensity > 20 ? 0.5 : 0.05} />
        </mesh>
        <Html position={[0, 0.45, 0]} center>
          <div className="text-violet-400 text-xs font-mono" style={{ fontSize: 8 }}>PSII</div>
        </Html>
      </group>

      {/* Photosystem I complex */}
      <group position={[0.3, 0.2, 0]}>
        <mesh>
          <boxGeometry args={[0.5, 0.3, 0.45]} />
          <meshStandardMaterial color="#0369a1" emissive="#0369a1" emissiveIntensity={lightIntensity > 20 ? 0.4 : 0.05} />
        </mesh>
        <Html position={[0, 0.4, 0]} center>
          <div className="text-sky-400 text-xs font-mono" style={{ fontSize: 8 }}>PSI</div>
        </Html>
      </group>

      {/* ATP Synthase rotor */}
      <ATPRotor lightIntensity={lightIntensity} />

      {/* Photons streaming in */}
      {Array.from({ length: 15 }).map((_, i) => (
        <Photon key={i} index={i} lightIntensity={lightIntensity} />
      ))}

      {/* Water molecules approaching PSII */}
      {Array.from({ length: 3 }).map((_, i) => (
        <WaterMolecule key={i} index={i} lightIntensity={lightIntensity} />
      ))}

      {/* O2 released */}
      {Array.from({ length: 6 }).map((_, i) => (
        <OxygenRelease key={i} index={i} lightIntensity={lightIntensity} />
      ))}

      {/* Calvin cycle CO2 absorption bubbles when in calvin mode */}
      {scenario === 'calvin_cycle' && Array.from({ length: 6 }).map((_, i) => (
        <CalvinCO2 key={i} index={i} />
      ))}

      <Html position={[-2.6, 0, 0]} center>
        <div className="text-gray-400 text-xs font-mono bg-gray-900/60 px-1 rounded" style={{ fontSize: 8 }}>Stroma</div>
      </Html>
      <Html position={[0, -0.6, 0]} center>
        <div className="text-gray-400 text-xs font-mono bg-gray-900/60 px-1 rounded" style={{ fontSize: 8 }}>Lumen</div>
      </Html>

      <OrbitControls enablePan={false} minDistance={3} maxDistance={14} />
    </>
  );
}

function CalvinCO2({ index }: { index: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const offset = index * 0.5;

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = ((clock.elapsedTime * 0.25 + offset) % 1);
    const a = (index / 6) * Math.PI * 2;
    ref.current.position.set(
      Math.cos(a) * (1.5 + t * 0.5),
      0.4 + Math.sin(t * Math.PI) * 0.3,
      Math.sin(a) * (1.5 + t * 0.5),
    );
    (ref.current.material as THREE.MeshStandardMaterial).opacity = Math.sin(t * Math.PI) * 0.7;
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.065, 8, 8]} />
      <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.3} transparent opacity={0.7} />
    </mesh>
  );
}

export default function Photosynthesis() {
  const [lightIntensity, setLightIntensity] = useState(50);
  const [co2level, setCo2level] = useState(400);
  const [scenario, setScenario] = useState('light_dependent');

  const handleScenarioChange = (id: string) => {
    setScenario(id);
    if (id === 'light_dependent') { setLightIntensity(60); setCo2level(400); }
    if (id === 'calvin_cycle') { setLightIntensity(80); setCo2level(800); }
  };

  const atpRate = (lightIntensity * 0.08).toFixed(2);
  const nadphRate = (lightIntensity * 0.05).toFixed(2);
  const o2Rate = (lightIntensity * 0.04).toFixed(2);
  const atpNum = lightIntensity * 0.08;
  const co2Contribution = co2level * 0.01;
  const sugarRate = Math.min(atpNum, co2Contribution).toFixed(2);

  const chartData = useMemo(() => {
    return Array.from({ length: 21 }, (_, i) => {
      const li = i * 5;
      return { light: li, atp: parseFloat((li * 0.08).toFixed(2)) };
    });
  }, []);

  return (
    <div className="w-full h-full flex overflow-hidden">
      <div className="flex-1">
        <Canvas style={{ background: '#030712' }} camera={{ position: [0, 3, 7], fov: 50 }}>
          <PhotosynthesisScene lightIntensity={lightIntensity} scenario={scenario} />
        </Canvas>
      </div>

      <div className="w-72 bg-gray-950 border-l border-gray-800 overflow-y-auto scrollbar-thin p-3 space-y-4">
        <ScenarioSelect
          label="Scenario"
          scenarios={[
            { id: 'light_dependent', label: 'Light Reactions', description: 'Thylakoid membrane reactions' },
            { id: 'calvin_cycle', label: 'Calvin Cycle', description: 'CO₂ fixation in stroma' },
          ]}
          value={scenario}
          onChange={handleScenarioChange}
          color="#4ade80"
        />

        <ControlSlider
          label="Light Intensity"
          value={lightIntensity}
          min={0}
          max={100}
          step={1}
          color="#fde047"
          onChange={setLightIntensity}
          precision={0}
          formatValue={(v) => `${v}%`}
        />

        <ControlSlider
          label="CO₂ Level"
          value={co2level}
          min={100}
          max={1000}
          step={50}
          color="#f59e0b"
          onChange={setCo2level}
          precision={0}
          formatValue={(v) => `${v} ppm`}
        />

        <DataOverlay
          equation={{ text: '6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂', color: '#4ade80' }}
          readouts={[
            { label: 'Light Intensity', value: `${lightIntensity}%`, color: '#fde047', highlight: lightIntensity > 70 },
            { label: 'CO₂ Level', value: `${co2level} ppm`, color: '#f59e0b' },
            { label: 'ATP Rate', value: `${atpRate} units/s`, color: '#4ade80' },
            { label: 'NADPH Rate', value: `${nadphRate} units/s`, color: '#38bdf8' },
            { label: 'O₂ Rate', value: `${o2Rate} units/s`, color: '#86efac' },
            { label: 'Sugar Prod.', value: `${sugarRate} units/s`, color: '#fbbf24', highlight: parseFloat(sugarRate) > 4 },
          ]}
        />

        <div className="bg-gray-900 rounded-lg p-3 border border-gray-800">
          <p className="text-xs font-semibold text-green-400 mb-2">ATP Production vs Light</p>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: -15, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="light" tick={{ fill: '#64748b', fontSize: 9 }} tickCount={6} label={{ value: '%', position: 'insideBottomRight', offset: 0, fill: '#64748b', fontSize: 9 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 9 }} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 4 }}
                labelStyle={{ color: '#94a3b8', fontSize: 10 }}
                itemStyle={{ color: '#4ade80', fontSize: 10 }}
              />
              <ReferenceDot x={lightIntensity} y={parseFloat(atpRate)} r={4} fill="#fde047" stroke="none" />
              <Line type="monotone" dataKey="atp" stroke="#4ade80" strokeWidth={2} dot={false} name="ATP rate" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-900 rounded-lg p-3 border border-gray-800">
          <p className="text-xs font-semibold text-green-400 mb-1">Insight</p>
          <p className="text-xs text-gray-400 leading-relaxed">
            The light reactions split water at Photosystem II, releasing O₂ and energizing electrons that drive ATP synthesis via the proton gradient across the thylakoid membrane. The Calvin cycle then uses this ATP and NADPH to fix CO₂ into glucose — a process limited by whichever reactant is scarcer (light or CO₂).
          </p>
        </div>
      </div>
    </div>
  );
}
