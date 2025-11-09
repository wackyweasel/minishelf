import initSqlJs from 'sql.js';
import path from 'path';
import fs from 'fs';

type Database = import('sql.js').Database;

const DB_PATH = path.join(__dirname, '../../data/minishelf.sqlite');
const DB_DIR = path.dirname(DB_PATH);

// Ensure data directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

let db: Database;

export interface Miniature {
  id: string;
  game: string;
  name: string;
  amount: number;
  painted: boolean;
  keywords: string;
  image_path: string;
  thumbnail_path: string | null;
  created_at: string;
  updated_at: string;
}

export async function initDatabase() {
  try {
    // Initialize SQL.js with local WASM file
    const SQL = await initSqlJs({
      // Use the WASM file from node_modules
      locateFile: (file: string) => {
        return path.join(__dirname, '../node_modules/sql.js/dist', file);
      }
    });
    
    // Load existing database or create new one
    if (fs.existsSync(DB_PATH)) {
      const buffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(buffer);
    } else {
      db = new SQL.Database();
    }

    db.run(`
      CREATE TABLE IF NOT EXISTS miniatures (
        id TEXT PRIMARY KEY,
        game TEXT NOT NULL,
        name TEXT NOT NULL,
        amount INTEGER NOT NULL DEFAULT 1,
        painted INTEGER NOT NULL DEFAULT 0,
        keywords TEXT NOT NULL DEFAULT '',
        image_path TEXT NOT NULL,
        thumbnail_path TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE INDEX IF NOT EXISTS idx_game ON miniatures(game)
    `);

    db.run(`
      CREATE INDEX IF NOT EXISTS idx_painted ON miniatures(painted)
    `);

    // Save database
    saveDatabase();

    console.log('✅ Database initialized');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
}

export function saveDatabase() {
  if (db) {
    const data = db.export();
    fs.writeFileSync(DB_PATH, data);
  }
}

export function getDb(): Database {
  return db;
}

export default { initDatabase, saveDatabase, getDb };
