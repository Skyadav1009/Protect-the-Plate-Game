import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Trophy, Gamepad2, Timer, Skull, Target, Loader2, Crown } from 'lucide-react';
import { getGlobalLeaderboard, type GlobalLeaderboard, type LeaderboardEntry, getPlayerId } from '../api';

interface Props {
    onBack: () => void;
}

const MODES = [
    { mode: 'CLASSIC', icon: Gamepad2, label: 'Classic', color: 'bg-lime-500', borderColor: 'border-lime-400' },
    { mode: 'TIME_ATTACK', icon: Timer, label: 'Time Attack', color: 'bg-sky-500', borderColor: 'border-sky-400' },
    { mode: 'SURVIVAL', icon: Skull, label: 'Survival', color: 'bg-purple-500', borderColor: 'border-purple-400' },
    { mode: 'CHALLENGE', icon: Target, label: 'Challenge', color: 'bg-amber-500', borderColor: 'border-amber-400' },
];

export default function Leaderboard({ onBack }: Props) {
    const [selectedMode, setSelectedMode] = useState<string>('CLASSIC');
    const [leaderboard, setLeaderboard] = useState<GlobalLeaderboard | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const currentPlayerId = getPlayerId();

    useEffect(() => {
        setLoading(true);
        setError(null);
        getGlobalLeaderboard()
            .then(data => {
                setLeaderboard(data.leaderboard);
                setLoading(false);
            })
            .catch(err => {
                setError('Failed to load leaderboard');
                setLoading(false);
            });
    }, []);

    const selectedConfig = MODES.find(m => m.mode === selectedMode) || MODES[0];
    const entries: LeaderboardEntry[] = leaderboard?.[selectedMode] || [];

    const getRankStyle = (rank: number) => {
        if (rank === 1) return 'bg-amber-100 border-amber-400 text-amber-700';
        if (rank === 2) return 'bg-slate-100 border-slate-400 text-slate-600';
        if (rank === 3) return 'bg-orange-100 border-orange-400 text-orange-700';
        return 'bg-white border-slate-200 text-slate-600';
    };

    const getRankIcon = (rank: number) => {
        if (rank === 1) return <Crown size={16} className="text-amber-500" />;
        if (rank === 2) return <span className="text-slate-400 font-bold">2</span>;
        if (rank === 3) return <span className="text-orange-500 font-bold">3</span>;
        return <span className="text-slate-400">{rank}</span>;
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
                className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-5 border-2 border-slate-200 max-h-[90%] overflow-hidden flex flex-col"
            >
                <button
                    onClick={onBack}
                    className="flex items-center gap-1 text-slate-400 hover:text-slate-600 text-sm mb-3 transition-colors"
                >
                    <ArrowLeft size={16} /> Back
                </button>

                <div className="flex items-center gap-2 justify-center mb-4">
                    <Trophy size={28} className="text-amber-500" />
                    <h2 className="text-2xl font-black text-slate-800">LEADERBOARD</h2>
                </div>

                {/* Mode tabs */}
                <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
                    {MODES.map(m => {
                        const Icon = m.icon;
                        const isActive = selectedMode === m.mode;
                        return (
                            <button
                                key={m.mode}
                                onClick={() => setSelectedMode(m.mode)}
                                className={`flex-1 min-w-0 flex flex-col items-center gap-1 px-2 py-2 rounded-xl transition-all ${
                                    isActive
                                        ? `${m.color} text-white shadow-lg`
                                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                }`}
                            >
                                <Icon size={18} />
                                <span className="text-[10px] font-bold truncate w-full text-center">{m.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Leaderboard content */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="animate-spin text-slate-400" size={32} />
                        </div>
                    ) : error ? (
                        <div className="text-center py-12 text-slate-400">
                            <p>{error}</p>
                            <button
                                onClick={() => window.location.reload()}
                                className="mt-2 text-sm text-lime-600 hover:underline"
                            >
                                Retry
                            </button>
                        </div>
                    ) : entries.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                            <Trophy size={48} className="mx-auto mb-3 opacity-30" />
                            <p className="font-medium">No scores yet!</p>
                            <p className="text-sm mt-1">Be the first to play {selectedConfig.label}</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {entries.map((entry, i) => {
                                const rank = i + 1;
                                const isCurrentPlayer = entry.player_id === currentPlayerId;
                                return (
                                    <motion.div
                                        key={`${entry.player_id}-${i}`}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className={`flex items-center gap-3 p-3 rounded-xl border-2 ${getRankStyle(rank)} ${
                                            isCurrentPlayer ? 'ring-2 ring-lime-400 ring-offset-1' : ''
                                        }`}
                                    >
                                        <div className="w-8 h-8 flex items-center justify-center rounded-full bg-white/50 font-bold">
                                            {getRankIcon(rank)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-700 truncate">
                                                    {entry.nickname || `Player ${entry.player_id.slice(0, 6)}`}
                                                </span>
                                                {isCurrentPlayer && (
                                                    <span className="text-[10px] bg-lime-500 text-white px-1.5 py-0.5 rounded-full font-bold">
                                                        YOU
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                Level {entry.level} · {entry.drops_wiped} drops · x{entry.max_combo} combo
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xl font-black text-slate-800">{entry.score}</div>
                                            <div className="text-[10px] text-slate-400">points</div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}
