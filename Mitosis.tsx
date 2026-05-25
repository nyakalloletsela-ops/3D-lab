import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import ControlSlider from '../../components/ControlSlider';
import ScenarioSelect from '../../components/ScenarioSelect';
import DataOverlay from '../../components/DataOverlay';
import { useState } from 'react';

const PHASE_NAMES = ['Interphase', 'Prophase', 'Metaphase', 'Anaphase', 'Telophase'];

const PHASE_DESCRIPTIONS = [
  'Cell grows and DNA replicates. Chromatin is diffuse in the nucleus.',
  'Chromosomes condense into visible X-shaped pairs. Spindle begins to form.',
  'Chromosomes align along the cell equatorial plate. Spindle fully formed.',
  'Sister chromatids pulled to opposite poles by spindle fibers.',
  'Nuclear envelopes re-form around each set. Cell pinches into two daughter cells.',
];

const CHROMOSOME_COLORS = ['#e879f9', '#c084fc', '#818cf8', '#38bdf8', '#34d399', '#fbbf24'];

interface ChromosomePairProps {
  phase: number;
  index: number;
  total: number;
}

function ChromosomePair({ phase, index, total }: ChromosomePairProps) {
  const ref = useRef<THREE.Group>(null);
  const color = CHROMOSOME_COLORS[index % CHROMOSOME_COLORS.length];

  const angle = (index / total) * Math.PI * 2;
  const radius = 0.6;

  const interphasePos = useMemo((): [number, number, number] => {
    return [
      Math.cos(angle) * radius * 0.5,
      Math.sin(angle) * radius * 0.5,
      (Math.random() - 0.5) * 0.4,
    ];
  }, [angle, radius]);

  const metaphasePos: [number, number, number] = [
    Math.cos(angle) * 0.55,
    0,
    Math.sin(angle) * 0.55,
  ];

  const anaphasePosTop: [number, number, number] = [
    Math.cos(angle) * 0.45,
    1.0,
    Math.sin(angle) * 0.45,
  ];

  const anaphasePosBottom: [number, number, number] = [
    Math.cos(angle) * 0.45,
    -1.0,
    Math.sin(angle) * 0.45,
  ];

  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * 0.3;
  });

  const getPosition = (): THREE.Vector3 => {
    const t = phase;
    if (t < 1) {
      return new THREE.Vector3(...interphasePos);
    } else if (t < 2) {
      const p = t - 1;
      return new THREE.Vector3(
        THREE.MathUtils.lerp(interphasePos[0], metaphasePos[0], p),
        THREE.MathUtils.lerp(interphasePos[1], metaphasePos[1], p),
        THREE.MathUtils.lerp(interphasePos[2], metaphasePos[2], p),
      );
    } else if (t < 3) {
      return new THREE.Vector3(...metaphasePos);
    } else if (t < 4) {
      const p = t - 3;
      const topPos = anaphasePosTop;
      return new THREE.Vector3(
        THREE.MathUtils.lerp(metaphasePos[0], topPos[0], p),
        THREE.MathUtils.lerp(metaphasePos[1], topPos[1], p),
        THREE.MathUtils.lerp(metaphasePos[2], topPos[2], p),
      );
    } else {
      return new THREE.Vector3(...anaphasePosTop);
    }
  };

  const getSisterPosition = (): THREE.Vector3 | null => {
    if (phase < 3) return null;
    const p = Math.max(0, phase - 3);
    return new THREE.Vector3(
      THREE.MathUtils.lerp(metaphasePos[0], anaphasePosBottom[0], p),
      THREE.MathUtils.lerp(metaphasePos[1], anaphasePosBottom[1], p),
      THREE.MathUtils.lerp(metaphasePos[2], anaphasePosBottom[2], p),
    );
  };

  const pos = getPosition();
  const sisterPos = getSisterPosition();

  const visible = phase < 4;
  const opacity = phase === 4 ? 0 : 1;

  if (!visible && phase === 0) {
    return (
      <group>
        {Array.from({ length: 3 }).map((_, i) => (
          <mesh
            key={i}
            position={[
              interphasePos[0] + (Math.random() - 0.5) * 0.1,
              interphasePos[1] + (Math.random() - 0.5) * 0.1,
              interphasePos[2] + (Math.random() - 0.5) * 0.1,
            ]}
          >
            <sphereGeometry args={[0.04, 6, 6]} />
            <meshStandardMaterial color={color} opacity={0.6} transparent />
          </mesh>
        ))}
      </group>
    );
  }

  return (
    <group ref={ref}>
      <mesh position={pos.toArray()}>
        <capsuleGeometry args={[0.06, 0.18, 4, 8]} />
        <meshStandardMaterial color={color} opacity={opacity} transparent emissive={color} emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[pos.x + 0.1, pos.y, pos.z]}>
        <capsuleGeometry args={[0.06, 0.18, 4, 8]} />
        <meshStandardMaterial color={color} opacity={opacity} transparent emissive={color} emissiveIntensity={0.3} />
      </mesh>
      {sisterPos && (
        <>
          <mesh position={sisterPos.toArray()}>
            <capsuleGeometry args={[0.06, 0.18, 4, 8]} />
            <meshStandardMaterial color={color} opacity={1} transparent emissive={color} emissiveIntensity={0.3} />
          </mesh>
          <mesh position={[sisterPos.x + 0.1, sisterPos.y, sisterPos.z]}>
            <capsuleGeometry args={[0.06, 0.18, 4, 8]} />
            <meshStandardMaterial color={color} opacity={1} transparent emissive={color} emissiveIntensity={0.3} />
          </mesh>
        </>
      )}
    </group>
  );
}

interface SpindleFiberProps {
  phase: number;
  index: number;
  total: number;
}

function SpindleFiber({ phase, index, total }: SpindleFiberProps) {
  const angle = (index / total) * Math.PI * 2;
  const x = Math.cos(angle) * 0.55;
  const z = Math.sin(angle) * 0.55;
  const opacity = Math.max(0, phase - 1) * 0.5;

  const points = useMemo(() => {
    return [
      new THREE.Vector3(x, 1.5, z),
      new THREE.Vector3(x, 0, z),
      new THREE.Vector3(x, -1.5, z),
    ];
  }, [x, z]);

  if (phase < 1.5) return null;

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[new Float32Array(points.flatMap(p => [p.x, p.y, p.z])), 3]}
        />
      </bufferGeometry>
      <lineBasicMaterial color="#7dd3fc" opacity={opacity} transparent />
    </line>
  );
}

interface CellMembraneMeshProps {
  phase: number;
}

function CellMembraneMesh({ phase }: CellMembraneMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!meshRef.current) return;
    if (phase < 4) {
      meshRef.current.scale.set(1, 1, 1);
    } else {
      meshRef.current.scale.set(1, 0.6, 1);
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1.8, 32, 32]} />
      <meshStandardMaterial color="#86efac" opacity={0.08} transparent side={THREE.DoubleSide} wireframe={false} />
    </mesh>
  );
}

interface DaughterCellProps {
  phase: number;
  yOffset: number;
}

function DaughterCell({ phase, yOffset }: DaughterCellProps) {
  const opacity = Math.max(0, phase - 3.5) * 2;
  const scale = Math.max(0, phase - 3.5) * 2;

  return (
    <mesh position={[0, yOffset, 0]} scale={[scale, scale, scale]}>
      <sphereGeometry args={[1.2, 32, 32]} />
      <meshStandardMaterial color="#86efac" opacity={opacity * 0.1} transparent />
    </mesh>
  );
}

interface NucleusProps {
  phase: number;
}

function Nucleus({ phase }: NucleusProps) {
  const opacity = phase < 1 ? 0.3 : Math.max(0, 1 - (phase - 0.5) * 2) * 0.3;

  return (
    <mesh>
      <sphereGeometry args={[0.7, 32, 32]} />
      <meshStandardMaterial color="#a5f3fc" opacity={opacity} transparent />
    </mesh>
  );
}

interface MitosisSceneProps {
  phase: number;
}

function MitosisScene({ phase }: MitosisSceneProps) {
  const NUM_CHROMOSOMES = 8;

  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[5, 5, 5]} intensity={1} color="#ffffff" />
      <pointLight position={[-5, -5, -5]} intensity={0.4} color="#a5f3fc" />

      <CellMembraneMesh phase={phase} />
      <Nucleus phase={phase} />

      {phase >= 3 && (
        <>
          <DaughterCell phase={phase} yOffset={1.2} />
          <DaughterCell phase={phase} yOffset={-1.2} />
        </>
      )}

      {Array.from({ length: NUM_CHROMOSOMES }).map((_, i) => (
        <ChromosomePair key={i} phase={phase} index={i} total={NUM_CHROMOSOMES} />
      ))}

      {Array.from({ length: NUM_CHROMOSOMES }).map((_, i) => (
        <SpindleFiber key={i} phase={phase} index={i} total={NUM_CHROMOSOMES} />
      ))}

      {phase === 0 && (
        <Html position={[0, -2.2, 0]} center>
          <div className="text-green-400 text-xs font-mono bg-gray-900/70 px-2 py-1 rounded">Interphase</div>
        </Html>
      )}

      <OrbitControls enablePan={false} minDistance={3} maxDistance={12} />
    </>
  );
}

const SCENARIOS = [
  {
    id: 'prophase_telophase',
    label: 'Mitosis Cycle',
    description: 'Full mitosis from interphase to telophase',
  },
];

export default function Mitosis() {
  const [phase, setPhase] = useState(0);
  const [scenario, setScenario] = useState('prophase_telophase');

  const phaseIndex = Math.round(phase);
  const phaseName = PHASE_NAMES[phaseIndex];
  const cellCount = phaseIndex >= 4 ? 2 : 1;
  const chromosomeCount = 46;

  return (
    <div className="w-full h-full flex overflow-hidden">
      <div className="flex-1">
        <Canvas style={{ background: '#030712' }} camera={{ position: [0, 0, 6], fov: 50 }}>
          <MitosisScene phase={phase} />
        </Canvas>
      </div>

      <div className="w-72 bg-gray-950 border-l border-gray-800 overflow-y-auto scrollbar-thin p-3 space-y-4">
        <ScenarioSelect
          label="Scenario"
          scenarios={SCENARIOS}
          value={scenario}
          onChange={(v) => {
            setScenario(v);
          }}
          color="#86efac"
        />

        <ControlSlider
          label="Mitosis Phase"
          value={phase}
          min={0}
          max={4}
          step={1}
          color="#86efac"
          onChange={setPhase}
          precision={0}
          formatValue={(v) => PHASE_NAMES[Math.round(v)]}
        />

        <DataOverlay
          equation={{ text: 'G1 → S → G2 → M Phase', color: '#86efac' }}
          readouts={[
            { label: 'Current Phase', value: phaseName, color: '#86efac', highlight: true },
            { label: 'Chromosome Count', value: `${chromosomeCount}`, color: '#c084fc' },
            { label: 'Cell Count', value: `${cellCount}`, color: '#38bdf8' },
            { label: 'Description', value: PHASE_DESCRIPTIONS[phaseIndex], color: '#94a3b8' },
          ]}
        />

        <div className="bg-gray-900 rounded-lg p-3 border border-gray-800">
          <p className="text-xs font-semibold text-green-400 mb-1">Insight</p>
          <p className="text-xs text-gray-400 leading-relaxed">
            Mitosis produces two genetically identical daughter cells each with 46 chromosomes. Unlike meiosis, chromosome number is preserved. The spindle checkpoint ensures chromosomes are properly attached before anaphase proceeds, preventing aneuploidy.
          </p>
        </div>
      </div>
    </div>
  );
}
