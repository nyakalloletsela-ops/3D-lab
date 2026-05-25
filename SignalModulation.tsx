import { useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
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
  BarChart,
  Bar,
} from 'recharts';
import ControlSlider from '../../components/ControlSlider';
import ScenarioSelect from '../../components/ScenarioSelect';
import DataOverlay from '../../components/DataOverlay';

// ── Signal math ───────────────────────────────────────────────────────────────
type ModType = 'am' | 'fm';

function amSignal(t: number, fc: number, fm: number, ma: number): number {
  return (1 + ma * Math.cos(2 * Math.PI * fm * t)) * Math.cos(2 * Math.PI * fc * t);
}

function fmSignal(t: number, fc: number, fm: number, beta: number): number {
  return Math.cos(2 * Math.PI * fc * t + beta * Math.sin(2 * Math.PI * fm * t));
}

function carrierSignal(t: number, fc: number): number {
  return Math.cos(2 * Math.PI * fc * t) * 0.5;
}

function modulatingSignal(t: number, fm: number, ma: number): number {
  return ma * Math.cos(2 * Math.PI * fm * t) * 0.5;
}

// ── Build 3D wave points ──────────────────────────────────────────────────────
function buildWavePoints(
  fn: (t: number) => number,
  tStart: number,
  tEnd: number,
  n: number,
  yScale: number,
  zOffset: number,
  xScale: number
): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < n; i++) {
    const t = tStart + (i / (n - 1)) * (tEnd - tStart);
    const x = (t / tEnd) * xScale - xScale / 2;
    const y = fn(t) * yScale;
    pts.push(new THREE.Vector3(x, y, zOffset));
  }
  return pts;
}

// ── 3D Scene ──────────────────────────────────────────────────────────────────
function SignalScene({
  carrierFreq,
  modulatingFreq,
  modulatingAmp,
  scenario,
}: {
  carrierFreq: number;
  modulatingFreq: number;
  modulatingAmp: number;
  scenario: ModType;
}) {
  const tEnd = 2;
  const n = 300;
  const xScale = 10;

  const modulated = useMemo(() =>
    buildWavePoints(
      t => scenario === 'am'
        ? amSignal(t, carrierFreq, modulatingFreq, modulatingAmp)
        : fmSignal(t, carrierFreq, modulatingFreq, modulatingAmp * carrierFreq / modulatingFreq),
      0, tEnd, n, 0.9, 0, xScale
    ),
    [carrierFreq, modulatingFreq, modulatingAmp, scenario]
  );

  const carrier = useMemo(() =>
    buildWavePoints(t => carrierSignal(t, carrierFreq), 0, tEnd, n, 0.9, 1.5, xScale),
    [carrierFreq]
  );

  const modulating = useMemo(() =>
    buildWavePoints(t => modulatingSignal(t, modulatingFreq, modulatingAmp), 0, tEnd, n, 0.9, -1.5, xScale),
    [modulatingFreq, modulatingAmp]
  );

  // AM envelope
  const envelopeTop = useMemo(() =>
    scenario === 'am'
      ? buildWavePoints(t => (1 + modulatingAmp * Math.cos(2 * Math.PI * modulatingFreq * t)) * 0.9, 0, tEnd, 120, 1, 0, xScale)
      : [],
    [modulatingAmp, modulatingFreq, scenario]
  );

  const envelopeBot = useMemo(() =>
    scenario === 'am'
      ? buildWavePoints(t => -(1 + modulatingAmp * Math.cos(2 * Math.PI * modulatingFreq * t)) * 0.9, 0, tEnd, 120, 1, 0, xScale)
      : [],
    [modulatingAmp, modulatingFreq, scenario]
  );

  return (
    <group>
      {/* Carrier — faint gray */}
      {carrier.length > 1 && (
        <Line points={carrier} color="#6b7280" lineWidth={1} />
      )}
      {/* Modulating — amber */}
      {modulating.length > 1 && (
        <Line points={modulating} color="#f59e0b" lineWidth={2} />
      )}
      {/* Modulated output — cyan */}
      {modulated.length > 1 && (
        <Line points={modulated} color="#22d3ee" lineWidth={3} />
      )}
      {/* AM envelope */}
      {scenario === 'am' && envelopeTop.length > 1 && (
        <>
          <Line points={envelopeTop} color="#f43f5e" lineWidth={1} dashed dashSize={0.15} gapSize={0.1} />
          <Line points={envelopeBot} color="#f43f5e" lineWidth={1} dashed dashSize={0.15} gapSize={0.1} />
        </>
      )}
      {/* Axis lines */}
      <Line points={[new THREE.Vector3(-5, 0, 0), new THREE.Vector3(5, 0, 0)]} color="#1e293b" lineWidth={1} />
      <Line points={[new THREE.Vector3(-5, 0, 1.5), new THREE.Vector3(5, 0, 1.5)]} color="#1e293b" lineWidth={1} />
      <Line points={[new THREE.Vector3(-5, 0, -1.5), new THREE.Vector3(5, 0, -1.5)]} color="#1e293b" lineWidth={1} />
    </group>
  );
}

// ── Scenarios ─────────────────────────────────────────────────────────────────
const SCENARIOS = [
  { id: 'am', label: 'AM', description: 'Amplitude Modulation — envelope varies with signal' },
  { id: 'fm', label: 'FM', description: 'Frequency Modulation — frequency varies with signal' },
];

// ── Main ──────────────────────────────────────────────────────────────────────
export default function SignalModulation() {
  const [carrierFreq,    setCarrierFreq]    = useState(8);
  const [modulatingAmp,  setModulatingAmp]  = useState(0.5);
  const [modulatingFreq, setModulatingFreq] = useState(1.5);
  const [scenario,       setScenario]       = useState<ModType>('am');

  const applyScenario = (id: string) => setScenario(id as ModType);

  const modulationIndex =
    scenario === 'am'
      ? modulatingAmp
      : (modulatingAmp * carrierFreq) / modulatingFreq;

  // Time domain chart data (200 samples, 2 seconds)
  const timeDomainData = useMemo(() => {
    const n = 200;
    return Array.from({ length: n }, (_, i) => {
      const t = (i / (n - 1)) * 2;
      const sig =
        scenario === 'am'
          ? amSignal(t, carrierFreq, modulatingFreq, modulatingAmp)
          : fmSignal(t, carrierFreq, modulatingFreq, modulatingAmp * carrierFreq / modulatingFreq);
      return { t: parseFloat(t.toFixed(3)), signal: parseFloat(sig.toFixed(4)) };
    });
  }, [carrierFreq, modulatingFreq, modulatingAmp, scenario]);

  // Frequency domain: spikes at fc, fc±fm
  const freqData = useMemo(() => {
    const fc = carrierFreq;
    const fm = modulatingFreq;
    const beta = modulatingAmp;
    const sideband = scenario === 'am' ? beta / 2 : 0.44;
    const entries: { freq: number; amplitude: number }[] = [
      { freq: parseFloat((fc - fm).toFixed(2)), amplitude: parseFloat(sideband.toFixed(3)) },
      { freq: parseFloat(fc.toFixed(2)),         amplitude: 1.0 },
      { freq: parseFloat((fc + fm).toFixed(2)), amplitude: parseFloat(sideband.toFixed(3)) },
    ];
    return entries;
  }, [carrierFreq, modulatingFreq, modulatingAmp, scenario]);

  return (
    <div className="w-full h-full flex overflow-hidden">
      <div className="flex-1 relative min-w-0">
        <Canvas camera={{ position: [0, 2, 8], fov: 50 }} style={{ background: '#030712' }}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[4, 6, 4]} intensity={0.8} />
          <SignalScene
            carrierFreq={carrierFreq}
            modulatingFreq={modulatingFreq}
            modulatingAmp={modulatingAmp}
            scenario={scenario}
          />
          <OrbitControls enablePan={false} minDistance={4} maxDistance={16} />
        </Canvas>
      </div>

      <div className="w-72 flex-shrink-0 bg-gray-950 border-l border-gray-800 overflow-y-auto scrollbar-thin">
        <div className="p-3 space-y-4">
          <ScenarioSelect
            label="Modulation Type"
            scenarios={SCENARIOS}
            value={scenario}
            onChange={applyScenario}
            color="cyan"
          />

          <ControlSlider
            label="Carrier Frequency (fc)"
            value={carrierFreq}
            min={1}
            max={20}
            step={0.5}
            color="#6b7280"
            onChange={setCarrierFreq}
            precision={1}
            formatValue={v => `${v.toFixed(1)} Hz`}
          />
          <ControlSlider
            label="Modulating Amplitude"
            value={modulatingAmp}
            min={0.1}
            max={1.0}
            step={0.05}
            color="#f59e0b"
            onChange={setModulatingAmp}
            precision={2}
          />
          <ControlSlider
            label="Modulating Frequency (fm)"
            value={modulatingFreq}
            min={0.5}
            max={5}
            step={0.1}
            color="#22d3ee"
            onChange={setModulatingFreq}
            precision={1}
            formatValue={v => `${v.toFixed(1)} Hz`}
          />

          <DataOverlay
            readouts={[
              { label: 'Carrier Freq', value: `${carrierFreq.toFixed(1)} Hz`, color: '#6b7280' },
              { label: 'Modulating Freq', value: `${modulatingFreq.toFixed(1)} Hz`, color: '#f59e0b' },
              { label: 'Modulation Index', value: modulationIndex.toFixed(3), color: '#22d3ee', highlight: true },
              { label: 'Type', value: scenario.toUpperCase(), color: '#34d399' },
            ]}
          />

          {/* Time domain */}
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-3 pt-2 pb-0">
              <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Time Domain</span>
            </div>
            <ResponsiveContainer width="100%" height={110}>
              <LineChart data={timeDomainData} margin={{ top: 4, right: 10, left: -20, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="t" tick={{ fontSize: 9, fill: '#475569' }} tickLine={false} tickCount={5} label={{ value: 't (s)', position: 'insideRight', style: { fontSize: 8, fill: '#475569' } }} />
                <YAxis tick={{ fontSize: 9, fill: '#475569' }} tickLine={false} domain={[-2, 2]} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 6, fontSize: 10 }} formatter={(v: number) => [v.toFixed(3), 'Signal']} />
                <RLine type="monotone" dataKey="signal" stroke="#22d3ee" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Frequency domain */}
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-3 pt-2 pb-0">
              <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Frequency Domain</span>
            </div>
            <ResponsiveContainer width="100%" height={110}>
              <BarChart data={freqData} margin={{ top: 4, right: 10, left: -20, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="freq" tick={{ fontSize: 9, fill: '#475569' }} tickLine={false} label={{ value: 'f (Hz)', position: 'insideRight', style: { fontSize: 8, fill: '#475569' } }} />
                <YAxis tick={{ fontSize: 9, fill: '#475569' }} tickLine={false} domain={[0, 1.2]} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 6, fontSize: 10 }} formatter={(v: number) => [v.toFixed(3), 'Amplitude']} />
                <Bar dataKey="amplitude" fill="#f59e0b" radius={[3, 3, 0, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-3 text-[11px] text-gray-400 space-y-1">
            {scenario === 'am'
              ? <p>AM varies the <span className="text-amber-300">amplitude</span> of the carrier. Sidebands appear at fc ± fm. Susceptible to noise.</p>
              : <p>FM varies the <span className="text-cyan-300">frequency</span> of the carrier. Higher bandwidth but much better noise immunity.</p>
            }
          </div>
        </div>
      </div>
    </div>
  );
}
