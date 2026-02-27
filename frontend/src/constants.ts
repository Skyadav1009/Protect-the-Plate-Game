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
    NORMAL: { color: '#84cc16', glowColor: '#bef264', speedMult: 1.0, baseClicks: 3, points: 1, hearts: 1, label: '🟢' },
    FAST: { color: '#3b82f6', glowColor: '#93c5fd', speedMult: 2.0, baseClicks: 3, points: 2, hearts: 1, label: '🔵' },
    STICKY: { color: '#eab308', glowColor: '#fde047', speedMult: 0.7, baseClicks: 3, points: 1, hearts: 1, label: '🟡' },
    INFECTION: { color: '#ef4444', glowColor: '#fca5a5', speedMult: 1.5, baseClicks: 3, points: 3, hearts: 2, label: '🔴' },
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
    { score: 0, baseSpeed: 1.5, extraClicks: 0 },
    { score: 5, baseSpeed: 1.6, extraClicks: 0 },
    { score: 10, baseSpeed: 1.7, extraClicks: 0 },
    { score: 15, baseSpeed: 1.8, extraClicks: 0 },
    { score: 20, baseSpeed: 1.9, extraClicks: 0 },
    { score: 25, baseSpeed: 2.0, extraClicks: 0 },
    { score: 30, baseSpeed: 2.1, extraClicks: 0 },
    { score: 40, baseSpeed: 2.2, extraClicks: 0 },
    { score: 50, baseSpeed: 2.3, extraClicks: 0 },
    { score: 60, baseSpeed: 2.4, extraClicks: 0 },
    { score: 75, baseSpeed: 2.5, extraClicks: 0 },
    { score: 100, baseSpeed: 2.7, extraClicks: 0 },
    { score: 150, baseSpeed: 3.0, extraClicks: 0 },
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

// ── SKINS SYSTEM ──
export const SKINS = {
    // Plate skins
    plate_classic: {
        id: 'plate_classic', name: 'Classic Plate', category: 'plate' as const, emoji: '🍽️',
        unlockType: 'default' as const, unlockValue: 0,
        colors: { primary: '#ffffff', secondary: '#94a3b8', accent: '#cbd5e1' }
    },
    plate_gold: {
        id: 'plate_gold', name: 'Golden Plate', category: 'plate' as const, emoji: '🥇',
        unlockType: 'level' as const, unlockValue: 10,
        colors: { primary: '#fbbf24', secondary: '#d97706', accent: '#fde047' }
    },
    plate_neon: {
        id: 'plate_neon', name: 'Neon Plate', category: 'plate' as const, emoji: '💫',
        unlockType: 'score' as const, unlockValue: 100, unlockMode: 'CLASSIC',
        colors: { primary: '#a855f7', secondary: '#7c3aed', accent: '#c084fc' }
    },
    plate_ice: {
        id: 'plate_ice', name: 'Ice Plate', category: 'plate' as const, emoji: '❄️',
        unlockType: 'score' as const, unlockValue: 50, unlockMode: 'SURVIVAL',
        colors: { primary: '#7dd3fc', secondary: '#0ea5e9', accent: '#bae6fd' }
    },
    plate_fire: {
        id: 'plate_fire', name: 'Fire Plate', category: 'plate' as const, emoji: '🔥',
        unlockType: 'games' as const, unlockValue: 50,
        colors: { primary: '#f97316', secondary: '#dc2626', accent: '#fbbf24' }
    },

    // Nose skins
    nose_classic: {
        id: 'nose_classic', name: 'Classic Nose', category: 'nose' as const, emoji: '👃',
        unlockType: 'default' as const, unlockValue: 0,
        colors: { primary: '#fca5a5', secondary: '#f87171', accent: '#7f1d1d' }
    },
    nose_piggy: {
        id: 'nose_piggy', name: 'Piggy Nose', category: 'nose' as const, emoji: '🐷',
        unlockType: 'level' as const, unlockValue: 5,
        colors: { primary: '#f9a8d4', secondary: '#ec4899', accent: '#be185d' }
    },
    nose_alien: {
        id: 'nose_alien', name: 'Alien Nose', category: 'nose' as const, emoji: '👽',
        unlockType: 'level' as const, unlockValue: 15,
        colors: { primary: '#86efac', secondary: '#22c55e', accent: '#166534' }
    },
    nose_robot: {
        id: 'nose_robot', name: 'Robot Nose', category: 'nose' as const, emoji: '🤖',
        unlockType: 'score' as const, unlockValue: 75, unlockMode: 'TIME_ATTACK',
        colors: { primary: '#94a3b8', secondary: '#64748b', accent: '#1e293b' }
    },
    nose_clown: {
        id: 'nose_clown', name: 'Clown Nose', category: 'nose' as const, emoji: '🤡',
        unlockType: 'games' as const, unlockValue: 25,
        colors: { primary: '#ef4444', secondary: '#dc2626', accent: '#7f1d1d' }
    },

    // Background skins
    bg_cream: {
        id: 'bg_cream', name: 'Cream', category: 'background' as const, emoji: '🌾',
        unlockType: 'default' as const, unlockValue: 0,
        colors: { primary: '#fefce8', secondary: '#fef9c3' }
    },
    bg_night: {
        id: 'bg_night', name: 'Night Mode', category: 'background' as const, emoji: '🌙',
        unlockType: 'level' as const, unlockValue: 8,
        colors: { primary: '#1e293b', secondary: '#0f172a' }
    },
    bg_ocean: {
        id: 'bg_ocean', name: 'Ocean', category: 'background' as const, emoji: '🌊',
        unlockType: 'level' as const, unlockValue: 12,
        colors: { primary: '#0ea5e9', secondary: '#0284c7' }
    },
    bg_sunset: {
        id: 'bg_sunset', name: 'Sunset', category: 'background' as const, emoji: '🌅',
        unlockType: 'score' as const, unlockValue: 150, unlockMode: 'CLASSIC',
        colors: { primary: '#fb923c', secondary: '#f97316' }
    },
    bg_galaxy: {
        id: 'bg_galaxy', name: 'Galaxy', category: 'background' as const, emoji: '🌌',
        unlockType: 'games' as const, unlockValue: 100,
        colors: { primary: '#581c87', secondary: '#3b0764' }
    },
};
