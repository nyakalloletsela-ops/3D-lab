import { useRef, useState, useMemo, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import ControlSlider from '../../components/ControlSlider';
import ScenarioSelect from '../../components/ScenarioSelect';
import DataOverlay from '../../components/DataOverlay';

// ── Constants ─────────────────────────────────────────────────────────────────
const TOTAL_LAYERS = 20;
const LAYER_SEC    = 0.5; // seconds per layer

// ── Nozzle path builders ──────────────────────────────────────────────────────
function buildGridPath(layer: number, density: number): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  const size = 1.8;
  const step = size / Math.max(1, Math.round(density * 0.08 + 2));
  const y = layer * 0.05 + 0.025;
  let flip = false;
  for (let x = -size / 2; x <= size / 2; x += step) {
    pts.push(new THREE.Vector3(x, y, flip ? -size / 2 : size / 2));
    pts.push(new THREE.Vector3(x, y, flip ? size / 2 : -size / 2));
    flip = !flip;
  }
  return pts;
}

function buildHexPath(layer: number): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  const y = layer * 0.05 + 0.025;
  const R = 0.35;
  const cols = 4;
  const rows = 3;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = (c - cols / 2 + 0.5) * R * 1.8;
      const cz = (r - rows / 2 + 0.5) * R * 1.6 + (c % 2 === 0 ? 0 : R * 0.8);
      for (let i = 0; i <= 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
        pts.push(new THREE.Vector3(cx + Math.cos(a) * R * 0.85, y, cz + Math.sin(a) * R * 0.85));
      }
    }
  }
  return pts;
}

// ── Layer fade color ──────────────────────────────────────────────────────────
function layerEmissive(layerIdx: number, currentLayer: number): number {
  const age = currentLayer - layerIdx;
  if (age === 0) return 1.0;
  if (age === 1) return 0.5;
  if (age === 2) return 0.2;
  return 0.0;
}

// ── Scene ─────────────────────────────────────────────────────────────────────
interface SceneProps {
  currentLayer: number;
  layerHeight: number;
  infillDensity: number;
  scenario: 'grid' | 'honeycomb';
  isPaused: boolean;
  onLayerChange: (l: number) => void;
}

function PrintScene({
  currentLayer,
  layerHeight,
  infillDensity,
  scenario,
  isPaused,
  onLayerChange,
}: SceneProps) {
  const elapsed = useRef(0);
  const layerRef = useRef(currentLayer);
  const nozzleRef = useRef<THREE.Mesh>(null);
  const nozzlePathRef = useRef<THREE.Vector3[]>([]);
  const nozzlePathIdx = useRef(0);
  const nozzlePathTime = useRef(0);

  // Keep layerRef synced
  layerRef.current = currentLayer;

  // Rebuild nozzle path when layer or scenario changes
  useMemo(() => {
    if (currentLayer < TOTAL_LAYERS) {
      nozzlePathRef.current =
        scenario === 'grid'
          ? buildGridPath(currentLayer, infillDensity)
          : buildHexPath(currentLayer);
      nozzlePathIdx.current = 0;
      nozzlePathTime.current = 0;
    }
  }, [currentLayer, scenario, infillDensity]);

  useFrame((_, delta) => {
    if (isPaused) return;
    const dt = Math.min(delta, 0.05);
    elapsed.current += dt;

    // Advance layer
    if (elapsed.current >= LAYER_SEC && layerRef.current < TOTAL_LAYERS) {
      elapsed.current -= LAYER_SEC;
      onLayerChange(Math.min(layerRef.current + 1, TOTAL_LAYERS));
    }

    // Animate nozzle along path
    if (nozzleRef.current) {
      const path = nozzlePathRef.current;
      if (path.length > 0) {
        nozzlePathTime.current += dt * 8;
        const idx = Math.floor(nozzlePathTime.current) % path.length;
        const pt = path[idx];
        nozzleRef.current.position.set(pt.x, pt.y + 0.15, pt.z);
      }
    }
  });

  const visLH = layerHeight * 0.25; // visual layer height

  return (
    <group>
      {/* Build plate */}
      <mesh position={[0, -0.06, 0]}>
        <boxGeometry args={[2.2, 0.08, 2.2]} />
        <meshStandardMaterial color="#1e293b" metalness={0.4} roughness={0.6} />
      </mesh>
      {/* Grid lines on plate */}
      {[-1, -0.5, 0, 0.5, 1].map(x => (
        <line key={`x${x}`}>
          <bufferGeometry
            onUpdate={self => {
              const pts = [new THREE.Vector3(x, -0.02, -1), new THREE.Vector3(x, -0.02, 1)];
              self.setFromPoints(pts);
            }}
          />
          <lineBasicMaterial color="#0f172a" />
        </line>
      ))}
      {[-1, -0.5, 0, 0.5, 1].map(z => (
        <line key={`z${z}`}>
          <bufferGeometry
            onUpdate={self => {
              const pts = [new THREE.Vector3(-1, -0.02, z), new THREE.Vector3(1, -0.02, z)];
              self.setFromPoints(pts);
            }}
          />
          <lineBasicMaterial color="#0f172a" />
        </line>
      ))}

      {/* Deposited layers */}
      {Array.from({ length: Math.min(currentLayer, TOTAL_LAYERS) }, (_, i) => {
        const emissive = layerEmissive(i, currentLayer - 1);
        const col = emissive > 0.4 ? '#f97316' : emissive > 0.1 ? '#3b82f6' : '#22d3ee';
        return (
          <mesh key={i} position={[0, i * visLH + visLH / 2, 0]}>
            <boxGeometry args={[1.8, visLH * 0.9, 1.8]} />
            <meshStandardMaterial
              color={col}
              emissive={col}
              emissiveIntensity={emissive * 0.6}
              transparent
              opacity={0.85}
            />
          </mesh>
        );
      })}

      {/* Nozzle */}
      {currentLayer < TOTAL_LAYERS && (
        <mesh ref={nozzleRef} position={[0, currentLayer * visLH + 0.2, 0]}>
          <coneGeometry args={[0.06, 0.18, 8]} rotation={[Math.PI, 0, 0]} />
          <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.9} />
        </mesh>
      )}
    </group>
  );
}

// ── Scenarios ─────────────────────────────────────────────────────────────────
const SCENARIOS = [
  { id: 'grid',      label: 'Grid',      description: 'Rectilinear infill — fast and simple' },
  { id: 'honeycomb', label: 'Honeycomb', description: 'Hexagonal infill — stronger for weight' },
];

// ── Main ──────────────────────────────────────────────────────────────────────
export default function GCodeLayering() {
  const [layerHeight,   setLayerHeight]   = useState(0.2);
  const [infillDensity, setInfillDensity] = useState(40);
  const [currentLayer,  setCurrentLayer]  = useState(0);
  const [scenario,      setScenario]      = useState<'grid' | 'honeycomb'>('grid');
  const [isPaused,      setIsPaused]      = useState(false);

  const handleLayerChange = useCallback((l: number) => {
    setCurrentLayer(l);
  }, []);

  const applyScenario = (id: string) => {
    setScenario(id as 'grid' | 'honeycomb');
    setCurrentLayer(0);
  };

  // Estimated time and material
  const pathLengthPerLayer = scenario === 'grid' ? (1.8 * infillDensity * 0.018 + 1.8) : 18;
  const estTime = (TOTAL_LAYERS * pathLengthPerLayer) / 40; // seconds (arbitrary speed)
  const materialUsed = currentLayer * pathLengthPerLayer * layerHeight * 0.8;

  const barData = [
    { name: 'Done', layers: currentLayer, fill: '#22d3ee' },
    { name: 'Left', layers: TOTAL_LAYERS - currentLayer, fill: '#1e293b' },
  ];

  return (
    <div className="w-full h-full flex overflow-hidden">
      <div className="flex-1 relative min-w-0">
        <Canvas camera={{ position: [3, 4, 6], fov: 45 }} style={{ background: '#030712' }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[4, 8, 4]} intensity={1} />
          <pointLight position={[0, 4, 3]} color="#f97316" intensity={1.5} distance={10} />
          <PrintScene
            currentLayer={currentLayer}
            layerHeight={layerHeight}
            infillDensity={infillDensity}
            scenario={scenario}
            isPaused={isPaused}
            onLayerChange={handleLayerChange}
          />
          <OrbitControls enablePan={false} minDistance={4} maxDistance={16} />
          <gridHelper args={[6, 6, '#0f172a', '#0f172a']} />
        </Canvas>
      </div>

      <div className="w-72 flex-shrink-0 bg-gray-950 border-l border-gray-800 overflow-y-auto scrollbar-thin">
        <div className="p-3 space-y-4">
          <ScenarioSelect
            label="Infill Pattern"
            scenarios={SCENARIOS}
            value={scenario}
            onChange={applyScenario}
            color="cyan"
          />

          <ControlSlider
            label="Layer Height"
            value={layerHeight}
            min={0.1}
            max={0.5}
            step={0.05}
            color="#22d3ee"
            onChange={setLayerHeight}
            precision={2}
            formatValue={v => `${v.toFixed(2)} mm`}
          />
          <ControlSlider
            label="Infill Density"
            value={infillDensity}
            min={10}
            max={100}
            step={5}
            color="#f59e0b"
            onChange={setInfillDensity}
            precision={0}
            formatValue={v => `${v.toFixed(0)}%`}
          />

          {/* Pause/Resume + Reset */}
          <div className="flex gap-2">
            <button
              onClick={() => setIsPaused(p => !p)}
              className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${
                isPaused
                  ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300'
                  : 'bg-amber-500/20 border-amber-500/60 text-amber-300'
              }`}
            >
              {isPaused ? 'Resume' : 'Pause'}
            </button>
            <button
              onClick={() => { setCurrentLayer(0); setIsPaused(false); }}
              className="flex-1 py-2 rounded-lg text-sm font-bold border border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-500 transition-all"
            >
              Reset
            </button>
          </div>

          <DataOverlay
            equation={{ text: 'Print time ∝ layers × path length', color: '#94a3b8' }}
            readouts={[
              { label: 'Current Layer', value: `${currentLayer} / ${TOTAL_LAYERS}`, color: '#22d3ee', highlight: true },
              { label: 'Layer Height', value: `${layerHeight.toFixed(2)} mm`, color: '#22d3ee' },
              { label: 'Infill Density', value: `${infillDensity}%`, color: '#f59e0b' },
              { label: 'Est. Print Time', value: `${estTime.toFixed(0)} s`, color: '#34d399' },
              { label: 'Material Used', value: `${materialUsed.toFixed(1)} mm`, color: '#f97316' },
              { label: 'Status', value: currentLayer >= TOTAL_LAYERS ? 'COMPLETE' : isPaused ? 'PAUSED' : 'PRINTING', color: currentLayer >= TOTAL_LAYERS ? '#34d399' : isPaused ? '#f59e0b' : '#22d3ee', highlight: true },
            ]}
          />

          {/* Layers bar chart */}
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-3 pt-2 pb-0">
              <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Layer Progress</span>
            </div>
            <ResponsiveContainer width="100%" height={110}>
              <BarChart data={barData} margin={{ top: 4, right: 10, left: -20, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#475569' }} tickLine={false} domain={[0, TOTAL_LAYERS]} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 6, fontSize: 10 }} formatter={(v: number) => [v, 'Layers']} />
                <Bar dataKey="layers" radius={[3, 3, 0, 0]}>
                  {barData.map((entry, i) => (
                    <rect key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-3 text-[11px] text-gray-400 space-y-1">
            <p>
              {scenario === 'grid'
                ? 'Grid infill is fast and predictable — good for solid, flat objects.'
                : 'Honeycomb infill uses the geometry of beehives — maximizes strength-to-weight ratio.'}
            </p>
            <p>Thinner layers = better <span className="text-cyan-300">surface quality</span> but slower print. Higher infill = stronger but uses more material.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
