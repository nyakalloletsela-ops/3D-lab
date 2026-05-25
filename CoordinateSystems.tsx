import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import ControlSlider from '../../components/ControlSlider';
import ScenarioSelect from '../../components/ScenarioSelect';
import DataOverlay from '../../components/DataOverlay';

// ── coordinate conversions ────────────────────────────────────────────────────
function toSpherical(x: number, y: number, z: number) {
  const r = Math.sqrt(x * x + y * y + z * z);
  const theta = (Math.atan2(y, x) * 180) / Math.PI;
  const phi = r < 1e-9 ? 0 : (Math.acos(Math.max(-1, Math.min(1, z / r))) * 180) / Math.PI;
  return { r, theta, phi };
}

function toCylindrical(x: number, y: number, z: number) {
  const r = Math.sqrt(x * x + y * y);
  const theta = (Math.atan2(y, x) * 180) / Math.PI;
  return { r, theta, z };
}

// ── arc helper ────────────────────────────────────────────────────────────────
function makeArc(
  startAngleRad: number,
  endAngleRad: number,
  radius: number,
  plane: 'xy' | 'xz',
  steps = 48
): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = startAngleRad + ((endAngleRad - startAngleRad) * i) / steps;
    if (plane === 'xy') {
      pts.push(new THREE.Vector3(radius * Math.cos(a), radius * Math.sin(a), 0));
    } else {
      // xz plane arc (polar angle from z-axis, drawn in the xz plane rotated toward y)
      pts.push(new THREE.Vector3(radius * Math.sin(a), 0, radius * Math.cos(a)));
    }
  }
  return pts;
}

// ── axis lines + labels ────────────────────────────────────────────────────────
function Axes() {
  return (
    <group>
      <Line points={[[-4, 0, 0], [4, 0, 0]]} color="#1e293b" lineWidth={1.5} />
      <Line points={[[0, -4, 0], [0, 4, 0]]} color="#1e293b" lineWidth={1.5} />
      <Line points={[[0, 0, -4], [0, 0, 4]]} color="#1e293b" lineWidth={1.5} />
      <Html position={[4.3, 0, 0]}>
        <span style={{ color: '#f43f5e', fontSize: 13, fontWeight: 700, pointerEvents: 'none', textShadow: '0 0 8px #000' }}>X</span>
      </Html>
      <Html position={[0, 4.3, 0]}>
        <span style={{ color: '#34d399', fontSize: 13, fontWeight: 700, pointerEvents: 'none', textShadow: '0 0 8px #000' }}>Y</span>
      </Html>
      <Html position={[0, 0, 4.3]}>
        <span style={{ color: '#60a5fa', fontSize: 13, fontWeight: 700, pointerEvents: 'none', textShadow: '0 0 8px #000' }}>Z</span>
      </Html>
    </group>
  );
}

// ── cartesian drop lines ───────────────────────────────────────────────────────
function CartesianLines({ x, y, z }: { x: number; y: number; z: number }) {
  return (
    <group>
      {/* drop to XY plane (down to z=0) */}
      <Line
        points={[new THREE.Vector3(x, y, z), new THREE.Vector3(x, y, 0)]}
        color="#60a5fa"
        lineWidth={1.5}
        dashed
        dashSize={0.12}
        gapSize={0.08}
      />
      {/* projection on XY plane to x-axis */}
      <Line
        points={[new THREE.Vector3(x, y, 0), new THREE.Vector3(x, 0, 0)]}
        color="#f43f5e"
        lineWidth={1.5}
        dashed
        dashSize={0.12}
        gapSize={0.08}
      />
      {/* projection on XY plane to y-axis */}
      <Line
        points={[new THREE.Vector3(x, y, 0), new THREE.Vector3(0, y, 0)]}
        color="#34d399"
        lineWidth={1.5}
        dashed
        dashSize={0.12}
        gapSize={0.08}
      />
    </group>
  );
}

// ── spherical overlays ─────────────────────────────────────────────────────────
function SphericalLines({ x, y, z }: { x: number; y: number; z: number }) {
  const { r, theta, phi } = toSpherical(x, y, z);
  if (r < 0.05) return null;

  const thetaRad = (theta * Math.PI) / 180;
  const phiRad = (phi * Math.PI) / 180;

  // radial line from origin to point
  const radialPts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(x, y, z)];

  // azimuthal arc (θ) in XY plane from x-axis to projection of point
  const rCyl = Math.sqrt(x * x + y * y);
  const thetaArcPts = rCyl > 0.05 ? makeArc(0, thetaRad, rCyl * 0.5, 'xy') : [];

  // polar arc (φ) in plane of point — from z-axis down to radius r
  // rotate the xz-arc around z by thetaRad
  const phiArcPtsRaw = r > 0.05 ? makeArc(0, phiRad, r * 0.45, 'xz') : [];
  const phiArcPts = phiArcPtsRaw.map(p => {
    return new THREE.Vector3(
      p.x * Math.cos(thetaRad) - p.y * Math.sin(thetaRad),
      p.x * Math.sin(thetaRad) + p.y * Math.cos(thetaRad),
      p.z
    );
  });

  return (
    <group>
      {/* radial line */}
      <Line points={radialPts} color="#fbbf24" lineWidth={2.5} />
      {/* azimuthal arc θ */}
      {thetaArcPts.length >= 2 && (
        <Line points={thetaArcPts} color="#a78bfa" lineWidth={1.8} />
      )}
      {/* polar arc φ */}
      {phiArcPts.length >= 2 && (
        <Line points={phiArcPts} color="#f472b6" lineWidth={1.8} dashed dashSize={0.1} gapSize={0.06} />
      )}
      {/* r label */}
      <Html position={[x * 0.55, y * 0.55, z * 0.55]}>
        <span style={{ color: '#fbbf24', fontSize: 11, fontWeight: 700, pointerEvents: 'none', textShadow: '0 0 6px #000' }}>r</span>
      </Html>
    </group>
  );
}

// ── cylindrical overlays ───────────────────────────────────────────────────────
function CylindricalLines({ x, y, z }: { x: number; y: number; z: number }) {
  const { r: rCyl, theta } = toCylindrical(x, y, z);
  const thetaRad = (theta * Math.PI) / 180;

  return (
    <group>
      {/* horizontal line from origin to (x,y,0) */}
      <Line
        points={[new THREE.Vector3(0, 0, 0), new THREE.Vector3(x, y, 0)]}
        color="#34d399"
        lineWidth={2.5}
      />
      {/* vertical line from (x,y,0) to (x,y,z) */}
      {Math.abs(z) > 0.02 && (
        <Line
          points={[new THREE.Vector3(x, y, 0), new THREE.Vector3(x, y, z)]}
          color="#60a5fa"
          lineWidth={2}
          dashed
          dashSize={0.12}
          gapSize={0.08}
        />
      )}
      {/* θ arc in XY plane */}
      {rCyl > 0.05 && (
        <Line
          points={makeArc(0, thetaRad, rCyl * 0.45, 'xy')}
          color="#a78bfa"
          lineWidth={1.8}
        />
      )}
      {/* r label */}
      <Html position={[x * 0.6, y * 0.6, 0.1]}>
        <span style={{ color: '#34d399', fontSize: 11, fontWeight: 700, pointerEvents: 'none', textShadow: '0 0 6px #000' }}>r</span>
      </Html>
    </group>
  );
}

// ── main 3D scene ──────────────────────────────────────────────────────────────
function CoordScene({
  x, y, z, scenario,
}: {
  x: number; y: number; z: number;
  scenario: 'cartesian' | 'spherical' | 'cylindrical';
}) {
  return (
    <group>
      <Axes />

      {scenario === 'cartesian' && <CartesianLines x={x} y={y} z={z} />}
      {scenario === 'spherical' && <SphericalLines x={x} y={y} z={z} />}
      {scenario === 'cylindrical' && <CylindricalLines x={x} y={y} z={z} />}

      {/* glowing point */}
      <mesh position={[x, y, z]}>
        <sphereGeometry args={[0.12, 20, 20]} />
        <meshStandardMaterial
          color="#fbbf24"
          emissive="#fbbf24"
          emissiveIntensity={1.2}
        />
      </mesh>
      {/* glow halo */}
      <mesh position={[x, y, z]}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial color="#fbbf24" transparent opacity={0.15} />
      </mesh>

      {/* point label */}
      <Html position={[x + 0.22, y + 0.22, z + 0.1]}>
        <span style={{ color: '#fbbf24', fontSize: 11, fontWeight: 700, pointerEvents: 'none', textShadow: '0 0 8px #000' }}>
          P
        </span>
      </Html>
    </group>
  );
}

// ── scenarios ─────────────────────────────────────────────────────────────────
type ScenarioId = 'cartesian' | 'spherical' | 'cylindrical';

const SCENARIOS: { id: ScenarioId; label: string; description: string }[] = [
  { id: 'cartesian',   label: 'Cartesian',   description: 'Show drop lines to each axis plane' },
  { id: 'spherical',   label: 'Spherical',   description: 'Show r, θ (azimuthal), φ (polar) angles' },
  { id: 'cylindrical', label: 'Cylindrical', description: 'Show r, θ, z components' },
];

// ── root component ─────────────────────────────────────────────────────────────
import { useState } from 'react';

export default function CoordinateSystems() {
  const [x, setX] = useState(1.5);
  const [y, setY] = useState(1.0);
  const [z, setZ] = useState(1.2);
  const [scenario, setScenario] = useState<ScenarioId>('cartesian');

  const sph = useMemo(() => toSpherical(x, y, z), [x, y, z]);
  const cyl = useMemo(() => toCylindrical(x, y, z), [x, y, z]);

  const equationMap: Record<ScenarioId, string> = {
    cartesian:   'P = (x, y, z)',
    spherical:   'P = (r, θ, φ)  φ = polar from +z',
    cylindrical: 'P = (r, θ, z)',
  };

  return (
    <div className="w-full h-full flex overflow-hidden">
      <div className="flex-1 relative min-w-0">
        <Canvas
          camera={{ position: [5, 4, 6], fov: 45 }}
          style={{ background: '#030712' }}
        >
          <ambientLight intensity={0.5} />
          <pointLight position={[5, 6, 5]} intensity={1.2} />
          <CoordScene x={x} y={y} z={z} scenario={scenario} />
          <OrbitControls enablePan={false} minDistance={3} maxDistance={16} />
          <gridHelper args={[8, 8, '#0f172a', '#0f172a']} position={[0, 0, 0]} />
        </Canvas>
      </div>

      <div className="w-72 flex-shrink-0 bg-gray-950 border-l border-gray-800 overflow-y-auto scrollbar-thin">
        <div className="p-3 space-y-4">

          <ScenarioSelect
            label="Coordinate System"
            scenarios={SCENARIOS}
            value={scenario}
            onChange={setScenario}
            color="amber"
          />

          <div>
            <p className="text-[10px] text-gray-600 font-semibold uppercase tracking-wider mb-2">Point Position</p>
            <div className="space-y-3">
              <ControlSlider
                label="x"
                value={x}
                min={-3}
                max={3}
                step={0.05}
                color="#f43f5e"
                onChange={setX}
                precision={2}
              />
              <ControlSlider
                label="y"
                value={y}
                min={-3}
                max={3}
                step={0.05}
                color="#34d399"
                onChange={setY}
                precision={2}
              />
              <ControlSlider
                label="z"
                value={z}
                min={-3}
                max={3}
                step={0.05}
                color="#60a5fa"
                onChange={setZ}
                precision={2}
              />
            </div>
          </div>

          <DataOverlay
            equation={{ text: equationMap[scenario], color: '#fbbf24' }}
            readouts={[
              { label: 'Cartesian x', value: x.toFixed(3), color: '#f43f5e', highlight: scenario === 'cartesian' },
              { label: 'Cartesian y', value: y.toFixed(3), color: '#34d399', highlight: scenario === 'cartesian' },
              { label: 'Cartesian z', value: z.toFixed(3), color: '#60a5fa', highlight: scenario === 'cartesian' },
              { label: 'Spherical r', value: sph.r.toFixed(3), color: '#fbbf24', highlight: scenario === 'spherical' },
              { label: 'Spherical θ', value: `${sph.theta.toFixed(1)}°`, color: '#a78bfa', highlight: scenario === 'spherical' },
              { label: 'Spherical φ', value: `${sph.phi.toFixed(1)}°`, color: '#f472b6', highlight: scenario === 'spherical' },
              { label: 'Cylindrical r', value: cyl.r.toFixed(3), color: '#34d399', highlight: scenario === 'cylindrical' },
              { label: 'Cylindrical θ', value: `${cyl.theta.toFixed(1)}°`, color: '#a78bfa', highlight: scenario === 'cylindrical' },
              { label: 'Cylindrical z', value: cyl.z.toFixed(3), color: '#60a5fa', highlight: scenario === 'cylindrical' },
            ]}
          />

          {/* Conversion formulas reference */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-3 space-y-1.5">
            <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-1">Conversion Formulas</p>
            {scenario === 'cartesian' && (
              <div className="font-mono text-[10px] text-gray-400 space-y-0.5">
                <p><span className="text-rose-400">x</span> = r·sin(φ)·cos(θ)</p>
                <p><span className="text-emerald-400">y</span> = r·sin(φ)·sin(θ)</p>
                <p><span className="text-blue-400">z</span> = r·cos(φ)</p>
              </div>
            )}
            {scenario === 'spherical' && (
              <div className="font-mono text-[10px] text-gray-400 space-y-0.5">
                <p><span className="text-yellow-400">r</span> = √(x²+y²+z²) = <span className="text-white">{sph.r.toFixed(3)}</span></p>
                <p><span className="text-purple-400">θ</span> = atan2(y,x) = <span className="text-white">{sph.theta.toFixed(1)}°</span></p>
                <p><span className="text-pink-400">φ</span> = acos(z/r) = <span className="text-white">{sph.phi.toFixed(1)}°</span></p>
              </div>
            )}
            {scenario === 'cylindrical' && (
              <div className="font-mono text-[10px] text-gray-400 space-y-0.5">
                <p><span className="text-emerald-400">r</span> = √(x²+y²) = <span className="text-white">{cyl.r.toFixed(3)}</span></p>
                <p><span className="text-purple-400">θ</span> = atan2(y,x) = <span className="text-white">{cyl.theta.toFixed(1)}°</span></p>
                <p><span className="text-blue-400">z</span> = z = <span className="text-white">{cyl.z.toFixed(3)}</span></p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
