import type { DropType, Challenge } from './types';

export const GAME = {
    WIDTH: 400,
    HEIGHT: 800,
    NOSE_Y: 100,
    NOSE_WIDTH: 200,
    NOSE_HEIGHT: 120,
    NOSTRIL_OFFSET_X: 40,
    NOSTRIL_Y_OFFSET: 30,
    PLATE_Y: 700,
    PLATE_WIDTH: 280,
    PLATE_HEIGHT: 60,
    INITIAL_LIVES: 3,
    MAX_LIVES: 5,
    MAX_SPEED: 10.0,
    TIME_ATTACK_DURATION: 60,
    DROP_SPAWN_DELAY: 0.3,
    DROP_SPAWN_DELAY_MISS: 0.8,
};

export const DROP_CONFIGS: Record<DropType, {
    color: string; glowColor: string; speedMult: number;
    baseClicks: number; points: number; hearts: number; label: string;
}> = {
    NORMAL: { color: '#84cc16', glowColor: '#bef264', speedMult: 1.0, baseClicks: 5, points: 1, hearts: 1, label: '🟢' },
    FAST: { color: '#3b82f6', glowColor: '#93c5fd', speedMult: 2.0, baseClicks: 3, points: 2, hearts: 1, label: '🔵' },
    STICKY: { color: '#eab308', glowColor: '#fde047', speedMult: 0.7, baseClicks: 8, points: 1, hearts: 1, label: '🟡' },
    INFECTION: { color: '#ef4444', glowColor: '#fca5a5', speedMult: 1.5, baseClicks: 5, points: 3, hearts: 2, label: '🔴' },
};

export const COMBO_TIERS = [
    { streak: 3, multiplier: 2, label: 'COMBO x2!' },
    { streak: 5, multiplier: 3, label: 'COMBO x3!' },
    { streak: 10, multiplier: 5, label: '🔥 SUPER WIPE!' },
];
export const COMBO_SLOW_MO_DURATION = 3;
export const COMBO_SLOW_MO_FACTOR = 0.3;
export const COMBO_DISPLAY_DURATION = 1.5;

export const POWERUP_CONFIG = {
    SPAWN_MIN: 15, SPAWN_MAX: 20,
    FALL_SPEED: 0.8, RADIUS: 18,
    TISSUE_DURATION: 3, FREEZE_DURATION: 5,
};

export const BOSS_CONFIG = {
    TRIGGER_SCORE: 50, WAVES: 10,
    SPEED_MULT: 1.5, WARNING_TIME: 2,
    RELIEF_TIME: 5, DROPS_PER_WAVE: 3,
};

export const WEATHER_CONFIG = {
    COLD_COOLDOWN: 60, COLD_DURATION: 15, COLD_SPAWN_MULT: 1.5,
    DUST_COOLDOWN: 90, DUST_DURATION: 3, DUST_DROPS: 5,
    SNOWFLAKE_COUNT: 30,
};

export const SNEEZE_COOLDOWN = 45;
export const SNEEZE_DROP_COUNT = 4;

export const LEVEL_UNLOCKS: { level: number; type: DropType; label: string }[] = [
    { level: 1, type: 'NORMAL', label: 'Normal Drops' },
    { level: 5, type: 'FAST', label: '🔵 Fast Drops Unlocked!' },
    { level: 10, type: 'STICKY', label: '🟡 Sticky Drops Unlocked!' },
    { level: 15, type: 'INFECTION', label: '🔴 Infection Drops Unlocked!' },
];
export const BOSS_UNLOCK_LEVEL = 20;
export const XP_PER_LEVEL_MULT = 10;

export const DIFFICULTY_TIERS = [
    { score: 0, baseSpeed: 2.0, extraClicks: 0 },
    { score: 10, baseSpeed: 3.0, extraClicks: 1 },
    { score: 20, baseSpeed: 4.0, extraClicks: 2 },
    { score: 30, baseSpeed: 5.0, extraClicks: 3 },
    { score: 50, baseSpeed: 6.0, extraClicks: 5 },
];

export const CHALLENGES: Omit<Challenge, 'progress' | 'completed'>[] = [
    { id: 'no_miss_20', name: "Don't miss 20", description: 'Wipe 20 drops without missing', condition: 'NO_MISS', target: 20 },
    { id: 'left_only', name: 'Left Nostril', description: 'Score 15 — left nostril only', condition: 'LEFT_ONLY', target: 15 },
    { id: 'sticky_only', name: 'Sticky Only', description: 'Score 10 — sticky drops only', condition: 'STICKY_ONLY', target: 10 },
    { id: 'boss_survive', name: 'Boss Survivor', description: 'Survive boss for 30 seconds', condition: 'BOSS_SURVIVE', target: 30 },
];

export const POWERUP_TYPES = [
    { type: 'TISSUE' as const, emoji: '🧻', label: 'Tissue Boost', color: '#f0f0f0' },
    { type: 'SHIELD' as const, emoji: '🛡️', label: 'Plate Shield', color: '#60a5fa' },
    { type: 'FREEZE' as const, emoji: '❄️', label: 'Freeze', color: '#7dd3fc' },
    { type: 'EXTRA_HEART' as const, emoji: '❤️', label: 'Extra Heart', color: '#f87171' },
];
