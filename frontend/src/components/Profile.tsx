import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { 
    ArrowLeft, User, Trophy, Gamepad2, Timer, Target, Zap, 
    Clock, TrendingUp, Edit3, Check, X, Loader2, Medal
} from 'lucide-react';
import { 
    getProfile, updateNickname, getPlayerId, getCachedNickname, setCachedNickname,
    type PlayerProfile, type RecentGame 
} from '../api';

interface Props {
    onBack: () => void;
}

const MODE_ICONS: Record<string, React.ElementType> = {
    CLASSIC: Gamepad2,
    TIME_ATTACK: Timer,
    SURVIVAL: Target,
    CHALLENGE: Zap,
};

const MODE_COLORS: Record<string, string> = {
    CLASSIC: 'bg-lime-500',
    TIME_ATTACK: 'bg-sky-500',
    SURVIVAL: 'bg-purple-500',
    CHALLENGE: 'bg-amber-500',
};

function formatDuration(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    if (mins > 0) return `${mins}m`;
    return `${seconds}s`;
}

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
}

export default function Profile({ onBack }: Props) {
    const [profile, setProfile] = useState<PlayerProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editing, setEditing] = useState(false);
    const [nickname, setNickname] = useState(getCachedNickname());
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getProfile();
            setProfile(data);
            if (data.player.nickname) {
                setNickname(data.player.nickname);
                setCachedNickname(data.player.nickname);
            }
        } catch (err) {
            setError('Failed to load profile');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveNickname = async () => {
        if (nickname.trim().length < 2) {
            setSaveError('Nickname must be at least 2 characters');
            return;
        }
        
        setSaving(true);
        setSaveError(null);
        try {
            const result = await updateNickname(nickname.trim());
            setCachedNickname(result.player.nickname);
            setNickname(result.player.nickname);
            if (profile) {
                setProfile({
                    ...profile,
                    player: { ...profile.player, nickname: result.player.nickname }
                });
            }
            setEditing(false);
        } catch (err: any) {
            setSaveError(err.message || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const displayName = profile?.player.nickname || nickname || `Player ${getPlayerId().slice(0, 6)}`;

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

                {loading ? (
                    <div className="flex-1 flex items-center justify-center py-12">
                        <Loader2 className="animate-spin text-slate-400" size={32} />
                    </div>
                ) : error ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-12 text-slate-400">
                        <p>{error}</p>
                        <button onClick={loadProfile} className="mt-2 text-lime-600 hover:underline text-sm">
                            Retry
                        </button>
                    </div>
                ) : profile && (
                    <div className="flex-1 overflow-y-auto">
                        {/* Profile header */}
                        <div className="flex items-center gap-4 mb-5">
                            <div className="w-16 h-16 bg-gradient-to-br from-lime-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                                <User size={32} className="text-white" />
                            </div>
                            <div className="flex-1">
                                {editing ? (
                                    <div className="flex flex-col gap-2">
                                        <input
                                            type="text"
                                            value={nickname}
                                            onChange={(e) => setNickname(e.target.value)}
                                            maxLength={20}
                                            placeholder="Enter nickname"
                                            className="w-full px-3 py-2 border-2 border-lime-400 rounded-lg text-slate-700 font-bold focus:outline-none focus:border-lime-500"
                                            autoFocus
                                        />
                                        {saveError && (
                                            <p className="text-red-500 text-xs">{saveError}</p>
                                        )}
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleSaveNickname}
                                                disabled={saving}
                                                className="flex-1 bg-lime-500 text-white px-3 py-1.5 rounded-lg font-bold text-sm flex items-center justify-center gap-1 hover:bg-lime-600 disabled:opacity-50"
                                            >
                                                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                                Save
                                            </button>
                                            <button
                                                onClick={() => { setEditing(false); setNickname(profile.player.nickname || getCachedNickname()); }}
                                                className="px-3 py-1.5 bg-slate-200 text-slate-600 rounded-lg font-bold text-sm flex items-center gap-1 hover:bg-slate-300"
                                            >
                                                <X size={14} /> Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-2">
                                            <h2 className="text-xl font-black text-slate-800">{displayName}</h2>
                                            <button
                                                onClick={() => setEditing(true)}
                                                className="p-1 text-slate-400 hover:text-lime-600 transition-colors"
                                            >
                                                <Edit3 size={14} />
                                            </button>
                                        </div>
                                        <p className="text-xs text-slate-400">
                                            Playing since {new Date(profile.player.createdAt).toLocaleDateString()}
                                        </p>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Stats grid */}
                        <div className="grid grid-cols-2 gap-3 mb-5">
                            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                <div className="flex items-center gap-2 mb-1">
                                    <Gamepad2 size={14} className="text-slate-400" />
                                    <span className="text-xs text-slate-500">Games Played</span>
                                </div>
                                <div className="text-2xl font-black text-slate-800">{profile.stats.total_games}</div>
                            </div>
                            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                <div className="flex items-center gap-2 mb-1">
                                    <Trophy size={14} className="text-amber-500" />
                                    <span className="text-xs text-slate-500">Total Score</span>
                                </div>
                                <div className="text-2xl font-black text-slate-800">{profile.stats.total_score.toLocaleString()}</div>
                            </div>
                            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                <div className="flex items-center gap-2 mb-1">
                                    <Zap size={14} className="text-purple-500" />
                                    <span className="text-xs text-slate-500">Best Combo</span>
                                </div>
                                <div className="text-2xl font-black text-slate-800">x{profile.stats.best_combo}</div>
                            </div>
                            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                <div className="flex items-center gap-2 mb-1">
                                    <Clock size={14} className="text-sky-500" />
                                    <span className="text-xs text-slate-500">Play Time</span>
                                </div>
                                <div className="text-2xl font-black text-slate-800">{formatDuration(profile.stats.total_play_time)}</div>
                            </div>
                        </div>

                        {/* High scores per mode */}
                        {profile.highScores.length > 0 && (
                            <div className="mb-5">
                                <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                                    <Medal size={16} className="text-amber-500" /> High Scores
                                </h3>
                                <div className="space-y-2">
                                    {profile.highScores.map(hs => {
                                        const Icon = MODE_ICONS[hs.mode] || Gamepad2;
                                        const color = MODE_COLORS[hs.mode] || 'bg-slate-500';
                                        const rank = profile.ranks[hs.mode];
                                        return (
                                            <div key={hs.mode} className="flex items-center gap-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
                                                <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center`}>
                                                    <Icon size={20} className="text-white" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="font-bold text-slate-700">{hs.mode.replace('_', ' ')}</div>
                                                    <div className="text-xs text-slate-400">
                                                        {hs.games_played} games · Best combo x{hs.best_combo}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xl font-black text-slate-800">{hs.high_score}</div>
                                                    {rank && (
                                                        <div className="text-xs text-amber-600 font-bold">#{rank} Global</div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Recent games */}
                        {profile.recentGames.length > 0 && (
                            <div>
                                <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                                    <TrendingUp size={16} className="text-lime-500" /> Recent Games
                                </h3>
                                <div className="space-y-2">
                                    {profile.recentGames.slice(0, 5).map((game: RecentGame, i: number) => {
                                        const color = MODE_COLORS[game.mode] || 'bg-slate-500';
                                        return (
                                            <div key={game._id || i} className="flex items-center gap-3 p-2 border-b border-slate-100 last:border-0">
                                                <div className={`w-2 h-8 ${color} rounded-full`} />
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium text-slate-700">{game.mode.replace('_', ' ')}</div>
                                                    <div className="text-xs text-slate-400">{formatDate(game.createdAt)}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-bold text-slate-800">{game.score}</div>
                                                    <div className="text-xs text-slate-400">Lv.{game.level}</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Empty state */}
                        {profile.stats.total_games === 0 && (
                            <div className="text-center py-8 text-slate-400">
                                <Gamepad2 size={48} className="mx-auto mb-3 opacity-30" />
                                <p className="font-medium">No games played yet!</p>
                                <p className="text-sm">Start playing to see your stats here.</p>
                            </div>
                        )}
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
}
