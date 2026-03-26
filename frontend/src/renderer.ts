import type { GameRef, Drop, Particle, FaceExpression } from './types';
import { GAME, POWERUP_TYPES, SKINS } from './constants';

const TAU = Math.PI * 2;

function getSkinColors(skinId: string, category: 'plate' | 'nose' | 'background'): { primary: string, secondary: string, accent?: string } {
    const skin = SKINS[skinId as keyof typeof SKINS];
    if (skin && skin.category === category) return skin.colors;
    // Default colors
    const defaults: Record<string, { primary: string, secondary: string, accent?: string }> = {
        plate: { primary: '#ffffff', secondary: '#94a3b8', accent: '#cbd5e1' },
        nose: { primary: '#fca5a5', secondary: '#f87171', accent: '#7f1d1d' },
        background: { primary: '#fefce8', secondary: '#fef9c3' },
    };
    return defaults[category];
}

export function drawGame(ctx: CanvasRenderingContext2D, ref: GameRef): void {
    const W = GAME.WIDTH, H = GAME.HEIGHT;
    
    // Background with skin
    const bgColors = getSkinColors(ref.equippedSkins.background, 'background');
    const gradient = ctx.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, bgColors.primary);
    gradient.addColorStop(1, bgColors.secondary);
    ctx.fillStyle = gradient;
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
    const noseColors = getSkinColors(ref.equippedSkins.nose, 'nose');
    
    // Drop shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetY = 10;
    
    // Main nose gradient (3D effect)
    const grad = ctx.createRadialGradient(cx, ny - 10, GAME.NOSE_HEIGHT * 0.1, cx, ny, GAME.NOSE_HEIGHT * 0.6);
    grad.addColorStop(0, isB ? '#f87171' : noseColors.secondary);
    grad.addColorStop(0.7, isB ? '#ef4444' : noseColors.primary);
    grad.addColorStop(1, isB ? '#b91c1c' : noseColors.accent || '#7f1d1d');
    
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, ny, GAME.NOSE_WIDTH / 2, GAME.NOSE_HEIGHT / 2, 0, 0, TAU);
    ctx.fill();
    ctx.restore(); // restore to remove shadow for inner elements

    // Soft border highlight instead of hard stroke
    ctx.strokeStyle = `rgba(255, 255, 255, ${isB ? 0.2 : 0.4})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(cx, ny, GAME.NOSE_WIDTH / 2 - 2, GAME.NOSE_HEIGHT / 2 - 2, 0, 0, TAU);
    ctx.stroke();

    if (isB) {
        ctx.save();
        ctx.globalAlpha = 0.4 + 0.3 * Math.sin(Date.now() / 200);
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 30;
        ctx.beginPath();
        ctx.ellipse(cx, ny, GAME.NOSE_WIDTH / 2, GAME.NOSE_HEIGHT / 2, 0, 0, TAU);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 5;
        ctx.stroke();
        ctx.restore();
    }

    // Nostrils with inner shadow effect via gradients
    const drawNostril = (nx: number, ny: number) => {
        const nGrad = ctx.createLinearGradient(nx, ny - 15, nx, ny + 15);
        nGrad.addColorStop(0, '#000000');
        nGrad.addColorStop(1, noseColors.accent || '#450a0a');
        ctx.fillStyle = nGrad;
        ctx.beginPath();
        ctx.ellipse(nx, ny, 15, 25, 0, 0, TAU);
        ctx.fill();
    };

    drawNostril(cx - GAME.NOSTRIL_OFFSET_X, ny + GAME.NOSTRIL_Y_OFFSET);
    drawNostril(cx + GAME.NOSTRIL_OFFSET_X, ny + GAME.NOSTRIL_Y_OFFSET);

    // Subtle highlight on top of nose for volume
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.ellipse(cx, ny - 30, GAME.NOSE_WIDTH * 0.3, GAME.NOSE_HEIGHT * 0.1, 0, 0, TAU);
    ctx.fill();

    drawExpression(ctx, ref.expression, cx, ny, noseColors);
}

function drawExpression(ctx: CanvasRenderingContext2D, expr: FaceExpression, cx: number, ny: number, noseColors: { primary: string; secondary: string; accent?: string }): void {
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    const accentColor = noseColors.accent || '#7f1d1d';
    if (expr === 'ANGRY') {
        ctx.strokeStyle = accentColor;
        ctx.beginPath(); ctx.moveTo(cx - 60, ny - 55); ctx.lineTo(cx - 30, ny - 45); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + 60, ny - 55); ctx.lineTo(cx + 30, ny - 45); ctx.stroke();
    } else if (expr === 'HAPPY') {
        ctx.strokeStyle = noseColors.secondary;
        ctx.beginPath(); ctx.arc(cx, ny + 60, 30, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
    } else if (expr === 'SNEEZE') {
        ctx.strokeStyle = accentColor;
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
    const plateColors = getSkinColors(ref.equippedSkins.plate, 'plate');

    // Bulge effect on impact
    const shakeScale = 1 + (ref.shake > 0 ? Math.sin(Date.now() / 30) * (ref.shake / 60) : 0);
    ctx.save();
    ctx.translate(cx, py);
    ctx.scale(shakeScale, shakeScale);
    ctx.translate(-cx, -py);

    if (hasShield) {
        ctx.save();
        ctx.globalAlpha = 0.5 + 0.2 * Math.sin(Date.now() / 300);
        ctx.shadowColor = '#60a5fa';
        ctx.shadowBlur = 30;
        ctx.fillStyle = 'rgba(96, 165, 250, 0.3)';
        ctx.beginPath();
        ctx.ellipse(cx, py, GAME.PLATE_WIDTH / 2 + 15, GAME.PLATE_HEIGHT / 2 + 15, 0, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = 'rgba(147, 197, 253, 0.8)';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
    }

    // Plate shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 25;
    ctx.shadowOffsetY = 15;
    
    // Plate base gradient
    const pGrad = ctx.createLinearGradient(cx, py - GAME.PLATE_HEIGHT/2, cx, py + GAME.PLATE_HEIGHT/2);
    pGrad.addColorStop(0, plateColors.primary);
    pGrad.addColorStop(1, plateColors.secondary);
    
    ctx.fillStyle = pGrad;
    ctx.beginPath();
    ctx.ellipse(cx, py, GAME.PLATE_WIDTH / 2, GAME.PLATE_HEIGHT / 2, 0, 0, TAU);
    ctx.fill();
    ctx.restore(); // clear shadow

    // Inner rim gradient for 3D depth
    const innerGrad = ctx.createLinearGradient(cx, py - GAME.PLATE_HEIGHT/2, cx, py + GAME.PLATE_HEIGHT/2);
    innerGrad.addColorStop(0, plateColors.secondary);
    innerGrad.addColorStop(1, plateColors.primary);
    
    ctx.fillStyle = innerGrad;
    ctx.beginPath();
    ctx.ellipse(cx, py, GAME.PLATE_WIDTH / 2 - 15, GAME.PLATE_HEIGHT / 2 - 8, 0, 0, TAU);
    ctx.fill();

    // Subtle edge highlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, py, GAME.PLATE_WIDTH / 2 - 2, GAME.PLATE_HEIGHT / 2 - 2, 0, 0, TAU);
    ctx.stroke();

    if (ref.lives > 0) {
        // Draw 3D food items
        const drawFood = (fx: number, fy: number, r: number, cMain: string, cDark: string, cLight: string) => {
            const fGrad = ctx.createRadialGradient(fx - r*0.3, fy - r*0.3, r*0.1, fx, fy, r);
            fGrad.addColorStop(0, cLight);
            fGrad.addColorStop(0.5, cMain);
            fGrad.addColorStop(1, cDark);
            
            ctx.save();
            ctx.shadowColor = 'rgba(0,0,0,0.3)';
            ctx.shadowBlur = 8;
            ctx.shadowOffsetY = 4;
            ctx.fillStyle = fGrad;
            ctx.beginPath(); ctx.arc(fx, fy, r, 0, TAU); ctx.fill();
            ctx.restore();
            
            // tiny gloss
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.beginPath(); ctx.ellipse(fx - r*0.4, fy - r*0.4, r*0.3, r*0.15, -Math.PI/4, 0, TAU); ctx.fill();
        };
        
        drawFood(cx - 40, py, 15, '#16a34a', '#14532d', '#4ade80');
        drawFood(cx + 30, py - 10, 18, '#ea580c', '#7c2d12', '#fb923c');
        drawFood(cx, py + 10, 20, '#854d0e', '#422006', '#ca8a04');
    } else {
        // Contaminated plate
        ctx.fillStyle = 'rgba(132, 204, 22, 0.5)';
        ctx.beginPath();
        ctx.ellipse(cx, py, GAME.PLATE_WIDTH / 2 - 10, GAME.PLATE_HEIGHT / 2 - 5, 0, 0, TAU);
        ctx.fill();
        
        ctx.fillStyle = 'rgba(101, 163, 13, 0.8)';
        for (let i=0; i<8; i++) {
            ctx.beginPath(); 
            ctx.arc(cx + Math.cos(i) * 30, py + Math.sin(i*2) * 10, 5 + i, 0, TAU); 
            ctx.fill();
        }
    }
    ctx.restore(); // restore plate shake scale
}

function drawDrop(ctx: CanvasRenderingContext2D, drop: Drop): void {
    const r = drop.radius;

    // Visual Squash and Stretch
    const velocityScale = Math.max(1, drop.speed / 400); // Stretch based on speed
    const stretchY = drop.clicksReceived > 0 ? 0.8 : (drop.speed > 50 ? velocityScale : 1);
    const stretchX = drop.clicksReceived > 0 ? 1.2 : 1 / Math.sqrt(stretchY); // Preserve volume, squash on click

    ctx.save(); // Squash & Stretch state
    ctx.translate(drop.x, drop.y);
    ctx.scale(stretchX, stretchY);
    ctx.translate(-drop.x, -drop.y);

    // Flash effect when clicked
    const flashAlpha = drop.clicksReceived > 0 ? Math.min(1, drop.clicksReceived / drop.clicksRequired) : 0;

    // Outer Glow / Drop shadow
    ctx.save();
    ctx.shadowColor = drop.glowColor;
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 5;
    
    // Tail with gradient
    const tailGrad = ctx.createLinearGradient(drop.x, drop.y, drop.x, drop.y - r * 3);
    tailGrad.addColorStop(0, drop.color);
    tailGrad.addColorStop(1, 'rgba(255,255,255,0)');
    
    ctx.fillStyle = tailGrad;
    ctx.beginPath();
    ctx.moveTo(drop.x - r * 0.7, drop.y);
    ctx.quadraticCurveTo(drop.x, drop.y - r * 1.5, drop.x, drop.y - r * 3);
    ctx.quadraticCurveTo(drop.x, drop.y - r * 1.5, drop.x + r * 0.7, drop.y);
    ctx.fill();

    // Orb base (radial gradient for 3D sphere)
    const orbGrad = ctx.createRadialGradient(drop.x - r*0.3, drop.y - r*0.3, r*0.1, drop.x, drop.y, r);
    orbGrad.addColorStop(0, '#ffffff');
    orbGrad.addColorStop(0.3, drop.color);
    orbGrad.addColorStop(1, drop.glowColor);
    
    ctx.fillStyle = orbGrad;
    ctx.beginPath();
    ctx.arc(drop.x, drop.y, r, 0, TAU);
    ctx.fill();
    ctx.restore(); // restore shadows

    // Glossy reflection on top
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.ellipse(drop.x - r*0.3, drop.y - r*0.4, r*0.4, r*0.2, -Math.PI/6, 0, TAU);
    ctx.fill();

    // White flash on hit
    if (flashAlpha > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha * 0.8})`;
        ctx.beginPath();
        ctx.arc(drop.x, drop.y, r, 0, TAU);
        ctx.fill();
    }

    ctx.restore(); // restore Squash & Stretch state

    // Type indicator emoji (drawn outside squash/stretch so text doesn't distort)
    const cfg = { NORMAL: '🟢', FAST: '🔵', STICKY: '🟡', INFECTION: '🔴' };
    ctx.font = `${r * 0.8}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(cfg[drop.type] || '', drop.x, drop.y + 2);

    // Click progress ring
    if (drop.clicksReceived > 0) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(drop.x, drop.y, r + 4, -Math.PI / 2,
            -Math.PI / 2 + (drop.clicksReceived / drop.clicksRequired) * TAU);
        ctx.stroke();
    }
}

function drawPowerUpItem(ctx: CanvasRenderingContext2D, pu: any): void {
    const cfg = POWERUP_TYPES.find(p => p.type === pu.type);
    if (!cfg) return;
    
    const r = pu.radius;
    const pulse = 1 + 0.1 * Math.sin(Date.now() / 150);

    // Bouncing aura
    ctx.save();
    ctx.shadowColor = cfg.color;
    ctx.shadowBlur = 25;
    ctx.fillStyle = cfg.color;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.arc(pu.x, pu.y, r * 1.5 * pulse, 0, TAU);
    ctx.fill();
    ctx.restore();

    // 3D Glass Pill background
    const pGrad = ctx.createRadialGradient(pu.x - r*0.3, pu.y - r*0.3, r*0.1, pu.x, pu.y, r);
    pGrad.addColorStop(0, '#ffffff');
    pGrad.addColorStop(0.3, cfg.color);
    pGrad.addColorStop(1, '#0f172a');
    
    ctx.fillStyle = pGrad;
    ctx.beginPath();
    ctx.arc(pu.x, pu.y, r, 0, TAU);
    ctx.fill();

    // Inner rim highlight
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pu.x, pu.y, r - 2, 0, TAU);
    ctx.stroke();

    // Emoji
    ctx.font = `${r * 1.3}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;
    ctx.fillText(cfg.emoji, pu.x, pu.y + 2);
    ctx.shadowBlur = 0; // reset
}

function drawParticle(ctx: CanvasRenderingContext2D, p: Particle): void {
    ctx.save();
    ctx.globalAlpha = p.life;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 15;
    
    const speedSq = p.vx*p.vx + p.vy*p.vy;
    
    // Spark / Star effect
    if (speedSq > 5) {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(1, p.size * p.life);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx*1.5, p.y - p.vy*1.5); // trail
        ctx.stroke();
        
        // cross glare
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x - p.size, p.y); ctx.lineTo(p.x + p.size, p.y);
        ctx.moveTo(p.x, p.y - p.size); ctx.lineTo(p.x, p.y + p.size);
        ctx.stroke();
    } else {
        // glowing orb
        const r = p.size * (1 + (1 - p.life)); // expands slightly as it fades
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.2, p.color);
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, TAU);
        ctx.fill();
    }
    ctx.restore();
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
    ctx.lineWidth = 5;
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetY = 6;
    ctx.strokeText(ref.combo.label, 0, 0);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
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
    ctx.lineWidth = 5;
    ctx.shadowColor = 'rgba(239, 68, 68, 0.6)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 5;
    ctx.strokeText('⚠️ BOSS!', GAME.WIDTH / 2, GAME.HEIGHT / 2);
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 10;
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
    ctx.lineWidth = 4;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetY = 5;
    ctx.strokeText(`LEVEL ${d.level}!`, GAME.WIDTH / 2, 450);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillText(`LEVEL ${d.level}!`, GAME.WIDTH / 2, 450);
    if (d.unlock) {
        ctx.font = 'bold 18px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 6;
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
    ctx.lineWidth = 5;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetY = 5;
    ctx.strokeText('ACHOO!', GAME.WIDTH / 2, 250);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
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
