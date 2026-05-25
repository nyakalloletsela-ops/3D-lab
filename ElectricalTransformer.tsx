import { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import ControlSlider from '../../components/ControlSlider';
import ScenarioSelect from '../../components/ScenarioSelect';
import DataOverlay from '../../components/DataOverlay';

// ── Helix builder ─────────────────────────────────────────────────────────────
function buildHelix(
  turns: number,
  radius: number,
  height: number,
  centerX: number,
  centerY: number,
  segments: number
): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  const totalAngle = turns * Math.PI * 2;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = t * totalAngle;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + (t - 0.5) * height;
    const z = Math.sin(angle) * radius;
    pts.push(new THREE.Vector3(x, y, z));
  }
  return pts;
}

// ── Flux animation ────────────────────────────────────────────────────────────
function FluxLine({ alpha }: { alpha: number }) {
  const color = `rgba(251,191,36,${alpha})`;
  const coreLoop: THREE.Vector3[] = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const rx = 1.2, ry = 0.5;
    const n = 64;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * rx, Math.sin(a) * ry, 0));
    }
    return pts;
  }, []);

  return (
    <Line
      points={coreLoop}
      color="#fbbf24"
      lineWidth={2}
      transparent
      opacity={alpha}
    />
  );
}

// ── Scene ─────────────────────────────────────────────────────────────────────
function TransformerScene({ N1, N2, V1 }: { N1: number; N2: number; V1: number }) {
  const fluxAlpha = useRef(0);
  const fluxRef = useRef<{ alpha: number }>({ alpha: 0 });
  const time = useRef(0);
  const [alpha, setAlpha] = useState(0.5);

  useFrame((_, delta) => {
    time.current += delta * 2;
    const a = (Math.sin(time.current) * 0.5 + 0.5) * 0.85 + 0.1;
    fluxAlpha.current = a;
    setAlpha(a);
  });

  // Primary coil: left side of core
  const primaryCoil = useMemo(() => buildHelix(Math.min(8, Math.round(N1 / 12)), 0.35, 1.4, -1.2, 0, 120), [N1]);
  // Secondary coil: right side of core
  const secondaryCoil = useMemo(() => buildHelix(Math.min(8, Math.round(N2 / 12)), 0.35, 1.4, 1.2, 0, 120), [N2]);

  const V2 = V1 * (N2 / N1);
  const ratio = (N2 / N1).toFixed(3);

  return (
    <group>
      {/* Iron core — torus */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.2, 0.28, 16, 64]} />
        <meshStandardMaterial color="#78350f" metalness={0.5} roughness={0.5} emissive="#451a03" emissiveIntensity={0.2} />
      </mesh>

      {/* Primary coil (cyan) */}
      {primaryCoil.length > 1 && (
        <Line points={primaryCoil} color="#22d3ee" lineWidth={4} />
      )}

      {/* Secondary coil (amber) */}
      {secondaryCoil.length > 1 && (
        <Line points={secondaryCoil} color="#f59e0b" lineWidth={4} />
      )}

      {/* Animated flux */}
      <FluxLine alpha={alpha} />

      {/* Labels */}
      <Html position={[-1.5, 1.2, 0]}>
        <div style={{ color: '#22d3ee', fontSize: 11, fontWeight: 700, pointerEvents: 'none', textShadow: '0 0 6px #000', textAlign: 'center' }}>
          N₁ = {N1} turns<br />
          <span style={{ color: '#94a3b8', fontSize: 10 }}>V₁ = {V1.toFixed(0)} V</span>
        </div>
      </Html>
      <Html position={[1.5, 1.2, 0]}>
        <div style={{ color: '#f59e0b', fontSize: 11, fontWeight: 700, pointerEvents: 'none', textShadow: '0 0 6px #000', textAlign: 'center' }}>
          N₂ = {N2} turns<br />
          <span style={{ color: '#94a3b8', fontSize: 10 }}>V₂ = {V2.toFixed(1)} V</span>
        </div>
      </Html>

      {/* Input wire left */}
      <Line
        points={[new THREE.Vector3(-1.2, -1.0, 0), new THREE.Vector3(-2.0, -1.0, 0), new THREE.Vector3(-2.0, 1.0, 0), new THREE.Vector3(-1.2, 1.0, 0)]}
        color="#22d3ee"
        lineWidth={2}
      />
      {/* Output wire right */}
      <Line
        points={[new THREE.Vector3(1.2, -1.0, 0), new THREE.Vector3(2.0, -1.0, 0), new THREE.Vector3(2.0, 1.0, 0), new THREE.Vector3(1.2, 1.0, 0)]}
        color="#f59e0b"
        lineWidth={2}
      />

      {/* Ratio label in center */}
      <Html position={[0, -1.5, 0]} center>
        <div style={{ color: '#fbbf24', fontSize: 10, fontWeight: 600, pointerEvents: 'none', textShadow: '0 0 6px #000' }}>
          Ratio N₂/N₁ = {ratio}
        </div>
      </Html>
    </group>
  );
}

// ── Scenarios ─────────────────────────────────────────────────────────────────
const SCENARIOS = [
  { id: 'stepup',   label: 'Step-Up',   description: 'N2 > N1 — voltage increases, current decreases' },
  { id: 'stepdown', label: 'Step-Down', description: 'N2 < N1 — voltage decreases, current increases' },
];

const SCENARIO_PARAMS: Record<string, { N1: number; N2: number }> = {
  stepup:   { N1: 100, N2: 400 },
  stepdown: { N1: 400, N2: 100 },
};

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ElectricalTransformer() {
  const [N1,       setN1]       = useState(100);
  const [N2,       setN2]       = useState(400);
  const [V1,       setV1]       = useState(120);
  const [scenario, setScenario] = useState('stepup');

  const V2   = V1 * (N2 / N1);
  const I1   = 1.0; // assumed 1 A input
  const I2   = I1 * (N1 / N2);
  const Pout = V2 * I2;
  const Pin  = V1 * I1;
  const ratio = N2 / N1;
  const isStepUp = N2 > N1;

  const applyScenario = (id: string) => {
    setScenario(id);
    const p = SCENARIO_PARAMS[id];
    setN1(p.N1);
    setN2(p.N2);
  };

  return (
    <div className="w-full h-full flex overflow-hidden">
      <div className="flex-1 relative min-w-0">
        <Canvas camera={{ position: [0, 1.5, 6], fov: 50 }} style={{ background: '#030712' }}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[4, 6, 4]} intensity={1} />
          <pointLight position={[-2, 2, 4]} color="#22d3ee" intensity={1.2} distance={10} />
          <pointLight position={[2, 2, 4]} color="#f59e0b" intensity={1.2} distance={10} />
          <TransformerScene N1={N1} N2={N2} V1={V1} />
          <OrbitControls enablePan={false} minDistance={3} maxDistance={12} />
        </Canvas>
      </div>

      <div className="w-72 flex-shrink-0 bg-gray-950 border-l border-gray-800 overflow-y-auto scrollbar-thin">
        <div className="p-3 space-y-4">
          <ScenarioSelect
            label="Transformer Type"
            scenarios={SCENARIOS}
            value={scenario}
            onChange={applyScenario}
            color="amber"
          />

          <ControlSlider
            label="Primary Turns (N1)"
            value={N1}
            min={10}
            max={500}
            step={10}
            color="#22d3ee"
            onChange={v => { setN1(Math.round(v)); }}
            precision={0}
            formatValue={v => `${Math.round(v)} turns`}
          />
          <ControlSlider
            label="Secondary Turns (N2)"
            value={N2}
            min={10}
            max={500}
            step={10}
            color="#f59e0b"
            onChange={v => { setN2(Math.round(v)); }}
            precision={0}
            formatValue={v => `${Math.round(v)} turns`}
          />
          <ControlSlider
            label="Input Voltage (V1)"
            value={V1}
            min={10}
            max={240}
            step={5}
            color="#34d399"
            onChange={setV1}
            precision={0}
            formatValue={v => `${v.toFixed(0)} V`}
          />

          <DataOverlay
            equation={{ text: 'V₂/V₁ = N₂/N₁', color: '#94a3b8' }}
            readouts={[
              { label: 'Turns Ratio N₂/N₁', value: ratio.toFixed(3), color: '#f59e0b', highlight: true },
              { label: 'Type', value: isStepUp ? 'Step-Up' : 'Step-Down', color: isStepUp ? '#34d399' : '#f43f5e' },
              { label: 'V_in (V₁)', value: `${V1.toFixed(0)} V`, color: '#22d3ee' },
              { label: 'V_out (V₂)', value: `${V2.toFixed(1)} V`, color: '#f59e0b', highlight: true },
              { label: 'I_in (I₁)', value: `${I1.toFixed(2)} A`, color: '#22d3ee' },
              { label: 'I_out (I₂)', value: `${I2.toFixed(3)} A`, color: '#f59e0b' },
              { label: 'Power In', value: `${Pin.toFixed(1)} W`, color: '#94a3b8' },
              { label: 'Power Out', value: `${Pout.toFixed(1)} W`, color: '#94a3b8' },
            ]}
          />

          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-3 text-[11px] text-gray-400 space-y-1">
            <p>
              {isStepUp
                ? `Step-up: V₂ = ${V2.toFixed(0)} V. Voltage multiplied by ${ratio.toFixed(2)}×, current divided by same ratio.`
                : `Step-down: V₂ = ${V2.toFixed(0)} V. Voltage divided by ${(1/ratio).toFixed(2)}×, current multiplied.`
              }
            </p>
            <p>Transformers work on AC only — the changing magnetic flux through the core induces the secondary voltage.</p>
            <p>Ideal transformer: <span className="text-amber-300">P_in = P_out</span> (power is conserved).</p>
          </div>
        </div>
      </div>
    </div>
  );
}
