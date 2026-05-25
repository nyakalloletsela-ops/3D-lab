import { useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import ControlSlider from '../../components/ControlSlider';
import ScenarioSelect from '../../components/ScenarioSelect';
import DataOverlay from '../../components/DataOverlay';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Node {
  x: number;
  y: number;
  z: number;
}

interface Member {
  a: number;
  b: number;
  force: number; // positive = compression, negative = tension
}

// ── Warren Truss: 6 panels, 13 nodes ─────────────────────────────────────────
function buildWarren(load: number): { nodes: Node[]; members: Member[] } {
  const panels = 6;
  const span = 6;
  const h = 1.2;
  const dx = span / panels;

  const nodes: Node[] = [];
  // Bottom chord (0..6)
  for (let i = 0; i <= panels; i++) nodes.push({ x: i * dx - span / 2, y: 0, z: 0 });
  // Top chord (7..12) – nodes over midpoints of each panel top
  for (let i = 0; i < panels; i++) nodes.push({ x: (i + 0.5) * dx - span / 2, y: h, z: 0 });

  // Approximate forces (method of sections, simplified)
  // Bottom chord: tension proportional to panel moment / h
  // Top chord: compression
  // Diagonals: shear / sin(theta)
  const theta = Math.atan2(h, dx / 2);
  const halfLoad = load / 2;
  const members: Member[] = [];

  // Bottom chord segments
  for (let i = 0; i < panels; i++) {
    const midPanel = i + 0.5;
    const moment = halfLoad * (span / 2 - midPanel * dx) * 0.25;
    const f = -(moment / h) * 0.8; // tension
    members.push({ a: i, b: i + 1, force: f });
  }

  // Top chord segments (top node i connects to top node i+1 via bottom at i+1)
  for (let i = 0; i < panels - 1; i++) {
    const midPanel = i + 1;
    const moment = halfLoad * (span / 2 - midPanel * dx) * 0.25;
    const f = (moment / h) * 0.8; // compression
    members.push({ a: panels + 1 + i, b: panels + 2 + i, force: f });
  }

  // Diagonals and verticals for Warren: each top node connects to two adjacent bottom nodes
  for (let i = 0; i < panels; i++) {
    const topNode = panels + 1 + i;
    const shear = halfLoad * (1 - i / panels);
    const diag = shear / Math.sin(theta);
    members.push({ a: i, b: topNode, force: diag * 0.6 });
    members.push({ a: i + 1, b: topNode, force: -diag * 0.5 });
  }

  return { nodes, members };
}

// ── Pratt Truss: 6 panels, 14 nodes ──────────────────────────────────────────
function buildPratt(load: number): { nodes: Node[]; members: Member[] } {
  const panels = 6;
  const span = 6;
  const h = 1.2;
  const dx = span / panels;

  const nodes: Node[] = [];
  // Bottom chord (0..6)
  for (let i = 0; i <= panels; i++) nodes.push({ x: i * dx - span / 2, y: 0, z: 0 });
  // Top chord (7..13) – nodes directly above each bottom node (except ends)
  for (let i = 1; i < panels; i++) nodes.push({ x: i * dx - span / 2, y: h, z: 0 });

  const halfLoad = load / 2;
  const members: Member[] = [];
  const theta = Math.atan2(h, dx);

  // Bottom chord
  for (let i = 0; i < panels; i++) {
    const midPanel = i + 0.5;
    const moment = halfLoad * (span / 2 - midPanel * dx) * 0.25;
    members.push({ a: i, b: i + 1, force: -(moment / h) * 0.8 });
  }

  // Top chord
  for (let i = 0; i < panels - 2; i++) {
    const midPanel = i + 1.5;
    const moment = halfLoad * (span / 2 - midPanel * dx) * 0.25;
    members.push({ a: panels + 1 + i, b: panels + 2 + i, force: (moment / h) * 0.8 });
  }

  // Verticals
  for (let i = 1; i < panels; i++) {
    const topNode = panels + i;
    const shear = halfLoad * Math.abs(1 - 2 * i / panels);
    members.push({ a: i, b: topNode, force: shear * 0.5 });
  }

  // Diagonals (Pratt: diagonals in tension toward center)
  for (let i = 0; i < panels - 1; i++) {
    const topNode = panels + 1 + i;
    const shear = halfLoad * (1 - (i + 1) / panels);
    const diag = shear / Math.sin(theta);
    if (i < panels / 2) {
      members.push({ a: i, b: topNode, force: -diag * 0.6 });
    } else {
      members.push({ a: i + 2, b: topNode, force: -diag * 0.6 });
    }
  }

  return { nodes, members };
}

// ── Member color ──────────────────────────────────────────────────────────────
function memberColor(force: number, maxForce: number): string {
  if (maxForce < 0.01) return '#6b7280';
  const norm = Math.abs(force) / maxForce;
  if (force > 0.5) {
    const r = Math.round(255);
    const g = Math.round(40 + (1 - norm) * 80);
    return `rgb(${r},${g},40)`;
  } else if (force < -0.5) {
    const b = Math.round(255);
    const g = Math.round(80 + (1 - norm) * 80);
    return `rgb(40,${g},${b})`;
  }
  return '#6b7280';
}

// ── Scene ─────────────────────────────────────────────────────────────────────
function TrussScene({ load, scenario }: { load: number; scenario: string }) {
  const { nodes, members } = useMemo(
    () => (scenario === 'warren' ? buildWarren(load) : buildPratt(load)),
    [load, scenario]
  );

  const maxForce = useMemo(
    () => Math.max(...members.map(m => Math.abs(m.force)), 0.01),
    [members]
  );

  // Center load node index (bottom center)
  const centerIdx = 3;

  return (
    <group>
      {/* Members */}
      {members.map((m, i) => {
        const a = nodes[m.a];
        const b = nodes[m.b];
        const col = memberColor(m.force, maxForce);
        return (
          <Line
            key={i}
            points={[
              new THREE.Vector3(a.x, a.y, a.z),
              new THREE.Vector3(b.x, b.y, b.z),
            ]}
            color={col}
            lineWidth={m.force > 0.5 ? 4 : m.force < -0.5 ? 4 : 2}
          />
        );
      })}

      {/* Nodes */}
      {nodes.map((n, i) => (
        <mesh key={i} position={[n.x, n.y, n.z]}>
          <sphereGeometry args={[0.07, 10, 10]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.6} roughness={0.3} />
        </mesh>
      ))}

      {/* Support triangles at ends */}
      {[-3, 3].map((x, i) => (
        <group key={i} position={[x, -0.5, 0]}>
          <Line
            points={[
              new THREE.Vector3(-0.3, 0, 0),
              new THREE.Vector3(0, 0.5, 0),
              new THREE.Vector3(0.3, 0, 0),
              new THREE.Vector3(-0.3, 0, 0),
            ]}
            color="#f59e0b"
            lineWidth={3}
          />
          <mesh position={[0, -0.15, 0]}>
            <cylinderGeometry args={[0.12, 0.12, 0.12, 8]} />
            <meshStandardMaterial color="#f59e0b" />
          </mesh>
        </group>
      ))}

      {/* Downward force arrow at center node */}
      {load > 0 && (
        <group position={[nodes[centerIdx].x, nodes[centerIdx].y, 0]}>
          <Line
            points={[new THREE.Vector3(0, 0.2, 0.1), new THREE.Vector3(0, 0.2 + Math.min(load / 40, 1.5), 0.1)]}
            color="#f43f5e"
            lineWidth={4}
          />
          <mesh position={[0, 0.05, 0.1]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.1, 0.25, 8]} />
            <meshStandardMaterial color="#f43f5e" emissive="#f43f5e" emissiveIntensity={0.6} />
          </mesh>
          <Html position={[0.3, 0.4, 0]}>
            <span style={{ color: '#f43f5e', fontSize: 10, fontWeight: 700, pointerEvents: 'none', textShadow: '0 0 6px #000' }}>
              {load.toFixed(0)} kN
            </span>
          </Html>
        </group>
      )}
    </group>
  );
}

// ── Scenarios ─────────────────────────────────────────────────────────────────
const SCENARIOS = [
  { id: 'warren', label: 'Warren', description: 'Equilateral triangles — efficient for moderate spans' },
  { id: 'pratt',  label: 'Pratt',  description: 'Vertical + diagonal members — diagonals in tension' },
];

// ── Main component ────────────────────────────────────────────────────────────
export default function TrussBridge() {
  const [load, setLoad] = useState(50);
  const [scenario, setScenario] = useState<'warren' | 'pratt'>('warren');

  const { members } = useMemo(
    () => (scenario === 'warren' ? buildWarren(load) : buildPratt(load)),
    [load, scenario]
  );

  const compressionForces = members.filter(m => m.force > 0.5).map(m => m.force);
  const tensionForces = members.filter(m => m.force < -0.5).map(m => -m.force);
  const maxComp = compressionForces.length ? Math.max(...compressionForces) : 0;
  const maxTens = tensionForces.length ? Math.max(...tensionForces) : 0;
  const reaction = load / 2;

  const applyScenario = (id: string) => {
    setScenario(id as 'warren' | 'pratt');
  };

  return (
    <div className="w-full h-full flex overflow-hidden">
      <div className="flex-1 relative min-w-0">
        <Canvas camera={{ position: [0, 1.5, 8], fov: 45 }} style={{ background: '#030712' }}>
          <ambientLight intensity={0.7} />
          <directionalLight position={[4, 6, 4]} intensity={1.2} />
          <pointLight position={[0, 4, 3]} color="#60a5fa" intensity={1.5} distance={10} />
          <TrussScene load={load} scenario={scenario} />
          <OrbitControls enablePan={false} minDistance={4} maxDistance={16} />
          <gridHelper args={[12, 12, '#0f172a', '#0f172a']} />
        </Canvas>
      </div>

      <div className="w-72 flex-shrink-0 bg-gray-950 border-l border-gray-800 overflow-y-auto scrollbar-thin">
        <div className="p-3 space-y-4">
          <ScenarioSelect
            label="Truss Type"
            scenarios={SCENARIOS}
            value={scenario}
            onChange={applyScenario}
            color="cyan"
          />

          <ControlSlider
            label="Applied Load"
            value={load}
            min={0}
            max={100}
            step={1}
            color="#f43f5e"
            onChange={setLoad}
            precision={0}
            formatValue={v => `${v.toFixed(0)} kN`}
          />

          <DataOverlay
            equation={{ text: 'ΣF = 0 (equilibrium)', color: '#94a3b8' }}
            readouts={[
              { label: 'Applied Load', value: `${load.toFixed(0)} kN`, color: '#f43f5e', highlight: true },
              { label: 'Max Compression', value: `${maxComp.toFixed(1)} kN`, color: '#f87171', highlight: true },
              { label: 'Max Tension', value: `${maxTens.toFixed(1)} kN`, color: '#60a5fa', highlight: true },
              { label: 'Total Members', value: `${members.length}`, color: '#94a3b8' },
              { label: 'Support Reaction (ea)', value: `${reaction.toFixed(1)} kN`, color: '#34d399' },
            ]}
          />

          {/* Color legend */}
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-3 space-y-2">
            <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Member Forces</p>
            <div className="flex items-center gap-2">
              <div className="w-8 h-1.5 rounded-full bg-red-500" style={{ boxShadow: '0 0 6px #ef4444' }} />
              <span className="text-[11px] text-gray-400">Compression (red glow)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-1.5 rounded-full bg-blue-400" style={{ boxShadow: '0 0 6px #60a5fa' }} />
              <span className="text-[11px] text-gray-400">Tension (blue glow)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-1.5 rounded-full bg-gray-500" />
              <span className="text-[11px] text-gray-400">Near zero force</span>
            </div>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-3 text-[11px] text-gray-400 space-y-1">
            <p>
              {scenario === 'warren'
                ? 'Warren trusses use equilateral triangles — members alternate between tension and compression with no verticals needed.'
                : 'Pratt trusses have vertical members in compression and diagonal members in tension — more efficient for longer spans.'}
            </p>
            <p>Top chord carries <span className="text-red-400 font-semibold">compression</span>, bottom chord carries <span className="text-blue-400 font-semibold">tension</span> under downward loads.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
