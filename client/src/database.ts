import initSqlJs, { Database } from 'sql.js';

const DB_NAME = 'minishelf-db';
const DB_VERSION = 1;

let db: Database | null = null;
let SQL: any = null;

// Ensure SQL.js is initialized with robust locateFile fallbacks
async function ensureSqlInitialized(): Promise<void> {
  if (SQL) return;

  const locateStrategies = [
    // Preferred CDN
    (file: string) => `https://sql.js.org/dist/${file}`,
    // Try package-provided path
    (file: string) => file,
  // Local fallback (assumes sql-wasm.wasm served at app root)
  (_file: string) => `/sql-wasm.wasm`,
  ];

  let lastErr: any = null;

  for (const locateFile of locateStrategies) {
    try {
      SQL = await initSqlJs({ locateFile });
      return;
    } catch (err) {
      console.warn('sql.js init attempt failed for locateFile strategy, trying next...', err);
      lastErr = err;
      SQL = null;
    }
  }

  console.error('❌ All attempts to initialize sql.js failed:', lastErr);
  throw new Error('Failed to initialize sql.js. Ensure the wasm file is reachable (network or local /sql-wasm.wasm).');
}

export interface Miniature {
  id: string;
  game: string;
  name: string;
  amount: number;
  painted: boolean;
  keywords: string;
  embedding?: number[];
  image_data: string; // base64 encoded image
  // thumbnail_data removed
  created_at: string;
  updated_at: string;
}

// Initialize the database
export async function initDatabase(): Promise<void> {
  // Load SQL.js first
  try {
    SQL = await initSqlJs({
      locateFile: (file: string) => `https://sql.js.org/dist/${file}`
    });
  } catch (err) {
    console.error('❌ Failed to initialize sql.js (WASM).', err);
    throw new Error('Failed to initialize sql.js. Check network/WASM availability.');
  }

  // Try to load existing database from IndexedDB and recover if corrupted
  let savedDb: Uint8Array | null = null;
  try {
    savedDb = await loadDatabaseFromIndexedDB();
  } catch (err) {
    console.warn('⚠️ Could not read saved DB from IndexedDB:', err);
    savedDb = null;
  }

  if (savedDb) {
    try {
      db = new SQL.Database(savedDb);
      console.log('✅ Database loaded from IndexedDB');
    } catch (err) {
      console.error('⚠️ Saved database appears corrupted/unreadable. Clearing saved DB and creating a fresh one.', err);
      try {
        await clearSavedDatabaseFromIndexedDB();
        console.log('ℹ️ Cleared saved (corrupted) database from IndexedDB');
      } catch (e) {
        console.warn('Could not clear saved database from IndexedDB:', e);
      }
      db = new SQL.Database();
      console.log('✅ New database created');
    }
  } else {
    db = new SQL.Database();
    console.log('✅ New database created');
  }

  // Ensure tables exist. If creating indices/tables fails, attempt to recreate an empty DB once.
  const ensureSchema = () => {
    db!.run(`
      CREATE TABLE IF NOT EXISTS miniatures (
        id TEXT PRIMARY KEY,
        game TEXT NOT NULL,
        name TEXT NOT NULL,
        amount INTEGER NOT NULL DEFAULT 1,
        painted INTEGER NOT NULL DEFAULT 0,
        keywords TEXT NOT NULL DEFAULT '',
        embedding TEXT,
        image_data TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db!.run(`
      CREATE INDEX IF NOT EXISTS idx_game ON miniatures(game)
    `);

    db!.run(`
      CREATE INDEX IF NOT EXISTS idx_painted ON miniatures(painted)
    `);

    // Migration: Add embedding column if it doesn't exist
    try {
      db!.run("ALTER TABLE miniatures ADD COLUMN embedding TEXT");
      console.log("Added embedding column to client database");
    } catch (e) {
      // Column likely already exists, ignore
    }
  };

  try {
    ensureSchema();
  } catch (err) {
    console.error('⚠️ Failed to ensure DB schema. Attempting to recreate a fresh DB.', err);
    try {
      db = new SQL.Database();
      ensureSchema();
      console.log('✅ Fresh database created and schema initialized');
    } catch (err2) {
      console.error('❌ Could not create a fresh database or initialize schema:', err2);
      throw err2;
    }
  }

  // Save to IndexedDB but don't fail the whole init if saving fails
  try {
    await saveDatabaseToIndexedDB();
  } catch (err) {
    console.warn('⚠️ Failed to save DB to IndexedDB. Continuing without persistence:', err);
  }
}

// Save database to IndexedDB
async function saveDatabaseToIndexedDB(): Promise<void> {
  if (!db) return;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      const idb = request.result;
      const transaction = idb.transaction(['database'], 'readwrite');
      const store = transaction.objectStore('database');
      const data = db!.export();
      store.put(data, 'sqliteDb');
      
      transaction.oncomplete = () => {
        idb.close();
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    };

    request.onupgradeneeded = (event) => {
      const idb = (event.target as IDBOpenDBRequest).result;
      if (!idb.objectStoreNames.contains('database')) {
        idb.createObjectStore('database');
      }
    };
  });
}

// Load database from IndexedDB
async function loadDatabaseFromIndexedDB(): Promise<Uint8Array | null> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      const idb = request.result;
      
      if (!idb.objectStoreNames.contains('database')) {
        idb.close();
        resolve(null);
        return;
      }

      const transaction = idb.transaction(['database'], 'readonly');
      const store = transaction.objectStore('database');
      const getRequest = store.get('sqliteDb');

      getRequest.onsuccess = () => {
        idb.close();
        resolve(getRequest.result || null);
      };
      getRequest.onerror = () => {
        idb.close();
        reject(getRequest.error);
      };
    };

    request.onupgradeneeded = (event) => {
      const idb = (event.target as IDBOpenDBRequest).result;
      if (!idb.objectStoreNames.contains('database')) {
        idb.createObjectStore('database');
      }
    };
  });
}

// Clear saved database from IndexedDB (used when the saved blob appears corrupted)
async function clearSavedDatabaseFromIndexedDB(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      const idb = request.result;
      if (!idb.objectStoreNames.contains('database')) {
        idb.close();
        resolve();
        return;
      }

      const transaction = idb.transaction(['database'], 'readwrite');
      const store = transaction.objectStore('database');
      const delReq = store.delete('sqliteDb');

      delReq.onsuccess = () => {
        idb.close();
        resolve();
      };
      delReq.onerror = () => {
        idb.close();
        reject(delReq.error);
      };
    };

    request.onupgradeneeded = (event) => {
      const idb = (event.target as IDBOpenDBRequest).result;
      if (!idb.objectStoreNames.contains('database')) {
        idb.createObjectStore('database');
      }
    };
  });
}

// Save database (call after any modification)
export async function saveDatabase(): Promise<void> {
  await saveDatabaseToIndexedDB();
  // Mark local cache as having local modifications (dirty)
  try {
    localStorage.setItem('isDirty', 'true');
    try {
      // notify other parts of the app in this tab
      window.dispatchEvent(new CustomEvent('isDirtyChanged', { detail: { isDirty: true } }));
    } catch {}
  } catch {
    // ignore localStorage errors
  }
}

// Get database instance
export function getDb(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

// Export database as JSON (for backup/export feature)
export async function exportDatabaseAsJSON(): Promise<string> {
  const miniatures = await getAllMiniatures();
  return JSON.stringify(miniatures, null, 2);
}

// Import database from JSON (for restore/import feature)
export async function importDatabaseFromJSON(jsonString: string): Promise<void> {
  const miniatures = JSON.parse(jsonString);
  
  // Clear existing data
  db!.run('DELETE FROM miniatures');
  
  // Insert imported data
  for (const mini of miniatures) {
    await createMiniature(mini);
  }
  
  await saveDatabase();
}

// Database operations
export async function createMiniature(miniature: Partial<Miniature>): Promise<string> {
  const id = miniature.id || crypto.randomUUID();
  const now = new Date().toISOString();
  
  console.log('Creating miniature:', {
    id,
    hasImageData: !!miniature.image_data,
    imageDataLength: miniature.image_data?.length || 0,
    // thumbnail removed
  });
  
  db!.run(
  `INSERT INTO miniatures (id, game, name, amount, painted, keywords, image_data, created_at, updated_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      miniature.game || '',
      miniature.name || '',
      miniature.amount || 1,
      miniature.painted ? 1 : 0,
      miniature.keywords || '',
          miniature.image_data || '',
      now,
      now
    ]
  );
  
  await saveDatabase();
  return id;
}

export async function getAllMiniatures(filters?: {
  search?: string;
  game?: string;
  painted?: boolean;
}): Promise<Miniature[]> {
  let query = 'SELECT * FROM miniatures WHERE 1=1';
  const params: any[] = [];

  if (filters?.game) {
    query += ' AND game = ?';
    params.push(filters.game);
  }

  if (filters?.painted !== undefined) {
    query += ' AND painted = ?';
    params.push(filters.painted ? 1 : 0);
  }

  if (filters?.search) {
    // Search in keywords, game name, and miniature name
    // Split by comma for keyword search (all terms must match)
    const searchTerms = filters.search.toLowerCase().split(',').map(s => s.trim()).filter(s => s);
    if (searchTerms.length > 0) {
      // For each search term, check if it appears in keywords OR game OR name
      const conditions = searchTerms.map(() => 
        '(LOWER(keywords) LIKE ? OR LOWER(game) LIKE ? OR LOWER(name) LIKE ?)'
      ).join(' AND ');
      query += ` AND (${conditions})`;
      searchTerms.forEach(term => {
        params.push(`%${term}%`); // keywords
        params.push(`%${term}%`); // game
        params.push(`%${term}%`); // name
      });
    }
  }

  query += ' ORDER BY created_at DESC';

  const stmt = db!.prepare(query);
  stmt.bind(params);

  const results: Miniature[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    let embedding = undefined;
    if (row.embedding) {
      try {
        embedding = JSON.parse(row.embedding as string);
      } catch (e) {
        console.error('Failed to parse embedding');
      }
    }
    const mini = {
      id: row.id as string,
      game: row.game as string,
      name: row.name as string,
      amount: row.amount as number,
      painted: row.painted === 1,
      keywords: row.keywords as string,
      embedding,
      image_data: row.image_data as string,
      // thumbnail_data removed
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
    };
    console.log('Retrieved miniature:', {
      id: mini.id,
      name: mini.name,
      hasImageData: !!mini.image_data,
      imageDataPreview: mini.image_data?.substring(0, 50)
    });
    results.push(mini);
  }
  stmt.free();

  return results;
}

export async function getMiniature(id: string): Promise<Miniature | null> {
  const stmt = db!.prepare('SELECT * FROM miniatures WHERE id = ?');
  stmt.bind([id]);

  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    let embedding = undefined;
    if (row.embedding) {
      try {
        embedding = JSON.parse(row.embedding as string);
      } catch (e) {
        console.error('Failed to parse embedding');
      }
    }
    return {
      id: row.id as string,
      game: row.game as string,
      name: row.name as string,
      amount: row.amount as number,
      painted: row.painted === 1,
      keywords: row.keywords as string,
      embedding,
      image_data: row.image_data as string,
  // thumbnail_data removed
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
    };
  }

  stmt.free();
  return null;
}

export async function updateMiniature(id: string, updates: Partial<Miniature>): Promise<void> {
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.game !== undefined) {
    fields.push('game = ?');
    values.push(updates.game);
  }
  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.amount !== undefined) {
    fields.push('amount = ?');
    values.push(updates.amount);
  }
  if (updates.painted !== undefined) {
    fields.push('painted = ?');
    values.push(updates.painted ? 1 : 0);
  }
  if (updates.keywords !== undefined) {
    fields.push('keywords = ?');
    values.push(updates.keywords);
  }
  if (updates.embedding !== undefined) {
    fields.push('embedding = ?');
    values.push(JSON.stringify(updates.embedding));
  }
  if (updates.image_data !== undefined) {
    fields.push('image_data = ?');
    values.push(updates.image_data);
  }
  // thumbnail_data removed
  // mediumData removed

  fields.push('updated_at = ?');
  values.push(new Date().toISOString());

  values.push(id);

  db!.run(
    `UPDATE miniatures SET ${fields.join(', ')} WHERE id = ?`,
    values
  );

  await saveDatabase();
}

export async function deleteMiniature(id: string): Promise<void> {
  db!.run('DELETE FROM miniatures WHERE id = ?', [id]);
  await saveDatabase();
}

export async function deleteMiniatures(ids: string[]): Promise<void> {
  if (!ids || ids.length === 0) return;

  // Perform deletes inside a transaction and save once for better performance
  try {
    db!.run('BEGIN TRANSACTION');
    const stmt = db!.prepare('DELETE FROM miniatures WHERE id = ?');
    try {
      for (const id of ids) {
        stmt.run([id]);
      }
    } finally {
      stmt.free();
    }
    db!.run('COMMIT');
  } catch (err) {
    try { db!.run('ROLLBACK'); } catch {}
    throw err;
  }

  await saveDatabase();
}

export async function getGames(): Promise<string[]> {
  const stmt = db!.prepare('SELECT DISTINCT game FROM miniatures ORDER BY game');
  const games: string[] = [];

  while (stmt.step()) {
    const row = stmt.getAsObject();
    if (row.game) {
      games.push(row.game as string);
    }
  }
  stmt.free();

  return games;
}

export async function getKeywords(): Promise<string[]> {
  const stmt = db!.prepare('SELECT keywords FROM miniatures');
  const keywordSet = new Set<string>();

  while (stmt.step()) {
    const row = stmt.getAsObject();
    const keywords = (row.keywords as string || '').split(',').map(k => k.trim()).filter(k => k);
    keywords.forEach(k => keywordSet.add(k));
  }
  stmt.free();

  return Array.from(keywordSet).sort();
}

// --- Helpers for safe temporary DB creation and swapping ---

// Ensure schema exists on a given Database instance
function ensureSchemaOn(dbInstance: Database) {
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS miniatures (
      id TEXT PRIMARY KEY,
      game TEXT NOT NULL,
      name TEXT NOT NULL,
      amount INTEGER NOT NULL DEFAULT 1,
      painted INTEGER NOT NULL DEFAULT 0,
      keywords TEXT NOT NULL DEFAULT '',
      image_data TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  dbInstance.run(`CREATE INDEX IF NOT EXISTS idx_game ON miniatures(game)`);
  dbInstance.run(`CREATE INDEX IF NOT EXISTS idx_painted ON miniatures(painted)`);
}

// Create a new temporary in-memory Database instance with schema initialized
export async function createTemporaryDatabase(): Promise<Database> {
  await ensureSqlInitialized();
  const tmp = new SQL.Database();
  ensureSchemaOn(tmp);
  return tmp;
}

// Insert an array of miniatures into a provided Database instance (does not touch global DB or persistence)
export async function insertMiniaturesIntoDatabase(dbInstance: Database, miniatures: Miniature[]): Promise<void> {
  const insertStmt = dbInstance.prepare(
    `INSERT INTO miniatures (id, game, name, amount, painted, keywords, image_data, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  try {
    for (const m of miniatures) {
      const id = m.id || crypto.randomUUID();
      const now = new Date().toISOString();
      insertStmt.run([
        id,
        m.game || '',
        m.name || '',
        m.amount ?? 1,
        m.painted ? 1 : 0,
        m.keywords || '',
        m.image_data || '',
        m.created_at || now,
        m.updated_at || now
      ]);
    }
  } finally {
    insertStmt.free();
  }
}

// Replace the current active database with the provided Database instance and persist it to IndexedDB
export async function replaceDatabaseWith(dbInstance: Database): Promise<void> {
  // Replace in-memory reference
  db = new SQL.Database(dbInstance.export());
  // Ensure schema on new global DB (should already exist, but be safe)
  ensureSchemaOn(db);
  // Persist
  await saveDatabaseToIndexedDB();
  // Successful replacement via synchronization means local changes were overwritten — mark clean
  try {
    localStorage.setItem('isDirty', 'false');
    try {
      window.dispatchEvent(new CustomEvent('isDirtyChanged', { detail: { isDirty: false } }));
    } catch {}
  } catch {
    // ignore
  }
}
