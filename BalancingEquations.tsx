import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import { useState } from 'react';

interface Molecule {
  formula: string;
  atoms: Record<string, number>;
  color: string;
}

const MOLECULES: Molecule[] = [
  { formula: 'H₂', atoms: { H: 2 }, color: '#60a5fa' },
  { formula: 'O₂', atoms: { O: 2 }, color: '#f87171' },
  { formula: 'H₂O', atoms: { H: 2, O: 1 }, color: '#34d399' },
];

function MoleculeBlock({ molecule, count, x, isRight }: { molecule: Molecule; count: number; x: number; isRight: boolean }) {
  return (
    <group position={[x, 0, 0]}>
      {Array.from({ length: count }).map((_, i) => (
        <group key={i} position={[0, i * 1.2 - (count - 1) * 0.6, 0]}>
          <mesh>
            <boxGeometry args={[1.2, 1, 0.4]} />
            <meshStandardMaterial color={molecule.color} transparent opacity={0.8} />
          </mesh>
          <Text position={[0, 0, 0.25]} fontSize={0.32} color="#fff" anchorX="center">
            {molecule.formula}
          </Text>
        </group>
      ))}
    </group>
  );
}

function countAtoms(molecules: Molecule[], counts: number[]): Record<string, number> {
  const total: Record<string, number> = {};
  molecules.forEach((m, i) => {
    Object.entries(m.atoms).forEach(([el, n]) => {
      total[el] = (total[el] || 0) + n * counts[i];
    });
  });
  return total;
}

export default function BalancingEquations() {
  // 2H₂ + O₂ → 2H₂O
  const [left, setLeft] = useState([1, 1]); // H₂, O₂
  const [right, setRight] = useState([1]); // H₂O

  const leftAtoms = countAtoms([MOLECULES[0], MOLECULES[1]], left);
  const rightAtoms = countAtoms([MOLECULES[2]], right);

  const balanced = JSON.stringify(leftAtoms) === JSON.stringify(rightAtoms);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1">
        <Canvas camera={{ position: [0, 0, 9], fov: 45 }}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 5, 5]} intensity={1} />

          {/* Left side */}
          <MoleculeBlock molecule={MOLECULES[0]} count={left[0]} x={-3.5} isRight={false} />
          <Text position={[-2.3, 0, 0]} fontSize={0.5} color="#64748b" anchorX="center">+</Text>
          <MoleculeBlock molecule={MOLECULES[1]} count={left[1]} x={-1} isRight={false} />

          {/* Arrow */}
          <Text position={[0.5, 0, 0]} fontSize={0.5} color="#94a3b8" anchorX="center">→</Text>

          {/* Right side */}
          <MoleculeBlock molecule={MOLECULES[2]} count={right[0]} x={2.5} isRight={true} />

          {/* Balance status */}
          <Text position={[0, 2.5, 0]} fontSize={0.35} color={balanced ? '#34d399' : '#f43f5e'} anchorX="center">
            {balanced ? 'BALANCED!' : 'Not balanced yet...'}
          </Text>

          {/* Atom counts */}
          <Text position={[-1.5, -2.2, 0]} fontSize={0.22} color="#94a3b8" anchorX="center">
            {`Left: H=${leftAtoms.H || 0} O=${leftAtoms.O || 0}`}
          </Text>
          <Text position={[1.5, -2.2, 0]} fontSize={0.22} color="#94a3b8" anchorX="center">
            {`Right: H=${rightAtoms.H || 0} O=${rightAtoms.O || 0}`}
          </Text>

          <OrbitControls enablePan={false} />
        </Canvas>
      </div>
      <div className="bg-gray-900 border-t border-gray-800 p-4 grid grid-cols-3 gap-4">
        <div>
          <label className="text-xs text-blue-400 mb-1 block">H₂ molecules: {left[0]}</label>
          <input type="range" min={1} max={4} value={left[0]} onChange={e => setLeft([+e.target.value, left[1]])} className="w-full accent-blue-400" />
        </div>
        <div>
          <label className="text-xs text-red-400 mb-1 block">O₂ molecules: {left[1]}</label>
          <input type="range" min={1} max={4} value={left[1]} onChange={e => setLeft([left[0], +e.target.value])} className="w-full accent-red-400" />
        </div>
        <div>
          <label className="text-xs text-emerald-400 mb-1 block">H₂O molecules: {right[0]}</label>
          <input type="range" min={1} max={4} value={right[0]} onChange={e => setRight([+e.target.value])} className="w-full accent-emerald-400" />
        </div>
      </div>
    </div>
  );
}
