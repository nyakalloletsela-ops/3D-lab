import { useRef, useState, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import ControlSlider from '../../components/ControlSlider';
import ScenarioSelect from '../../components/ScenarioSelect';
import DataOverlay from '../../components/DataOverlay';

const SPEED_OF_SOUND = 343;
const SCENE_WIDTH = 20;
const MAX_RINGS = 12;
const RING_SPAWN_INTERVAL = 0.3;
const WAVE_VISUAL_SPEED = 3.0;

interface Ring {
  id: number;
  spawnX: number;
  radius: number;
  age: number;
  maxAge: number;
}

function buildCirclePoints(cx: number, radius: number, segments = 64): [number, number, number][] {
  const pts: [number, number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    pts.push([cx + radius * Math.cos(theta), radius * Math.sin(theta), 0]);
  }
  return pts;
}

function buildMachCone(sx: number, sy: number, angle: number, length: number): [[number, number, number][], [number, number, number][]] {
  const upperEnd: [number, number, number] = [sx - length * Math.cos(angle), sy + length * Math.sin(angle), 0];
  const lowerEnd: [number, number, number] = [sx - length * Math.cos(angle), sy - length * Math.sin(angle), 0];
  const apex: [number, number, number] = [sx, sy, 0];
  return [[apex, upperEnd], [apex, lowerEnd]];
}

interface SceneProps {
  sourceSpeed: number;
  waveFreq: number;
}

function DopplerScene({ sourceSpeed, waveFreq }: SceneProps) {
  const sphereRef = useRef<THREE.Mesh>(null);
  const ringsRef = useRef<Ring[]>([]);
  const ringIdRef = useRef(0);
  const spawnTimerRef = useRef(0);
  const sourceXRef = useRef(-SCENE_WIDTH / 2);
  const sourceVelocityRef = useRef(sourceSpeed);

  const [renderTick, setRenderTick] = useState(0);

  sourceVelocityRef.current = sourceSpeed;

  const normalizedSpeed = sourceSpeed / 343;
  const visualSourceSpeed = normalizedSpeed * 4.0;

  useFrame((_, delta) => {
    const vx = visualSourceSpeed;
    sourceXRef.current += vx * delta;
    if (sourceXRef.current > SCENE_WIDTH / 2 + 1) {
      sourceXRef.current = -SCENE_WIDTH / 2 - 1;
      ringsRef.current = [];
    }

    if (sphereRef.current) {
      sphereRef.current.position.x = sourceXRef.current;
    }

    spawnTimerRef.current += delta;
    if (spawnTimerRef.current >= RING_SPAWN_INTERVAL) {
      spawnTimerRef.current = 0;
      ringsRef.current.push({
        id: ringIdRef.current++,
        spawnX: sourceXRef.current,
        radius: 0.05,
        age: 0,
        maxAge: 5.0,
      });
      if (ringsRef.current.length > MAX_RINGS) {
        ringsRef.current.shift();
      }
    }

    for (const ring of ringsRef.current) {
      ring.radius += WAVE_VISUAL_SPEED * delta;
      ring.age += delta;
    }

    setRenderTick(t => t + 1);
  });

  const isSonic = sourceSpeed > SPEED_OF_SOUND;
  const sx = sourceXRef.current;

  const machAngle = isSonic ? Math.asin(SPEED_OF_SOUND / sourceSpeed) : 0;
  const coneLines = isSonic ? buildMachCone(sx, 0, machAngle, 10) : null;

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[0, 5, 5]} intensity={1} />

      <mesh ref={sphereRef} position={[sx, 0, 0]}>
        <sphereGeometry args={[0.25, 32, 32]} />
        <meshStandardMaterial
          color="#f59e0b"
          emissive="#f59e0b"
          emissiveIntensity={2.0}
          toneMapped={false}
        />
      </mesh>

      {!isSonic && ringsRef.current.map(ring => {
        const opacity = Math.max(0, 1 - ring.age / ring.maxAge);
        if (opacity <= 0) return null;
        const pts = buildCirclePoints(ring.spawnX, ring.radius);
        return (
          <Line
            key={ring.id}
            points={pts}
            color="#22d3ee"
            lineWidth={1.5}
            transparent
            opacity={opacity}
          />
        );
      })}

      {isSonic && coneLines && (
        <>
          <Line points={coneLines[0]} color="white" lineWidth={2} />
          <Line points={coneLines[1]} color="white" lineWidth={2} />
          {ringsRef.current.map(ring => {
            const opacity = Math.max(0, 1 - ring.age / ring.maxAge) * 0.4;
            if (opacity <= 0) return null;
            const pts = buildCirclePoints(ring.spawnX, ring.radius);
            return (
              <Line
                key={ring.id}
                points={pts}
                color="#f97316"
                lineWidth={1}
                transparent
                opacity={opacity}
              />
            );
          })}
        </>
      )}

      <Html position={[sx, -1.2, 0]} center style={{ pointerEvents: 'none', fontSize: 11, color: '#f59e0b', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
        source
      </Html>
    </>
  );
}

const scenarios = [
  { id: 'subsonic', label: 'Subsonic', description: 'Source slower than sound (v=200 m/s)' },
  { id: 'supersonic', label: 'Supersonic', description: 'Source faster than sound (v=500 m/s)' },
];

export default function DopplerEffect() {
  const [sourceSpeed, setSourceSpeed] = useState(200);
  const [waveFreq, setWaveFreq] = useState(440);
  const [scenario, setScenario] = useState('subsonic');

  const handleScenario = useCallback((id: string) => {
    setScenario(id);
    if (id === 'subsonic') setSourceSpeed(200);
    if (id === 'supersonic') setSourceSpeed(500);
  }, []);

  const v = SPEED_OF_SOUND;
  const vs = sourceSpeed;

  const fObsAhead = vs < v ? waveFreq * (v / (v - vs)) : Infinity;
  const fObsBehind = waveFreq * (v / (v + vs));
  const machNumber = vs / v;
  const isSonic = vs > v;

  const equation = { text: 'f_obs = f × (v ± v_obs) / (v ∓ v_source)', color: '#22d3ee' };
  const readouts = [
    { label: 'Freq ahead', value: isSonic ? '∞ (shock)' : `${fObsAhead.toFixed(1)} Hz`, color: '#22d3ee', highlight: isSonic },
    { label: 'Freq behind', value: `${fObsBehind.toFixed(1)} Hz`, color: '#f97316' },
    { label: 'Mach number', value: machNumber.toFixed(3), color: '#a78bfa', highlight: isSonic },
    { label: 'Sonic boom?', value: isSonic ? 'YES' : 'No', color: isSonic ? '#ef4444' : '#6b7280', highlight: isSonic },
  ];

  return (
    <div className="w-full h-full flex overflow-hidden">
      <div className="flex-1">
        <Canvas
          camera={{ position: [0, 0, 12], fov: 50 }}
          style={{ background: '#030712' }}
        >
          <DopplerScene sourceSpeed={sourceSpeed} waveFreq={waveFreq} />
        </Canvas>
      </div>

      <div className="w-72 bg-gray-950 border-l border-gray-800 overflow-y-auto scrollbar-thin">
        <div className="p-3 space-y-4">
          <ScenarioSelect
            label="Scenario"
            scenarios={scenarios}
            value={scenario}
            onChange={handleScenario}
            color="#22d3ee"
          />

          <ControlSlider
            label="Source Speed"
            value={sourceSpeed}
            min={0}
            max={600}
            step={1}
            color="#f59e0b"
            onChange={setSourceSpeed}
            precision={0}
            formatValue={(v) => `${v} m/s`}
          />

          <ControlSlider
            label="Wave Frequency"
            value={waveFreq}
            min={100}
            max={1000}
            step={10}
            color="#22d3ee"
            onChange={setWaveFreq}
            precision={0}
            formatValue={(v) => `${v} Hz`}
          />

          <DataOverlay equation={equation} readouts={readouts} />

          <div className="bg-gray-900 rounded-lg p-3 border border-gray-800">
            <div className="text-xs font-semibold text-amber-400 mb-2">About Doppler Effect</div>
            <p className="text-xs text-gray-400 leading-relaxed">
              The Doppler effect describes how the observed frequency of a wave changes when
              the source and observer move relative to each other. When the source approaches,
              wavefronts bunch together, raising the frequency. When it recedes, they spread out,
              lowering it. At supersonic speeds, wavefronts pile up into a Mach cone — a shock
              wave heard as a sonic boom.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
