import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Player, Score } from '../db.ts';

const router = Router();

// ── POST /api/players — Register a new player ──
router.post('/players', async (_req: Request, res: Response) => {
    try {
        const id = uuidv4();
        await Player.create({ _id: id });
        res.status(201).json({ id });
    } catch (err: any) {
        res.status(500).json({ error: 'Failed to create player', details: err.message });
    }
});

// ── GET /api/players/:id — Check if player exists ──
router.get('/players/:id', async (req: Request, res: Response) => {
    try {
        const player = await Player.findById(req.params.id);
        if (!player) {
            res.status(404).json({ error: 'Player not found' });
            return;
        }
        player.lastSeenAt = new Date();
        await player.save();

        const stats = await Score.aggregate([
            { $match: { playerId: req.params.id } },
            {
                $group: {
                    _id: null,
                    total_games: { $sum: 1 },
                    total_score: { $sum: '$score' },
                    total_drops: { $sum: '$dropsWiped' },
                    best_combo: { $max: '$maxCombo' },
                    total_play_time: { $sum: '$durationSeconds' },
                }
            },
        ]);

        res.json({ player, stats: stats[0] || {} });
    } catch (err: any) {
        res.status(500).json({ error: 'Failed to get player', details: err.message });
    }
});

// ── POST /api/scores — Submit a score ──
router.post('/scores', async (req: Request, res: Response) => {
    try {
        const { playerId, mode, score, dropsWiped, maxCombo, level, durationSeconds } = req.body;

        if (!playerId || !mode || score === undefined) {
            res.status(400).json({ error: 'Missing required fields: playerId, mode, score' });
            return;
        }

        // Ensure player exists (upsert)
        await Player.findByIdAndUpdate(
            playerId,
            { $set: { lastSeenAt: new Date() } },
            { upsert: true, setDefaultsOnInsert: true }
        );

        await Score.create({
            playerId, mode,
            score: score || 0,
            dropsWiped: dropsWiped || 0,
            maxCombo: maxCombo || 0,
            level: level || 1,
            durationSeconds: durationSeconds || 0,
        });

        // Get updated high scores for this player
        const highScores = await Score.aggregate([
            { $match: { playerId } },
            {
                $group: {
                    _id: '$mode',
                    high_score: { $max: '$score' },
                    games_played: { $sum: 1 },
                    total_drops_wiped: { $sum: '$dropsWiped' },
                    best_combo: { $max: '$maxCombo' },
                    max_level: { $max: '$level' },
                }
            },
            { $project: { mode: '$_id', high_score: 1, games_played: 1, total_drops_wiped: 1, best_combo: 1, max_level: 1, _id: 0 } },
            { $sort: { mode: 1 } },
        ]);

        res.status(201).json({ highScores });
    } catch (err: any) {
        res.status(500).json({ error: 'Failed to save score', details: err.message });
    }
});

// ── GET /api/scores/:playerId — Get all high scores per mode ──
router.get('/scores/:playerId', async (req: Request, res: Response) => {
    try {
        const highScores = await Score.aggregate([
            { $match: { playerId: req.params.playerId } },
            {
                $group: {
                    _id: '$mode',
                    high_score: { $max: '$score' },
                    games_played: { $sum: 1 },
                    total_drops_wiped: { $sum: '$dropsWiped' },
                    best_combo: { $max: '$maxCombo' },
                    max_level: { $max: '$level' },
                }
            },
            { $project: { mode: '$_id', high_score: 1, games_played: 1, total_drops_wiped: 1, best_combo: 1, max_level: 1, _id: 0 } },
            { $sort: { mode: 1 } },
        ]);

        const stats = await Score.aggregate([
            { $match: { playerId: req.params.playerId } },
            {
                $group: {
                    _id: null,
                    total_games: { $sum: 1 },
                    total_score: { $sum: '$score' },
                    total_drops: { $sum: '$dropsWiped' },
                    best_combo: { $max: '$maxCombo' },
                    total_play_time: { $sum: '$durationSeconds' },
                }
            },
        ]);

        res.json({ highScores, stats: stats[0] || {} });
    } catch (err: any) {
        res.status(500).json({ error: 'Failed to get scores', details: err.message });
    }
});

// ── GET /api/scores/:playerId/:mode — Score history for a mode ──
router.get('/scores/:playerId/:mode', async (req: Request, res: Response) => {
    try {
        const history = await Score.find(
            { playerId: req.params.playerId, mode: req.params.mode },
            { playerId: 0, __v: 0 }
        ).sort({ createdAt: -1 }).limit(50).lean();

        res.json({ history });
    } catch (err: any) {
        res.status(500).json({ error: 'Failed to get score history', details: err.message });
    }
});

// ── GET /api/leaderboard/:mode — Global top 10 ──
router.get('/leaderboard/:mode', async (req: Request, res: Response) => {
    try {
        const leaderboard = await Score.aggregate([
            { $match: { mode: req.params.mode } },
            { $sort: { score: -1 } },
            { $limit: 10 },
            { $lookup: { from: 'players', localField: 'playerId', foreignField: '_id', as: 'player' } },
            { $unwind: { path: '$player', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    player_id: '$playerId',
                    nickname: { $ifNull: ['$player.nickname', ''] },
                    score: 1, dropsWiped: 1, maxCombo: 1, level: 1,
                    played_at: '$createdAt', _id: 0,
                }
            },
        ]);

        res.json({ leaderboard });
    } catch (err: any) {
        res.status(500).json({ error: 'Failed to get leaderboard', details: err.message });
    }
});

export default router;
