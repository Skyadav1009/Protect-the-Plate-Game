import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, RotateCcw, Trophy, Heart, Timer, Star, Sparkles, User } from 'lucide-react';
import type { GameState, GameMode, GameRef, Challenge, PlayerProgress } from '../types';
import { GAME } from '../constants';
import { initAudio } from '../audio';
import { drawGame } from '../renderer';
import { createGameRef, spawnDrop, updateGame, handleTap, UpdateCallbacks } from '../engine';
import { loadProgress, saveProgress, updateHighScore, xpForLevel, incrementGamesPlayed } from '../progression';
import { submitScore, getHighScores, getCachedNickname, type HighScoreEntry } from '../api';
import ModeSelect from './ModeSelect';
import Leaderboard from './Leaderboard';
import Skins from './Skins';
import Profile from './Profile';

export default function Game() {
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [gameMode, setGameMode] = useState<GameMode>('CLASSIC');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(GAME.INITIAL_LIVES);
  const [comboLabel, setComboLabel] = useState('');
  const [comboMult, setComboMult] = useState(1);
  const [timeLeft, setTimeLeft] = useState(0);
  const [progress, setProgress] = useState<PlayerProgress>(loadProgress);
  const [serverHighScores, setServerHighScores] = useState<HighScoreEntry[]>([]);
  const gameStartRef = useRef<number>(Date.now());
  const [challengeResult, setChallengeResult] = useState<'win' | 'fail' | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const stateRef = useRef<GameRef>(createGameRef('CLASSIC', loadProgress()));
  const progressRef = useRef<PlayerProgress>(loadProgress());

  // Sync progress ref
  useEffect(() => { progressRef.current = progress; }, [progress]);

  // Load server high scores on mount
  useEffect(() => {
    getHighScores().then(data => setServerHighScores(data.highScores)).catch(() => { });
  }, []);

  const callbacks: UpdateCallbacks = {
    onScoreChange: (s) => setScore(s),
    onLivesChange: (l) => setLives(l),
    onGameOver: () => {
      const p = progressRef.current;
      const ref = stateRef.current;
      updateHighScore(p, ref.gameMode, ref.score);
      saveProgress(p);
      setProgress({ ...p });
      setGameState('GAME_OVER');
      // Submit to backend
      const duration = (Date.now() - gameStartRef.current) / 1000;
      submitScore({
        mode: ref.gameMode, score: ref.score,
        dropsWiped: ref.score, maxCombo: ref.combo.multiplier,
        level: ref.level, durationSeconds: Math.round(duration),
      }).then(data => setServerHighScores(data.highScores)).catch(() => { });
    },
    onComboChange: (m, l) => { setComboMult(m); setComboLabel(l); },
    onTimeChange: (t) => setTimeLeft(Math.max(0, t)),
    onProgress: (p) => { saveProgress(p); setProgress({ ...p }); },
  };
  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;

  const startGame = useCallback((mode: GameMode, challenge?: Challenge) => {
    initAudio();
    const p = progressRef.current;
    incrementGamesPlayed(p);
    saveProgress(p);
    setProgress({ ...p });
    const ref = createGameRef(mode, p, challenge);
    stateRef.current = ref;
    setScore(0);
    setLives(ref.lives);
    setComboLabel('');
    setComboMult(1);
    setTimeLeft(ref.timeRemaining);
    setChallengeResult(null);
    setGameMode(mode);
    setGameState('PLAYING');
    gameStartRef.current = Date.now();
    spawnDrop(ref);
  }, []);

  // Game loop
  const loop = useCallback((time: number) => {
    const ref = stateRef.current;
    if (!ref.lastTime) ref.lastTime = time;
    const dt = Math.min(time - ref.lastTime, 50); // cap delta
    ref.lastTime = time;

    if (ref.gameState === 'PLAYING') {
      updateGame(ref, dt, progressRef.current, cbRef.current);

      // Check challenge completion
      if (ref.challenge?.completed && !challengeResult) {
        const p = progressRef.current;
        if (!p.challengesCompleted.includes(ref.challenge.id)) {
          p.challengesCompleted.push(ref.challenge.id);
          saveProgress(p);
          setProgress({ ...p });
        }
        setChallengeResult('win');
        ref.gameState = 'GAME_OVER';
        setGameState('GAME_OVER');
      }
    }

    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) drawGame(ctx, ref);
    }
    requestRef.current = requestAnimationFrame(loop);
  }, [challengeResult]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestRef.current);
  }, [loop]);

  // Input
  const handlePointerDown = (e: React.PointerEvent) => {
    if (stateRef.current.gameState !== 'PLAYING') return;
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    const cx = (e.clientX - rect.left) * scaleX;
    const cy = (e.clientY - rect.top) * scaleY;
    handleTap(stateRef.current, cx, cy, progressRef.current, cbRef.current);
  };

  const localHigh = progress.highScores[gameMode] || 0;
  const serverHigh = serverHighScores.find(h => h.mode === gameMode)?.high_score || 0;
  const highScore = Math.max(localHigh, serverHigh);

  return (
    <div className="relative w-full h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 flex items-center justify-center overflow-hidden font-sans select-none">
      <div className="relative w-full max-w-md aspect-[9/16] max-h-screen bg-[#fefce8] shadow-[0_0_50px_rgba(0,0,0,0.5)] shadow-indigo-500/20 overflow-hidden ring-1 ring-white/10">

        {/* Canvas */}
        <canvas ref={canvasRef} width={GAME.WIDTH} height={GAME.HEIGHT}
          className="w-full h-full touch-none" onPointerDown={handlePointerDown} />

        {/* HUD */}
        {gameState === 'PLAYING' && (
          <div className="absolute top-0 left-0 w-full p-4 pointer-events-none flex justify-between items-start z-10">
            <div className="flex flex-col items-start gap-1">
              {/* Score Badge */}
              <div className="flex items-center gap-2 bg-white/40 backdrop-blur-md px-4 py-1.5 rounded-2xl shadow-lg border border-white/50">
                <Trophy size={20} className="text-amber-500 drop-shadow-sm" fill="currentColor" />
                <motion.span
                  key={score}
                  initial={{ scale: 1.8, color: '#f59e0b', rotate: -5 }}
                  animate={{ scale: 1, color: '#1e293b', rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 800, damping: 8, mass: 0.8 }}
                  className="font-black text-2xl tracking-tight"
                >
                  {score}
                </motion.span>
                <AnimatePresence>
                  {comboMult > 1 && (
                    <motion.span
                      initial={{ scale: 0.5, opacity: 0, y: 10, rotate: -10 }}
                      animate={{ scale: [1.5, 1], opacity: 1, y: 0, rotate: 0 }}
                      exit={{ scale: 0, opacity: 0, rotate: 10 }}
                      transition={{ type: "spring", stiffness: 600, damping: 12 }}
                      className="text-xs font-black text-white bg-gradient-to-r from-lime-500 to-green-500 px-2 py-0.5 rounded-full shadow-sm ml-1 origin-bottom-left"
                    >
                      x{comboMult}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              <div className="text-[10px] text-slate-100/70 ml-3 font-mono font-bold tracking-widest uppercase drop-shadow-md">
                HI {highScore}
              </div>
              {gameMode === 'TIME_ATTACK' && (
                <motion.div
                  animate={{ scale: timeLeft <= 10 ? [1, 1.05, 1] : 1 }}
                  transition={{ repeat: timeLeft <= 10 ? Infinity : 0, duration: 0.5 }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full shadow-lg border mt-1 ${
                    timeLeft <= 10
                      ? 'bg-red-500/90 border-red-400 text-white'
                      : 'bg-sky-500/90 border-sky-400 text-white'
                  } backdrop-blur-md`}
                >
                  <Timer size={14} className={timeLeft <= 10 ? "animate-pulse" : ""} />
                  <span className="font-extrabold text-sm font-mono tracking-wider">{Math.ceil(timeLeft)}s</span>
                </motion.div>
              )}
            </div>
            
            <div className="flex flex-col items-end gap-2">
              <div className="flex gap-1 bg-white/30 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm border border-white/40">
                {gameMode !== 'TIME_ATTACK' && [...Array(Math.min(lives, 5))].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ repeat: Infinity, duration: 2, delay: i * 0.2 }}
                  >
                    <Heart size={20} className="fill-rose-500 text-rose-600 drop-shadow-sm" />
                  </motion.div>
                ))}
                {gameMode !== 'TIME_ATTACK' && lives > 5 && (
                  <span className="text-sm font-black text-rose-600 drop-shadow-sm ml-1 self-center">
                    +{lives - 5}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 bg-white/40 backdrop-blur-md px-3 py-1 rounded-full shadow-sm border border-white/40">
                <Star size={14} className="text-amber-500 drop-shadow-sm" fill="currentColor" />
                <span className="text-sm font-black text-slate-700">Lv.{stateRef.current.level}</span>
              </div>
              {stateRef.current.challenge && (
                <div className="bg-gradient-to-r from-amber-400 to-amber-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md shadow-amber-500/30 border border-amber-300">
                  {stateRef.current.challenge.progress}/{stateRef.current.challenge.target}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Overlays */}
        <AnimatePresence>
          {gameState === 'MENU' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
              <motion.div initial={{ scale: 0.9, y: 30, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                className="bg-white/95 backdrop-blur-xl p-8 rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] max-w-sm w-full border border-white/50 relative overflow-hidden">
                
                {/* Decorative background circle */}
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-lime-400/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />

                {/* Profile button */}
                <motion.button 
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setGameState('PROFILE')}
                  className="absolute top-4 right-4 w-10 h-10 bg-slate-100/80 hover:bg-slate-200 rounded-full flex items-center justify-center shadow-sm border border-slate-200 z-10"
                >
                  <User size={20} className="text-slate-600" />
                </motion.button>

                <motion.div 
                  animate={{ y: [0, -8, 0] }} 
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  className="w-24 h-24 bg-gradient-to-br from-lime-300 to-lime-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-lime-500/30 border-4 border-white relative z-10"
                >
                  <div className="w-5 h-12 bg-white rounded-full shadow-inner" />
                </motion.div>

                <motion.h1 
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
                  className="text-4xl font-black text-slate-800 mb-2 tracking-tighter leading-none relative z-10">
                  PROTECT THE<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-500 to-green-600">PLATE</span>
                </motion.h1>
                
                <motion.p 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                  className="text-slate-500 mb-3 font-medium text-sm">
                  Tap the mucus before it ruins dinner!
                </motion.p>
                
                {getCachedNickname() && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.25, type: "spring" }} className="bg-lime-50 inline-block px-3 py-1 rounded-full mb-2">
                    <p className="text-sm text-lime-700 font-bold">👋 {getCachedNickname()}</p>
                  </motion.div>
                )}

                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
                  className="bg-slate-50 rounded-2xl p-3 mb-6 border border-slate-100">
                  <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-1">Level {progress.level}</p>
                  <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-amber-400 to-amber-500 h-2.5 rounded-full" 
                      style={{ width: `${Math.min(100, (progress.xp / xpForLevel(progress.level + 1)) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 font-mono text-right">{progress.xp} / {xpForLevel(progress.level + 1)} XP</p>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, type: "spring", stiffness: 300 }}
                  className="space-y-3 relative z-10">
                  <motion.button 
                    whileHover={{ scale: 1.03, rotate: -1 }}
                    whileTap={{ scale: 0.97, rotate: 1 }}
                    onClick={() => setGameState('MODE_SELECT')}
                    className="w-full bg-gradient-to-b from-lime-400 to-lime-600 hover:brightness-110 text-white font-black text-xl py-4 rounded-2xl shadow-[0_4px_0_rgb(77,124,15),0_10px_20px_rgba(132,204,22,0.4)] transition-colors flex items-center justify-center gap-2">
                    <Play fill="currentColor" size={24} /> PLAY NOW
                  </motion.button>
                  <div className="flex gap-3 pt-1">
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setGameState('LEADERBOARD')}
                      className="flex-1 bg-gradient-to-b from-amber-400 to-amber-500 hover:brightness-110 text-white font-black text-sm py-3 rounded-xl shadow-[0_4px_0_rgb(180,83,9),0_8px_15px_rgba(245,158,11,0.3)] transition-colors flex items-center justify-center gap-1.5">
                      <Trophy size={16} fill="currentColor" /> Ranks
                    </motion.button>
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setGameState('SKINS')}
                      className="flex-1 bg-gradient-to-b from-purple-400 to-purple-600 hover:brightness-110 text-white font-black text-sm py-3 rounded-xl shadow-[0_4px_0_rgb(107,33,168),0_8px_15px_rgba(168,85,247,0.3)] transition-colors flex items-center justify-center gap-1.5">
                      <Sparkles size={16} fill="currentColor" /> Skins
                    </motion.button>
                  </div>
                </motion.div>
              </motion.div>
            </motion.div>
          )}

          {gameState === 'MODE_SELECT' && (
            <ModeSelect
              onSelect={(mode, challenge) => startGame(mode, challenge)}
              onBack={() => setGameState('MENU')}
              progress={progress}
            />
          )}

          {gameState === 'LEADERBOARD' && (
            <Leaderboard onBack={() => setGameState('MENU')} />
          )}

          {gameState === 'SKINS' && (
            <Skins
              progress={progress}
              onBack={() => setGameState('MENU')}
              onProgressUpdate={(p) => setProgress(p)}
            />
          )}

          {gameState === 'PROFILE' && (
            <Profile onBack={() => setGameState('MENU')} />
          )}

          {gameState === 'GAME_OVER' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className={`absolute inset-0 ${challengeResult === 'win' ? 'bg-lime-950/70' : 'bg-red-950/70'} backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20`}>
              <motion.div initial={{ scale: 0.8, y: 50, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }}
                transition={{ type: 'spring', damping: 20, stiffness: 300, delay: 0.1 }}
                className={`bg-white/95 backdrop-blur-xl p-8 rounded-[2rem] shadow-[0_20px_60px_-10px_rgba(0,0,0,0.5)] max-w-sm w-full border-4 ${challengeResult === 'win' ? 'border-lime-500 shadow-lime-900/50' : 'border-red-500 shadow-red-900/50'}`}>
                
                {challengeResult === 'win' ? (
                  <>
                    <motion.div 
                      initial={{ scale: 0, rotate: -180 }} 
                      animate={{ scale: 1, rotate: 0 }} 
                      transition={{ type: "spring", damping: 12, delay: 0.2 }}
                      className="w-20 h-20 bg-lime-100 rounded-full flex items-center justify-center mx-auto mb-4"
                    >
                      <Trophy size={40} className="text-lime-500" />
                    </motion.div>
                    <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-lime-500 to-green-600 mb-1">COMPLETE!</h2>
                    <p className="text-slate-500 mb-6 font-medium">Challenge passed! 🎉</p>
                  </>
                ) : (
                  <>
                    <motion.div 
                      animate={{ x: [-5, 5, -5, 5, 0] }} 
                      transition={{ duration: 0.4, delay: 0.2 }}
                      className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"
                    >
                      <span className="text-4xl">🤢</span>
                    </motion.div>
                    <h2 className="text-4xl font-black text-red-500 mb-1 tracking-tight">GROSS!</h2>
                    <p className="text-slate-500 mb-6 font-medium">
                      {gameMode === 'TIME_ATTACK' ? "Time's up!" : 'The plate is contaminated.'}
                    </p>
                  </>
                )}

                <div className="bg-slate-50 rounded-2xl p-5 mb-8 border border-slate-200 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-slate-200 via-slate-400 to-slate-200 opacity-20" />
                  <div className="text-xs text-slate-400 uppercase font-black tracking-widest mb-1">Final Score</div>
                  
                  <motion.div 
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.3 }}
                    className="text-6xl font-black text-slate-800 tracking-tighter"
                  >
                    {score}
                  </motion.div>
                  
                  {score > 0 && score >= highScore && (
                    <motion.div 
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.6 }}
                      className="text-sm font-bold text-amber-500 mt-2 flex items-center justify-center gap-1"
                    >
                      <Trophy size={14} /> NEW HIGH SCORE!
                    </motion.div>
                  )}
                </div>

                <div className="flex gap-4">
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setGameState('MENU')}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-4 rounded-2xl shadow-sm">
                    Menu
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.03, rotate: 1 }}
                    whileTap={{ scale: 0.95, rotate: -2 }}
                    onClick={() => startGame(gameMode)}
                    className="flex-[2] bg-gradient-to-b from-slate-700 to-slate-900 hover:brightness-110 text-white font-black py-4 rounded-2xl shadow-[0_4px_0_rgb(15,23,42),0_10px_20px_rgba(0,0,0,0.3)] flex items-center justify-center gap-2">
                    <RotateCcw size={20} strokeWidth={3} /> AGAIN
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
