import { useRef, useState, useCallback, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import ControlSlider from '../../components/ControlSlider';
import ScenarioSelect from '../../components/ScenarioSelect';
import DataOverlay from '../../components/DataOverlay';

function buildBoxEdges(w: number, h: number, d: number): [number, number, number][] {
  const hw = w / 2, hh = h / 2, hd = d / 2;
  const corners: [number, number, number][] = [
    [-hw, -hh, -hd], [hw, -hh, -hd], [hw, hh, -hd], [-hw, hh, -hd],
    [-hw, -hh, hd], [hw, -hh, hd], [hw, hh, hd], [-hw, hh, hd],
  ];
  return [
    corners[0], corners[1], corners[1], corners[2], corners[2], corners[3], corners[3], corners[0],
    corners[4], corners[5], corners[5], corners[6], corners[6], corners[7], corners[7], corners[4],
    corners[0], corners[4], corners[1], corners[5], corners[2], corners[6], corners[3], corners[7],
  ];
}

function buildCirclePath(radius: number, segments = 64): [number, number, number][] {
  return Array.from({ length: segments + 1 }, (_, i) => {
    const theta = (i / segments) * Math.PI * 2;
    return [radius * Math.cos(theta), 0, radius * Math.sin(theta)] as [number, number, number];
  });
}

interface SceneProps {
  bField: number;
  velocity: number;
  chargeType: string;
}

function LorentzScene({ bField, velocity, chargeType }: SceneProps) {
  const angleRef = useRef(0);
  const particleRef = useRef<THREE.Mesh>(null);
  const velArrowRef = useRef<THREE.ArrowHelper>(null);
  const forceArrowRef = useRef<THREE.ArrowHelper>(null);

  const isElectron = chargeType === 'electron';
  const r_display = Math.min(4, Math.max(0.5, (velocity / bField) * 2));
  const omega = velocity / r_display;

  const particleColor = isElectron ? '#ef4444' : '#60a5fa';

  const boxEdges = useMemo(() => buildBoxEdges(8, 8, 4), []);
  const circlePath = useMemo(() => buildCirclePath(r_display), [r_display]);

  const bArrowPositions = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let xi = -1; xi <= 1; xi++) {
      for (let zi = -1; zi <= 1; zi++) {
        pts.push([xi * 2.5, 0, zi * 1.2]);
      }
    }
    return pts;
  }, []);

  useFrame((state, delta) => {
    angleRef.current += omega * delta;
    const theta = angleRef.current;
    const px = r_display * Math.cos(theta);
    const pz = r_display * Math.sin(theta);

    if (particleRef.current) {
      particleRef.current.position.set(px, 0, pz);
    }

    if (velArrowRef.current) {
      const vx = -Math.sin(theta);
      const vz = Math.cos(theta);
      velArrowRef.current.position.set(px, 0, pz);
      velArrowRef.current.setDirection(new THREE.Vector3(vx, 0, vz).normalize());
    }

    if (forceArrowRef.current) {
      const fx = -Math.cos(theta);
      const fz = -Math.sin(theta);
      forceArrowRef.current.position.set(px, 0, pz);
      forceArrowRef.current.setDirection(new THREE.Vector3(fx, 0, fz).normalize());
    }
  });

  const velArrow = useMemo(() => {
    const dir = new THREE.Vector3(0, 0, 1);
    const origin = new THREE.Vector3(r_display, 0, 0);
    const arrow = new THREE.ArrowHelper(dir, origin, 1.0, 0x22c55e, 0.3, 0.2);
    return arrow;
  }, [r_display]);

  const forceArrow = useMemo(() => {
    const dir = new THREE.Vector3(-1, 0, 0);
    const origin = new THREE.Vector3(r_display, 0, 0);
    const arrow = new THREE.ArrowHelper(dir, origin, 0.8, 0xef4444, 0.3, 0.2);
    return arrow;
  }, [r_display]);

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[0, 6, 6]} intensity={2} />

      <Line points={boxEdges} color="#3b82f6" lineWidth={1} segments />

      {bArrowPositions.map((pos, i) => (
        <group key={i} position={pos}>
          <mesh>
            <cylinderGeometry args={[0.03, 0.03, 1.5, 8]} />
            <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.5} />
          </mesh>
          <mesh position={[0, 0.9, 0]}>
            <coneGeometry args={[0.1, 0.3, 8]} />
            <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.5} />
          </mesh>
        </group>
      ))}

      <Line points={circlePath} color={particleColor} lineWidth={1.5} transparent opacity={0.4} />

      <mesh ref={particleRef} position={[r_display, 0, 0]}>
        <sphereGeometry args={[0.22, 32, 32]} />
        <meshStandardMaterial
          color={particleColor}
          emissive={particleColor}
          emissiveIntensity={3}
          toneMapped={false}
        />
      </mesh>

      <primitive object={velArrow} ref={velArrowRef} />
      <primitive object={forceArrow} ref={forceArrowRef} />

      <Html position={[0, 4.8, 0]} center style={{ pointerEvents: 'none' }}>
        <div style={{
          background: 'rgba(3,7,18,0.85)',
          border: '1px solid #3b82f6',
          borderRadius: 6,
          padding: '4px 10px',
          fontSize: 12,
          color: '#93c5fd',
          fontFamily: 'monospace',
          whiteSpace: 'nowrap',
        }}>
          <span style={{ color: '#22c55e' }}>v</span>
          {' × '}
          <span style={{ color: '#3b82f6' }}>B</span>
          {' = '}
          <span style={{ color: '#ef4444' }}>F</span>
          {' (right-hand rule)'}
        </div>
      </Html>

      <OrbitControls enableDamping dampingFactor={0.1} />
    </>
  );
}

const scenarios = [
  { id: 'electron', label: 'Electron', description: 'Electron (m=9.1e-31 kg, q=−1.6e-19 C)' },
  { id: 'proton', label: 'Proton', description: 'Proton (m=1.67e-27 kg, q=+1.6e-19 C)' },
];

export default function LorentzForce() {
  const [bField, setBField] = useState(2.0);
  const [velocity, setVelocity] = useState(5.0);
  const [chargeType, setChargeType] = useState('electron');
  const [scenario, setScenario] = useState('electron');

  const handleScenario = useCallback((id: string) => {
    setScenario(id);
    setChargeType(id);
  }, []);

  const isElectron = chargeType === 'electron';
  const mass = isElectron ? 9.1e-31 : 1.67e-27;
  const charge = 1.6e-19;

  const r_display = Math.min(4, Math.max(0.5, (velocity / bField) * 2));
  const forceMag = charge * velocity * bField;
  const cyclotronFreq = charge * bField / (2 * Math.PI * mass);
  const period = 1 / cyclotronFreq;

  const equation = { text: 'F = q(v × B)', color: '#60a5fa' };
  const readouts = [
    { label: 'Force', value: `${(forceMag * 1e19).toFixed(3)} ×10⁻¹⁹ N`, color: '#ef4444' },
    { label: 'Orbit radius', value: `${r_display.toFixed(2)} (norm.)`, color: '#22d3ee' },
    { label: 'Cyclotron freq', value: isElectron ? `${(cyclotronFreq / 1e9).toFixed(2)} GHz` : `${(cyclotronFreq / 1e6).toFixed(2)} MHz`, color: '#a78bfa' },
    { label: 'Period', value: isElectron ? `${(period * 1e9).toFixed(3)} ns` : `${(period * 1e6).toFixed(3)} μs`, color: '#34d399' },
    { label: 'Particle', value: isElectron ? 'Electron (−)' : 'Proton (+)', color: isElectron ? '#ef4444' : '#60a5fa', highlight: true },
  ];

  return (
    <div className="w-full h-full flex overflow-hidden">
      <div className="flex-1">
        <Canvas
          camera={{ position: [0, 6, 10], fov: 55 }}
          style={{ background: '#030712' }}
        >
          <LorentzScene bField={bField} velocity={velocity} chargeType={chargeType} />
        </Canvas>
      </div>

      <div className="w-72 bg-gray-950 border-l border-gray-800 overflow-y-auto scrollbar-thin">
        <div className="p-3 space-y-4">
          <ScenarioSelect
            label="Particle Type"
            scenarios={scenarios}
            value={scenario}
            onChange={handleScenario}
            color="#60a5fa"
          />

          <ControlSlider
            label="Magnetic Field B"
            value={bField}
            min={0.5}
            max={5}
            step={0.1}
            color="#3b82f6"
            onChange={setBField}
            precision={1}
            formatValue={(v) => `${v.toFixed(1)} T`}
          />

          <ControlSlider
            label="Velocity"
            value={velocity}
            min={1}
            max={10}
            step={0.1}
            color="#22c55e"
            onChange={setVelocity}
            precision={1}
            formatValue={(v) => `${v.toFixed(1)} (norm.)`}
          />

          <DataOverlay equation={equation} readouts={readouts} />

          <div className="bg-gray-900 rounded-lg p-3 border border-gray-800">
            <div className="text-xs font-semibold text-blue-400 mb-2">Cyclotrons</div>
            <p className="text-xs text-gray-400 leading-relaxed">
              The Lorentz force F = qv × B acts perpendicular to both velocity and magnetic field,
              causing charged particles to orbit in circles. This principle powers cyclotrons and
              synchrotrons — particle accelerators that use alternating electric fields to boost
              particles while a magnetic field keeps them curving inward. The cyclotron frequency
              depends only on charge, mass, and field strength — not on speed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
