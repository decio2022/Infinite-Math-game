
import React, { useState, useEffect, useRef } from 'react';
import { GameState, GameSettings } from './types';
import { generateProblem } from './services/mathService';
import { getMathHint, getEncouragement } from './services/geminiService';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(() => {
    const saved = localStorage.getItem('math_zen_progress');
    const initial = saved ? JSON.parse(saved) : null;
    return {
      score: initial?.score || 0,
      level: initial?.level || 1,
      bestLevel: initial?.bestLevel || 1,
      currentProblem: null,
      status: 'IDLE',
      settings: initial?.settings || {
        allowLinear: true,
        allowQuadratic: true
      },
    };
  });

  const [userInput, setUserInput] = useState('');
  const [jumpLevelInput, setJumpLevelInput] = useState('');
  const [hint, setHint] = useState<string | null>(null);
  const [loadingHint, setLoadingHint] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [resetClicks, setResetClicks] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Persistence logic
  useEffect(() => {
    localStorage.setItem('math_zen_progress', JSON.stringify({
      score: gameState.score,
      level: gameState.level,
      bestLevel: gameState.bestLevel,
      settings: gameState.settings
    }));
  }, [gameState.score, gameState.level, gameState.bestLevel, gameState.settings]);

  // Initialize fresh problem on load or level change
  useEffect(() => {
    if (!gameState.currentProblem) {
      const freshProblem = generateProblem(gameState.level, gameState.settings);
      setGameState(prev => ({ ...prev, currentProblem: freshProblem, status: 'PLAYING' }));
    }
  }, [gameState.currentProblem, gameState.level, gameState.settings]);

  // Focus input automatically
  useEffect(() => {
    if (gameState.status === 'PLAYING') {
      inputRef.current?.focus();
    }
  }, [gameState.status, gameState.currentProblem]);

  const handleCheckAnswer = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!gameState.currentProblem || userInput.trim() === '') return;

    const numericAnswer = parseFloat(userInput);
    if (numericAnswer === gameState.currentProblem.answer) {
      const nextLevel = gameState.level + 1;
      const newBest = Math.max(gameState.bestLevel, nextLevel);
      
      setGameState(prev => ({
        ...prev,
        score: prev.score + Math.floor(prev.level / 5) + 10,
        level: nextLevel,
        bestLevel: newBest,
        status: 'CORRECT'
      }));

      if (nextLevel % 10 === 0) {
        getEncouragement(nextLevel).then(setMessage);
      }

      setTimeout(() => {
        setGameState(prev => ({
          ...prev,
          currentProblem: generateProblem(prev.level, prev.settings),
          status: 'PLAYING'
        }));
        setUserInput('');
        setHint(null);
        if (nextLevel % 10 !== 0) setMessage(null);
      }, 500);
    } else {
      setGameState(prev => ({
        ...prev,
        status: 'WRONG'
      }));
      setTimeout(() => {
        setGameState(prev => ({ ...prev, status: 'PLAYING' }));
      }, 600);
    }
  };

  const handleJumpToLevel = (e: React.FormEvent) => {
    e.preventDefault();
    const targetLevel = parseInt(jumpLevelInput);
    if (isNaN(targetLevel) || targetLevel < 1) return;

    setGameState(prev => ({
      ...prev,
      level: targetLevel,
      currentProblem: null, // Force regeneration
      status: 'IDLE'
    }));
    setJumpLevelInput('');
    setShowSettings(false);
  };

  const handleHintRequest = async () => {
    if (!gameState.currentProblem || loadingHint) return;
    setLoadingHint(true);
    const hintText = await getMathHint(gameState.currentProblem.question);
    setHint(hintText);
    setLoadingHint(false);
  };

  const handleResetProgress = () => {
    const newCount = resetClicks + 1;
    if (newCount >= 10) {
      localStorage.removeItem('math_zen_progress');
      window.location.reload();
    } else {
      setResetClicks(newCount);
      setTimeout(() => setResetClicks(0), 2000);
    }
  };

  const toggleSetting = (key: keyof GameSettings) => {
    setGameState(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [key]: !prev.settings[key]
      },
      currentProblem: null // Refresh problem when settings change
    }));
  };

  const getStatusColor = () => {
    switch (gameState.status) {
      case 'CORRECT': return 'border-emerald-500 bg-emerald-500/10 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)]';
      case 'WRONG': return 'border-rose-500 bg-rose-500/10 text-rose-400 shadow-[0_0_30px_rgba(244,63,94,0.3)]';
      default: return 'border-slate-700 bg-slate-800/50 text-slate-100';
    }
  };

  const isRegression = gameState.currentProblem && gameState.currentProblem.level < Math.floor(gameState.level * 0.8) && gameState.level > 10;

  return (
    <div className="min-h-screen flex flex-col items-center justify-between p-4 md:p-8 bg-[#0a0f1d]">
      {/* Header / Stats */}
      <header className="w-full max-w-4xl flex flex-wrap items-center justify-between gap-4 glass p-6 rounded-3xl shadow-2xl relative">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-indigo-500/20">
            <i className="fas fa-infinity text-white"></i>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Math <span className="text-indigo-400">Zen</span></h1>
            <p className="text-xs text-slate-400 font-medium tracking-widest uppercase">Endless Journey</p>
          </div>
        </div>

        <div className="flex gap-4 items-center">
          <div className="flex gap-4">
            <div className="text-center">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Score</p>
              <p className="text-2xl font-black text-white font-mono">{gameState.score.toLocaleString()}</p>
            </div>
            <div className="text-center bg-indigo-500/10 px-4 py-1 rounded-2xl border border-indigo-500/20 shadow-inner">
              <p className="text-xs text-indigo-400 font-bold uppercase tracking-widest">Phase</p>
              <p className="text-2xl font-black text-white font-mono">{gameState.level.toLocaleString()}</p>
            </div>
          </div>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center hover:bg-slate-700 transition-colors group"
            title="Game Settings"
          >
            <i className={`fas fa-cog transition-transform group-hover:rotate-90 ${showSettings ? 'text-indigo-400' : 'text-slate-500'}`}></i>
          </button>
        </div>

        {/* Settings Dropdown */}
        {showSettings && (
          <div className="absolute top-[calc(100%+10px)] right-6 w-72 glass rounded-2xl p-5 z-50 shadow-2xl animate-fadeIn border border-slate-700">
            <div className="flex flex-col gap-6">
              {/* Jump to level section */}
              <section>
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Manual Phase Select</h3>
                <form onSubmit={handleJumpToLevel} className="flex gap-2">
                  <input 
                    type="number"
                    value={jumpLevelInput}
                    onChange={(e) => setJumpLevelInput(e.target.value)}
                    placeholder="Enter Phase"
                    className="flex-1 bg-slate-900/80 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                  <button 
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 rounded-lg transition-colors"
                  >
                    Set
                  </button>
                </form>
              </section>

              {/* Toggles section */}
              <section>
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Stage Types</h3>
                <div className="flex flex-col gap-3">
                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-sm font-medium text-slate-200">Linear Equations</span>
                    <button 
                      onClick={() => toggleSetting('allowLinear')}
                      className={`w-10 h-5 rounded-full relative transition-colors ${gameState.settings.allowLinear ? 'bg-indigo-600' : 'bg-slate-700'}`}
                    >
                      <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-all ${gameState.settings.allowLinear ? 'right-1' : 'left-1'}`}></div>
                    </button>
                  </label>
                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-sm font-medium text-slate-200">Quadratic Equations</span>
                    <button 
                      onClick={() => toggleSetting('allowQuadratic')}
                      className={`w-10 h-5 rounded-full relative transition-colors ${gameState.settings.allowQuadratic ? 'bg-indigo-600' : 'bg-slate-700'}`}
                    >
                      <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-all ${gameState.settings.allowQuadratic ? 'right-1' : 'left-1'}`}></div>
                    </button>
                  </label>
                </div>
              </section>

              <p className="text-[10px] text-slate-500 leading-tight italic border-t border-slate-800 pt-3">
                Phase milestones: 250 (Linear), 500 (Quadratic). Max Phase: 1,000,000.
              </p>
            </div>
          </div>
        )}
      </header>

      {/* Main Game Area */}
      <main className="flex-1 w-full flex flex-col items-center justify-center py-6">
        <div className="w-full max-w-2xl flex flex-col items-center gap-6">
          
          {/* Progression Indicator */}
          <div className="w-full max-w-md flex items-center gap-3">
            <span className="text-[10px] font-bold text-slate-600">0</span>
            <div className="flex-1 bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800">
              <div 
                className="h-full bg-indigo-500 transition-all duration-700 shadow-[0_0_15px_rgba(99,102,241,0.6)]"
                style={{ width: `${Math.min((gameState.level / 1000000) * 100, 100)}%` }}
              ></div>
            </div>
            <span className="text-[10px] font-bold text-slate-600">1M</span>
          </div>

          <div className="h-6">
            {message && (
              <p className="text-indigo-400 font-bold animate-pulse text-center italic text-sm tracking-wide">
                {message}
              </p>
            )}
          </div>

          <div className={`w-full min-h-[220px] md:min-h-[260px] flex flex-col items-center justify-center p-8 rounded-[3rem] border-2 transition-all duration-300 relative ${getStatusColor()}`}>
            <div className="absolute top-6 flex flex-col items-center">
              <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-slate-500 opacity-60">Focus on the pattern</span>
              {gameState.currentProblem && (
                <span className={`text-[9px] font-bold mt-1 tracking-[0.1em] transition-all duration-500 ${isRegression ? 'text-teal-400 animate-pulse' : 'text-slate-600'}`}>
                  {isRegression ? (
                    <><i className="fas fa-wind mr-1"></i> Zen Moment • Phase: {gameState.currentProblem.level}</>
                  ) : (
                    <>Phase Complexity: {gameState.currentProblem.level}</>
                  )}
                </span>
              )}
            </div>
            
            <div className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-center font-mono animate-float leading-snug mt-8 break-words max-w-full">
              {gameState.currentProblem?.question}
            </div>
          </div>

          <form onSubmit={handleCheckAnswer} className="w-full max-w-sm relative group mt-2">
            <input
              ref={inputRef}
              type="number"
              step="any"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="?"
              className="w-full bg-slate-900/50 border-2 border-slate-800 rounded-3xl py-6 px-10 text-4xl font-black text-center text-white focus:outline-none focus:border-indigo-500 focus:bg-slate-900 focus:ring-8 focus:ring-indigo-500/10 transition-all font-mono placeholder:text-slate-800"
            />
            <button 
              type="submit"
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg hover:scale-105 active:scale-90 transition-transform"
            >
              <i className="fas fa-chevron-right"></i>
            </button>
          </form>

          <div className="w-full max-w-md flex flex-col items-center gap-4">
            {!hint ? (
              <button 
                onClick={handleHintRequest}
                disabled={loadingHint}
                className="flex items-center gap-2 text-slate-600 hover:text-indigo-400 font-bold text-[10px] uppercase tracking-[0.2em] transition-colors disabled:opacity-50"
              >
                {loadingHint ? (
                  <i className="fas fa-spinner fa-spin"></i>
                ) : (
                  <i className="fas fa-brain"></i>
                )}
                Insight
              </button>
            ) : (
              <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 text-slate-400 text-xs text-center italic animate-fadeIn max-w-[85%] shadow-xl">
                <i className="fas fa-sparkles text-indigo-500 mr-2"></i>
                {hint}
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="w-full max-w-4xl py-6 flex flex-col items-center gap-4">
        <div className="flex items-center gap-6 opacity-30">
          <i className="fas fa-leaf text-slate-500"></i>
          <i className="fas fa-moon text-slate-500"></i>
          <i className="fas fa-wind text-slate-500"></i>
        </div>
        
        <button 
          onClick={handleResetProgress}
          className={`text-[9px] uppercase tracking-widest font-bold transition-all ${resetClicks > 0 ? 'text-red-500 animate-pulse' : 'text-slate-800 hover:text-slate-700'}`}
        >
          {resetClicks > 0 ? `Click ${10 - resetClicks} more times to clear` : 'Progress is saved automatically'}
        </button>
      </footer>
    </div>
  );
};

export default App;
