import React from 'react';
import { motion } from 'motion/react';
import { Timer, Skull, Target, Gamepad2, ArrowLeft } from 'lucide-react';
import type { GameMode, Challenge } from '../types';
import { CHALLENGES } from '../constants';

interface Props {
    onSelect: (mode: GameMode, challenge?: Challenge) => void;
    onBack: () => void;
    progress: { level: number; challengesCompleted: string[] };
}

const MODES = [
    { mode: 'CLASSIC' as GameMode, icon: Gamepad2, label: 'Classic', desc: 'Normal increasing speed, 3 lives', color: 'bg-lime-500', unlock: 1 },
    { mode: 'TIME_ATTACK' as GameMode, icon: Timer, label: 'Time Attack', desc: '60 seconds — highest score wins', color: 'bg-sky-500', unlock: 1 },
    { mode: 'SURVIVAL' as GameMode, icon: Skull, label: 'Survival', desc: 'Infinite, 1 life, speed ramps up', color: 'bg-purple-500', unlock: 1 },
    { mode: 'CHALLENGE' as GameMode, icon: Target, label: 'Challenge', desc: 'Complete preset missions', color: 'bg-amber-500', unlock: 1 },
];

export default function ModeSelect({ onSelect, onBack, progress }: Props) {
    const [showChallenges, setShowChallenges] = React.useState(false);

    const handleModeClick = (mode: GameMode) => {
        if (mode === 'CHALLENGE') {
            setShowChallenges(true);
        } else {
            onSelect(mode);
        }
    };

    const handleChallenge = (c: typeof CHALLENGES[number]) => {
        onSelect('CHALLENGE', { ...c, progress: 0, completed: false });
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center p-4 z-10"
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 border-2 border-slate-200 max-h-[90%] overflow-y-auto"
            >
                <button onClick={showChallenges ? () => setShowChallenges(false) : onBack}
                    className="flex items-center gap-1 text-slate-400 hover:text-slate-600 text-sm mb-4 transition-colors">
                    <ArrowLeft size={16} /> Back
                </button>

                {!showChallenges ? (
                    <>
                        <h2 className="text-2xl font-black text-slate-800 mb-1 text-center">SELECT MODE</h2>
                        <p className="text-slate-400 text-sm text-center mb-5">Choose your challenge</p>
                        <div className="space-y-3">
                            {MODES.map(m => (
                                <button key={m.mode} onClick={() => handleModeClick(m.mode)}
                                    className={`w-full ${m.color} hover:brightness-110 text-white rounded-2xl p-4 text-left transition-all active:scale-[0.97] shadow-lg`}>
                                    <div className="flex items-center gap-3">
                                        <m.icon size={28} />
                                        <div>
                                            <div className="font-bold text-lg leading-tight">{m.label}</div>
                                            <div className="text-white/80 text-sm">{m.desc}</div>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </>
                ) : (
                    <>
                        <h2 className="text-2xl font-black text-slate-800 mb-1 text-center">CHALLENGES</h2>
                        <p className="text-slate-400 text-sm text-center mb-5">Complete these missions</p>
                        <div className="space-y-3">
                            {CHALLENGES.map(c => {
                                const done = progress.challengesCompleted.includes(c.id);
                                return (
                                    <button key={c.id} onClick={() => !done && handleChallenge(c)} disabled={done}
                                        className={`w-full rounded-2xl p-4 text-left transition-all border-2 ${done
                                            ? 'bg-slate-50 border-slate-200 opacity-60'
                                            : 'bg-white border-amber-300 hover:border-amber-500 active:scale-[0.97] shadow-md'}`}>
                                        <div className="font-bold text-slate-700">{done ? '✅ ' : '🎯 '}{c.name}</div>
                                        <div className="text-slate-500 text-sm">{c.description}</div>
                                    </button>
                                );
                            })}
                        </div>
                    </>
                )}

                <div className="mt-4 text-center text-xs text-slate-400">
                    Level {progress.level}
                </div>
            </motion.div>
        </motion.div>
    );
}
