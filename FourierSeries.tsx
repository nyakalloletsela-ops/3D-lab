import { useState, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line } from '@react-three/drei';
import * as THREE from 'three';
import {
  LineChart,
  Line as RLine,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import ControlSlider from '../../components/ControlSlider';
import ScenarioSelect from '../../components/ScenarioSelect';
import DataOverlay from '../../components/DataOverlay';

// ── wave math ─────────────────────────────────────────────────────────────────
type WaveId = 'square' | 'sawtooth';

function squareApprox(x: number, n: number): number {
  let sum = 0;
  for (let k = 1; k <= n; k++) {
    sum += Math.sin((2 * k - 1) * x) / (2 * k - 1);
  }
  return (4 / Math.PI) * sum;
}

function sawtoothApprox(x: number, n: number): number {
  let sum = 0;
  for (let k = 1; k <= n; k++) {
    sum += Math.sin(k * x) / k;
  }
  return (2 / Math.PI) * sum;
}

function squareIdeal(x: number): number {
  const mod = ((x % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  return mod < Math.PI ? 1 : -1;
}

function sawtoothIdeal(x: number): number {
  const mod = ((x % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  return 1 - mod / Math.PI;
}

function getApprox(wave: WaveId, x: number, n: number): number {
  return wave === 'square' ? squareApprox(x, n) : sawtoothApprox(x, n);
}

function getIdeal(wave: WaveId, x: number): number {
  return wave === 'square' ? squareIdeal(x) : sawtoothIdeal(x);
}

// Amplitude of k-th harmonic for each wave type
function harmonicAmplitude(wave: WaveId, k: number): number {
  if (wave === 'square') {
    const m = 2 * k - 1;
    return (4 / Math.PI) * (1 / m);
  } else {
    return (2 / Math.PI) * (1 / k);
  }
}

// ── epicycle animation scene ──────────────────────────────────────────────────
const TRAIL_LENGTH = 240;
const WALL_Z = -2.5;

function EpicycleScene({ n, wave }: { n: number; wave: WaveId }) {
  const timeRef = useRef(0);
  const trailRef = useRef<[number, number, number][]>([]);
  const groupRef = useRef<THREE.Group>(null);

  // Use state to force re-render each frame
  const [, setTick] = useState(0);

  useFrame((_, delta) => {
    timeRef.current += delta * 1.4;
    setTick(t => t + 1);
  });

  const t = timeRef.current;

  // Build chain of epicycle tips
  const chainPoints: THREE.Vector3[] = [];
  let cx = 0;
  let cy = 0;
  // offset x so epicycles sit on the left side
  const startX = -3.5;
  cx = startX;

  const circleLines: { pts: THREE.Vector3[]; color: string; radius: number; cx: number; cy: number }[] = [];

  for (let k = 1; k <= n; k++) {
    const amp = harmonicAmplitude(wave, k);
    const freq = wave === 'square' ? (2 * k - 1) : k;
    const angle = freq * t;
    const nx = cx + amp * Math.cos(angle);
    const ny = cy + amp * Math.sin(angle);

    // build circle points
    const circlePts: THREE.Vector3[] = [];
    for (let i = 0; i <= 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      circlePts.push(new THREE.Vector3(cx + amp * Math.cos(a), cy + amp * Math.sin(a), 0));
    }

    const hue = (k / n) * 220;
    const color = `hsl(${hue}, 80%, 65%)`;
    circleLines.push({ pts: circlePts, color, radius: amp, cx, cy });
    chainPoints.push(new THREE.Vector3(nx, ny, 0));
    cx = nx;
    cy = ny;
  }

  const tip = chainPoints[chainPoints.length - 1] ?? new THREE.Vector3(startX, 0, 0);

  // Update trail
  const trail = trailRef.current;
  trail.unshift([tip.x, tip.y, 0]);
  if (trail.length > TRAIL_LENGTH) trail.length = TRAIL_LENGTH;

  // Map trail to scrolling wall (Z spread)
  const wallPts: THREE.Vector3[] = trail.map((p, i) => {
    const wz = WALL_Z - (i / TRAIL_LENGTH) * 4;
    return new THREE.Vector3(p[0] + 4.5, p[1], wz);
  });

  // Connecting dashed line from tip to wall
  const wallTipX = tip.x + 4.5;
  const connectPts = [
    new THREE.Vector3(tip.x, tip.y, 0),
    new THREE.Vector3(wallTipX, tip.y, WALL_Z),
  ];

  return (
    <group ref={groupRef}>
      {/* Epicycle circles */}
      {circleLines.map((c, i) => (
        <Line key={i} points={c.pts} color={c.color} lineWidth={1} transparent opacity={0.4} />
      ))}

      {/* Spoke lines connecting centers to tips */}
      {chainPoints.map((pt, i) => {
        const prev = i === 0
          ? new THREE.Vector3(startX, 0, 0)
          : chainPoints[i - 1];
        return (
          <Line
            key={`spoke-${i}`}
            points={[prev, pt]}
            color="#ffffff"
            lineWidth={1.5}
          />
        );
      })}

      {/* Dots at each circle center */}
      {circleLines.map((c, i) => (
        <mesh key={`dot-${i}`} position={[c.cx, c.cy, 0]}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshBasicMaterial color="#64748b" />
        </mesh>
      ))}

      {/* Tip sphere */}
      <mesh position={[tip.x, tip.y, 0]}>
        <sphereGeometry args={[0.07, 12, 12]} />
        <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={1} />
      </mesh>

      {/* Trail on wall */}
      {wallPts.length >= 2 && (
        <Line points={wallPts} color="#22d3ee" lineWidth={2} />
      )}

      {/* Dashed connector from tip to wall */}
      {connectPts.length === 2 && (
        <Line
          points={connectPts}
          color="#fbbf24"
          lineWidth={1.5}
          dashed
          dashSize={0.1}
          gapSize={0.07}
        />
      )}

      {/* Horizontal guide line at y=0 */}
      <Line
        points={[new THREE.Vector3(-5, 0, 0), new THREE.Vector3(5, 0, 0)]}
        color="#1e293b"
        lineWidth={1}
      />

      {/* Wall surface hint */}
      <mesh position={[4.5, 0, WALL_Z - 2]} rotation={[0, 0, 0]}>
        <planeGeometry args={[3, 6]} />
        <meshStandardMaterial color="#0f172a" transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// ── scenarios ─────────────────────────────────────────────────────────────────
const SCENARIOS: { id: WaveId; label: string; description: string }[] = [
  { id: 'square',   label: 'Square Wave',   description: '(4/π)·Σ sin((2k-1)x)/(2k-1)' },
  { id: 'sawtooth', label: 'Sawtooth Wave', description: '(2/π)·Σ sin(kx)/k' },
];

// ── approximation error ────────────────────────────────────────────────────────
function computeError(wave: WaveId, n: number): number {
  const steps = 200;
  let sumSq = 0;
  let idealSumSq = 0;
  for (let i = 0; i <= steps; i++) {
    const x = -Math.PI + (i / steps) * 2 * Math.PI;
    const approx = getApprox(wave, x, n);
    const ideal = getIdeal(wave, x);
    const diff = approx - ideal;
    sumSq += diff * diff;
    idealSumSq += ideal * ideal;
  }
  return idealSumSq > 0 ? (Math.sqrt(sumSq / steps) / Math.sqrt(idealSumSq / steps)) * 100 : 0;
}

// ── chart data ─────────────────────────────────────────────────────────────────
function useChartData(wave: WaveId, n: number) {
  return useMemo(() => {
    const pts = 100;
    return Array.from({ length: pts }, (_, i) => {
      const x = -Math.PI + (i / (pts - 1)) * 2 * Math.PI;
      return {
        x: x.toFixed(2),
        approx: parseFloat(getApprox(wave, x, n).toFixed(4)),
        ideal: parseFloat(getIdeal(wave, x).toFixed(4)),
      };
    });
  }, [wave, n]);
}

// ── root component ─────────────────────────────────────────────────────────────
export default function FourierSeries() {
  const [n, setN] = useState(5);
  const [wave, setWave] = useState<WaveId>('square');

  const chartData = useChartData(wave, n);
  const errorPct = useMemo(() => computeError(wave, n), [wave, n]);

  const equationMap: Record<WaveId, string> = {
    square:   'f(x) = (4/π)·Σ sin((2k-1)x)/(2k-1)',
    sawtooth: 'f(x) = (2/π)·Σ sin(kx)/k',
  };

  return (
    <div className="w-full h-full flex overflow-hidden">
      <div className="flex-1 relative min-w-0">
        <Canvas
          camera={{ position: [0, 0, 12], fov: 45 }}
          style={{ background: '#030712' }}
        >
          <ambientLight intensity={0.5} />
          <pointLight position={[0, 5, 8]} intensity={1.2} />
          <EpicycleScene n={n} wave={wave} />
          <OrbitControls enablePan={false} minDistance={5} maxDistance={22} />
        </Canvas>
      </div>

      <div className="w-72 flex-shrink-0 bg-gray-950 border-l border-gray-800 overflow-y-auto scrollbar-thin">
        <div className="p-3 space-y-4">

          <ScenarioSelect
            label="Wave Type"
            scenarios={SCENARIOS}
            value={wave}
            onChange={setWave}
            color="cyan"
          />

          <ControlSlider
            label="Harmonics (n)"
            value={n}
            min={1}
            max={20}
            step={1}
            color="#22d3ee"
            onChange={setN}
            precision={0}
            formatValue={v => `${v} term${v === 1 ? '' : 's'}`}
          />

          {/* Approximation vs ideal chart */}
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-3 pt-2 pb-0">
              <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
                Approximation vs Ideal (−π to π)
              </span>
            </div>
            <ResponsiveContainer width="100%" height={130}>
              <LineChart data={chartData} margin={{ top: 4, right: 8, left: -24, bottom: 2 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="x"
                  tick={{ fontSize: 8, fill: '#475569' }}
                  tickLine={false}
                  interval={24}
                />
                <YAxis
                  tick={{ fontSize: 8, fill: '#475569' }}
                  tickLine={false}
                  domain={[-1.6, 1.6]}
                  tickFormatter={v => v.toFixed(1)}
                />
                <Tooltip
                  contentStyle={{
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: 8,
                    fontSize: 10,
                  }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(v: any) => (typeof v === 'number' ? v.toFixed(3) : v)}
                />
                <Legend
                  wrapperStyle={{ fontSize: 9, paddingTop: 2 }}
                  formatter={(value: string) =>
                    value === 'approx' ? `Approx n=${n}` : 'Ideal'
                  }
                />
                <RLine
                  type="monotone"
                  dataKey="ideal"
                  stroke="#f43f5e"
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                  strokeDasharray="4 3"
                />
                <RLine
                  type="monotone"
                  dataKey="approx"
                  stroke="#22d3ee"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <DataOverlay
            equation={{ text: equationMap[wave], color: '#94a3b8' }}
            readouts={[
              { label: 'Harmonics',    value: `${n}`, color: '#22d3ee', highlight: true },
              { label: 'Wave type',    value: wave.charAt(0).toUpperCase() + wave.slice(1), color: '#a78bfa' },
              {
                label: 'RMS error %',
                value: `${errorPct.toFixed(2)}%`,
                color: errorPct < 5 ? '#34d399' : errorPct < 20 ? '#f59e0b' : '#f43f5e',
                highlight: true,
              },
              {
                label: 'Approx quality',
                value: errorPct < 5 ? 'Excellent' : errorPct < 15 ? 'Good' : errorPct < 35 ? 'Fair' : 'Poor',
                color: errorPct < 5 ? '#34d399' : errorPct < 15 ? '#22d3ee' : errorPct < 35 ? '#f59e0b' : '#f43f5e',
              },
              { label: 'Highest freq', value: wave === 'square' ? `${2 * n - 1}f₀` : `${n}f₀`, color: '#f59e0b' },
            ]}
          />

          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-3 text-[11px] text-gray-400 space-y-1">
            <p>
              Each circle in the epicycle chain rotates at a harmonic frequency.
              The tip traces out the wave shape as they compose.
            </p>
            <p className="text-gray-500">
              {wave === 'square'
                ? 'Square waves only use odd harmonics — each one sharpens the corners.'
                : 'Sawtooth waves use all harmonics — the ramp shape needs both odd and even terms.'}
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
