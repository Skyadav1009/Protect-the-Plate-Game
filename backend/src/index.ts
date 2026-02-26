import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './db.ts';
import scoreRoutes from './routes/scores.ts';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
}));
app.use(express.json());

// Request logging
app.use((req, _res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
});

// Routes
app.use('/api', scoreRoutes);

// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Connect to MongoDB then start server
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`🎮 Save the Plate API running on http://localhost:${PORT}`);
        console.log(`   Health: http://localhost:${PORT}/api/health`);
    });
});
