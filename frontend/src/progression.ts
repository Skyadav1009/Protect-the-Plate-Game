import type { PlayerProgress, DropType, SkinCategory } from './types';
import { LEVEL_UNLOCKS, XP_PER_LEVEL_MULT, SKINS } from './constants';

const STORAGE_KEY = 'protect-the-plate-progress';

export function loadProgress(): PlayerProgress {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            // Migrate old progress to new format
            return {
                ...createDefaultProgress(),
                ...parsed,
                unlockedSkins: parsed.unlockedSkins || ['plate_classic', 'nose_classic', 'bg_cream'],
                equippedSkins: parsed.equippedSkins || { plate: 'plate_classic', nose: 'nose_classic', background: 'bg_cream' },
                totalGamesPlayed: parsed.totalGamesPlayed || 0,
            };
        }
    } catch { /* ignore */ }
    return createDefaultProgress();
}

export function saveProgress(progress: PlayerProgress): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch { /* ignore */ }
}

export function createDefaultProgress(): PlayerProgress {
    return {
        level: 1,
        xp: 0,
        highScores: {},
        challengesCompleted: [],
        unlockedSkins: ['plate_classic', 'nose_classic', 'bg_cream'],
        equippedSkins: { plate: 'plate_classic', nose: 'nose_classic', background: 'bg_cream' },
        totalGamesPlayed: 0,
    };
}

export function xpForLevel(level: number): number {
    return level * XP_PER_LEVEL_MULT;
}

export function addXP(progress: PlayerProgress, amount: number): { leveledUp: boolean; newLevel: number; unlock: string } {
    progress.xp += amount;
    let leveledUp = false;
    let unlock = '';
    while (progress.xp >= xpForLevel(progress.level + 1)) {
        progress.xp -= xpForLevel(progress.level + 1);
        progress.level += 1;
        leveledUp = true;
        const entry = LEVEL_UNLOCKS.find(u => u.level === progress.level);
        if (entry) unlock = entry.label;
    }
    return { leveledUp, newLevel: progress.level, unlock };
}

export function getUnlockedDropTypes(level: number): DropType[] {
    return LEVEL_UNLOCKS.filter(u => u.level <= level).map(u => u.type);
}

export function updateHighScore(progress: PlayerProgress, mode: string, score: number): boolean {
    const current = progress.highScores[mode] || 0;
    if (score > current) {
        progress.highScores[mode] = score;
        return true;
    }
    return false;
}

export function incrementGamesPlayed(progress: PlayerProgress): void {
    progress.totalGamesPlayed += 1;
}

export function isSkinUnlocked(progress: PlayerProgress, skinId: string): boolean {
    const skin = SKINS[skinId as keyof typeof SKINS];
    if (!skin) return false;
    
    if (skin.unlockType === 'default') return true;
    if (progress.unlockedSkins.includes(skinId)) return true;
    
    switch (skin.unlockType) {
        case 'level':
            return progress.level >= skin.unlockValue;
        case 'score':
            if (skin.unlockMode) {
                return (progress.highScores[skin.unlockMode] || 0) >= skin.unlockValue;
            }
            return Object.values(progress.highScores).some(s => s >= skin.unlockValue);
        case 'games':
            return progress.totalGamesPlayed >= skin.unlockValue;
        default:
            return false;
    }
}

export function getUnlockProgress(progress: PlayerProgress, skinId: string): { current: number; target: number; label: string } {
    const skin = SKINS[skinId as keyof typeof SKINS];
    if (!skin) return { current: 0, target: 1, label: '' };
    
    switch (skin.unlockType) {
        case 'default':
            return { current: 1, target: 1, label: 'Default' };
        case 'level':
            return { current: progress.level, target: skin.unlockValue, label: `Level ${skin.unlockValue}` };
        case 'score':
            const score = skin.unlockMode ? (progress.highScores[skin.unlockMode] || 0) : Math.max(...Object.values(progress.highScores), 0);
            const modeLabel = skin.unlockMode ? ` in ${skin.unlockMode.replace('_', ' ')}` : '';
            return { current: score, target: skin.unlockValue, label: `Score ${skin.unlockValue}${modeLabel}` };
        case 'games':
            return { current: progress.totalGamesPlayed, target: skin.unlockValue, label: `Play ${skin.unlockValue} games` };
        default:
            return { current: 0, target: 1, label: '' };
    }
}

export function equipSkin(progress: PlayerProgress, skinId: string): boolean {
    const skin = SKINS[skinId as keyof typeof SKINS];
    if (!skin || !isSkinUnlocked(progress, skinId)) return false;
    
    progress.equippedSkins[skin.category] = skinId;
    if (!progress.unlockedSkins.includes(skinId)) {
        progress.unlockedSkins.push(skinId);
    }
    return true;
}

export function getEquippedSkin(progress: PlayerProgress, category: SkinCategory): typeof SKINS[keyof typeof SKINS] {
    const skinId = progress.equippedSkins[category];
    return SKINS[skinId as keyof typeof SKINS] || Object.values(SKINS).find(s => s.category === category && s.unlockType === 'default')!;
}
