type SoundType = 'wipe' | 'splash' | 'gameover' | 'spawn' | 'combo' | 'super_wipe' |
    'powerup' | 'boss_warning' | 'freeze' | 'sneeze' | 'wrong_side' | 'level_up';

let audioCtx: AudioContext | null = null;

export function initAudio() {
    if (!audioCtx) {
        const AC = window.AudioContext || (window as any).webkitAudioContext;
        if (AC) audioCtx = new AC();
    }
    if (audioCtx?.state === 'suspended') audioCtx.resume();
}

export function playSound(type: SoundType) {
    if (!audioCtx) return;
    const ctx = audioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;

    switch (type) {
        case 'wipe':
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now); osc.stop(now + 0.1);
            break;
        case 'splash':
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(100, now);
            osc.frequency.exponentialRampToValueAtTime(50, now + 0.3);
            gain.gain.setValueAtTime(0.5, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc.start(now); osc.stop(now + 0.3);
            break;
        case 'spawn':
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.linearRampToValueAtTime(200, now + 0.1);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
            osc.start(now); osc.stop(now + 0.1);
            break;
        case 'gameover':
            osc.type = 'square';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + 1);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 1);
            osc.start(now); osc.stop(now + 1);
            break;
        case 'combo':
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(1400, now + 0.2);
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
            osc.start(now); osc.stop(now + 0.25);
            break;
        case 'super_wipe': {
            const osc2 = ctx.createOscillator();
            const osc3 = ctx.createOscillator();
            const g2 = ctx.createGain();
            const g3 = ctx.createGain();
            osc2.connect(g2); g2.connect(ctx.destination);
            osc3.connect(g3); g3.connect(ctx.destination);
            osc.type = osc2.type = osc3.type = 'sine';
            osc.frequency.setValueAtTime(523, now);
            osc2.frequency.setValueAtTime(659, now + 0.15);
            osc3.frequency.setValueAtTime(784, now + 0.3);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            g2.gain.setValueAtTime(0.3, now + 0.15);
            g2.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
            g3.gain.setValueAtTime(0.3, now + 0.3);
            g3.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
            osc.start(now); osc.stop(now + 0.3);
            osc2.start(now + 0.15); osc2.stop(now + 0.45);
            osc3.start(now + 0.3); osc3.stop(now + 0.6);
            break;
        }
        case 'powerup':
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.exponentialRampToValueAtTime(800, now + 0.15);
            osc.frequency.exponentialRampToValueAtTime(1200, now + 0.3);
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
            osc.start(now); osc.stop(now + 0.35);
            break;
        case 'boss_warning':
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.linearRampToValueAtTime(200, now + 0.3);
            osc.frequency.linearRampToValueAtTime(150, now + 0.6);
            gain.gain.setValueAtTime(0.4, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.7);
            osc.start(now); osc.stop(now + 0.7);
            break;
        case 'freeze':
            osc.type = 'sine';
            osc.frequency.setValueAtTime(2000, now);
            osc.frequency.exponentialRampToValueAtTime(500, now + 0.4);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
            osc.start(now); osc.stop(now + 0.5);
            break;
        case 'sneeze':
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(80, now);
            osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
            osc.frequency.exponentialRampToValueAtTime(50, now + 0.4);
            gain.gain.setValueAtTime(0.5, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
            osc.start(now); osc.stop(now + 0.5);
            break;
        case 'wrong_side':
            osc.type = 'square';
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.linearRampToValueAtTime(100, now + 0.15);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
            osc.start(now); osc.stop(now + 0.2);
            break;
        case 'level_up':
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
            osc.frequency.setValueAtTime(660, now + 0.2);
            osc.frequency.exponentialRampToValueAtTime(1320, now + 0.35);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.linearRampToValueAtTime(0.2, now + 0.2);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
            osc.start(now); osc.stop(now + 0.5);
            break;
    }
}
