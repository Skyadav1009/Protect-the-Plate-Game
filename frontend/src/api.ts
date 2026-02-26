const API_BASE = '/api';
const PLAYER_ID_KEY = 'save-the-plate-player-id';

// ── Player ID management ──
export function getPlayerId(): string {
    let id = localStorage.getItem(PLAYER_ID_KEY);
    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem(PLAYER_ID_KEY, id);
    }
    return id;
}

// ── Types ──
export interface HighScoreEntry {
    mode: string;
    high_score: number;
    games_played: number;
    total_drops_wiped: number;
    best_combo: number;
    max_level: number;
}

export interface ScoreHistoryEntry {
    id: number;
    score: number;
    drops_wiped: number;
    max_combo: number;
    level: number;
    duration_seconds: number;
    played_at: string;
}

export interface LeaderboardEntry {
    player_id: string;
    nickname: string;
    score: number;
    drops_wiped: number;
    max_combo: number;
    level: number;
    played_at: string;
}

export interface PlayerStats {
    total_games: number;
    total_score: number;
    total_drops: number;
    best_combo: number;
    total_play_time: number;
}

export interface SubmitScorePayload {
    mode: string;
    score: number;
    dropsWiped: number;
    maxCombo: number;
    level: number;
    durationSeconds: number;
}

// ── API calls ──

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE}${url}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `API error ${res.status}`);
    }
    return res.json();
}

export async function submitScore(payload: SubmitScorePayload): Promise<{ id: number; highScores: HighScoreEntry[] }> {
    const playerId = getPlayerId();
    return apiFetch('/scores', {
        method: 'POST',
        body: JSON.stringify({ playerId, ...payload }),
    });
}

export async function getHighScores(): Promise<{ highScores: HighScoreEntry[]; stats: PlayerStats }> {
    const playerId = getPlayerId();
    return apiFetch(`/scores/${playerId}`);
}

export async function getScoreHistory(mode: string): Promise<{ history: ScoreHistoryEntry[] }> {
    const playerId = getPlayerId();
    return apiFetch(`/scores/${playerId}/${mode}`);
}

export async function getLeaderboard(mode: string): Promise<{ leaderboard: LeaderboardEntry[] }> {
    return apiFetch(`/leaderboard/${mode}`);
}

export async function ensurePlayer(): Promise<void> {
    const playerId = getPlayerId();
    try {
        await apiFetch(`/players/${playerId}`);
    } catch {
        // Player doesn't exist yet, create
        await apiFetch('/players', {
            method: 'POST',
        });
        // Store the new ID if the server created a different one
    }
}
