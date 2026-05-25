import { useState, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import ScenarioSelect from '../../components/ScenarioSelect';
import DataOverlay from '../../components/DataOverlay';

// ── 2×2 matrix math ───────────────────────────────────────────────────────────
interface EigenResult {
  disc: number;
  trace: number;
  det: number;
  isReal: boolean;
  lambda1: number | null;
  lambda2: number | null;
  ev1: [number, number] | null;
  ev2: [number, number] | null;
  // complex parts when disc < 0
  realPart: number;
  imagPart: number;
}

function computeEigen(a: number, b: number, c: number, d: number): EigenResult {
  const trace = a + d;
  const det = a * d - b * c;
  const disc = trace * trace - 4 * det;
  const realPart = trace / 2;
  const imagPart = disc < 0 ? Math.sqrt(-disc) / 2 : 0;

  const isReal = disc >= 0;

  let lambda1: number | null = null;
  let lambda2: number | null = null;
  let ev1: [number, number] | null = null;
  let ev2: [number, number] | null = null;

  if (isReal) {
    const sqrtDisc = Math.sqrt(disc);
    lambda1 = (trace + sqrtDisc) / 2;
    lambda2 = (trace - sqrtDisc) / 2;

    const computeEV = (lam: number): [number, number] => {
      if (Math.abs(b) > 1e-9) {
        const vx = b;
        const vy = lam - a;
        const len = Math.sqrt(vx * vx + vy * vy);
        return len > 1e-9 ? [vx / len, vy / len] : [1, 0];
      } else if (Math.abs(c) > 1e-9) {
        const vx = lam - d;
        const vy = c;
        const len = Math.sqrt(vx * vx + vy * vy);
        return len > 1e-9 ? [vx / len, vy / len] : [1, 0];
      } else {
        // diagonal — eigenvectors are basis vectors
        if (Math.abs(lam - a) < 1e-9) return [1, 0];
        return [0, 1];
      }
    };

    ev1 = computeEV(lambda1);
    ev2 = computeEV(lambda2);
  }

  return { disc, trace, det, isReal, lambda1, lambda2, ev1, ev2, realPart, imagPart };
}

// ── arrow helper ───────────────────────────────────────────────────────────────
function Arrow2D({
  dx, dy, color, label, dashed = false, scale = 1,
}: {
  dx: number; dy: number; color: string; label: string; dashed?: boolean; scale?: number;
}) {
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.05) return null;

  const sx = dx * scale;
  const sy = dy * scale;
  const slen = Math.sqrt(sx * sx + sy * sy);
  const coneH = Math.min(0.22, slen * 0.28);
  const ux = sx / slen;
  const uy = sy / slen;
  const coneBaseX = sx - ux * coneH;
  const coneBaseY = sy - uy * coneH;

  const dir = new THREE.Vector3(ux, uy, 0);
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);

  return (
    <group>
      {dashed ? (
        <Line
          points={[new THREE.Vector3(0, 0, 0.01), new THREE.Vector3(coneBaseX, coneBaseY, 0.01)]}
          color={color}
          lineWidth={2}
          dashed
          dashSize={0.1}
          gapSize={0.07}
        />
      ) : (
        <Line
          points={[new THREE.Vector3(0, 0, 0.01), new THREE.Vector3(coneBaseX, coneBaseY, 0.01)]}
          color={color}
          lineWidth={2.5}
        />
      )}
      <mesh position={[sx, sy, 0.01]} quaternion={quat}>
        <coneGeometry args={[0.06, coneH, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} />
      </mesh>
      <Html position={[sx + ux * 0.18, sy + uy * 0.18, 0.01]}>
        <span style={{
          color,
          fontSize: 11,
          fontWeight: 700,
          pointerEvents: 'none',
          textShadow: '0 0 6px #000, 0 0 12px #000',
        }}>
          {label}
        </span>
      </Html>
    </group>
  );
}

// ── grid transformation visualization ─────────────────────────────────────────
function TransformedGrid({ a, b, c, d }: { a: number; b: number; c: number; d: number }) {
  const RANGE = 2;
  const STEP = 0.5;

  const pts: THREE.Vector3[] = [];
  for (let gx = -RANGE; gx <= RANGE; gx += STEP) {
    for (let gy = -RANGE; gy <= RANGE; gy += STEP) {
      pts.push(new THREE.Vector3(gx, gy, 0));
    }
  }

  // Transform: [a b; c d] * [x; y]
  const tPts = pts.map(p => new THREE.Vector3(
    a * p.x + b * p.y,
    c * p.x + d * p.y,
    0
  ));

  // Draw faint lines between nearby original points and their transforms
  const lines: { from: THREE.Vector3; to: THREE.Vector3 }[] = pts.map((p, i) => ({
    from: p,
    to: tPts[i],
  }));

  return (
    <group>
      {/* Original grid dots */}
      {pts.map((p, i) => (
        <mesh key={`dot-${i}`} position={[p.x, p.y, -0.05]}>
          <sphereGeometry args={[0.03, 6, 6]} />
          <meshBasicMaterial color="#334155" />
        </mesh>
      ))}
      {/* Transformed grid dots */}
      {tPts.map((p, i) => (
        <mesh key={`tdot-${i}`} position={[p.x, p.y, -0.05]}>
          <sphereGeometry args={[0.025, 6, 6]} />
          <meshBasicMaterial color="#1e3a4a" />
        </mesh>
      ))}
      {/* Transform lines */}
      {lines.map((l, i) => {
        const dist = l.from.distanceTo(l.to);
        if (dist < 0.02) return null;
        return (
          <Line
            key={`warp-${i}`}
            points={[l.from, l.to]}
            color="#164e63"
            lineWidth={0.8}
          />
        );
      })}
    </group>
  );
}

// ── main 3D scene ──────────────────────────────────────────────────────────────
function EigenScene({ a, b, c, d, eigen }: {
  a: number; b: number; c: number; d: number; eigen: EigenResult;
}) {
  const AXIS_LEN = 3.2;

  return (
    <group>
      {/* Coordinate axes */}
      <Line points={[[-AXIS_LEN, 0, 0], [AXIS_LEN, 0, 0]]} color="#1e293b" lineWidth={1.5} />
      <Line points={[[0, -AXIS_LEN, 0], [0, AXIS_LEN, 0]]} color="#1e293b" lineWidth={1.5} />
      <Html position={[AXIS_LEN + 0.2, 0, 0]}>
        <span style={{ color: '#334155', fontSize: 11, pointerEvents: 'none' }}>x</span>
      </Html>
      <Html position={[0, AXIS_LEN + 0.2, 0]}>
        <span style={{ color: '#334155', fontSize: 11, pointerEvents: 'none' }}>y</span>
      </Html>

      {/* Grid + transformation warp */}
      <TransformedGrid a={a} b={b} c={c} d={d} />

      {/* Standard basis vectors (white, dashed) */}
      <Arrow2D dx={1} dy={0} color="#64748b" label="e₁" dashed scale={1.5} />
      <Arrow2D dx={0} dy={1} color="#64748b" label="e₂" dashed scale={1.5} />

      {/* Eigenvectors (only if real eigenvalues) */}
      {eigen.isReal && eigen.ev1 && eigen.lambda1 !== null && (
        <Arrow2D
          dx={eigen.ev1[0]}
          dy={eigen.ev1[1]}
          color="#22d3ee"
          label={`v₁`}
          scale={2.2}
        />
      )}
      {eigen.isReal && eigen.ev2 && eigen.lambda2 !== null && (
        <Arrow2D
          dx={eigen.ev2[0]}
          dy={eigen.ev2[1]}
          color="#f59e0b"
          label={`v₂`}
          scale={2.2}
        />
      )}

      {/* Origin dot */}
      <mesh>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshStandardMaterial color="#64748b" />
      </mesh>
    </group>
  );
}

// ── scenarios ─────────────────────────────────────────────────────────────────
type ScenarioId = 'distinct_real' | 'repeated' | 'complex';

const SCENARIOS: { id: ScenarioId; label: string; description: string }[] = [
  { id: 'distinct_real', label: 'Distinct Real',  description: 'Two distinct real eigenvalues' },
  { id: 'repeated',      label: 'Repeated',        description: 'Repeated eigenvalue (degenerate)' },
  { id: 'complex',       label: 'Complex',          description: 'Complex eigenvalues — rotation' },
];

const SCENARIO_VALS: Record<ScenarioId, [number, number, number, number]> = {
  distinct_real: [2, 1, 1, 2],
  repeated:      [3, 0, 0, 3],
  complex:       [0, -1, 1, 0],
};

// ── 2×2 matrix number input ────────────────────────────────────────────────────
function MatrixInput({
  values, onChange,
}: {
  values: [number, number, number, number];
  onChange: (i: number, v: number) => void;
}) {
  const labels = ['a', 'b', 'c', 'd'];
  const colors = ['#22d3ee', '#22d3ee', '#22d3ee', '#22d3ee'];

  return (
    <div>
      <p className="text-[10px] text-gray-600 font-semibold uppercase tracking-wider mb-2">
        Matrix M = [a b; c d]
      </p>
      <div className="grid grid-cols-2 gap-1.5 font-mono">
        {values.map((v, i) => (
          <div key={i}>
            <p className="text-[9px] text-gray-600 text-center mb-0.5">{labels[i]}</p>
            <input
              type="number"
              value={v}
              step={0.5}
              onChange={e => onChange(i, parseFloat(e.target.value))}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white text-center outline-none focus:border-cyan-500 transition-colors"
              style={{ color: colors[i] }}
            />
          </div>
        ))}
      </div>
      {/* visual bracket hint */}
      <div className="flex items-center justify-center mt-1.5 gap-1 font-mono text-[10px] text-gray-600">
        <span>⎡</span>
        <span className="text-cyan-400">{values[0].toFixed(1)}</span>
        <span className="text-cyan-400">{values[1].toFixed(1)}</span>
        <span>⎤</span>
        <span className="ml-2">⎡</span>
        <span className="text-cyan-400">{values[2].toFixed(1)}</span>
        <span className="text-cyan-400">{values[3].toFixed(1)}</span>
        <span>⎦</span>
      </div>
    </div>
  );
}

// ── root component ─────────────────────────────────────────────────────────────
export default function Eigenvalues() {
  const [mat, setMat] = useState<[number, number, number, number]>([2, 1, 1, 2]);
  const [scenario, setScenario] = useState<ScenarioId>('distinct_real');

  const [a, b, c, d] = mat;
  const eigen = useMemo(() => computeEigen(a, b, c, d), [a, b, c, d]);

  const updateCell = (i: number, v: number) => {
    const next = [...mat] as [number, number, number, number];
    next[i] = isNaN(v) ? 0 : v;
    setMat(next);
  };

  const applyScenario = (id: ScenarioId) => {
    setScenario(id);
    setMat([...SCENARIO_VALS[id]]);
  };

  const lambda1Str = eigen.isReal && eigen.lambda1 !== null
    ? eigen.lambda1.toFixed(3)
    : `${eigen.realPart.toFixed(3)} + ${eigen.imagPart.toFixed(3)}i`;

  const lambda2Str = eigen.isReal && eigen.lambda2 !== null
    ? eigen.lambda2.toFixed(3)
    : `${eigen.realPart.toFixed(3)} − ${eigen.imagPart.toFixed(3)}i`;

  const ev1Str = eigen.isReal && eigen.ev1
    ? `(${eigen.ev1[0].toFixed(3)}, ${eigen.ev1[1].toFixed(3)})`
    : '—';

  const ev2Str = eigen.isReal && eigen.ev2
    ? `(${eigen.ev2[0].toFixed(3)}, ${eigen.ev2[1].toFixed(3)})`
    : '—';

  const discColor = eigen.disc > 1e-9
    ? '#34d399'
    : eigen.disc < -1e-9
    ? '#f43f5e'
    : '#f59e0b';

  return (
    <div className="w-full h-full flex overflow-hidden">
      <div className="flex-1 relative min-w-0">
        <Canvas
          camera={{ position: [0, 0, 9], fov: 45 }}
          style={{ background: '#030712' }}
        >
          <ambientLight intensity={0.5} />
          <directionalLight position={[4, 6, 5]} intensity={1.2} />
          <EigenScene a={a} b={b} c={c} d={d} eigen={eigen} />
          <OrbitControls enablePan={false} minDistance={4} maxDistance={16} />
          <gridHelper args={[8, 8, '#0f172a', '#0f172a']} />
        </Canvas>
      </div>

      <div className="w-72 flex-shrink-0 bg-gray-950 border-l border-gray-800 overflow-y-auto scrollbar-thin">
        <div className="p-3 space-y-4">

          <MatrixInput values={mat} onChange={updateCell} />

          <ScenarioSelect
            label="Preset"
            scenarios={SCENARIOS}
            value={scenario}
            onChange={applyScenario}
            color="cyan"
          />

          <DataOverlay
            equation={{ text: 'λ² − tr(M)λ + det(M) = 0', color: '#94a3b8' }}
            readouts={[
              { label: 'Trace (a+d)',  value: eigen.trace.toFixed(3),   color: '#22d3ee' },
              { label: 'Det (ad−bc)',  value: eigen.det.toFixed(3),     color: '#22d3ee' },
              {
                label: 'Discriminant',
                value: eigen.disc.toFixed(4),
                color: discColor,
                highlight: true,
              },
              {
                label: 'λ₁',
                value: lambda1Str,
                color: eigen.isReal ? '#22d3ee' : '#f43f5e',
                highlight: true,
              },
              {
                label: 'λ₂',
                value: lambda2Str,
                color: eigen.isReal ? '#f59e0b' : '#f43f5e',
                highlight: true,
              },
              { label: 'Eigenvec v₁', value: ev1Str, color: '#22d3ee' },
              { label: 'Eigenvec v₂', value: ev2Str, color: '#f59e0b' },
            ]}
          />

          {/* Insight card */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-3 text-[11px] text-gray-400 space-y-1.5">
            {!eigen.isReal ? (
              <>
                <p>
                  <span className="text-rose-400 font-semibold">Complex eigenvalues:</span>{' '}
                  rotation in the plane. No real eigenvectors exist — no direction is left
                  invariant by this transformation.
                </p>
                <p className="text-gray-500">
                  Complex pair: {eigen.realPart.toFixed(3)} ± {eigen.imagPart.toFixed(3)}i
                </p>
              </>
            ) : Math.abs(eigen.disc) < 1e-6 ? (
              <>
                <p>
                  <span className="text-amber-400 font-semibold">Repeated eigenvalue λ = {eigen.lambda1?.toFixed(3)}.</span>{' '}
                  The matrix may have only one linearly independent eigenvector (defective),
                  or a full eigenspace if it is a scalar multiple of the identity.
                </p>
              </>
            ) : (
              <>
                <p>
                  <span className="text-cyan-400 font-semibold">Two distinct real eigenvalues.</span>{' '}
                  Eigenvectors{' '}
                  <span className="text-cyan-300">v₁</span> and{' '}
                  <span className="text-amber-300">v₂</span>{' '}
                  are the invariant directions — the matrix only scales along these axes.
                </p>
                <p className="text-gray-500">
                  λ₁ = {eigen.lambda1?.toFixed(3)} scales by {Math.abs(eigen.lambda1 ?? 0).toFixed(3)}
                  {(eigen.lambda1 ?? 0) < 0 ? ' (flips direction)' : ''}.
                </p>
              </>
            )}
            <p className="text-gray-600 border-t border-gray-800 pt-1.5 mt-0.5">
              det = {eigen.det.toFixed(3)} · trace = {eigen.trace.toFixed(3)}
            </p>
          </div>

          {/* Characteristic polynomial display */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-3">
            <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-1.5">
              Characteristic Polynomial
            </p>
            <div className="font-mono text-[11px] space-y-0.5 text-gray-300">
              <p>
                λ² −{' '}
                <span className="text-cyan-300">({eigen.trace.toFixed(2)})</span>
                λ +{' '}
                <span className="text-cyan-300">({eigen.det.toFixed(2)})</span>
                {' '}= 0
              </p>
              <p className="text-gray-500 text-[10px]">
                Δ = {eigen.trace.toFixed(2)}² − 4·{eigen.det.toFixed(2)}{' '}
                = <span style={{ color: discColor }}>{eigen.disc.toFixed(4)}</span>
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
