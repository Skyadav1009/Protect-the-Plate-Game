import mongoose from 'mongoose';

// ── Schemas ──

const playerSchema = new mongoose.Schema({
  _id: { type: String }, // UUID as _id
  nickname: { type: String, default: '' },
  lastSeenAt: { type: Date, default: Date.now },
}, { timestamps: true });

const scoreSchema = new mongoose.Schema({
  playerId: { type: String, required: true, index: true },
  mode: { type: String, required: true, index: true },
  score: { type: Number, required: true, default: 0 },
  dropsWiped: { type: Number, default: 0 },
  maxCombo: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  durationSeconds: { type: Number, default: 0 },
}, { timestamps: true });

// Compound indexes for common queries
scoreSchema.index({ playerId: 1, mode: 1 });
scoreSchema.index({ mode: 1, score: -1 });

// ── Models ──

export const Player = mongoose.model('Player', playerSchema);
export const Score = mongoose.model('Score', scoreSchema);

// ── Connect ──

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/protect-the-plate';
  try {
    await mongoose.connect(uri);
    console.log('✅ MongoDB connected:', uri);
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err);
    process.exit(1);
  }
}
