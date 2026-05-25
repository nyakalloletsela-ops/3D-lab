import { useState, useRef, useCallback, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import ScenarioSelect from '../../components/ScenarioSelect';
import DataOverlay from '../../components/DataOverlay';

// ── types ─────────────────────────────────────────────────────────────────────
interface Charge {
  id: number;
  x: number;
  y: number;
  q: number; // +1 or -1
}

// ── coulomb constant (simplified) ─────────────────────────────────────────────
const K = 8;

function eField(charges: Charge[], px: number, py: number): [number, number] {
  let ex = 0, ey = 0;
  for (const c of charges) {
    const dx = px - c.x;
    const dy = py - c.y;
    const r2 = dx * dx + dy * dy;
    if (r2 < 0.04) continue;
    const r = Math.sqrt(r2);
    const mag = K * Math.abs(c.q) / r2;
    ex += (c.q > 0 ? 1 : -1) * (dx / r) * mag;
    ey += (c.q > 0 ? 1 : -1) * (dy / r) * mag;
  }
  return [ex, ey];
}

function eMagnitude(charges: Charge[], px: number, py: number): number {
  const [ex, ey] = eField(charges, px, py);
  return Math.sqrt(ex * ex + ey * ey);
}

// ── field line tracer ─────────────────────────────────────────────────────────
function traceFieldLine(charges: Charge[], startX: number, startY: number, forward: boolean): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  let x = startX, y = startY;
  const step = forward ? 0.12 : -0.12;
  for (let i = 0; i < 80; i++) {
    pts.push(new THREE.Vector3(x, y, 0));
    const [ex, ey] = eField(charges, x, y);
    const len = Math.sqrt(ex * ex + ey * ey);
    if (len < 0.001) break;
    x += (ex / len) * step;
    y += (ey / len) * step;
    if (Math.abs(x) > 5.5 || Math.abs(y) > 4.5) break;
    let nearCharge = false;
    for (const c of charges) {
      if (c.q < 0 && Math.sqrt((x - c.x) ** 2 + (y - c.y) ** 2) < 0.3) { nearCharge = true; break; }
    }
    if (nearCharge) { pts.push(new THREE.Vector3(x, y, 0)); break; }
  }
  return pts;
}

// ── field lines renderer ──────────────────────────────────────────────────────
function FieldLines({ charges }: { charges: Charge[] }) {
  const lines = useMemo(() => {
    const result: { pts: THREE.Vector3[]; id: string }[] = [];
    for (const c of charges) {
      if (c.q <= 0) continue;
      const numLines = 10;
      for (let i = 0; i < numLines; i++) {
        const angle = (i / numLines) * Math.PI * 2;
        const sx = c.x + 0.35 * Math.cos(angle);
        const sy = c.y + 0.35 * Math.sin(angle);
        const pts = traceFieldLine(charges, sx, sy, true);
        if (pts.length >= 2) result.push({ pts, id: `${c.id}-${i}` });
      }
    }
    return result;
  }, [charges]);

  return (
    <>
      {lines.map(({ pts, id }) => (
        <Line key={id} points={pts} color="#22d3ee" lineWidth={1.2} transparent opacity={0.5} />
      ))}
    </>
  );
}

// ── probe point showing E-field ────────────────────────────────────────────────
function Probe({ charges, position }: { charges: Charge[]; position: [number, number] }) {
  const [ex, ey] = eField(charges, position[0], position[1]);
  const mag = Math.sqrt(ex * ex + ey * ey);
  const len = Math.min(mag * 0.15, 1.5);
  const nx = mag > 0.01 ? ex / mag : 0;
  const ny = mag > 0.01 ? ey / mag : 0;

  return (
    <group>
      <mesh position={[position[0], position[1], 0.1]}>
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={1} />
      </mesh>
      {mag > 0.05 && (
        <>
          <Line
            points={[
              new THREE.Vector3(position[0], position[1], 0.15),
              new THREE.Vector3(position[0] + nx * len, position[1] + ny * len, 0.15),
            ]}
            color="#fbbf24"
            lineWidth={3}
          />
          <mesh
            position={[position[0] + nx * (len + 0.12), position[1] + ny * (len + 0.12), 0.15]}
            quaternion={new THREE.Quaternion().setFromUnitVectors(
              new THREE.Vector3(0, 1, 0),
              new THREE.Vector3(nx, ny, 0)
            )}
          >
            <coneGeometry args={[0.07, 0.18, 8]} />
            <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.6} />
          </mesh>
        </>
      )}
      <Html position={[position[0] + 0.15, position[1] + 0.3, 0.2]}>
        <div className="bg-amber-900/80 border border-amber-500/50 text-amber-300 text-[10px] font-mono px-2 py-0.5 rounded-lg pointer-events-none whitespace-nowrap">
          |E| = {mag.toFixed(2)} N/C
        </div>
      </Html>
    </group>
  );
}

// ── click-to-spawn charge handler ─────────────────────────────────────────────
function ClickHandler({ onPlace, mode }: { onPlace: (x: number, y: number) => void; mode: string }) {
  const { camera, gl } = useThree();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

  const handleClick = useCallback((e: any) => {
    if (mode !== 'spawn') return;
    const rect = gl.domElement.getBoundingClientRect();
    const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera({ x: ndcX, y: ndcY }, camera);
    const target = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, target);
    onPlace(target.x, target.y);
  }, [mode, camera, gl, onPlace]);

  return <mesh visible={false} onClick={handleClick}><planeGeometry args={[100, 100]} /></mesh>;
}

// ── draggable probe ────────────────────────────────────────────────────────────
function DraggableProbe({
  charges, probePos, setProbePos, mode,
}: {
  charges: Charge[];
  probePos: [number, number];
  setProbePos: (pos: [number, number]) => void;
  mode: string;
}) {
  const isDragging = useRef(false);
  const { camera, gl } = useThree();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

  const getWorldPos = (e: any): [number, number] => {
    const rect = gl.domElement.getBoundingClientRect();
    const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera({ x: ndcX, y: ndcY }, camera);
    const target = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, target);
    return [target.x, target.y];
  };

  return (
    <group>
      <Probe charges={charges} position={probePos} />
      {mode === 'probe' && (
        <mesh
          position={[probePos[0], probePos[1], 0.2]}
          onPointerDown={(e: any) => { e.stopPropagation(); isDragging.current = true; gl.domElement.style.cursor = 'grabbing'; }}
          onPointerMove={(e: any) => { if (!isDragging.current) return; const [wx, wy] = getWorldPos(e); setProbePos([wx, wy]); }}
          onPointerUp={() => { isDragging.current = false; gl.domElement.style.cursor = 'default'; }}
        >
          <sphereGeometry args={[0.22, 12, 12]} />
          <meshStandardMaterial visible={false} />
        </mesh>
      )}
    </group>
  );
}

// ── scenarios ─────────────────────────────────────────────────────────────────
const SCENARIOS = [
  { id: 'dipole',     label: 'Dipole',        description: 'Equal + and − charges' },
  { id: 'like',       label: 'Like Charges',  description: 'Two + charges repelling' },
  { id: 'capacitor',  label: 'Capacitor',     description: 'Parallel plate electric field' },
];

const SCENARIO_CHARGES: Record<string, Charge[]> = {
  dipole:    [{ id: 1, x: -2, y: 0, q: 1 }, { id: 2, x: 2, y: 0, q: -1 }],
  like:      [{ id: 1, x: -2, y: 0, q: 1 }, { id: 2, x: 2, y: 0, q: 1 }],
  capacitor: [
    { id: 1, x: -3.5, y: -1.5, q: 1 }, { id: 2, x: -3.5, y: 0, q: 1 }, { id: 3, x: -3.5, y: 1.5, q: 1 },
    { id: 4, x: 3.5, y: -1.5, q: -1 }, { id: 5, x: 3.5, y: 0, q: -1 }, { id: 6, x: 3.5, y: 1.5, q: -1 },
  ],
};

export default function ElectricFields() {
  const [scenario, setScenario] = useState('dipole');
  const [charges, setCharges] = useState<Charge[]>(SCENARIO_CHARGES.dipole);
  const [nextId, setNextId] = useState(10);
  const [spawnSign, setSpawnSign] = useState<1 | -1>(1);
  const [mode, setMode] = useState<'probe' | 'spawn'>('probe');
  const [probePos, setProbePos] = useState<[number, number]>([0, 1.5]);

  const probeE = eMagnitude(charges, probePos[0], probePos[1]);
  const [pex, pey] = eField(charges, probePos[0], probePos[1]);
  const peMag = Math.sqrt(pex * pex + pey * pey);
  const peAngle = Math.atan2(pey, pex) * (180 / Math.PI);

  const applyScenario = (id: string) => {
    setScenario(id);
    setCharges(SCENARIO_CHARGES[id]);
    setMode('probe');
    setProbePos([0, 1.5]);
  };

  const handleSpawn = (x: number, y: number) => {
    setCharges(prev => [...prev, { id: nextId, x, y, q: spawnSign }]);
    setNextId(n => n + 1);
  };

  const resetCharges = () => {
    setCharges(SCENARIO_CHARGES[scenario]);
    setProbePos([0, 1.5]);
  };

  return (
    <div className="w-full h-full flex overflow-hidden">
      <div className="flex-1 relative min-w-0">
        <Canvas camera={{ position: [0, 0, 9], fov: 45 }} style={{ background: '#030712' }}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 8, 5]} intensity={1} />

          <FieldLines charges={charges} />

          {charges.map(c => (
            <group key={c.id}>
              <mesh position={[c.x, c.y, 0]}>
                <sphereGeometry args={[0.35, 20, 20]} />
                <meshStandardMaterial
                  color={c.q > 0 ? '#f43f5e' : '#22d3ee'}
                  emissive={c.q > 0 ? '#f43f5e' : '#22d3ee'}
                  emissiveIntensity={0.6}
                />
              </mesh>
              <pointLight position={[c.x, c.y, 0.5]} color={c.q > 0 ? '#f43f5e' : '#22d3ee'} intensity={1.5} distance={3} />
              <Html position={[c.x, c.y, 0.45]}>
                <span style={{ color: '#fff', fontSize: 16, fontWeight: 900, pointerEvents: 'none',
                  textShadow: '0 0 4px #000', lineHeight: 1 }}>{c.q > 0 ? '+' : '−'}</span>
              </Html>
            </group>
          ))}

          <DraggableProbe
            charges={charges}
            probePos={probePos}
            setProbePos={setProbePos}
            mode={mode}
          />

          {mode === 'spawn' && (
            <ClickHandler onPlace={handleSpawn} mode={mode} />
          )}

          <OrbitControls enablePan={false} minDistance={4} maxDistance={16} enabled={mode === 'probe'} />
          <gridHelper args={[12, 12, '#0f172a', '#0f172a']} />
        </Canvas>

        {/* Mode overlay hint */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-gray-950/80 border border-gray-800 rounded-lg px-3 py-1 text-[10px] text-gray-500 pointer-events-none">
          {mode === 'probe' ? 'Drag the yellow probe to measure E-field' : `Click to spawn a ${spawnSign > 0 ? 'positive' : 'negative'} charge`}
        </div>
      </div>

      <div className="w-72 flex-shrink-0 bg-gray-950 border-l border-gray-800 overflow-y-auto scrollbar-thin">
        <div className="p-3 space-y-4">

          <ScenarioSelect
            label="Scenario"
            scenarios={SCENARIOS}
            value={scenario}
            onChange={applyScenario}
            color="cyan"
          />

          {/* Mode buttons */}
          <div>
            <p className="text-[10px] text-gray-600 font-semibold uppercase tracking-wider mb-2">Interaction Mode</p>
            <div className="grid grid-cols-2 gap-1.5">
              {(['probe', 'spawn'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`py-1.5 rounded-lg text-xs font-semibold border transition-all ${mode === m ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300' : 'border-gray-800 text-gray-500 hover:text-gray-300 hover:bg-gray-800'}`}
                >
                  {m === 'probe' ? 'Drag Probe' : 'Spawn Charge'}
                </button>
              ))}
            </div>
          </div>

          {mode === 'spawn' && (
            <div>
              <p className="text-[10px] text-gray-600 font-semibold uppercase tracking-wider mb-2">Spawn Type</p>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => setSpawnSign(1)}
                  className={`py-1.5 rounded-lg text-xs font-semibold border transition-all ${spawnSign === 1 ? 'bg-rose-500/20 border-rose-500/40 text-rose-300' : 'border-gray-800 text-gray-500 hover:text-gray-300'}`}
                >+ Positive</button>
                <button
                  onClick={() => setSpawnSign(-1)}
                  className={`py-1.5 rounded-lg text-xs font-semibold border transition-all ${spawnSign === -1 ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300' : 'border-gray-800 text-gray-500 hover:text-gray-300'}`}
                >− Negative</button>
              </div>
            </div>
          )}

          <button
            onClick={resetCharges}
            className="w-full py-1.5 rounded-lg text-xs font-semibold border border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800 transition-all"
          >
            Reset to Scenario
          </button>

          <DataOverlay
            equation={{ text: 'E = kQ/r² (Coulomb)', color: '#94a3b8' }}
            readouts={[
              { label: 'Probe |E|', value: `${probeE.toFixed(3)} N/C`, color: '#fbbf24', highlight: true },
              { label: 'E direction', value: `${peAngle.toFixed(1)}°`, color: '#22d3ee' },
              { label: 'Probe x', value: probePos[0].toFixed(2), color: '#94a3b8' },
              { label: 'Probe y', value: probePos[1].toFixed(2), color: '#94a3b8' },
              { label: 'Charges', value: `${charges.filter(c => c.q > 0).length}+ / ${charges.filter(c => c.q < 0).length}−`, color: '#94a3b8' },
            ]}
          />

          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-3 text-[11px] text-gray-400 space-y-1">
            <p>Field lines flow from <span className="text-rose-400 font-semibold">+</span> to <span className="text-cyan-400 font-semibold">−</span>. Closer lines = stronger field.</p>
            <p>The yellow probe shows field <span className="text-amber-300">direction and magnitude</span> at any point.</p>
          </div>

        </div>
      </div>
    </div>
  );
}
