import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Lock, Check, Sparkles } from 'lucide-react';
import type { PlayerProgress, SkinCategory } from '../types';
import { SKINS } from '../constants';
import { isSkinUnlocked, getUnlockProgress, equipSkin, saveProgress, getEquippedSkin } from '../progression';

interface Props {
    progress: PlayerProgress;
    onBack: () => void;
    onProgressUpdate: (progress: PlayerProgress) => void;
}

const CATEGORIES: { key: SkinCategory; label: string; emoji: string }[] = [
    { key: 'plate', label: 'Plates', emoji: '🍽️' },
    { key: 'nose', label: 'Noses', emoji: '👃' },
    { key: 'background', label: 'Backgrounds', emoji: '🎨' },
];

export default function Skins({ progress, onBack, onProgressUpdate }: Props) {
    const [selectedCategory, setSelectedCategory] = useState<SkinCategory>('plate');

    const categorySkins = Object.values(SKINS).filter(s => s.category === selectedCategory);
    const equippedId = progress.equippedSkins[selectedCategory];

    const handleEquip = (skinId: string) => {
        if (equipSkin(progress, skinId)) {
            saveProgress(progress);
            onProgressUpdate({ ...progress });
        }
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
                    <Sparkles size={28} className="text-purple-500" />
                    <h2 className="text-2xl font-black text-slate-800">SKINS</h2>
                </div>

                {/* Category tabs */}
                <div className="flex gap-2 mb-4">
                    {CATEGORIES.map(cat => {
                        const isActive = selectedCategory === cat.key;
                        return (
                            <button
                                key={cat.key}
                                onClick={() => setSelectedCategory(cat.key)}
                                className={`flex-1 flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
                                    isActive
                                        ? 'bg-purple-500 text-white shadow-lg'
                                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                }`}
                            >
                                <span className="text-lg">{cat.emoji}</span>
                                <span className="text-xs font-bold">{cat.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Equipped preview */}
                <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl p-4 mb-4 border border-purple-200">
                    <div className="text-xs text-purple-600 font-bold uppercase tracking-wider mb-2">Currently Equipped</div>
                    <div className="flex items-center gap-3">
                        {CATEGORIES.map(cat => {
                            const skin = getEquippedSkin(progress, cat.key);
                            return (
                                <div key={cat.key} className="flex flex-col items-center">
                                    <div
                                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-md border-2 border-white"
                                        style={{ backgroundColor: skin.colors.primary }}
                                    >
                                        {skin.emoji}
                                    </div>
                                    <span className="text-[10px] text-slate-500 mt-1">{cat.label}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Skins grid */}
                <div className="flex-1 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-3">
                        {categorySkins.map(skin => {
                            const unlocked = isSkinUnlocked(progress, skin.id);
                            const equipped = equippedId === skin.id;
                            const unlockInfo = getUnlockProgress(progress, skin.id);
                            const progressPercent = Math.min(100, (unlockInfo.current / unlockInfo.target) * 100);

                            return (
                                <motion.button
                                    key={skin.id}
                                    whileHover={{ scale: unlocked ? 1.02 : 1 }}
                                    whileTap={{ scale: unlocked ? 0.98 : 1 }}
                                    onClick={() => unlocked && handleEquip(skin.id)}
                                    disabled={!unlocked}
                                    className={`relative rounded-2xl p-3 text-left transition-all border-2 ${
                                        equipped
                                            ? 'border-purple-500 bg-purple-50 shadow-lg shadow-purple-200'
                                            : unlocked
                                            ? 'border-slate-200 bg-white hover:border-purple-300 hover:shadow-md'
                                            : 'border-slate-100 bg-slate-50 opacity-70'
                                    }`}
                                >
                                    {/* Preview */}
                                    <div
                                        className={`w-full aspect-square rounded-xl flex items-center justify-center text-4xl mb-2 ${
                                            !unlocked ? 'grayscale' : ''
                                        }`}
                                        style={{
                                            backgroundColor: skin.colors.primary,
                                            borderColor: skin.colors.secondary,
                                            borderWidth: 3,
                                        }}
                                    >
                                        {unlocked ? skin.emoji : <Lock size={24} className="text-slate-400" />}
                                    </div>

                                    {/* Info */}
                                    <div className="font-bold text-sm text-slate-700 truncate">{skin.name}</div>
                                    
                                    {unlocked ? (
                                        equipped ? (
                                            <div className="flex items-center gap-1 text-purple-600 text-xs font-bold">
                                                <Check size={12} /> Equipped
                                            </div>
                                        ) : (
                                            <div className="text-slate-400 text-xs">Tap to equip</div>
                                        )
                                    ) : (
                                        <div className="mt-1">
                                            <div className="text-[10px] text-slate-500 truncate">{unlockInfo.label}</div>
                                            <div className="w-full h-1.5 bg-slate-200 rounded-full mt-1 overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-full transition-all"
                                                    style={{ width: `${progressPercent}%` }}
                                                />
                                            </div>
                                            <div className="text-[9px] text-slate-400 mt-0.5">
                                                {unlockInfo.current}/{unlockInfo.target}
                                            </div>
                                        </div>
                                    )}

                                    {/* Equipped badge */}
                                    {equipped && (
                                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center shadow-md">
                                            <Check size={14} className="text-white" />
                                        </div>
                                    )}
                                </motion.button>
                            );
                        })}
                    </div>
                </div>

                {/* Stats footer */}
                <div className="mt-4 pt-3 border-t border-slate-100 text-center">
                    <div className="text-xs text-slate-400">
                        <span className="font-bold text-slate-600">
                            {Object.values(SKINS).filter(s => isSkinUnlocked(progress, s.id)).length}
                        </span>
                        {' / '}
                        {Object.keys(SKINS).length} skins unlocked
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
