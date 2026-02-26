import type { GameRef, Drop, Particle, FaceExpression } from './types';
import { GAME, POWERUP_TYPES } from './constants';

const TAU = Math.PI * 2;

export function drawGame(ctx: CanvasRenderingContext2D, ref: GameRef): void {
    const W = GAME.WIDTH, H = GAME.HEIGHT;
    ctx.fillStyle = '#fefce8';
    ctx.fillRect(0, 0, W, H);

    const sx = (Math.random() - 0.5) * ref.shake;
    const sy = (Math.random() - 0.5) * ref.shake;
    ctx.save();
    ctx.translate(sx, sy);

    // Weather background
    drawWeather(ctx, ref);

    // Boss tint
    if (ref.boss.active) {
        ctx.fillStyle = 'rgba(255,0,0,0.05)';
        ctx.fillRect(0, 0, W, H);
    }

    drawNose(ctx, ref);
    drawPlate(ctx, ref);
    ref.drops.forEach(d => drawDrop(ctx, d));
    ref.powerUps.forEach(p => drawPowerUpItem(ctx, p));
    ref.particles.forEach(p => drawParticle(ctx, p));

    if (ref.combo.displayTimer > 0) drawComboText(ctx, ref);
    if (ref.boss.warningTimer > 0) drawBossWarning(ctx, ref);
    if (ref.levelUpDisplay.show) drawLevelUp(ctx, ref);
    if (ref.expression === 'SNEEZE' && ref.expressionTimer > 0.5) drawSneezeText(ctx);
    drawActivePowerUpIcons(ctx, ref);

    ctx.restore();
}

function drawNose(ctx: CanvasRenderingContext2D, ref: GameRef): void {
    const cx = GAME.WIDTH / 2, ny = GAME.NOSE_Y;
    const isB = ref.boss.active;
    ctx.fillStyle = isB ? '#ef4444' : '#fca5a5';
    ctx.beginPath();
    ctx.ellipse(cx, ny, GAME.NOSE_WIDTH / 2, GAME.NOSE_HEIGHT / 2, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = isB ? '#b91c1c' : '#f87171';
    ctx.lineWidth = 4;
    ctx.stroke();

    if (isB) {
        ctx.save();
        ctx.globalAlpha = 0.3 + 0.2 * Math.sin(Date.now() / 200);
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.ellipse(cx, ny, GAME.NOSE_WIDTH / 2 + 5, GAME.NOSE_HEIGHT / 2 + 5, 0, 0, TAU);
        ctx.stroke();
        ctx.restore();
    }

    ctx.fillStyle = '#7f1d1d';
    ctx.beginPath();
    ctx.ellipse(cx - GAME.NOSTRIL_OFFSET_X, ny + GAME.NOSTRIL_Y_OFFSET, 15, 25, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + GAME.NOSTRIL_OFFSET_X, ny + GAME.NOSTRIL_Y_OFFSET, 15, 25, 0, 0, TAU);
    ctx.fill();

    drawExpression(ctx, ref.expression, cx, ny);
}

function drawExpression(ctx: CanvasRenderingContext2D, expr: FaceExpression, cx: number, ny: number): void {
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    if (expr === 'ANGRY') {
        ctx.strokeStyle = '#7f1d1d';
        ctx.beginPath(); ctx.moveTo(cx - 60, ny - 55); ctx.lineTo(cx - 30, ny - 45); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + 60, ny - 55); ctx.lineTo(cx + 30, ny - 45); ctx.stroke();
    } else if (expr === 'HAPPY') {
        ctx.strokeStyle = '#f87171';
        ctx.beginPath(); ctx.arc(cx, ny + 60, 30, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
    } else if (expr === 'SNEEZE') {
        ctx.strokeStyle = '#7f1d1d';
        ctx.beginPath(); ctx.moveTo(cx - 50, ny - 45); ctx.lineTo(cx - 25, ny - 50); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + 50, ny - 45); ctx.lineTo(cx + 25, ny - 50); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - 25, ny + 65);
        ctx.quadraticCurveTo(cx - 12, ny + 55, cx, ny + 65);
        ctx.quadraticCurveTo(cx + 12, ny + 75, cx + 25, ny + 65);
        ctx.stroke();
    }
}

function drawPlate(ctx: CanvasRenderingContext2D, ref: GameRef): void {
    const cx = GAME.WIDTH / 2, py = GAME.PLATE_Y + 20;
    const hasShield = ref.activePowerUps.some(p => p.type === 'SHIELD');

    if (hasShield) {
        ctx.save();
        ctx.globalAlpha = 0.4 + 0.2 * Math.sin(Date.now() / 300);
        ctx.shadowColor = '#60a5fa';
        ctx.shadowBlur = 25;
        ctx.fillStyle = '#60a5fa';
        ctx.beginPath();
        ctx.ellipse(cx, py, GAME.PLATE_WIDTH / 2 + 10, GAME.PLATE_HEIGHT / 2 + 10, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
    }

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(cx, py, GAME.PLATE_WIDTH / 2, GAME.PLATE_HEIGHT / 2, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(cx, py, GAME.PLATE_WIDTH / 2 - 20, GAME.PLATE_HEIGHT / 2 - 10, 0, 0, TAU);
    ctx.strokeStyle = '#cbd5e1';
    ctx.stroke();

    if (ref.lives > 0) {
        ctx.fillStyle = '#16a34a';
        ctx.beginPath(); ctx.arc(cx - 40, py, 15, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ea580c';
        ctx.beginPath(); ctx.arc(cx + 30, py - 10, 18, 0, TAU); ctx.fill();
        ctx.fillStyle = '#854d0e';
        ctx.beginPath(); ctx.arc(cx, py + 10, 20, 0, TAU); ctx.fill();
    } else {
        ctx.fillStyle = '#84cc16';
        ctx.beginPath();
        ctx.ellipse(cx, py, GAME.PLATE_WIDTH / 2 - 10, GAME.PLATE_HEIGHT / 2 - 5, 0, 0, TAU);
        ctx.fill();
    }
}

function drawDrop(ctx: CanvasRenderingContext2D, drop: Drop): void {
    // Glow
    ctx.save();
    ctx.shadowColor = drop.glowColor;
    ctx.shadowBlur = 12;
    ctx.fillStyle = drop.color;
    ctx.beginPath();
    ctx.arc(drop.x, drop.y, drop.radius, 0, TAU);
    ctx.fill();
    ctx.restore();

    // Tail
    ctx.fillStyle = drop.color;
    ctx.beginPath();
    ctx.moveTo(drop.x - drop.radius * 0.8, drop.y - drop.radius * 0.2);
    ctx.lineTo(drop.x, drop.y - drop.radius * 2.5);
    ctx.lineTo(drop.x + drop.radius * 0.8, drop.y - drop.radius * 0.2);
    ctx.fill();

    // Highlight
    ctx.fillStyle = drop.glowColor;
    ctx.beginPath();
    ctx.arc(drop.x - drop.radius * 0.3, drop.y - drop.radius * 0.3, drop.radius * 0.25, 0, TAU);
    ctx.fill();

    // Type indicator emoji
    const cfg = { NORMAL: '🟢', FAST: '🔵', STICKY: '🟡', INFECTION: '🔴' };
    ctx.font = `${drop.radius * 0.8}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(cfg[drop.type] || '', drop.x, drop.y + 2);

    // Click progress ring
    if (drop.clicksReceived > 0) {
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(drop.x, drop.y, drop.radius + 2, -Math.PI / 2,
            -Math.PI / 2 + (drop.clicksReceived / drop.clicksRequired) * TAU);
        ctx.stroke();
    }
}

function drawPowerUpItem(ctx: CanvasRenderingContext2D, pu: any): void {
    const cfg = POWERUP_TYPES.find(p => p.type === pu.type);
    if (!cfg) return;

    ctx.save();
    ctx.shadowColor = cfg.color;
    ctx.shadowBlur = 15;
    ctx.fillStyle = cfg.color;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.arc(pu.x, pu.y, pu.radius + 5, 0, TAU);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(pu.x, pu.y, pu.radius, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = cfg.color;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = `${pu.radius * 1.2}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(cfg.emoji, pu.x, pu.y + 2);
}

function drawParticle(ctx: CanvasRenderingContext2D, p: Particle): void {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.life;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1.0;
}

function drawComboText(ctx: CanvasRenderingContext2D, ref: GameRef): void {
    const alpha = Math.min(1, ref.combo.displayTimer / 0.3);
    const scale = 1 + (1 - alpha) * 0.3;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(GAME.WIDTH / 2, 350);
    ctx.scale(scale, scale);
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = ref.combo.multiplier >= 5 ? '#ef4444' : ref.combo.multiplier >= 3 ? '#f59e0b' : '#84cc16';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.strokeText(ref.combo.label, 0, 0);
    ctx.fillText(ref.combo.label, 0, 0);
    ctx.restore();
}

function drawBossWarning(ctx: CanvasRenderingContext2D, ref: GameRef): void {
    const flash = Math.sin(Date.now() / 100) > 0;
    if (!flash) return;
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ef4444';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.strokeText('⚠️ BOSS!', GAME.WIDTH / 2, GAME.HEIGHT / 2);
    ctx.fillText('⚠️ BOSS!', GAME.WIDTH / 2, GAME.HEIGHT / 2);
    ctx.restore();
}

function drawLevelUp(ctx: CanvasRenderingContext2D, ref: GameRef): void {
    const d = ref.levelUpDisplay;
    const alpha = Math.min(1, d.timer / 0.5);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fbbf24';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.strokeText(`LEVEL ${d.level}!`, GAME.WIDTH / 2, 450);
    ctx.fillText(`LEVEL ${d.level}!`, GAME.WIDTH / 2, 450);
    if (d.unlock) {
        ctx.font = 'bold 18px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(d.unlock, GAME.WIDTH / 2, 485);
    }
    ctx.restore();
}

function drawSneezeText(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ef4444';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.strokeText('ACHOO!', GAME.WIDTH / 2, 250);
    ctx.fillText('ACHOO!', GAME.WIDTH / 2, 250);
    ctx.restore();
}

function drawActivePowerUpIcons(ctx: CanvasRenderingContext2D, ref: GameRef): void {
    if (ref.activePowerUps.length === 0) return;
    let x = GAME.WIDTH / 2 - (ref.activePowerUps.length * 22);
    ref.activePowerUps.forEach(ap => {
        const cfg = POWERUP_TYPES.find(p => p.type === ap.type);
        if (!cfg) return;
        ctx.font = '18px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(cfg.emoji, x + 11, GAME.HEIGHT - 30);
        if (ap.remaining > 0) {
            ctx.font = 'bold 10px sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(`${Math.ceil(ap.remaining)}s`, x + 11, GAME.HEIGHT - 15);
        }
        x += 44;
    });
}

function drawWeather(ctx: CanvasRenderingContext2D, ref: GameRef): void {
    if (ref.weather.type === 'COLD') {
        ctx.fillStyle = 'rgba(200,230,255,0.15)';
        ctx.fillRect(0, 0, GAME.WIDTH, GAME.HEIGHT);
        ctx.fillStyle = '#ffffff';
        ref.weather.snowflakes.forEach(s => {
            ctx.globalAlpha = 0.7;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, TAU);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
    } else if (ref.weather.type === 'DUST') {
        ctx.fillStyle = `rgba(180,140,80,${ref.weather.dustOpacity})`;
        ctx.fillRect(0, 0, GAME.WIDTH, GAME.HEIGHT);
    }
}
