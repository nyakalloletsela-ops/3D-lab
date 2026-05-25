import { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot } from 'recharts';
import ControlSlider from '../../components/ControlSlider';
import ScenarioSelect from '../../components/ScenarioSelect';
import DataOverlay from '../../components/DataOverlay';

const SCENARIOS = [
  { id: 'high_albedo', label: 'High Albedo', description: 'Full ice coverage — maximum reflection' },
  { id: 'low_albedo', label: 'Low Albedo', description: 'Significant warming — major ice loss' },
];

interface ReflectionArrowProps {
  x: number;
  z: number;
  icePercent: number;
  index: number;
}

function ReflectionArrow({ x, z, icePercent, index }: ReflectionArrowProps) {
  const ref = useRef<THREE.Mesh>(null);
  const speed = 0.6 + index * 0.1;

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = (clock.elapsedTime * speed + index * 0.5) % 1;
    ref.current.position.set(x, THREE.MathUtils.lerp(0.1, 1.8, t), z);
    ref.current.scale.setScalar(icePercent / 100);
    (ref.current.material as THREE.MeshStandardMaterial).opacity = (1 - t) * 0.8 * (icePercent / 100);
  });

  return (
    <mesh ref={ref}>
      <coneGeometry args={[0.04, 0.15, 6]} />
      <meshStandardMaterial color="#f1f5f9" emissive="#f1f5f9" emissiveIntensity={0.8} transparent opacity={0.6} />
    </mesh>
  );
}

interface HeatArrowProps {
  x: number;
  z: number;
  icePercent: number;
  index: number;
}

function HeatArrow({ x, z, icePercent, index }: HeatArrowProps) {
  const ref = useRef<THREE.Mesh>(null);
  const speed = 0.5 + index * 0.08;
  const oceanFrac = 1 - icePercent / 100;

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = (clock.elapsedTime * speed + index * 0.4) % 1;
    ref.current.position.set(x, THREE.MathUtils.lerp(1.5, 0.05, t), z);
    ref.current.scale.setScalar(oceanFrac);
    (ref.current.material as THREE.MeshStandardMaterial).opacity = t * 0.8 * oceanFrac;
  });

  return (
    <mesh ref={ref} rotation={[Math.PI, 0, 0]}>
      <coneGeometry args={[0.04, 0.18, 6]} />
      <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.8} transparent opacity={0.6} />
    </mesh>
  );
}

interface GlacialSceneProps {
  globalTemp: number;
  icePercent: number;
}

function GlacialScene({ globalTemp, icePercent }: GlacialSceneProps) {
  const iceScaleX = Math.max(0.01, icePercent / 100);
  const iceRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!iceRef.current) return;
    iceRef.current.scale.x = THREE.MathUtils.lerp(iceRef.current.scale.x, iceScaleX, 0.05);
    iceRef.current.scale.z = THREE.MathUtils.lerp(iceRef.current.scale.z, iceScaleX, 0.05);
  });

  const sunIntensity = 1.2 - globalTemp * 0.05;

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[0, 8, 0]} intensity={sunIntensity} color="#fffbeb" />
      <pointLight position={[3, 3, 3]} intensity={0.4} color="#fde68a" />

      {/* Sun */}
      <mesh position={[0, 5, 0]}>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshStandardMaterial color="#fde047" emissive="#fde047" emissiveIntensity={1.5} />
      </mesh>

      {/* Ocean base */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <circleGeometry args={[3.5, 48]} />
        <meshStandardMaterial color="#0c4a6e" />
      </mesh>

      {/* Ice cap */}
      <mesh ref={iceRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <circleGeometry args={[3.4, 48]} />
        <meshStandardMaterial color="#e0f2fe" opacity={0.92} transparent />
      </mesh>

      {/* Ice surface detail */}
      <mesh ref={iceRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[3.0, 40]} />
        <meshStandardMaterial color="#f0f9ff" opacity={0.7} transparent />
      </mesh>

      {/* Reflection arrows from ice */}
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2;
        const r = 1.0 + (i % 3) * 0.5;
        return <ReflectionArrow key={i} x={Math.cos(a) * r * iceScaleX} z={Math.sin(a) * r * iceScaleX} icePercent={icePercent} index={i} />;
      })}

      {/* Heat absorption arrows into ocean */}
      {Array.from({ length: 10 }).map((_, i) => {
        const a = (i / 10) * Math.PI * 2;
        const r = 2.0 + (i % 2) * 0.5;
        return <HeatArrow key={i} x={Math.cos(a) * r} z={Math.sin(a) * r} icePercent={icePercent} index={i} />;
      })}

      <Html position={[0, -3.2, 0]} center>
        <div className="text-sky-400 text-xs font-mono bg-gray-900/70 px-2 py-0.5 rounded">Ice: {icePercent.toFixed(0)}%</div>
      </Html>

      <OrbitControls enablePan={false} minDistance={4} maxDistance={18} minPolarAngle={0.2} maxPolarAngle={Math.PI / 2} />
    </>
  );
}

export default function GlacialRetreat() {
  const [globalTemp, setGlobalTemp] = useState(0);
  const [scenario, setScenario] = useState('high_albedo');

  const handleScenarioChange = (id: string) => {
    setScenario(id);
    if (id === 'high_albedo') setGlobalTemp(0);
    if (id === 'low_albedo') setGlobalTemp(4);
  };

  const icePercent = Math.max(0, 100 - globalTemp * 20);
  const effectiveAlbedo = (icePercent / 100) * 0.85 + (1 - icePercent / 100) * 0.06;
  const extraWarming = (0.85 - effectiveAlbedo) * 5;
  const netAmp = (globalTemp + extraWarming).toFixed(2);

  const chartData = useMemo(() => {
    return Array.from({ length: 26 }, (_, i) => {
      const t = i * 0.2;
      const ice = Math.max(0, 100 - t * 20);
      return { temp: parseFloat(t.toFixed(1)), ice };
    });
  }, []);

  return (
    <div className="w-full h-full flex overflow-hidden">
      <div className="flex-1">
        <Canvas style={{ background: '#030712' }} camera={{ position: [0, 8, 8], fov: 50 }}>
          <GlacialScene globalTemp={globalTemp} icePercent={icePercent} />
        </Canvas>
      </div>

      <div className="w-72 bg-gray-950 border-l border-gray-800 overflow-y-auto scrollbar-thin p-3 space-y-4">
        <ScenarioSelect
          label="Scenario"
          scenarios={SCENARIOS}
          value={scenario}
          onChange={handleScenarioChange}
          color="#7dd3fc"
        />

        <ControlSlider
          label="Global Temp Anomaly"
          value={globalTemp}
          min={0}
          max={5}
          step={0.1}
          color="#7dd3fc"
          onChange={setGlobalTemp}
          precision={1}
          formatValue={(v) => `+${v.toFixed(1)} °C`}
        />

        <DataOverlay
          equation={{ text: 'α_eff = fᵢ × 0.85 + (1−fᵢ) × 0.06', color: '#7dd3fc' }}
          readouts={[
            { label: 'Global Temp', value: `+${globalTemp.toFixed(1)} °C`, color: '#7dd3fc', highlight: globalTemp > 2 },
            { label: 'Ice Coverage', value: `${icePercent.toFixed(1)} %`, color: '#e0f2fe' },
            { label: 'Effective Albedo', value: effectiveAlbedo.toFixed(3), color: '#38bdf8' },
            { label: 'Extra Warming', value: `+${extraWarming.toFixed(2)} °C`, color: '#f97316', highlight: extraWarming > 1 },
            { label: 'Net Temp Amplif.', value: `×${(1 + extraWarming / Math.max(0.1, globalTemp)).toFixed(2)}`, color: '#ef4444' },
          ]}
        />

        <div className="bg-gray-900 rounded-lg p-3 border border-gray-800">
          <p className="text-xs font-semibold text-sky-400 mb-2">Ice Coverage vs Temperature</p>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: -15, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="temp" tick={{ fill: '#64748b', fontSize: 9 }} tickCount={6} label={{ value: '°C', position: 'insideBottomRight', offset: 0, fill: '#64748b', fontSize: 9 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 9 }} domain={[0, 105]} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 4 }}
                labelStyle={{ color: '#94a3b8', fontSize: 10 }}
                itemStyle={{ color: '#7dd3fc', fontSize: 10 }}
              />
              <ReferenceDot x={globalTemp} y={icePercent} r={4} fill="#f59e0b" stroke="none" />
              <Line type="monotone" dataKey="ice" stroke="#7dd3fc" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-900 rounded-lg p-3 border border-gray-800">
          <p className="text-xs font-semibold text-sky-400 mb-1">Insight</p>
          <p className="text-xs text-gray-400 leading-relaxed">
            Ice-albedo feedback is one of the strongest amplifying feedbacks in the climate system. As ice melts, darker ocean and land absorb more sunlight, causing further warming — which melts more ice. Arctic warming is currently ~4x faster than the global average due to this effect.
          </p>
        </div>
      </div>
    </div>
  );
}
