import { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import ScenarioSelect from '../../components/ScenarioSelect';
import DataOverlay from '../../components/DataOverlay';

// ── standard reduction potentials (V) ────────────────────────────────────────
const REDUCTION_POTENTIALS: Record<string, number> = {
  zinc: -0.76,
  iron: -0.44,
  copper: 0.34,
  silver: 0.80,
};

const METAL_COLORS: Record<string, string> = {
  zinc: '#a3a3a3',
  iron: '#78716c',
  copper: '#f97316',
  silver: '#e2e8f0',
};

const METAL_LABELS: Record<string, string> = {
  zinc: 'Zn',
  iron: 'Fe',
  copper: 'Cu',
  silver: 'Ag',
};

type AnodeMetal = 'zinc' | 'iron';
type CathodeMetal = 'copper' | 'silver';
type CellScenario = 'zinc_copper' | 'silver_copper';

// ── electron particle travelling along wire ───────────────────────────────────
interface ElectronProps {
  index: number;
  total: number;
  speed: number;
}

function ElectronOnWire({ index, total, speed }: ElectronProps) {
  const ref = useRef<THREE.Mesh>(null);
  const t = useRef((index / total));

  useFrame((_, delta) => {
    if (!ref.current) return;
    t.current = (t.current + delta * speed) % 1;
    // Wire goes from anode top (-2.5, 1.5, 0) to cathode top (2.5, 1.5, 0) via arc
    const angle = t.current * Math.PI;
    const x = THREE.MathUtils.lerp(-2.5, 2.5, t.current);
    const y = 1.5 + Math.sin(angle) * 0.6;
    ref.current.position.set(x, y, 0);
  });

  return (
    <mesh ref={ref} position={[-2.5, 1.5, 0]}>
      <sphereGeometry args={[0.07, 8, 8]} />
      <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={1.2} />
    </mesh>
  );
}

// ── ion in salt bridge ─────────────────────────────────────────────────────────
interface SaltBridgeIonProps {
  index: number;
  total: number;
}

function SaltBridgeIon({ index, total }: SaltBridgeIonProps) {
  const ref = useRef<THREE.Mesh>(null);
  const t = useRef(index / total);

  useFrame((_, delta) => {
    if (!ref.current) return;
    t.current = (t.current + delta * 0.3) % 1;
    const x = THREE.MathUtils.lerp(-1.8, 1.8, t.current);
    const y = -1.2 - Math.sin(t.current * Math.PI) * 0.25;
    ref.current.position.set(x, y, 0);
  });

  return (
    <mesh ref={ref} position={[0, -1.2, 0]}>
      <sphereGeometry args={[0.06, 8, 8]} />
      <meshStandardMaterial color="#a78bfa" emissive="#a78bfa" emissiveIntensity={0.9} />
    </mesh>
  );
}

// ── dissolving anode particle ─────────────────────────────────────────────────
function DetachingIon({ anodeColor }: { anodeColor: string }) {
  const ref = useRef<THREE.Mesh>(null);
  const vel = useRef(new THREE.Vector3((Math.random() - 0.5) * 0.8, -0.5, (Math.random() - 0.5) * 0.5));
  const life = useRef(Math.random());

  useFrame((_, delta) => {
    if (!ref.current) return;
    life.current += delta * 0.4;
    if (life.current > 1) life.current = 0;
    ref.current.position.addScaledVector(vel.current, delta);
    if (life.current > 0.9) ref.current.position.set(-2.5 + (Math.random() - 0.5) * 0.4, -0.3, 0);
    (ref.current.material as THREE.MeshStandardMaterial).opacity = 1 - life.current;
  });

  return (
    <mesh ref={ref} position={[-2.5, -0.3, 0]}>
      <sphereGeometry args={[0.06, 8, 8]} />
      <meshStandardMaterial color={anodeColor} transparent opacity={0.8} />
    </mesh>
  );
}

// ── depositing cathode particle ────────────────────────────────────────────────
function DepositingIon({ cathodeColor }: { cathodeColor: string }) {
  const ref = useRef<THREE.Mesh>(null);
  const startY = useRef(0.3 + Math.random() * 0.8);
  const targetX = useRef(2.5 + (Math.random() - 0.5) * 0.25);
  const targetY = useRef(-0.2 + (Math.random() - 0.5) * 0.6);
  const t = useRef(Math.random());

  useFrame((_, delta) => {
    if (!ref.current) return;
    t.current += delta * 0.3;
    if (t.current > 1) {
      t.current = 0;
      startY.current = 0.3 + Math.random() * 0.8;
      targetX.current = 2.5 + (Math.random() - 0.5) * 0.25;
      targetY.current = -0.2 + (Math.random() - 0.5) * 0.6;
    }
    const x = THREE.MathUtils.lerp(2.5, targetX.current, t.current);
    const y = THREE.MathUtils.lerp(startY.current, targetY.current, t.current);
    ref.current.position.set(x, y, 0);
    (ref.current.material as THREE.MeshStandardMaterial).opacity = t.current > 0.8 ? 1 : t.current * 1.25;
  });

  return (
    <mesh ref={ref} position={[2.5, 0.5, 0]}>
      <sphereGeometry args={[0.07, 8, 8]} />
      <meshStandardMaterial color={cathodeColor} emissive={cathodeColor} emissiveIntensity={0.4} transparent opacity={0.9} />
    </mesh>
  );
}

// ── scene ─────────────────────────────────────────────────────────────────────
interface CellSceneProps {
  anode: string;
  cathode: string;
  cellVoltage: number;
}

function GalvanicScene({ anode, cathode, cellVoltage }: CellSceneProps) {
  const anodeColor = METAL_COLORS[anode];
  const cathodeColor = METAL_COLORS[cathode];
  const speed = Math.min(1.0, Math.abs(cellVoltage) * 0.5 + 0.15);

  const wirePoints = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      const x = THREE.MathUtils.lerp(-2.5, 2.5, t);
      const y = 1.5 + Math.sin(t * Math.PI) * 0.6;
      pts.push(new THREE.Vector3(x, y, 0));
    }
    return pts;
  }, []);

  const saltBridgePts = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const x = THREE.MathUtils.lerp(-1.8, 1.8, t);
      const y = -1.2 - Math.sin(t * Math.PI) * 0.25;
      pts.push(new THREE.Vector3(x, y, 0));
    }
    return pts;
  }, []);

  return (
    <group>
      {/* Anode beaker */}
      <mesh position={[-2.5, -0.5, 0]}>
        <cylinderGeometry args={[0.9, 0.75, 2.2, 24, 1, true]} />
        <meshStandardMaterial color="#94a3b8" transparent opacity={0.18} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[-2.5, -1.65, 0]}>
        <cylinderGeometry args={[0.75, 0.75, 0.1, 24]} />
        <meshStandardMaterial color="#334155" transparent opacity={0.5} />
      </mesh>
      {/* Liquid anode */}
      <mesh position={[-2.5, -0.85, 0]}>
        <cylinderGeometry args={[0.74, 0.73, 1.5, 24]} />
        <meshStandardMaterial color="#1e3a5f" transparent opacity={0.4} />
      </mesh>

      {/* Cathode beaker */}
      <mesh position={[2.5, -0.5, 0]}>
        <cylinderGeometry args={[0.9, 0.75, 2.2, 24, 1, true]} />
        <meshStandardMaterial color="#94a3b8" transparent opacity={0.18} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[2.5, -1.65, 0]}>
        <cylinderGeometry args={[0.75, 0.75, 0.1, 24]} />
        <meshStandardMaterial color="#334155" transparent opacity={0.5} />
      </mesh>
      {/* Liquid cathode */}
      <mesh position={[2.5, -0.85, 0]}>
        <cylinderGeometry args={[0.74, 0.73, 1.5, 24]} />
        <meshStandardMaterial color="#1e3a5f" transparent opacity={0.4} />
      </mesh>

      {/* Anode rod */}
      <mesh position={[-2.5, -0.1, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 1.8, 12]} />
        <meshStandardMaterial color={anodeColor} emissive={anodeColor} emissiveIntensity={0.2} />
      </mesh>
      {/* Cathode rod */}
      <mesh position={[2.5, -0.1, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 2.0, 12]} />
        <meshStandardMaterial color={cathodeColor} emissive={cathodeColor} emissiveIntensity={0.2} />
      </mesh>

      {/* Wire */}
      <Line points={wirePoints} color="#94a3b8" lineWidth={2} />

      {/* Electrons on wire */}
      {Array.from({ length: 5 }, (_, i) => (
        <ElectronOnWire key={i} index={i} total={5} speed={speed} />
      ))}

      {/* Salt bridge */}
      <Line points={saltBridgePts} color="#7c3aed" lineWidth={4} transparent opacity={0.5} />
      {Array.from({ length: 4 }, (_, i) => (
        <SaltBridgeIon key={i} index={i} total={4} />
      ))}

      {/* Dissolving anode particles */}
      {Array.from({ length: 4 }, (_, i) => (
        <DetachingIon key={i} anodeColor={anodeColor} />
      ))}

      {/* Depositing cathode particles */}
      {Array.from({ length: 4 }, (_, i) => (
        <DepositingIon key={i} cathodeColor={cathodeColor} />
      ))}

      {/* Labels */}
      <Html position={[-2.5, 1.7, 0]}>
        <div className="text-center pointer-events-none">
          <div className="text-[11px] text-gray-400">ANODE (−)</div>
          <div className="text-sm font-bold" style={{ color: anodeColor }}>{METAL_LABELS[anode]}</div>
        </div>
      </Html>
      <Html position={[2.5, 1.7, 0]}>
        <div className="text-center pointer-events-none">
          <div className="text-[11px] text-gray-400">CATHODE (+)</div>
          <div className="text-sm font-bold" style={{ color: cathodeColor }}>{METAL_LABELS[cathode]}</div>
        </div>
      </Html>

      {/* Voltage meter */}
      <Html position={[0, 2.5, 0]}>
        <div className="bg-gray-950/90 border border-amber-500/50 rounded-xl px-3 py-1.5 pointer-events-none text-center">
          <div className="text-[9px] text-gray-500 uppercase tracking-wider">Cell Voltage</div>
          <div className="text-lg font-mono font-bold text-amber-400">{cellVoltage.toFixed(2)} V</div>
        </div>
      </Html>

      {/* Salt bridge label */}
      <Html position={[0, -1.65, 0]}>
        <div className="text-[9px] text-violet-400 pointer-events-none text-center">Salt Bridge</div>
      </Html>
    </group>
  );
}

// ── scenarios ─────────────────────────────────────────────────────────────────
const SCENARIOS = [
  { id: 'zinc_copper', label: 'Zn/Cu', description: 'Classic Daniell cell: Zn anode, Cu cathode' },
  { id: 'silver_copper', label: 'Cu/Ag', description: 'Copper anode, silver cathode' },
];

// ── main component ────────────────────────────────────────────────────────────
export default function GalvanicCell() {
  const [scenario, setScenario] = useState<CellScenario>('zinc_copper');
  const [anode, setAnode] = useState<AnodeMetal>('zinc');
  const [cathode, setCathode] = useState<CathodeMetal>('copper');

  const handleScenario = (id: CellScenario) => {
    setScenario(id);
    if (id === 'zinc_copper') { setAnode('zinc'); setCathode('copper'); }
    else { setAnode('iron'); setCathode('silver'); }
  };

  const eAnode = REDUCTION_POTENTIALS[anode];
  const eCathode = REDUCTION_POTENTIALS[cathode];
  const cellVoltage = eCathode - eAnode;

  const oxidationRxn = anode === 'zinc'
    ? 'Zn → Zn²⁺ + 2e⁻'
    : 'Fe → Fe²⁺ + 2e⁻';
  const reductionRxn = cathode === 'copper'
    ? 'Cu²⁺ + 2e⁻ → Cu'
    : 'Ag⁺ + e⁻ → Ag';

  return (
    <div className="w-full h-full flex overflow-hidden">
      {/* 3D Canvas */}
      <div className="flex-1 relative min-w-0">
        <Canvas camera={{ position: [0, 0.5, 8], fov: 45 }} style={{ background: '#030712' }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[3, 5, 5]} intensity={1.0} />
          <pointLight position={[-3, 0, 2]} color={METAL_COLORS[anode]} intensity={0.8} distance={6} />
          <pointLight position={[3, 0, 2]} color={METAL_COLORS[cathode]} intensity={0.8} distance={6} />
          <GalvanicScene anode={anode} cathode={cathode} cellVoltage={cellVoltage} />
          <OrbitControls enablePan={false} minDistance={5} maxDistance={14} />
        </Canvas>
      </div>

      {/* Right panel */}
      <div className="w-72 flex-shrink-0 bg-gray-950 border-l border-gray-800 overflow-y-auto scrollbar-thin p-3 space-y-4">

        <ScenarioSelect
          label="Scenario"
          scenarios={SCENARIOS}
          value={scenario}
          onChange={handleScenario}
          color="amber"
        />

        {/* Anode selector */}
        <div>
          <p className="text-[10px] text-gray-600 font-semibold uppercase tracking-wider mb-1.5">Anode Metal</p>
          <div className="flex gap-1.5">
            {(['zinc', 'iron'] as AnodeMetal[]).map(m => (
              <button
                key={m}
                onClick={() => setAnode(m)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  anode === m
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                    : 'border-gray-800 text-gray-500 hover:text-gray-300 hover:bg-gray-800'
                }`}
              >
                {METAL_LABELS[m]} ({eAnode === REDUCTION_POTENTIALS[m] ? eAnode.toFixed(2) : REDUCTION_POTENTIALS[m].toFixed(2)} V)
              </button>
            ))}
          </div>
        </div>

        {/* Cathode selector */}
        <div>
          <p className="text-[10px] text-gray-600 font-semibold uppercase tracking-wider mb-1.5">Cathode Metal</p>
          <div className="flex gap-1.5">
            {(['copper', 'silver'] as CathodeMetal[]).map(m => (
              <button
                key={m}
                onClick={() => setCathode(m)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  cathode === m
                    ? 'bg-orange-500/20 border-orange-500/40 text-orange-300'
                    : 'border-gray-800 text-gray-500 hover:text-gray-300 hover:bg-gray-800'
                }`}
              >
                {METAL_LABELS[m]} ({REDUCTION_POTENTIALS[m].toFixed(2)} V)
              </button>
            ))}
          </div>
        </div>

        <DataOverlay
          equation={{ text: 'E_cell = E_cathode − E_anode', color: '#fbbf24' }}
          readouts={[
            { label: 'Anode', value: `${METAL_LABELS[anode]} (${eAnode.toFixed(2)} V)`, color: METAL_COLORS[anode] },
            { label: 'Cathode', value: `${METAL_LABELS[cathode]} (${eCathode.toFixed(2)} V)`, color: METAL_COLORS[cathode] },
            { label: 'E_anode', value: `${eAnode.toFixed(2)} V`, color: '#f87171' },
            { label: 'E_cathode', value: `${eCathode.toFixed(2)} V`, color: '#4ade80' },
            { label: 'Cell Voltage', value: `${cellVoltage.toFixed(2)} V`, color: '#fbbf24', highlight: true },
            { label: 'Oxidation', value: oxidationRxn, color: '#f87171' },
            { label: 'Reduction', value: reductionRxn, color: '#4ade80' },
          ]}
        />

        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-3 text-[11px] text-gray-400 space-y-1">
          <p>Electrons flow from <span className="text-amber-400 font-semibold">anode (−)</span> through the wire to <span className="text-green-400 font-semibold">cathode (+)</span>.</p>
          <p>The <span className="text-violet-400 font-semibold">salt bridge</span> maintains electrical neutrality by allowing ion flow between solutions.</p>
          <p>Higher cell voltage = greater driving force for the redox reaction.</p>
        </div>

      </div>
    </div>
  );
}
