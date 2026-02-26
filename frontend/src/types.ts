export type GameState = 'MENU' | 'MODE_SELECT' | 'PLAYING' | 'GAME_OVER';
export type GameMode = 'CLASSIC' | 'TIME_ATTACK' | 'SURVIVAL' | 'CHALLENGE';
export type DropType = 'NORMAL' | 'FAST' | 'STICKY' | 'INFECTION';
export type PowerUpType = 'TISSUE' | 'SHIELD' | 'FREEZE' | 'EXTRA_HEART';
export type WeatherType = 'NONE' | 'COLD' | 'DUST';
export type FaceExpression = 'NEUTRAL' | 'ANGRY' | 'HAPPY' | 'SNEEZE';

export interface Drop {
  id: number;
  type: DropType;
  x: number;
  y: number;
  speed: number;
  radius: number;
  clicksRequired: number;
  clicksReceived: number;
  nostrilIndex: 0 | 1 | 2;
  color: string;
  glowColor: string;
  pointValue: number;
  heartsLost: number;
}

export interface PowerUp {
  id: number;
  type: PowerUpType;
  x: number;
  y: number;
  vy: number;
  radius: number;
}

export interface ActivePowerUp {
  type: PowerUpType;
  remaining: number;
  uses?: number;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

export interface Snowflake {
  x: number;
  y: number;
  speed: number;
  size: number;
  drift: number;
}

export interface ComboState {
  streak: number;
  multiplier: number;
  label: string;
  slowMotionTimer: number;
  displayTimer: number;
}

export interface BossState {
  active: boolean;
  wavesRemaining: number;
  warningTimer: number;
  reliefTimer: number;
}

export interface WeatherState {
  type: WeatherType;
  timer: number;
  cooldown: number;
  snowflakes: Snowflake[];
  dustOpacity: number;
}

export interface Challenge {
  id: string;
  name: string;
  description: string;
  condition: string;
  target: number;
  progress: number;
  completed: boolean;
}

export interface LevelUpDisplay {
  show: boolean;
  level: number;
  unlock: string;
  timer: number;
}

export interface PlayerProgress {
  level: number;
  xp: number;
  highScores: Record<string, number>;
  challengesCompleted: string[];
}

export interface GameRef {
  drops: Drop[];
  particles: Particle[];
  powerUps: PowerUp[];
  activePowerUps: ActivePowerUp[];
  lastTime: number;
  shake: number;
  score: number;
  lives: number;
  speedMultiplier: number;
  gameState: GameState;
  gameMode: GameMode;
  combo: ComboState;
  boss: BossState;
  weather: WeatherState;
  expression: FaceExpression;
  expressionTimer: number;
  level: number;
  xp: number;
  unlockedDropTypes: DropType[];
  timeRemaining: number;
  challenge: Challenge | null;
  dropSpawnTimer: number;
  powerUpSpawnTimer: number;
  sneezeCooldown: number;
  bossTriggered: boolean;
  levelUpDisplay: LevelUpDisplay;
  idCounter: number;
  survivalSpeedTimer: number;
}
