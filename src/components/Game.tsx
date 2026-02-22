import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, RotateCcw, Trophy, Heart, Zap } from 'lucide-react';

// --- Constants & Types ---

type GameState = 'MENU' | 'PLAYING' | 'GAME_OVER';

interface Drip {
  id: number;
  x: number;
  y: number;
  speed: number;
  radius: number;
  clicksRequired: number;
  clicksReceived: number;
  nostrilIndex: 0 | 1; // 0 for left, 1 for right
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

const CONSTANTS = {
  GAME_WIDTH: 400, // Internal resolution width
  GAME_HEIGHT: 800, // Internal resolution height
  NOSE_Y: 100,
  NOSE_WIDTH: 200,
  NOSE_HEIGHT: 120,
  NOSTRIL_OFFSET_X: 40,
  NOSTRIL_Y_OFFSET: 30,
  PLATE_Y: 700,
  PLATE_WIDTH: 280,
  PLATE_HEIGHT: 60,
  INITIAL_LIVES: 3,
  MAX_SPEED: 8.0,
};

// --- Helper Functions ---

const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;

// --- Main Component ---

export default function Game() {
  // State
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [lives, setLives] = useState(CONSTANTS.INITIAL_LIVES);
  const [speedMultiplier, setSpeedMultiplier] = useState(1.0);

  // Refs for game loop to avoid re-renders
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const stateRef = useRef<{
    drip: Drip | null;
    particles: Particle[];
    lastTime: number;
    shake: number;
    score: number;
    lives: number;
    speedMultiplier: number;
    gameState: GameState;
  }>({
    drip: null,
    particles: [],
    lastTime: 0,
    shake: 0,
    score: 0,
    lives: CONSTANTS.INITIAL_LIVES,
    speedMultiplier: 1.0,
    gameState: 'MENU',
  });

  // Sync React state with Ref state for the loop
  useEffect(() => {
    stateRef.current.gameState = gameState;
  }, [gameState]);

  useEffect(() => {
    stateRef.current.score = score;
  }, [score]);

  useEffect(() => {
    stateRef.current.lives = lives;
  }, [lives]);

  useEffect(() => {
    stateRef.current.speedMultiplier = speedMultiplier;
  }, [speedMultiplier]);

  // Load High Score
  useEffect(() => {
    const stored = localStorage.getItem('save-the-plate-highscore');
    if (stored) setHighScore(parseInt(stored, 10));
  }, []);

  // Save High Score
  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('save-the-plate-highscore', score.toString());
    }
  }, [score, highScore]);

  // --- Sound Synthesis ---
  
  const audioCtxRef = useRef<AudioContext | null>(null);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        audioCtxRef.current = new AudioContext();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const playSound = (type: 'wipe' | 'splash' | 'gameover' | 'spawn') => {
    if (!audioCtxRef.current) return;
    
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'wipe') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'splash') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.3);
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'spawn') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.linearRampToValueAtTime(200, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'gameover') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 1);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 1);
      osc.start(now);
      osc.stop(now + 1);
    }
  };

  // --- Game Logic Methods ---

  const spawnDrip = useCallback(() => {
    const nostrilIndex = Math.random() < 0.5 ? 0 : 1;
    const x = CONSTANTS.GAME_WIDTH / 2 + (nostrilIndex === 0 ? -CONSTANTS.NOSTRIL_OFFSET_X : CONSTANTS.NOSTRIL_OFFSET_X);
    const y = CONSTANTS.NOSE_Y + CONSTANTS.NOSTRIL_Y_OFFSET;
    
    // Difficulty Scaling
    let baseSpeed = 2.0;
    let clicks = 5;
    const currentScore = stateRef.current.score;

    if (currentScore > 10) { baseSpeed = 3.0; clicks = 6; }
    if (currentScore > 20) { baseSpeed = 4.0; clicks = 7; }
    if (currentScore > 30) { baseSpeed = 5.0; clicks = 8; }
    if (currentScore > 50) { baseSpeed = 6.0; clicks = 10; }

    // Apply speed multiplier (progressive)
    const finalSpeed = Math.min(baseSpeed * stateRef.current.speedMultiplier, CONSTANTS.MAX_SPEED);

    stateRef.current.drip = {
      id: Date.now(),
      x,
      y,
      speed: finalSpeed,
      radius: 25,
      clicksRequired: clicks,
      clicksReceived: 0,
      nostrilIndex,
    };
    
    playSound('spawn');
  }, []);

  const createParticles = (x: number, y: number, color: string, count: number) => {
    for (let i = 0; i < count; i++) {
      stateRef.current.particles.push({
        id: Math.random(),
        x,
        y,
        vx: randomRange(-5, 5),
        vy: randomRange(-5, 5),
        life: 1.0,
        color,
        size: randomRange(2, 6),
      });
    }
  };

  const startGame = () => {
    initAudio();
    setScore(0);
    setLives(CONSTANTS.INITIAL_LIVES);
    setSpeedMultiplier(1.0);
    stateRef.current = {
      ...stateRef.current,
      drip: null,
      particles: [],
      score: 0,
      lives: CONSTANTS.INITIAL_LIVES,
      speedMultiplier: 1.0,
      shake: 0,
    };
    setGameState('PLAYING');
    spawnDrip();
  };

  const handleGameOver = () => {
    setGameState('GAME_OVER');
    stateRef.current.shake = 20;
  };

  // --- Game Loop ---

  const update = (deltaTime: number) => {
    if (stateRef.current.gameState !== 'PLAYING') return;

    const { drip } = stateRef.current;

    // Update Drip
    if (drip) {
      drip.y += drip.speed * (deltaTime / 16); // Normalize to ~60fps

      // Collision with Plate
      if (drip.y + drip.radius >= CONSTANTS.PLATE_Y) {
        // Splash!
        createParticles(drip.x, CONSTANTS.PLATE_Y, '#84cc16', 20); // Lime green splash
        stateRef.current.shake = 10;
        stateRef.current.drip = null;
        playSound('splash');
        
        const newLives = stateRef.current.lives - 1;
        setLives(newLives);
        stateRef.current.lives = newLives;
        
        if (newLives <= 0) {
          playSound('gameover');
          handleGameOver();
        } else {
          // Spawn new drip after a short delay or immediately? 
          // Immediately for now, maybe small delay in future
          setTimeout(() => {
             if (stateRef.current.gameState === 'PLAYING') spawnDrip();
          }, 500);
        }
      }
    }

    // Update Particles
    stateRef.current.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.2; // Gravity
      p.life -= 0.02;
    });
    stateRef.current.particles = stateRef.current.particles.filter(p => p.life > 0);

    // Update Shake
    if (stateRef.current.shake > 0) {
      stateRef.current.shake *= 0.9;
      if (stateRef.current.shake < 0.5) stateRef.current.shake = 0;
    }
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;

    // Clear Screen
    ctx.fillStyle = '#fefce8'; // Yellow-50 background
    ctx.fillRect(0, 0, width, height);

    // Apply Shake
    const shakeX = (Math.random() - 0.5) * stateRef.current.shake;
    const shakeY = (Math.random() - 0.5) * stateRef.current.shake;
    ctx.save();
    ctx.translate(shakeX, shakeY);

    // --- Draw Nose ---
    ctx.fillStyle = '#fca5a5'; // Red-300 (Skin tone-ish)
    ctx.beginPath();
    ctx.ellipse(
      width / 2, 
      CONSTANTS.NOSE_Y, 
      CONSTANTS.NOSE_WIDTH / 2, 
      CONSTANTS.NOSE_HEIGHT / 2, 
      0, 0, Math.PI * 2
    );
    ctx.fill();
    ctx.strokeStyle = '#f87171';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Nostrils
    ctx.fillStyle = '#7f1d1d'; // Dark Red
    // Left
    ctx.beginPath();
    ctx.ellipse(
      width / 2 - CONSTANTS.NOSTRIL_OFFSET_X, 
      CONSTANTS.NOSE_Y + CONSTANTS.NOSTRIL_Y_OFFSET, 
      15, 25, 0, 0, Math.PI * 2
    );
    ctx.fill();
    // Right
    ctx.beginPath();
    ctx.ellipse(
      width / 2 + CONSTANTS.NOSTRIL_OFFSET_X, 
      CONSTANTS.NOSE_Y + CONSTANTS.NOSTRIL_Y_OFFSET, 
      15, 25, 0, 0, Math.PI * 2
    );
    ctx.fill();

    // --- Draw Plate ---
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(
      width / 2, 
      CONSTANTS.PLATE_Y + 20, 
      CONSTANTS.PLATE_WIDTH / 2, 
      CONSTANTS.PLATE_HEIGHT / 2, 
      0, 0, Math.PI * 2
    );
    ctx.fill();
    ctx.strokeStyle = '#94a3b8'; // Slate-400
    ctx.lineWidth = 4;
    ctx.stroke();
    
    // Plate inner rim
    ctx.beginPath();
    ctx.ellipse(
      width / 2, 
      CONSTANTS.PLATE_Y + 20, 
      CONSTANTS.PLATE_WIDTH / 2 - 20, 
      CONSTANTS.PLATE_HEIGHT / 2 - 10, 
      0, 0, Math.PI * 2
    );
    ctx.strokeStyle = '#cbd5e1';
    ctx.stroke();

    // Food on plate (simple circles)
    if (stateRef.current.lives > 0) {
        ctx.fillStyle = '#16a34a'; // Green peas
        ctx.beginPath(); ctx.arc(width/2 - 40, CONSTANTS.PLATE_Y + 20, 15, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#ea580c'; // Carrot
        ctx.beginPath(); ctx.arc(width/2 + 30, CONSTANTS.PLATE_Y + 10, 18, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#854d0e'; // Meatball
        ctx.beginPath(); ctx.arc(width/2, CONSTANTS.PLATE_Y + 30, 20, 0, Math.PI*2); ctx.fill();
    } else {
        // Dirty plate
        ctx.fillStyle = '#84cc16'; // Slime
        ctx.beginPath();
        ctx.ellipse(width / 2, CONSTANTS.PLATE_Y + 20, CONSTANTS.PLATE_WIDTH / 2 - 10, CONSTANTS.PLATE_HEIGHT / 2 - 5, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    // --- Draw Drip ---
    const drip = stateRef.current.drip;
    if (drip) {
      // Drip body
      ctx.fillStyle = '#84cc16'; // Lime-500
      ctx.beginPath();
      ctx.arc(drip.x, drip.y, drip.radius, 0, Math.PI * 2);
      ctx.fill();
      
      // Drip tail (triangle pointing up)
      ctx.beginPath();
      ctx.moveTo(drip.x - drip.radius * 0.8, drip.y - drip.radius * 0.2);
      ctx.lineTo(drip.x, drip.y - drip.radius * 2.5);
      ctx.lineTo(drip.x + drip.radius * 0.8, drip.y - drip.radius * 0.2);
      ctx.fill();

      // Highlight
      ctx.fillStyle = '#d9f99d'; // Lime-200
      ctx.beginPath();
      ctx.arc(drip.x - drip.radius * 0.3, drip.y - drip.radius * 0.3, drip.radius * 0.25, 0, Math.PI * 2);
      ctx.fill();

      // Click Progress Indicator (cracks or darkening)
      if (drip.clicksReceived > 0) {
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(drip.x, drip.y, drip.radius, 0, (drip.clicksReceived / drip.clicksRequired) * Math.PI * 2);
        ctx.stroke();
      }
    }

    // --- Draw Particles ---
    stateRef.current.particles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    });

    ctx.restore();
  };

  const loop = (time: number) => {
    if (!stateRef.current.lastTime) stateRef.current.lastTime = time;
    const deltaTime = time - stateRef.current.lastTime;
    stateRef.current.lastTime = time;

    update(deltaTime);
    
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) draw(ctx);
    }

    requestRef.current = requestAnimationFrame(loop);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestRef.current);
  }, []);

  // --- Input Handling ---

  const handlePointerDown = (e: React.PointerEvent) => {
    if (stateRef.current.gameState !== 'PLAYING') return;
    if (!canvasRef.current || !stateRef.current.drip) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;

    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const drip = stateRef.current.drip;
    const dx = clickX - drip.x;
    const dy = clickY - drip.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Hitbox check (generous radius)
    if (distance < drip.radius * 1.5) {
      // Hit!
      drip.clicksReceived += 1;
      playSound('wipe');
      
      // Visual feedback for hit
      createParticles(clickX, clickY, '#bef264', 3); // Light lime particles
      drip.radius *= 0.95; // Shrink slightly

      if (drip.clicksReceived >= drip.clicksRequired) {
        // Destroy Drip
        createParticles(drip.x, drip.y, '#84cc16', 10); // Explosion
        stateRef.current.drip = null;
        
        // Update Score & Speed
        const newScore = stateRef.current.score + 1;
        setScore(newScore);
        stateRef.current.score = newScore; // Sync immediately for spawnDrip logic
        
        // Increase speed multiplier slightly
        setSpeedMultiplier(prev => {
             const next = Math.min(prev + 0.05, 2.5);
             stateRef.current.speedMultiplier = next; // Sync immediately
             return next;
        }); 

        // Spawn new drip
        spawnDrip();
      }
    }
  };

  return (
    <div className="relative w-full h-screen bg-neutral-900 flex items-center justify-center overflow-hidden font-sans select-none">
      
      {/* Game Container */}
      <div className="relative w-full max-w-md aspect-[9/16] max-h-screen bg-[#fefce8] shadow-2xl overflow-hidden">
        
        {/* Canvas Layer */}
        <canvas
          ref={canvasRef}
          width={CONSTANTS.GAME_WIDTH}
          height={CONSTANTS.GAME_HEIGHT}
          className="w-full h-full touch-none"
          onPointerDown={handlePointerDown}
        />

        {/* HUD Layer */}
        <div className="absolute top-0 left-0 w-full p-4 pointer-events-none flex justify-between items-start text-slate-800">
             <div className="flex flex-col items-start">
               <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm border border-slate-200">
                 <Trophy size={18} className="text-amber-500" />
                 <span className="font-bold text-lg">{score}</span>
               </div>
               <div className="text-xs text-slate-500 mt-1 ml-2 font-mono">HI: {highScore}</div>
             </div>

             <div className="flex flex-col items-end gap-2">
                <div className="flex gap-1">
                    {[...Array(CONSTANTS.INITIAL_LIVES)].map((_, i) => (
                        <Heart 
                            key={i} 
                            size={24} 
                            className={`${i < lives ? 'fill-red-500 text-red-500' : 'fill-slate-200 text-slate-200'}`} 
                        />
                    ))}
                </div>
                <div className="flex items-center gap-1 bg-white/80 backdrop-blur-sm px-2 py-0.5 rounded-full shadow-sm border border-slate-200 text-xs font-mono text-slate-500">
                    <Zap size={12} className="text-yellow-500" />
                    <span>{speedMultiplier.toFixed(1)}x</span>
                </div>
             </div>
        </div>

        {/* UI Overlays */}
        <AnimatePresence>
          {gameState === 'MENU' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-10"
            >
              <motion.div 
                initial={{ scale: 0.8, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full border-4 border-lime-500"
              >
                <div className="w-20 h-20 bg-lime-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-lime-500">
                    <div className="w-4 h-10 bg-lime-500 rounded-full animate-bounce" />
                </div>
                <h1 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">SAVE THE<br/><span className="text-lime-600">PLATE</span></h1>
                <p className="text-slate-500 mb-8 font-medium">Tap the mucus before it ruins dinner!</p>
                
                <button 
                  onClick={startGame}
                  className="w-full bg-lime-500 hover:bg-lime-600 text-white font-bold text-xl py-4 rounded-xl shadow-lg shadow-lime-500/30 transition-transform active:scale-95 flex items-center justify-center gap-2"
                >
                  <Play fill="currentColor" /> PLAY NOW
                </button>
              </motion.div>
            </motion.div>
          )}

          {gameState === 'GAME_OVER' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-red-900/60 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-10"
            >
              <motion.div 
                initial={{ scale: 0.8, rotate: -2 }}
                animate={{ scale: 1, rotate: 0 }}
                className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full border-4 border-red-500"
              >
                <h2 className="text-4xl font-black text-red-500 mb-2">GROSS!</h2>
                <p className="text-slate-500 mb-6 font-medium">The plate is contaminated.</p>
                
                <div className="bg-slate-50 rounded-2xl p-4 mb-6 border border-slate-100">
                    <div className="text-sm text-slate-400 uppercase font-bold tracking-wider mb-1">Final Score</div>
                    <div className="text-5xl font-black text-slate-800">{score}</div>
                </div>

                <button 
                  onClick={startGame}
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold text-xl py-4 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
                >
                  <RotateCcw /> TRY AGAIN
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
