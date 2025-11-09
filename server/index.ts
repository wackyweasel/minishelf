import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { initDatabase } from './database';
import miniaturesRouter from './routes/miniatures';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// Routes
app.use('/api/miniatures', miniaturesRouter);

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'MiniShelf API is running' });
});

// Initialize database then start server
console.log('🔧 Initializing database...');
initDatabase().then(() => {
  console.log('✅ Database ready');
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📁 Uploads directory: ${path.join(__dirname, '../../uploads')}`);
    console.log(`📡 API available at http://localhost:${PORT}/api`);
  });
}).catch(err => {
  console.error('❌ Failed to initialize database:', err);
  console.error('Stack:', err.stack);
  process.exit(1);
});

export default app;
