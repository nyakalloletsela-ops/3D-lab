import { useState } from 'react';
import { BookOpen, Zap } from 'lucide-react';
import Sidebar from './components/Sidebar';
import ModuleCanvas from './components/ModuleCanvas';
import TheoryPanel from './components/TheoryPanel';
import WelcomeScreen from './components/WelcomeScreen';
import type { Module, Category } from './types';
import { MODULES } from './types';

export default function App() {
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [showTheory, setShowTheory] = useState(false);

  const handleSelectModule = (mod: Module) => {
    setSelectedModule(mod);
    setShowTheory(false);
  };

  const handleSelectCategory = (cat: Category) => {
    const first = MODULES.find(m => m.category === cat);
    if (first) handleSelectModule(first);
  };

  const diffColor: Record<string, string> = {
    beginner: 'text-emerald-400 bg-emerald-500/10',
    intermediate: 'text-amber-400 bg-amber-500/10',
    advanced: 'text-rose-400 bg-rose-500/10',
  };

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden font-sans">
      <Sidebar selectedModule={selectedModule} onSelectModule={handleSelectModule} />

      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <header className="bg-gray-950/95 border-b border-gray-800/80 px-4 py-2.5 flex items-center justify-between flex-shrink-0 gap-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {selectedModule ? (
              <>
                <span className="text-[10px] text-gray-700 font-mono flex-shrink-0">#{selectedModule.id}</span>
                <h2 className="text-sm font-semibold text-white truncate">{selectedModule.name}</h2>
                <span className="text-gray-800 flex-shrink-0">•</span>
                <span className="text-xs text-gray-600 flex-shrink-0">{selectedModule.category}</span>
                {selectedModule.difficulty && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0 ${diffColor[selectedModule.difficulty]}`}>
                    {selectedModule.difficulty}
                  </span>
                )}
                {selectedModule.enhanced && (
                  <span className="flex items-center gap-0.5 text-[10px] text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 rounded-full font-bold flex-shrink-0">
                    <Zap size={9} />
                    LIVE
                  </span>
                )}
              </>
            ) : (
              <h2 className="text-sm font-semibold text-gray-400">Lordda 3D Discovery Lab</h2>
            )}
          </div>

          {selectedModule && (
            <button
              onClick={() => setShowTheory(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors flex-shrink-0 ${
                showTheory
                  ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                  : 'border-gray-800 text-gray-500 hover:text-gray-200 hover:bg-gray-800 hover:border-gray-700'
              }`}
            >
              <BookOpen size={12} />
              Theory
            </button>
          )}
        </header>

        {/* Canvas / module area — full height, no internal padding */}
        <div className="flex-1 relative overflow-hidden">
          {selectedModule ? (
            <>
              <div className="w-full h-full">
                <ModuleCanvas module={selectedModule} />
              </div>
              {showTheory && (
                <TheoryPanel module={selectedModule} onClose={() => setShowTheory(false)} />
              )}
            </>
          ) : (
            <WelcomeScreen onSelectCategory={handleSelectCategory} />
          )}
        </div>
      </main>
    </div>
  );
}
