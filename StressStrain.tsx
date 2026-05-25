import { useState, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { LineChart, Line as RLine, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';
import ControlSlider from '../../components/ControlSlider';
import ScenarioSelect from '../../components/ScenarioSelect';
import DataOverlay from '../../components/DataOverlay';

// ── material definitions ──────────────────────────────────────────────────────
interface Material {
  label: string;
  E: number;      // Young's modulus (GPa normalized)
  yieldStrain: number;
  uts: number;    // ultimate tensile strength
  failureStrain: number;
  color: string;
}

const MATERIALS: Record<string, Material> = {
  steel:    { label: 'Steel',    E: 200, yieldStrain: 0.002, uts: 1.4, failureStrain: 0.25,  color: '#94a3b8' },
  aluminum: { label: 'Aluminum', E: 70,  yieldStrain: 0.004, uts: 0.5, failureStrain: 0.15,  color: '#60a5fa' },
  glass:    { label: 'Glass',    E: 70,  yieldStrain: 0.001, uts: 0.7, failureStrain: 0.003, color: '#a5f3fc' },
  rubber:   { label: 'Rubber',   E: 0.01, yieldStrain: 0.5,  uts: 0.02, failureStrain: 4.0,  color: '#4ade80' },
};

const MATERIAL_SCENARIOS = Object.entries(MATERIALS).map(([id, m]) => ({
  id, label: m.label, description: `E = ${m.E} GPa`,
}));

// ── stress-strain curve ────────────────────────────────────────────────────────
function buildCurve(mat: Material): { strain: number; stress: number }[] {
  const pts: { strain: number; stress: number }[] = [];
  const steps = 200;
  const maxStrain = mat.failureStrain * 1.05;

  for (let i = 0; i <= steps; i++) {
    const strain = (i / steps) * maxStrain;
    let stress: number;
    if (strain <= mat.yieldStrain) {
      stress = mat.E * strain;
    } else if (strain <= mat.failureStrain * 0.8) {
      const t = (strain - mat.yieldStrain) / (mat.failureStrain * 0.8 - mat.yieldStrain);
      const yieldStress = mat.E * mat.yieldStrain;
      stress = yieldStress + (mat.uts - yieldStress) * (1 - Math.pow(1 - t, 0.6));
    } else {
      const t = (strain - mat.failureStrain * 0.8) / (mat.failureStrain * 0.2);
      stress = mat.uts * (1 - t * 0.3);
    }
    pts.push({ strain: parseFloat(strain.toFixed(5)), stress: parseFloat(Math.max(0, stress).toFixed(4)) });
  }
  return pts;
}

function getStressAtStrain(mat: Material, strain: number): number {
  if (strain <= 0) return 0;
  if (strain > mat.failureStrain) return 0;
  if (strain <= mat.yieldStrain) return mat.E * strain;
  if (strain <= mat.failureStrain * 0.8) {
    const t = (strain - mat.yieldStrain) / (mat.failureStrain * 0.8 - mat.yieldStrain);
    const yieldStress = mat.E * mat.yieldStrain;
    return yieldStress + (mat.uts - yieldStress) * (1 - Math.pow(1 - t, 0.6));
  }
  const t = (strain - mat.failureStrain * 0.8) / (mat.failureStrain * 0.2);
  return mat.uts * (1 - t * 0.3);
}

// ── 3D rod ────────────────────────────────────────────────────────────────────
function Rod({ strain, mat, failed }: { strain: number; mat: Material; failed: boolean }) {
  const baseLength = 3;
  const elongation = strain;
  const currentLength = baseLength * (1 + elongation);
  const neckFactor = Math.max(0.3, 1 - strain * 0.5);

  const color = failed ? '#ef4444'
    : strain > mat.yieldStrain * 0.5 ? `hsl(${Math.max(0, 30 - strain * 200)}, 80%, 55%)`
    : mat.color;

  return (
    <group>
      {/* Left grip */}
      <mesh position={[-(currentLength / 2 + 0.4), 0, 0]}>
        <boxGeometry args={[0.8, 0.8, 0.5]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
      {/* Right grip */}
      <mesh position={[(currentLength / 2 + 0.4), 0, 0]}>
        <boxGeometry args={[0.8, 0.8, 0.5]} />
        <meshStandardMaterial color="#334155" />
      </mesh>

      {!failed ? (
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.25 * neckFactor, 0.25 * neckFactor, currentLength, 16]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} />
        </mesh>
      ) : (
        <>
          <mesh position={[-0.3, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.08, 0.25, currentLength / 2, 12]} />
            <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.4} />
          </mesh>
          <mesh position={[0.3, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.25, 0.08, currentLength / 2, 12]} />
            <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.4} />
          </mesh>
          <pointLight position={[0, 0, 0.5]} color="#ef4444" intensity={3} distance={2} />
          <Html position={[0, 0.8, 0]}>
            <div className="bg-red-900/80 border border-red-500 text-red-300 text-[10px] font-bold px-2 py-0.5 rounded pointer-events-none">
              FRACTURE
            </div>
          </Html>
        </>
      )}

      {/* Strain indicator arrows */}
      {!failed && strain > 0.001 && (
        <>
          <Html position={[currentLength / 2 + 1.2, 0, 0]}>
            <div className="text-rose-400 text-[10px] font-bold pointer-events-none">→ F</div>
          </Html>
          <Html position={[-(currentLength / 2 + 1.2), 0, 0]}>
            <div className="text-rose-400 text-[10px] font-bold pointer-events-none">F ←</div>
          </Html>
        </>
      )}
    </group>
  );
}

export default function StressStrain() {
  const [matId, setMatId] = useState('steel');
  const [force, setForce] = useState(0);
  const [area] = useState(100);

  const mat = MATERIALS[matId];
  const stress = force / area;
  const strain = stress <= mat.E * mat.yieldStrain ? stress / mat.E : mat.yieldStrain + (stress - mat.E * mat.yieldStrain) / (mat.E * 0.05);
  const clampedStrain = Math.min(strain, mat.failureStrain);
  const failed = force / area >= mat.uts;

  const curveData = useMemo(() => buildCurve(mat), [mat]);
  const yieldStress = mat.E * mat.yieldStrain;

  const applyScenario = (id: string) => {
    setMatId(id);
    setForce(0);
  };

  return (
    <div className="w-full h-full flex overflow-hidden">
      <div className="flex-1 relative min-w-0">
        <Canvas camera={{ position: [0, 1, 7], fov: 45 }} style={{ background: '#030712' }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 8, 5]} intensity={1.2} />
          <Rod strain={clampedStrain} mat={mat} failed={failed} />
          <OrbitControls enablePan={false} minDistance={4} maxDistance={14} />
          <gridHelper args={[12, 12, '#0f172a', '#0f172a']} />
        </Canvas>
      </div>

      <div className="w-72 flex-shrink-0 bg-gray-950 border-l border-gray-800 overflow-y-auto scrollbar-thin">
        <div className="p-3 space-y-4">

          <ScenarioSelect
            label="Material"
            scenarios={MATERIAL_SCENARIOS}
            value={matId}
            onChange={applyScenario}
            color="cyan"
          />

          <ControlSlider
            label="Applied Force (N)"
            value={force}
            min={0}
            max={mat.uts * area * 1.05}
            step={mat.uts * area * 0.01}
            color="#f43f5e"
            onChange={setForce}
            precision={1}
            formatValue={v => `${v.toFixed(0)} N`}
          />

          <DataOverlay
            equation={{ text: 'σ = F/A   ε = ΔL/L₀   E = σ/ε', color: '#94a3b8' }}
            readouts={[
              { label: 'Stress (σ)', value: `${(force / area).toFixed(4)} GPa`, color: failed ? '#f43f5e' : '#22d3ee', highlight: true },
              { label: 'Strain (ε)', value: clampedStrain.toFixed(5), color: '#34d399', highlight: true },
              { label: "Young's Modulus", value: `${mat.E} GPa`, color: '#f59e0b' },
              { label: 'Yield Stress', value: `${yieldStress.toFixed(4)} GPa`, color: '#fbbf24' },
              { label: 'UTS', value: `${mat.uts} GPa`, color: '#f43f5e' },
              { label: 'Region', value: failed ? 'FRACTURE' : force / area <= yieldStress ? 'Elastic' : 'Plastic', color: failed ? '#f43f5e' : force / area <= yieldStress ? '#34d399' : '#f59e0b' },
            ]}
          />

          {/* Stress-strain curve */}
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-3 pt-2 pb-0">
              <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Stress-Strain Curve</span>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={curveData} margin={{ top: 4, right: 10, left: -10, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="strain" tick={{ fontSize: 8, fill: '#475569' }} tickLine={false}
                  tickFormatter={v => v.toFixed(3)} label={{ value: 'ε', position: 'insideRight', style: { fontSize: 9, fill: '#475569' } }} />
                <YAxis tick={{ fontSize: 8, fill: '#475569' }} tickLine={false} tickFormatter={v => v.toFixed(2)} />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 6, fontSize: 10 }}
                  formatter={(v: number) => [v.toFixed(4), 'σ (GPa)']}
                />
                <ReferenceLine x={mat.yieldStrain} stroke="#fbbf24" strokeDasharray="3 3" strokeWidth={1} label={{ value: 'Yield', position: 'top', style: { fontSize: 8, fill: '#fbbf24' } }} />
                <ReferenceLine x={clampedStrain} stroke="#22d3ee" strokeDasharray="3 3" strokeWidth={1.5} />
                <RLine type="monotone" dataKey="stress" stroke={mat.color} strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-3 text-[11px] text-gray-400 space-y-1">
            <p><span className="text-emerald-400 font-semibold">Elastic region:</span> Material returns to original shape when force removed.</p>
            <p><span className="text-amber-400 font-semibold">Plastic region:</span> Permanent deformation — it won't fully recover.</p>
            <p><span className="text-rose-400 font-semibold">UTS:</span> Maximum stress before fracture.</p>
          </div>

        </div>
      </div>
    </div>
  );
}
