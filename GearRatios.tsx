import { useState, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import ControlSlider from '../../components/ControlSlider';
import ScenarioSelect from '../../components/ScenarioSelect';
import DataOverlay from '../../components/DataOverlay';

// ── Gear geometry ─────────────────────────────────────────────────────────────
function buildGearShape(teeth: number, r: number): THREE.Shape {
  const shape = new THREE.Shape();
  const toothH = r * 0.12;
  const toothW = (Math.PI * 2) / teeth * 0.35;

  for (let i = 0; i < teeth; i++) {
    const a0 = (i / teeth) * Math.PI * 2;
    const a1 = ((i + 0.5 - 0.18) / teeth) * Math.PI * 2;
    const a2 = ((i + 0.5 + 0.18) / teeth) * Math.PI * 2;
    const a3 = ((i + 1) / teeth) * Math.PI * 2;

    const x0 = Math.cos(a0) * r, y0 = Math.sin(a0) * r;
    const x1 = Math.cos(a1) * r, y1 = Math.sin(a1) * r;
    const x2 = Math.cos(a1) * (r + toothH), y2 = Math.sin(a1) * (r + toothH);
    const x3 = Math.cos(a2) * (r + toothH), y3 = Math.sin(a2) * (r + toothH);
    const x4 = Math.cos(a2) * r, y4 = Math.sin(a2) * r;
    const x5 = Math.cos(a3) * r, y5 = Math.sin(a3) * r;

    if (i === 0) shape.moveTo(x0, y0);
    else shape.lineTo(x0, y0);
    shape.lineTo(x1, y1);
    shape.lineTo(x2, y2);
    shape.lineTo(x3, y3);
    shape.lineTo(x4, y4);
    shape.lineTo(x5, y5);
  }
  shape.closePath();
  return shape;
}

// ── Single Gear mesh ──────────────────────────────────────────────────────────
function Gear({
  teeth, radius, posX, posY, angleRef, color, label, rpm,
}: {
  teeth: number; radius: number; posX: number; posY: number;
  angleRef: React.MutableRefObject<number>; color: string; label: string; rpm: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const shape = buildGearShape(teeth, radius);
  const extrudeSettings = { depth: 0.3, bevelEnabled: false };

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.z = angleRef.current;
    }
  });

  return (
    <group position={[posX, posY, 0]}>
      <group ref={groupRef}>
        <mesh>
          <extrudeGeometry args={[shape, extrudeSettings]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.15} metalness={0.6} roughness={0.3} />
        </mesh>
        {/* Center hub */}
        <mesh position={[0, 0, 0.35]}>
          <cylinderGeometry args={[radius * 0.18, radius * 0.18, 0.15, 16]} rotation={[Math.PI / 2, 0, 0]} />
          <meshStandardMaterial color="#0f172a" metalness={0.8} />
        </mesh>
        {/* Spokes */}
        {[0, 1, 2].map(i => (
          <mesh key={i} rotation={[0, 0, (i / 3) * Math.PI * 2]} position={[0, 0, 0.15]}>
            <boxGeometry args={[radius * 0.85, radius * 0.07, 0.05]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
        ))}
      </group>

      {/* Label */}
      <Html position={[0, -(radius + 0.6), 0]}>
        <div style={{ color, fontSize: 11, fontWeight: 700, pointerEvents: 'none',
          textShadow: '0 0 8px #000', textAlign: 'center', whiteSpace: 'nowrap' }}>
          {label}<br />
          <span style={{ color: '#94a3b8', fontSize: 9 }}>{teeth}T · {Math.abs(rpm).toFixed(1)} RPM</span>
        </div>
      </Html>
    </group>
  );
}

// ── Scene ─────────────────────────────────────────────────────────────────────
function GearScene({
  driverTeeth, drivenTeeth, inputRPM,
}: {
  driverTeeth: number; drivenTeeth: number; inputRPM: number;
}) {
  const ratio = drivenTeeth / driverTeeth;
  const outputRPM = inputRPM / ratio;

  const R1 = driverTeeth * 0.065;
  const R2 = drivenTeeth * 0.065;
  const gap = 0.05;
  const centerDist = R1 + R2 + gap;

  const angle1 = useRef(0);
  const angle2 = useRef(0);

  useFrame((_, delta) => {
    const angSpeed1 = (inputRPM / 60) * Math.PI * 2;
    const angSpeed2 = (outputRPM / 60) * Math.PI * 2;
    angle1.current -= delta * angSpeed1;
    angle2.current += delta * angSpeed2;
  });

  const posX1 = -centerDist / 2;
  const posX2 = centerDist / 2;

  return (
    <group>
      <Gear
        teeth={driverTeeth} radius={R1} posX={posX1} posY={0}
        angleRef={angle1} color="#22d3ee" label="Driver" rpm={inputRPM}
      />
      <Gear
        teeth={drivenTeeth} radius={R2} posX={posX2} posY={0}
        angleRef={angle2} color="#f59e0b" label="Driven" rpm={outputRPM}
      />
    </group>
  );
}

// ── scenarios ─────────────────────────────────────────────────────────────────
const SCENARIOS = [
  { id: 'torque',  label: 'Torque Multiplier', description: 'Small drives large — more torque, less speed' },
  { id: 'speed',   label: 'Speed Multiplier',  description: 'Large drives small — more speed, less torque' },
  { id: 'equal',   label: 'Equal Gears',        description: '1:1 ratio — same speed and torque' },
];

const SCENARIO_TEETH: Record<string, [number, number]> = {
  torque: [10, 30],
  speed:  [30, 10],
  equal:  [20, 20],
};

export default function GearRatios() {
  const [driverTeeth, setDriverTeeth] = useState(10);
  const [drivenTeeth, setDrivenTeeth] = useState(30);
  const [inputRPM, setInputRPM] = useState(60);
  const [inputTorque, setInputTorque] = useState(10);
  const [scenario, setScenario] = useState('torque');

  const ratio = drivenTeeth / driverTeeth;
  const outputRPM = inputRPM / ratio;
  const outputTorque = inputTorque * ratio;
  const efficiency = 0.95;
  const outputPower = (2 * Math.PI * outputRPM / 60) * outputTorque * efficiency;
  const inputPower = (2 * Math.PI * inputRPM / 60) * inputTorque;

  const applyScenario = (id: string) => {
    setScenario(id);
    const [d, v] = SCENARIO_TEETH[id];
    setDriverTeeth(d);
    setDrivenTeeth(v);
  };

  const barData = [
    { name: 'Input', rpm: parseFloat(inputRPM.toFixed(1)), torque: parseFloat(inputTorque.toFixed(1)) },
    { name: 'Output', rpm: parseFloat(outputRPM.toFixed(1)), torque: parseFloat(outputTorque.toFixed(1)) },
  ];

  return (
    <div className="w-full h-full flex overflow-hidden">
      <div className="flex-1 relative min-w-0">
        <Canvas camera={{ position: [0, 0, 8], fov: 50 }} style={{ background: '#030712' }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[3, 5, 5]} intensity={1.2} />
          <pointLight position={[-3, 2, 3]} color="#22d3ee" intensity={1} distance={6} />
          <pointLight position={[3, 2, 3]} color="#f59e0b" intensity={1} distance={6} />
          <GearScene driverTeeth={driverTeeth} drivenTeeth={drivenTeeth} inputRPM={inputRPM} />
          <OrbitControls enablePan={false} minDistance={4} maxDistance={14} />
          <gridHelper args={[10, 10, '#0f172a', '#0f172a']} />
        </Canvas>
      </div>

      <div className="w-72 flex-shrink-0 bg-gray-950 border-l border-gray-800 overflow-y-auto scrollbar-thin">
        <div className="p-3 space-y-4">

          <ScenarioSelect label="Scenario" scenarios={SCENARIOS} value={scenario} onChange={applyScenario} color="cyan" />

          <ControlSlider label="Driver Teeth" value={driverTeeth} min={6} max={40} step={1} color="#22d3ee"
            onChange={v => { setDriverTeeth(Math.round(v)); setScenario('custom'); }} precision={0} />
          <ControlSlider label="Driven Teeth" value={drivenTeeth} min={6} max={60} step={1} color="#f59e0b"
            onChange={v => { setDrivenTeeth(Math.round(v)); setScenario('custom'); }} precision={0} />
          <ControlSlider label="Input RPM" value={inputRPM} min={10} max={300} step={5} color="#34d399"
            onChange={setInputRPM} precision={0} formatValue={v => `${v} RPM`} />
          <ControlSlider label="Input Torque (Nm)" value={inputTorque} min={1} max={100} step={1} color="#f43f5e"
            onChange={setInputTorque} precision={0} formatValue={v => `${v} Nm`} />

          <DataOverlay
            equation={{ text: 'GR = T₂/T₁ = ω₁/ω₂ = τ₂/τ₁', color: '#94a3b8' }}
            readouts={[
              { label: 'Gear Ratio', value: `${ratio.toFixed(3)} : 1`, color: ratio > 1 ? '#f59e0b' : '#22d3ee', highlight: true },
              { label: 'Output RPM', value: `${outputRPM.toFixed(1)} RPM`, color: '#34d399', highlight: true },
              { label: 'Output Torque', value: `${outputTorque.toFixed(1)} Nm`, color: '#f43f5e', highlight: true },
              { label: 'Input Power', value: `${inputPower.toFixed(1)} W`, color: '#94a3b8' },
              { label: 'Output Power', value: `${outputPower.toFixed(1)} W (95%)`, color: '#94a3b8' },
              { label: 'Mech. Adv.', value: ratio.toFixed(2), color: ratio > 1 ? '#f59e0b' : '#22d3ee' },
            ]}
          />

          {/* RPM & Torque comparison */}
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-3 pt-2 pb-0">
              <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Input vs Output</span>
            </div>
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={barData} margin={{ top: 4, right: 10, left: -20, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} />
                <YAxis tick={{ fontSize: 8, fill: '#475569' }} tickLine={false} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 6, fontSize: 10 }} />
                <Bar dataKey="rpm" fill="#22d3ee" name="RPM" radius={[3, 3, 0, 0]} />
                <Bar dataKey="torque" fill="#f59e0b" name="Torque (Nm)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-3 text-[11px] text-gray-400 space-y-1">
            <p>Gear ratio {ratio.toFixed(2)}:1 — {ratio > 1
              ? <span>driven gear has <span className="text-amber-300">more torque</span> but rotates <span className="text-rose-400">slower</span></span>
              : ratio < 1
              ? <span>driven gear rotates <span className="text-emerald-300">faster</span> but with <span className="text-rose-400">less torque</span></span>
              : <span>equal gears — <span className="text-cyan-300">1:1 direct drive</span></span>
            }.</p>
            <p>Power is conserved (minus 5% friction losses).</p>
          </div>

        </div>
      </div>
    </div>
  );
}
