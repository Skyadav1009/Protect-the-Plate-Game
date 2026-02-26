import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, RotateCcw, Trophy, Heart, Timer, Star } from 'lucide-react';
import type { GameState, GameMode, GameRef, Challenge, PlayerProgress } from '../types';
import { GAME } from '../constants';
import { initAudio } from '../audio';
import { drawGame } from '../renderer';
import { createGameRef, spawnDrop, updateGame, handleTap, UpdateCallbacks } from '../engine';
import { loadProgress, saveProgress, updateHighScore, xpForLevel } from '../progression';
import { submitScore, getHighScores, type HighScoreEntry } from '../api';
import ModeSelect from './ModeSelect';

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
    <div className="relative w-full h-screen bg-neutral-900 flex items-center justify-center overflow-hidden font-sans select-none">
      <div className="relative w-full max-w-md aspect-[9/16] max-h-screen bg-[#fefce8] shadow-2xl overflow-hidden">

        {/* Canvas */}
        <canvas ref={canvasRef} width={GAME.WIDTH} height={GAME.HEIGHT}
          className="w-full h-full touch-none" onPointerDown={handlePointerDown} />

        {/* HUD */}
        {gameState === 'PLAYING' && (
          <div className="absolute top-0 left-0 w-full p-4 pointer-events-none flex justify-between items-start text-slate-800">
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm border border-slate-200">
                <Trophy size={18} className="text-amber-500" />
                <span className="font-bold text-lg">{score}</span>
                {comboMult > 1 && (
                  <span className="text-xs font-bold text-lime-600 bg-lime-100 px-1.5 py-0.5 rounded-full">
                    x{comboMult}
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500 mt-1 ml-2 font-mono">HI: {highScore}</div>
              {gameMode === 'TIME_ATTACK' && (
                <div className="flex items-center gap-1 bg-sky-500 text-white px-3 py-1 rounded-full mt-1 shadow-sm">
                  <Timer size={14} />
                  <span className="font-bold text-sm font-mono">{Math.ceil(timeLeft)}s</span>
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex gap-1">
                {gameMode !== 'TIME_ATTACK' && [...Array(Math.min(lives, 5))].map((_, i) => (
                  <Heart key={i} size={20} className="fill-red-500 text-red-500" />
                ))}
                {gameMode !== 'TIME_ATTACK' && lives > 5 && (
                  <span className="text-xs font-bold text-red-500">+{lives - 5}</span>
                )}
              </div>
              <div className="flex items-center gap-1 bg-white/80 backdrop-blur-sm px-2 py-0.5 rounded-full shadow-sm border border-slate-200">
                <Star size={12} className="text-amber-500" />
                <span className="text-xs font-mono text-slate-500">Lv.{stateRef.current.level}</span>
              </div>
              {stateRef.current.challenge && (
                <div className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs font-bold border border-amber-300">
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
              className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-10">
              <motion.div initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }}
                className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full border-4 border-lime-500">
                <div className="w-20 h-20 bg-lime-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-lime-500">
                  <div className="w-4 h-10 bg-lime-500 rounded-full animate-bounce" />
                </div>
                <h1 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">
                  SAVE THE<br /><span className="text-lime-600">PLATE</span>
                </h1>
                <p className="text-slate-500 mb-2 font-medium">Tap the mucus before it ruins dinner!</p>
                <p className="text-xs text-slate-400 mb-6">Level {progress.level} · XP {progress.xp}/{xpForLevel(progress.level + 1)}</p>
                <button onClick={() => setGameState('MODE_SELECT')}
                  className="w-full bg-lime-500 hover:bg-lime-600 text-white font-bold text-xl py-4 rounded-xl shadow-lg shadow-lime-500/30 transition-transform active:scale-95 flex items-center justify-center gap-2">
                  <Play fill="currentColor" /> PLAY NOW
                </button>
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

          {gameState === 'GAME_OVER' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className={`absolute inset-0 ${challengeResult === 'win' ? 'bg-lime-900/60' : 'bg-red-900/60'} backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-10`}>
              <motion.div initial={{ scale: 0.8, rotate: -2 }} animate={{ scale: 1, rotate: 0 }}
                className={`bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full border-4 ${challengeResult === 'win' ? 'border-lime-500' : 'border-red-500'}`}>
                {challengeResult === 'win' ? (
                  <>
                    <h2 className="text-4xl font-black text-lime-500 mb-2">🎉 COMPLETE!</h2>
                    <p className="text-slate-500 mb-6 font-medium">Challenge passed!</p>
                  </>
                ) : (
                  <>
                    <h2 className="text-4xl font-black text-red-500 mb-2">GROSS!</h2>
                    <p className="text-slate-500 mb-6 font-medium">
                      {gameMode === 'TIME_ATTACK' ? "Time's up!" : 'The plate is contaminated.'}
                    </p>
                  </>
                )}
                <div className="bg-slate-50 rounded-2xl p-4 mb-6 border border-slate-100">
                  <div className="text-sm text-slate-400 uppercase font-bold tracking-wider mb-1">Final Score</div>
                  <div className="text-5xl font-black text-slate-800">{score}</div>
                  {score > 0 && score >= highScore && (
                    <div className="text-sm font-bold text-amber-500 mt-1">🏆 New High Score!</div>
                  )}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setGameState('MENU')}
                    className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-3 rounded-xl transition-transform active:scale-95">
                    Menu
                  </button>
                  <button onClick={() => startGame(gameMode)}
                    className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2">
                    <RotateCcw size={18} /> Again
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
