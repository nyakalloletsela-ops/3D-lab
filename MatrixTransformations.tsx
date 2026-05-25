import { useState, useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import ScenarioSelect from '../../components/ScenarioSelect';
import DataOverlay from '../../components/DataOverlay';

// ── 3×3 matrix math ─────────────────────────────────────────────────────────
type Mat3 = [number, number, number, number, number, number, number, number, number];

function matDet(m: Mat3): number {
  return (
    m[0] * (m[4] * m[8] - m[5] * m[7]) -
    m[1] * (m[3] * m[8] - m[5] * m[6]) +
    m[2] * (m[3] * m[7] - m[4] * m[6])
  );
}

function applyMat(m: Mat3, v: [number, number, number]): [number, number, number] {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ];
}

const IDENTITY: Mat3 = [1, 0, 0,  0, 1, 0,  0, 0, 1];
const SCENARIOS: Record<string, { label: string; mat: Mat3; description: string }> = {
  identity:  { label: 'Identity',      mat: [1,0,0, 0,1,0, 0,0,1],    description: 'No change — det = 1' },
  rotate90:  { label: 'Rotate 90°',    mat: [0,-1,0, 1,0,0, 0,0,1],   description: 'Rotate XY plane 90° — det = 1' },
  shearX:    { label: 'Shear X',       mat: [1,1,0, 0,1,0, 0,0,1],    description: 'Slant along X axis' },
  scale:     { label: 'Scale ×2',      mat: [2,0,0, 0,2,0, 0,0,2],    description: 'Uniform scale — det = 8' },
  collapse:  { label: 'Collapse (det=0)', mat: [1,2,3, 4,8,12, 7,14,21], description: '3D → 2D — det = 0, volume = 0' },
};

// Unit cube corners
const BASE_VERTS: [number, number, number][] = [
  [0,0,0],[1,0,0],[1,1,0],[0,1,0],
  [0,0,1],[1,0,1],[1,1,1],[0,1,1],
];
const EDGES: [number, number][] = [
  [0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]
];

function TransformedCube({ mat, t }: { mat: Mat3; t: number }) {
  const lerpVert = (base: [number,number,number], target: [number,number,number]): THREE.Vector3 =>
    new THREE.Vector3(
      base[0] + (target[0] - base[0]) * t - 0.5,
      base[1] + (target[1] - base[1]) * t - 0.5,
      base[2] + (target[2] - base[2]) * t - 0.5
    );

  const verts = BASE_VERTS.map(v => ({
    base: v,
    transformed: applyMat(mat, v),
  }));

  return (
    <group>
      {EDGES.map(([a, b], i) => (
        <Line
          key={i}
          points={[lerpVert(verts[a].base, verts[a].transformed), lerpVert(verts[b].base, verts[b].transformed)]}
          color="#22d3ee"
          lineWidth={2.5}
        />
      ))}
      {/* Basis vectors */}
      {[
        { end: applyMat(mat, [1,0,0]), color: '#f43f5e', label: 'i' },
        { end: applyMat(mat, [0,1,0]), color: '#34d399', label: 'j' },
        { end: applyMat(mat, [0,0,1]), color: '#f59e0b', label: 'k' },
      ].map(({ end, color, label }) => {
        const to = new THREE.Vector3(
          (end[0]) * t - 0.5,
          (end[1]) * t - 0.5,
          (end[2]) * t - 0.5
        );
        const from = new THREE.Vector3(-0.5, -0.5, -0.5);
        return (
          <group key={label}>
            <Line points={[from, to]} color={color} lineWidth={3} />
            <mesh position={to} rotation={[0, 0, Math.atan2(to.y - from.y, to.x - from.x) - Math.PI / 2]}>
              <coneGeometry args={[0.06, 0.18, 8]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
            </mesh>
            <Html position={[to.x + 0.1, to.y + 0.1, to.z]}>
              <span style={{ color, fontSize: 11, fontWeight: 700, pointerEvents: 'none' }}>{label}̂</span>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

function AnimatedScene({ target, isAnimating }: { target: Mat3; isAnimating: boolean }) {
  const tRef = useRef(0);
  const [t, setT] = useState(0);

  useFrame((_, delta) => {
    if (isAnimating && tRef.current < 1) {
      tRef.current = Math.min(1, tRef.current + delta * 1.2);
      setT(tRef.current);
    }
  });

  useEffect(() => {
    tRef.current = 0;
    setT(0);
  }, [target]);

  return <TransformedCube mat={target} t={t} />;
}

export default function MatrixTransformations() {
  const [mat, setMat] = useState<Mat3>([...IDENTITY]);
  const [scenario, setScenario] = useState('identity');
  const [isAnimating, setIsAnimating] = useState(false);
  const [animTarget, setAnimTarget] = useState<Mat3>([...IDENTITY]);

  const det = matDet(mat);

  const applyScenario = (id: string) => {
    setScenario(id);
    const m = [...SCENARIOS[id].mat] as Mat3;
    setMat(m);
    setAnimTarget(m);
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 1200);
  };

  const updateCell = (i: number, v: number) => {
    const next = [...mat] as Mat3;
    next[i] = isNaN(v) ? 0 : v;
    setMat(next);
    setAnimTarget(next);
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 900);
  };

  return (
    <div className="w-full h-full flex overflow-hidden">
      <div className="flex-1 relative min-w-0">
        <Canvas camera={{ position: [2, 2, 5], fov: 45 }} style={{ background: '#030712' }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 8, 5]} intensity={1} />
          <AnimatedScene target={animTarget} isAnimating={isAnimating} />
          <OrbitControls enablePan={false} minDistance={3} maxDistance={12} />
          <gridHelper args={[8, 8, '#0f172a', '#0f172a']} />
        </Canvas>
      </div>

      <div className="w-72 flex-shrink-0 bg-gray-950 border-l border-gray-800 overflow-y-auto scrollbar-thin">
        <div className="p-3 space-y-4">

          <ScenarioSelect
            label="Preset Transformation"
            scenarios={Object.entries(SCENARIOS).map(([id, v]) => ({ id, label: v.label, description: v.description }))}
            value={scenario}
            onChange={applyScenario}
            color="cyan"
          />

          {/* 3×3 Matrix Input */}
          <div>
            <p className="text-[10px] text-gray-600 font-semibold uppercase tracking-wider mb-2">Transformation Matrix</p>
            <div className="grid grid-cols-3 gap-1.5 font-mono">
              {mat.map((v, i) => (
                <input
                  key={i}
                  type="number"
                  value={v}
                  onChange={e => updateCell(i, parseFloat(e.target.value))}
                  step={0.1}
                  className="bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white text-center outline-none focus:border-cyan-500 transition-colors w-full"
                />
              ))}
            </div>
            <div className="flex justify-between text-[9px] text-gray-700 mt-1 px-1">
              <span>row 1</span><span>row 2</span><span>row 3</span>
            </div>
          </div>

          <DataOverlay
            equation={{ text: 'det(M) = ad(ei-fh) − b(di-fg) + c(dh-eg)', color: '#94a3b8' }}
            readouts={[
              { label: 'Determinant', value: det.toFixed(4), color: Math.abs(det) < 0.001 ? '#f43f5e' : '#34d399', highlight: true },
              { label: 'Volume scale', value: `${Math.abs(det).toFixed(3)}×`, color: '#22d3ee' },
              { label: 'Invertible?', value: Math.abs(det) > 0.001 ? 'Yes' : 'NO — singular matrix', color: Math.abs(det) > 0.001 ? '#34d399' : '#f43f5e' },
              { label: 'Orientation', value: det >= 0 ? 'Preserved' : 'Flipped', color: det >= 0 ? '#34d399' : '#f59e0b' },
            ]}
          />

          {/* Basis vector readout */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-3 space-y-2">
            <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Transformed Basis Vectors</p>
            {[
              { label: 'î →', vec: applyMat(mat, [1,0,0]), color: '#f43f5e' },
              { label: 'ĵ →', vec: applyMat(mat, [0,1,0]), color: '#34d399' },
              { label: 'k̂ →', vec: applyMat(mat, [0,0,1]), color: '#f59e0b' },
            ].map(({ label, vec, color }) => (
              <div key={label} className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-semibold" style={{ color }}>{label}</span>
                <span className="text-[11px] text-gray-400 font-mono">
                  ({vec.map(v => v.toFixed(2)).join(', ')})
                </span>
              </div>
            ))}
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-3 text-[11px] text-gray-400">
            {Math.abs(det) < 0.001
              ? <p><span className="text-rose-400 font-semibold">det = 0:</span> Space collapsed to lower dimension — matrix is not invertible!</p>
              : <p>Volume changes by factor <span className="text-cyan-300">{Math.abs(det).toFixed(3)}</span>. {det < 0 ? 'Orientation is flipped.' : 'Orientation preserved.'}</p>}
          </div>

        </div>
      </div>
    </div>
  );
}
