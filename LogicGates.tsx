import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import ControlSlider from '../../components/ControlSlider';
import ScenarioSelect from '../../components/ScenarioSelect';
import DataOverlay from '../../components/DataOverlay';

// ── Logic ─────────────────────────────────────────────────────────────────────
type GateType = 'and' | 'or' | 'xor' | 'nand';

function computeOutput(gate: GateType, a: number, b: number): number {
  switch (gate) {
    case 'and':  return a & b;
    case 'or':   return a | b;
    case 'xor':  return a ^ b;
    case 'nand': return (a & b) ? 0 : 1;
  }
}

function gateEquation(gate: GateType, a: number, b: number, out: number): string {
  const names: Record<GateType, string> = { and: 'AND', or: 'OR', xor: 'XOR', nand: 'NAND' };
  return `${a} ${names[gate]} ${b} = ${out}`;
}

// ── Wire color ────────────────────────────────────────────────────────────────
function wireColor(signal: number): string {
  return signal === 1 ? '#22d3ee' : '#374151';
}

// ── Scene ─────────────────────────────────────────────────────────────────────
function GateScene({ gateType, inputA, inputB }: { gateType: GateType; inputA: number; inputB: number }) {
  const output = computeOutput(gateType, inputA, inputB);
  const gateLabels: Record<GateType, string> = { and: 'AND', or: 'OR', xor: 'XOR', nand: 'NAND' };
  const gateColors: Record<GateType, string> = { and: '#22d3ee', or: '#34d399', xor: '#f59e0b', nand: '#f43f5e' };
  const col = gateColors[gateType];

  // Wire paths
  const wireA: THREE.Vector3[] = [new THREE.Vector3(-3.5, 0.5, 0), new THREE.Vector3(-1.2, 0.5, 0)];
  const wireB: THREE.Vector3[] = [new THREE.Vector3(-3.5, -0.5, 0), new THREE.Vector3(-1.2, -0.5, 0)];
  const wireOut: THREE.Vector3[] = [new THREE.Vector3(1.2, 0, 0), new THREE.Vector3(3.5, 0, 0)];

  return (
    <group>
      {/* Gate body */}
      <mesh>
        <boxGeometry args={[2.4, 1.8, 0.4]} />
        <meshStandardMaterial color="#1e293b" emissive={col} emissiveIntensity={0.08} metalness={0.5} roughness={0.4} />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(2.4, 1.8, 0.4)]} />
        <lineBasicMaterial color={col} />
      </lineSegments>

      {/* Gate label */}
      <Html position={[0, 0, 0.25]} center>
        <div style={{ color: col, fontSize: 18, fontWeight: 900, pointerEvents: 'none', textShadow: `0 0 10px ${col}` }}>
          {gateLabels[gateType]}
        </div>
      </Html>

      {/* Input wire A */}
      <Line points={wireA} color={wireColor(inputA)} lineWidth={inputA ? 5 : 2} />
      {/* Input wire B */}
      <Line points={wireB} color={wireColor(inputB)} lineWidth={inputB ? 5 : 2} />
      {/* Output wire */}
      <Line points={wireOut} color={wireColor(output)} lineWidth={output ? 5 : 2} />

      {/* Input node A */}
      <mesh position={[-3.5, 0.5, 0]}>
        <sphereGeometry args={[0.18, 12, 12]} />
        <meshStandardMaterial
          color={inputA ? '#22d3ee' : '#374151'}
          emissive={inputA ? '#22d3ee' : '#000'}
          emissiveIntensity={inputA ? 0.8 : 0}
        />
      </mesh>

      {/* Input node B */}
      <mesh position={[-3.5, -0.5, 0]}>
        <sphereGeometry args={[0.18, 12, 12]} />
        <meshStandardMaterial
          color={inputB ? '#22d3ee' : '#374151'}
          emissive={inputB ? '#22d3ee' : '#000'}
          emissiveIntensity={inputB ? 0.8 : 0}
        />
      </mesh>

      {/* Output node */}
      <mesh position={[3.5, 0, 0]}>
        <sphereGeometry args={[0.22, 12, 12]} />
        <meshStandardMaterial
          color={output ? col : '#374151'}
          emissive={output ? col : '#000'}
          emissiveIntensity={output ? 1.0 : 0}
        />
      </mesh>

      {/* Labels */}
      <Html position={[-3.5, 0.5, 0.3]} center>
        <div style={{ color: inputA ? '#22d3ee' : '#6b7280', fontSize: 11, fontWeight: 700, pointerEvents: 'none' }}>A={inputA}</div>
      </Html>
      <Html position={[-3.5, -0.5, 0.3]} center>
        <div style={{ color: inputB ? '#22d3ee' : '#6b7280', fontSize: 11, fontWeight: 700, pointerEvents: 'none' }}>B={inputB}</div>
      </Html>
      <Html position={[3.5, 0.4, 0.3]} center>
        <div style={{ color: output ? col : '#6b7280', fontSize: 13, fontWeight: 800, pointerEvents: 'none', textShadow: output ? `0 0 8px ${col}` : 'none' }}>
          Y={output}
        </div>
      </Html>
    </group>
  );
}

// ── Truth table ───────────────────────────────────────────────────────────────
function TruthTable({ gate, inputA, inputB }: { gate: GateType; inputA: number; inputB: number }) {
  const rows: [number, number][] = [[0, 0], [0, 1], [1, 0], [1, 1]];
  return (
    <div className="bg-gray-900/80 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-3 pt-2 pb-1">
        <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Truth Table</span>
      </div>
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="border-b border-gray-800">
            <th className="text-gray-500 px-3 py-1 text-left font-semibold">A</th>
            <th className="text-gray-500 px-3 py-1 text-left font-semibold">B</th>
            <th className="text-gray-500 px-3 py-1 text-left font-semibold">Y</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([a, b]) => {
            const out = computeOutput(gate, a, b);
            const isActive = a === inputA && b === inputB;
            return (
              <tr
                key={`${a}${b}`}
                className={isActive ? 'bg-cyan-500/10 border-l-2 border-cyan-500' : ''}
              >
                <td className={`px-3 py-1 ${a ? 'text-cyan-300' : 'text-gray-500'}`}>{a}</td>
                <td className={`px-3 py-1 ${b ? 'text-cyan-300' : 'text-gray-500'}`}>{b}</td>
                <td className={`px-3 py-1 font-bold ${out ? 'text-emerald-400' : 'text-gray-600'}`}>{out}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Scenarios ─────────────────────────────────────────────────────────────────
const SCENARIOS = [
  { id: 'and',  label: 'AND',  description: 'Output is 1 only when both inputs are 1' },
  { id: 'or',   label: 'OR',   description: 'Output is 1 when at least one input is 1' },
  { id: 'xor',  label: 'XOR',  description: 'Output is 1 when inputs differ' },
  { id: 'nand', label: 'NAND', description: 'Inverted AND — universal gate' },
];

// ── Main ──────────────────────────────────────────────────────────────────────
export default function LogicGates() {
  const [gateType, setGateType] = useState<GateType>('and');
  const [inputA, setInputA] = useState(0);
  const [inputB, setInputB] = useState(0);

  const output = computeOutput(gateType, inputA, inputB);
  const gateNames: Record<GateType, string> = { and: 'AND', or: 'OR', xor: 'XOR', nand: 'NAND' };

  const applyScenario = (id: string) => setGateType(id as GateType);

  return (
    <div className="w-full h-full flex overflow-hidden">
      <div className="flex-1 relative min-w-0">
        <Canvas camera={{ position: [0, 0, 8], fov: 50 }} style={{ background: '#030712' }}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[3, 5, 5]} intensity={1} />
          <pointLight position={[0, 0, 5]} color="#22d3ee" intensity={0.8} distance={12} />
          <GateScene gateType={gateType} inputA={inputA} inputB={inputB} />
          <OrbitControls enablePan={false} minDistance={4} maxDistance={14} />
        </Canvas>
      </div>

      <div className="w-72 flex-shrink-0 bg-gray-950 border-l border-gray-800 overflow-y-auto scrollbar-thin">
        <div className="p-3 space-y-4">
          <ScenarioSelect
            label="Gate Type"
            scenarios={SCENARIOS}
            value={gateType}
            onChange={applyScenario}
            color="cyan"
          />

          {/* Input toggles */}
          <div className="space-y-2">
            <p className="text-[10px] text-gray-600 font-semibold uppercase tracking-wider">Inputs</p>
            <div className="flex gap-3">
              <button
                onClick={() => setInputA(inputA ? 0 : 1)}
                className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${
                  inputA
                    ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300'
                    : 'bg-gray-900 border-gray-700 text-gray-500 hover:border-gray-600'
                }`}
              >
                A = {inputA}
              </button>
              <button
                onClick={() => setInputB(inputB ? 0 : 1)}
                className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${
                  inputB
                    ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300'
                    : 'bg-gray-900 border-gray-700 text-gray-500 hover:border-gray-600'
                }`}
              >
                B = {inputB}
              </button>
            </div>
          </div>

          <DataOverlay
            equation={{ text: gateEquation(gateType, inputA, inputB, output), color: '#94a3b8' }}
            readouts={[
              { label: 'Input A', value: `${inputA}`, color: inputA ? '#22d3ee' : '#6b7280' },
              { label: 'Input B', value: `${inputB}`, color: inputB ? '#22d3ee' : '#6b7280' },
              { label: 'Output Y', value: `${output}`, color: output ? '#34d399' : '#6b7280', highlight: true },
              { label: 'Gate Type', value: gateNames[gateType], color: '#f59e0b' },
            ]}
          />

          <TruthTable gate={gateType} inputA={inputA} inputB={inputB} />

          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-3 text-[11px] text-gray-400 space-y-1">
            {gateType === 'and' && <p>AND gate: output is HIGH only when <span className="text-cyan-300">both</span> inputs are HIGH. Used in enable circuits.</p>}
            {gateType === 'or'  && <p>OR gate: output is HIGH when <span className="text-emerald-300">either</span> input is HIGH. Used in signal combining.</p>}
            {gateType === 'xor' && <p>XOR gate: output is HIGH when inputs <span className="text-amber-300">differ</span>. Key building block for adders and checksums.</p>}
            {gateType === 'nand' && <p>NAND is a <span className="text-rose-400">universal gate</span> — any logic function can be built from NAND gates alone.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
