import type { GameRef, Drop, DropType, GameMode, Challenge } from './types';
import {
    GAME, DROP_CONFIGS, COMBO_TIERS, COMBO_SLOW_MO_DURATION, COMBO_SLOW_MO_FACTOR,
    COMBO_DISPLAY_DURATION, POWERUP_CONFIG, BOSS_CONFIG, WEATHER_CONFIG,
    SNEEZE_COOLDOWN, SNEEZE_DROP_COUNT, DIFFICULTY_TIERS, CHALLENGES, POWERUP_TYPES,
    BOSS_UNLOCK_LEVEL,
} from './constants';
import { playSound } from './audio';
import { addXP, getUnlockedDropTypes } from './progression';
import type { PlayerProgress } from './types';

const rand = (min: number, max: number) => Math.random() * (max - min) + min;

// ── Create initial game ref ──
export function createGameRef(mode: GameMode, progress: PlayerProgress, challenge?: Challenge): GameRef {
    return {
        drops: [], particles: [], powerUps: [], activePowerUps: [],
        lastTime: 0, shake: 0, score: 0,
        lives: mode === 'TIME_ATTACK' ? 99 : mode === 'SURVIVAL' ? 1 : GAME.INITIAL_LIVES,
        speedMultiplier: 1.0,
        gameState: 'PLAYING', gameMode: mode,
        combo: { streak: 0, multiplier: 1, label: '', slowMotionTimer: 0, displayTimer: 0 },
        boss: { active: false, wavesRemaining: 0, warningTimer: 0, reliefTimer: 0 },
        weather: { type: 'NONE', timer: 0, cooldown: WEATHER_CONFIG.COLD_COOLDOWN, snowflakes: [], dustOpacity: 0 },
        expression: 'NEUTRAL', expressionTimer: 0,
        level: progress.level, xp: progress.xp,
        unlockedDropTypes: getUnlockedDropTypes(progress.level),
        timeRemaining: mode === 'TIME_ATTACK' ? GAME.TIME_ATTACK_DURATION : 0,
        challenge: challenge || null,
        dropSpawnTimer: 0.1, powerUpSpawnTimer: rand(POWERUP_CONFIG.SPAWN_MIN, POWERUP_CONFIG.SPAWN_MAX),
        sneezeCooldown: SNEEZE_COOLDOWN, bossTriggered: false,
        levelUpDisplay: { show: false, level: 0, unlock: '', timer: 0 },
        idCounter: 1, survivalSpeedTimer: 0,
        equippedSkins: progress.equippedSkins,
    };
}

// ── Pick drop type ──
function pickDropType(ref: GameRef): DropType {
    const available = ref.unlockedDropTypes;
    if (ref.challenge?.condition === 'STICKY_ONLY') return 'STICKY';
    if (available.length <= 1) return 'NORMAL';
    // Weighted random: Normal 50%, others split remaining
    const r = Math.random();
    if (r < 0.5 || available.length === 1) return 'NORMAL';
    const others = available.filter(t => t !== 'NORMAL');
    return others[Math.floor(Math.random() * others.length)];
}

// ── Spawn a single drop ──
export function spawnDrop(ref: GameRef, forceNostril?: 0 | 1, forceType?: DropType): void {
    let nostril: 0 | 1;
    if (forceNostril !== undefined) {
        nostril = forceNostril;
    } else if (ref.challenge?.condition === 'LEFT_ONLY') {
        nostril = 0;
    } else if (ref.challenge?.condition === 'RIGHT_ONLY') {
        nostril = 1;
    } else {
        nostril = Math.random() < 0.5 ? 0 : 1;
    }

    const type = forceType || pickDropType(ref);
    const cfg = DROP_CONFIGS[type];
    const x = GAME.WIDTH / 2 + (nostril === 0 ? -GAME.NOSTRIL_OFFSET_X : GAME.NOSTRIL_OFFSET_X);
    const y = GAME.NOSE_Y + GAME.NOSTRIL_Y_OFFSET;

    // Difficulty
    let tier = DIFFICULTY_TIERS[0];
    for (const t of DIFFICULTY_TIERS) { if (ref.score >= t.score) tier = t; }
    const baseSpeed = tier.baseSpeed * cfg.speedMult;
    const finalSpeed = Math.min(baseSpeed * ref.speedMultiplier, GAME.MAX_SPEED);
    const clicks = cfg.baseClicks + tier.extraClicks;

    ref.drops.push({
        id: ref.idCounter++, type, x, y,
        speed: ref.boss.active ? finalSpeed * BOSS_CONFIG.SPEED_MULT : finalSpeed,
        radius: 25, clicksRequired: clicks, clicksReceived: 0,
        nostrilIndex: nostril, color: cfg.color, glowColor: cfg.glowColor,
        pointValue: cfg.points, heartsLost: cfg.hearts,
    });
    playSound('spawn');
}

// ── Spawn boss wave ──
function spawnBossWave(ref: GameRef): void {
    spawnDrop(ref, 0);
    spawnDrop(ref, 1);
    // Center drop
    const type = pickDropType(ref);
    const cfg = DROP_CONFIGS[type];
    let tier = DIFFICULTY_TIERS[0];
    for (const t of DIFFICULTY_TIERS) { if (ref.score >= t.score) tier = t; }
    const speed = Math.min(tier.baseSpeed * cfg.speedMult * ref.speedMultiplier * BOSS_CONFIG.SPEED_MULT, GAME.MAX_SPEED);
    ref.drops.push({
        id: ref.idCounter++, type, x: GAME.WIDTH / 2, y: GAME.NOSE_Y + GAME.NOSTRIL_Y_OFFSET,
        speed, radius: 25, clicksRequired: cfg.baseClicks + tier.extraClicks,
        clicksReceived: 0, nostrilIndex: 2, color: cfg.color, glowColor: cfg.glowColor,
        pointValue: cfg.points, heartsLost: cfg.hearts,
    });
}

// ── Create particles ──
function createParticles(ref: GameRef, x: number, y: number, color: string, count: number): void {
    for (let i = 0; i < count; i++) {
        ref.particles.push({
            id: Math.random(), x, y,
            vx: rand(-5, 5), vy: rand(-5, 5),
            life: 1.0, color, size: rand(2, 6),
        });
    }
}

// ── Spawn power-up ──
function spawnPowerUp(ref: GameRef): void {
    if (ref.powerUps.length > 0) return;
    const types = POWERUP_TYPES;
    const chosen = types[Math.floor(Math.random() * types.length)];
    ref.powerUps.push({
        id: ref.idCounter++, type: chosen.type,
        x: rand(50, GAME.WIDTH - 50), y: -20,
        vy: POWERUP_CONFIG.FALL_SPEED, radius: POWERUP_CONFIG.RADIUS,
    });
}

// ── Get effective speed factor ──
function getSpeedFactor(ref: GameRef): number {
    let factor = 1.0;
    if (ref.combo.slowMotionTimer > 0) factor *= COMBO_SLOW_MO_FACTOR;
    if (ref.activePowerUps.some(p => p.type === 'FREEZE')) factor *= COMBO_SLOW_MO_FACTOR;
    return factor;
}

// ── Main update ──
export interface UpdateCallbacks {
    onScoreChange: (s: number) => void;
    onLivesChange: (l: number) => void;
    onGameOver: () => void;
    onComboChange: (m: number, l: string) => void;
    onTimeChange: (t: number) => void;
    onProgress: (p: PlayerProgress) => void;
}

export function updateGame(ref: GameRef, deltaMs: number, progress: PlayerProgress, cb: UpdateCallbacks): void {
    if (ref.gameState !== 'PLAYING') return;
    const dt = deltaMs / 1000; // seconds
    const speedFactor = getSpeedFactor(ref);

    // ── Time Attack timer ──
    if (ref.gameMode === 'TIME_ATTACK') {
        ref.timeRemaining -= dt;
        cb.onTimeChange(ref.timeRemaining);
        if (ref.timeRemaining <= 0) {
            ref.timeRemaining = 0;
            ref.gameState = 'GAME_OVER';
            playSound('gameover');
            cb.onGameOver();
            return;
        }
    }

    // ── Survival speed ramp ──
    if (ref.gameMode === 'SURVIVAL') {
        ref.survivalSpeedTimer += dt;
        if (ref.survivalSpeedTimer >= 5) {
            ref.survivalSpeedTimer -= 5;
            ref.speedMultiplier += 0.15;
        }
    }

    // ── Drop spawning ──
    if (ref.drops.length === 0 && !ref.boss.active) {
        ref.dropSpawnTimer -= dt;
        if (ref.dropSpawnTimer <= 0) {
            spawnDrop(ref);
            ref.dropSpawnTimer = 999; // reset, will be set on next clear
        }
    }

    // ── Boss logic ──
    if (ref.score >= BOSS_CONFIG.TRIGGER_SCORE && !ref.bossTriggered &&
        ref.level >= BOSS_UNLOCK_LEVEL && ref.gameMode !== 'TIME_ATTACK') {
        ref.bossTriggered = true;
        ref.boss.warningTimer = BOSS_CONFIG.WARNING_TIME;
        ref.boss.wavesRemaining = BOSS_CONFIG.WAVES;
        playSound('boss_warning');
    }

    if (ref.boss.warningTimer > 0) {
        ref.boss.warningTimer -= dt;
        if (ref.boss.warningTimer <= 0) {
            ref.boss.active = true;
            ref.drops = [];
            spawnBossWave(ref);
        }
    }

    if (ref.boss.reliefTimer > 0) {
        ref.boss.reliefTimer -= dt;
        if (ref.boss.reliefTimer <= 0) ref.boss.reliefTimer = 0;
    }

    // Boss: spawn next wave if all drops gone
    if (ref.boss.active && ref.drops.length === 0) {
        if (ref.boss.wavesRemaining > 0) {
            ref.boss.wavesRemaining--;
            spawnBossWave(ref);
        } else {
            ref.boss.active = false;
            ref.boss.reliefTimer = BOSS_CONFIG.RELIEF_TIME;
            ref.dropSpawnTimer = BOSS_CONFIG.RELIEF_TIME;
        }
    }

    // ── Move drops ──
    for (let i = ref.drops.length - 1; i >= 0; i--) {
        const drop = ref.drops[i];
        drop.y += drop.speed * speedFactor * (deltaMs / 16);

        // Hit plate
        if (drop.y + drop.radius >= GAME.PLATE_Y) {
            createParticles(ref, drop.x, GAME.PLATE_Y, drop.color, 20);
            ref.shake = 10;
            playSound('splash');

            // Shield check
            const shieldIdx = ref.activePowerUps.findIndex(p => p.type === 'SHIELD');
            if (shieldIdx >= 0) {
                ref.activePowerUps.splice(shieldIdx, 1);
                ref.drops.splice(i, 1);
                continue;
            }

            const heartsLost = drop.heartsLost;
            ref.lives -= heartsLost;
            cb.onLivesChange(ref.lives);

            // Reset combo
            ref.combo.streak = 0;
            ref.combo.multiplier = 1;
            ref.combo.label = '';
            cb.onComboChange(1, '');

            // Angry face
            ref.expression = 'ANGRY';
            ref.expressionTimer = 2;

            ref.drops.splice(i, 1);

            if (ref.lives <= 0) {
                ref.lives = 0;
                ref.gameState = 'GAME_OVER';
                playSound('gameover');
                cb.onGameOver();
                return;
            }

            // Challenge: NO_MISS fails on miss
            if (ref.challenge?.condition === 'NO_MISS') {
                ref.challenge.progress = 0;
            }

            if (!ref.boss.active) {
                ref.dropSpawnTimer = GAME.DROP_SPAWN_DELAY_MISS;
            }
        }
    }

    // ── Tissue auto-wipe ──
    if (ref.activePowerUps.some(p => p.type === 'TISSUE') && ref.drops.length > 0) {
        const drop = ref.drops[0];
        drop.clicksReceived = drop.clicksRequired; // instant wipe
        wipeDrop(ref, drop, progress, cb);
    }

    // ── Power-up spawning ──
    ref.powerUpSpawnTimer -= dt;
    if (ref.powerUpSpawnTimer <= 0) {
        spawnPowerUp(ref);
        ref.powerUpSpawnTimer = rand(POWERUP_CONFIG.SPAWN_MIN, POWERUP_CONFIG.SPAWN_MAX);
    }

    // ── Move power-ups ──
    for (let i = ref.powerUps.length - 1; i >= 0; i--) {
        ref.powerUps[i].y += ref.powerUps[i].vy * (deltaMs / 16);
        if (ref.powerUps[i].y > GAME.HEIGHT + 30) ref.powerUps.splice(i, 1);
    }

    // ── Update active power-up timers ──
    for (let i = ref.activePowerUps.length - 1; i >= 0; i--) {
        const ap = ref.activePowerUps[i];
        if (ap.remaining > 0) {
            ap.remaining -= dt;
            if (ap.remaining <= 0) ref.activePowerUps.splice(i, 1);
        }
    }

    // ── Combo slow-mo timer ──
    if (ref.combo.slowMotionTimer > 0) ref.combo.slowMotionTimer -= dt;
    if (ref.combo.displayTimer > 0) ref.combo.displayTimer -= dt;

    // ── Expression timer ──
    if (ref.expressionTimer > 0) {
        ref.expressionTimer -= dt;
        if (ref.expressionTimer <= 0) ref.expression = 'NEUTRAL';
    }

    // ── Weather ──
    updateWeather(ref, dt);

    // ── Sneeze ──
    ref.sneezeCooldown -= dt;
    if (ref.sneezeCooldown <= 0 && ref.gameMode !== 'TIME_ATTACK') {
        ref.sneezeCooldown = SNEEZE_COOLDOWN + rand(-10, 10);
        ref.expression = 'SNEEZE';
        ref.expressionTimer = 1.5;
        ref.shake = 15;
        playSound('sneeze');
        for (let i = 0; i < SNEEZE_DROP_COUNT; i++) {
            spawnDrop(ref, Math.random() < 0.5 ? 0 : 1);
        }
    }

    // ── Particles ──
    ref.particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.2; p.life -= 0.02;
    });
    ref.particles = ref.particles.filter(p => p.life > 0);

    // ── Shake decay ──
    if (ref.shake > 0) {
        ref.shake *= 0.9;
        if (ref.shake < 0.5) ref.shake = 0;
    }

    // ── Snow animation ──
    if (ref.weather.type === 'COLD') {
        ref.weather.snowflakes.forEach(s => {
            s.y += s.speed * (deltaMs / 16);
            s.x += Math.sin(Date.now() / 1000 + s.drift) * 0.3;
            if (s.y > GAME.HEIGHT) { s.y = -5; s.x = rand(0, GAME.WIDTH); }
        });
    }

    // ── Level-up display timer ──
    if (ref.levelUpDisplay.show) {
        ref.levelUpDisplay.timer -= dt;
        if (ref.levelUpDisplay.timer <= 0) ref.levelUpDisplay.show = false;
    }

    // ── Challenge: BOSS_SURVIVE timer ──
    if (ref.challenge?.condition === 'BOSS_SURVIVE' && ref.boss.active) {
        ref.challenge.progress += dt;
        if (ref.challenge.progress >= ref.challenge.target) ref.challenge.completed = true;
    }
}

function updateWeather(ref: GameRef, dt: number): void {
    if (ref.weather.type !== 'NONE') {
        ref.weather.timer -= dt;
        if (ref.weather.type === 'DUST') {
            ref.weather.dustOpacity = Math.min(0.4, ref.weather.dustOpacity + dt * 0.3);
        }
        if (ref.weather.timer <= 0) {
            if (ref.weather.type === 'DUST') {
                // Sneeze after dust
                ref.expression = 'SNEEZE';
                ref.expressionTimer = 1.5;
                ref.shake = 15;
                playSound('sneeze');
                for (let i = 0; i < WEATHER_CONFIG.DUST_DROPS; i++) {
                    spawnDrop(ref, Math.random() < 0.5 ? 0 : 1);
                }
            }
            ref.weather.type = 'NONE';
            ref.weather.dustOpacity = 0;
            ref.weather.snowflakes = [];
            ref.weather.cooldown = ref.weather.cooldown; // will be set below
        }
    } else {
        ref.weather.cooldown -= dt;
        if (ref.weather.cooldown <= 0) {
            // Pick weather
            if (Math.random() < 0.6) {
                ref.weather.type = 'COLD';
                ref.weather.timer = WEATHER_CONFIG.COLD_DURATION;
                ref.weather.cooldown = WEATHER_CONFIG.COLD_COOLDOWN;
                ref.weather.snowflakes = Array.from({ length: WEATHER_CONFIG.SNOWFLAKE_COUNT }, () => ({
                    x: rand(0, GAME.WIDTH), y: rand(0, GAME.HEIGHT),
                    speed: rand(0.5, 2), size: rand(1.5, 4), drift: rand(0, 6.28),
                }));
            } else {
                ref.weather.type = 'DUST';
                ref.weather.timer = WEATHER_CONFIG.DUST_DURATION;
                ref.weather.cooldown = WEATHER_CONFIG.DUST_COOLDOWN;
                ref.weather.dustOpacity = 0;
            }
        }
    }
}

// ── Wipe a drop (called when clicks are fulfilled) ──
function wipeDrop(ref: GameRef, drop: Drop, progress: PlayerProgress, cb: UpdateCallbacks): void {
    createParticles(ref, drop.x, drop.y, drop.color, 10);
    ref.drops = ref.drops.filter(d => d.id !== drop.id);

    // Score
    const points = drop.pointValue * ref.combo.multiplier;
    ref.score += points;
    cb.onScoreChange(ref.score);

    // Combo
    ref.combo.streak++;
    let newTier = null;
    for (const tier of COMBO_TIERS) {
        if (ref.combo.streak >= tier.streak) newTier = tier;
    }
    if (newTier && newTier.multiplier > ref.combo.multiplier) {
        ref.combo.multiplier = newTier.multiplier;
        ref.combo.label = newTier.label;
        ref.combo.displayTimer = COMBO_DISPLAY_DURATION;
        if (newTier.multiplier >= 5) {
            ref.combo.slowMotionTimer = COMBO_SLOW_MO_DURATION;
            playSound('super_wipe');
        } else {
            playSound('combo');
        }
        cb.onComboChange(newTier.multiplier, newTier.label);
        ref.expression = 'HAPPY';
        ref.expressionTimer = 2;
    }

    // Speed multiplier
    ref.speedMultiplier = Math.min(ref.speedMultiplier + 0.05, 2.5);

    // XP & Level
    const xpResult = addXP(progress, ref.combo.multiplier);
    if (xpResult.leveledUp) {
        ref.level = xpResult.newLevel;
        ref.unlockedDropTypes = getUnlockedDropTypes(ref.level);
        ref.levelUpDisplay = { show: true, level: xpResult.newLevel, unlock: xpResult.unlock, timer: 2.5 };
        playSound('level_up');
        cb.onProgress(progress);
    }

    // Challenge progress
    if (ref.challenge) {
        if (ref.challenge.condition === 'NO_MISS') ref.challenge.progress++;
        if (ref.challenge.condition === 'LEFT_ONLY' && drop.nostrilIndex === 0) ref.challenge.progress++;
        if (ref.challenge.condition === 'RIGHT_ONLY' && drop.nostrilIndex === 1) ref.challenge.progress++;
        if (ref.challenge.condition === 'STICKY_ONLY' && drop.type === 'STICKY') ref.challenge.progress++;
        if (ref.challenge.progress >= ref.challenge.target) ref.challenge.completed = true;
    }

    // Spawn next if not boss
    if (!ref.boss.active && ref.drops.length === 0) {
        ref.dropSpawnTimer = GAME.DROP_SPAWN_DELAY;
    }
}

// ── Handle tap ──
export function handleTap(ref: GameRef, canvasX: number, canvasY: number, progress: PlayerProgress, cb: UpdateCallbacks): void {
    if (ref.gameState !== 'PLAYING') return;

    // Check power-up collection first
    for (let i = ref.powerUps.length - 1; i >= 0; i--) {
        const pu = ref.powerUps[i];
        const dx = canvasX - pu.x, dy = canvasY - pu.y;
        if (Math.sqrt(dx * dx + dy * dy) < pu.radius * 1.5) {
            // Collect!
            playSound('powerup');
            createParticles(ref, pu.x, pu.y, '#fbbf24', 8);
            if (pu.type === 'EXTRA_HEART') {
                ref.lives = Math.min(ref.lives + 1, GAME.MAX_LIVES);
                cb.onLivesChange(ref.lives);
            } else if (pu.type === 'SHIELD') {
                ref.activePowerUps = ref.activePowerUps.filter(p => p.type !== 'SHIELD');
                ref.activePowerUps.push({ type: 'SHIELD', remaining: -1, uses: 1 });
            } else if (pu.type === 'TISSUE') {
                ref.activePowerUps = ref.activePowerUps.filter(p => p.type !== 'TISSUE');
                ref.activePowerUps.push({ type: 'TISSUE', remaining: POWERUP_CONFIG.TISSUE_DURATION });
            } else if (pu.type === 'FREEZE') {
                ref.activePowerUps = ref.activePowerUps.filter(p => p.type !== 'FREEZE');
                ref.activePowerUps.push({ type: 'FREEZE', remaining: POWERUP_CONFIG.FREEZE_DURATION });
                playSound('freeze');
            }
            ref.powerUps.splice(i, 1);
            return;
        }
    }

    // Check drop hits
    let hitAny = false;
    for (const drop of ref.drops) {
        const dx = canvasX - drop.x, dy = canvasY - drop.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < drop.radius * 1.5) {
            hitAny = true;
            drop.clicksReceived++;
            playSound('wipe');
            createParticles(ref, canvasX, canvasY, drop.glowColor, 3);
            drop.radius *= 0.95;

            if (drop.clicksReceived >= drop.clicksRequired) {
                wipeDrop(ref, drop, progress, cb);
            }
            break; // Only hit one drop per tap
        }
    }

    if (!hitAny && ref.drops.length > 0) {
        // Wrong side / miss tap - just a buzz
        playSound('wrong_side');
    }
}
