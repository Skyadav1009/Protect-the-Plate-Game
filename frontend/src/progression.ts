import type { PlayerProgress, DropType } from './types';
import { LEVEL_UNLOCKS, XP_PER_LEVEL_MULT } from './constants';

const STORAGE_KEY = 'protect-the-plate-progress';

export function loadProgress(): PlayerProgress {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) return JSON.parse(stored);
    } catch { /* ignore */ }
    return createDefaultProgress();
}

export function saveProgress(progress: PlayerProgress): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch { /* ignore */ }
}

export function createDefaultProgress(): PlayerProgress {
    return { level: 1, xp: 0, highScores: {}, challengesCompleted: [] };
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
