import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { getDb, saveDatabase, Miniature } from '../database';

const router = express.Router();

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, '../../../uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Helper function to resize image if it exceeds 2MB
async function resizeImageIfNeeded(filePath: string): Promise<void> {
  const MAX_SIZE = 512 * 512;
  const stats = fs.statSync(filePath);
  
  if (stats.size <= MAX_SIZE) {
    return; // Image is already under 2MB
  }
  
  // Resize image progressively until it's under 2MB
  let quality = 90;
  let resized = false;
  
  while (quality >= 60 && !resized) {
    const tempPath = `${filePath}.temp`;
    
    await sharp(filePath)
      .resize(512, 512, { // Max dimensions
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality })
      .toFile(tempPath);
    
    const tempStats = fs.statSync(tempPath);
    
    if (tempStats.size <= MAX_SIZE) {
      fs.unlinkSync(filePath);
      fs.renameSync(tempPath, filePath);
      resized = true;
    } else {
      fs.unlinkSync(tempPath);
      quality -= 10;
    }
  }
  
  // If still too large, reduce dimensions more aggressively
  if (!resized) {
    await sharp(filePath)
      .resize(512, 512, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 80 })
      .toFile(`${filePath}.temp`);
    
    fs.unlinkSync(filePath);
    fs.renameSync(`${filePath}.temp`, filePath);
  }
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  },
});

// Upload multiple images
router.post('/upload', upload.array('images', 1000), async (req: Request, res: Response) => {
  try {
    if (!req.files || !Array.isArray(req.files)) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    // Resize images if needed
    for (const file of req.files) {
      const filePath = path.join(UPLOADS_DIR, file.filename);
      await resizeImageIfNeeded(filePath);
    }

    const uploadedFiles = req.files.map((file: Express.Multer.File) => ({
      id: uuidv4(),
      filename: file.filename,
      path: `/uploads/${file.filename}`,
      originalName: file.originalname
    }));

    res.json({
      message: 'Files uploaded successfully',
      files: uploadedFiles
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload files' });
  }
});

// Create miniatures with metadata
router.post('/', express.json(), async (req: Request, res: Response) => {
  try {
    const miniatures = req.body.miniatures;
    
    if (!Array.isArray(miniatures)) {
      return res.status(400).json({ error: 'Expected array of miniatures' });
    }

    const db = getDb();
    
    for (const mini of miniatures) {
      // Handle rotation if specified
      if (mini.rotation && mini.rotation !== 0 && mini.image_path) {
        // Extract filename from path (e.g., /uploads/filename.jpg -> filename.jpg)
        const filename = mini.image_path.split('/').pop() || '';
        const filePath = path.join(UPLOADS_DIR, filename);
        
        console.log('Attempting to rotate:', filePath, 'by', mini.rotation, 'degrees');
        
        if (fs.existsSync(filePath)) {
          try {
            const rotatedPath = `${filePath}.temp`;
            const ext = path.extname(filePath).toLowerCase();
            
            // Determine output format based on file extension
            let pipeline = sharp(filePath).rotate(mini.rotation);
            
            if (ext === '.jpg' || ext === '.jpeg') {
              pipeline = pipeline.jpeg({ quality: 90 });
            } else if (ext === '.png') {
              pipeline = pipeline.png();
            } else if (ext === '.webp') {
              pipeline = pipeline.webp({ quality: 90 });
            }
            
            await pipeline.toFile(rotatedPath);
            
            // Replace the original with the rotated version
            fs.unlinkSync(filePath);
            fs.renameSync(rotatedPath, filePath);
            
            console.log('Successfully rotated image:', filename);
          } catch (rotateError) {
            console.error('Rotation error for', filename, ':', rotateError);
          }
        } else {
          console.error('File not found for rotation:', filePath);
        }
      }
      
      db.run(
        `INSERT INTO miniatures (id, game, name, amount, painted, keywords, image_path, thumbnail_path)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mini.id || uuidv4(),
          mini.game || '',
          mini.name || '',
          mini.amount || 1,
          mini.painted ? 1 : 0,
          mini.keywords || '',
          mini.image_path || '',
          mini.thumbnail_path || null
        ]
      );
    }

    saveDatabase();

    res.json({
      message: 'Miniatures created successfully',
      count: miniatures.length
    });
  } catch (error) {
    console.error('Create error:', error);
    res.status(500).json({ error: 'Failed to create miniatures' });
  }
});

// Get all miniatures with optional search
router.get('/', (req: Request, res: Response) => {
  try {
    const { search, game, painted } = req.query;
    const db = getDb();
    
    let query = 'SELECT * FROM miniatures WHERE 1=1';
    const params: any[] = [];

    if (search && typeof search === 'string') {
      // Search in keywords, name, and game
      const keywords = search.toLowerCase().split(/[\s,]+/).filter(k => k.length > 0);
      
      if (keywords.length > 0) {
        const keywordConditions = keywords.map(() => 
          '(LOWER(keywords) LIKE ? OR LOWER(name) LIKE ? OR LOWER(game) LIKE ?)'
        ).join(' AND ');
        
        query += ` AND (${keywordConditions})`;
        
        keywords.forEach(keyword => {
          const pattern = `%${keyword}%`;
          params.push(pattern, pattern, pattern);
        });
      }
    }

    if (game && typeof game === 'string') {
      query += ' AND game = ?';
      params.push(game);
    }

    if (painted !== undefined) {
      query += ' AND painted = ?';
      params.push(painted === 'true' ? 1 : 0);
    }

    query += ' ORDER BY created_at DESC';

    const stmt = db.prepare(query);
    stmt.bind(params);
    
    const miniatures: any[] = [];
    while (stmt.step()) {
      miniatures.push(stmt.getAsObject());
    }
    stmt.free();

    // Convert painted from 0/1 to boolean and parse embedding
    const result = miniatures.map((mini: any) => {
      let embedding = undefined;
      if (mini.embedding) {
        try {
          // If it's already an object (unlikely with sql.js but possible if driver changed), use it
          if (typeof mini.embedding === 'object') {
            embedding = mini.embedding;
          } else if (typeof mini.embedding === 'string') {
            embedding = JSON.parse(mini.embedding);
          }
        } catch (e) {
          console.error('Failed to parse embedding for mini', mini.id);
        }
      }
      return {
        ...mini,
        painted: mini.painted === 1,
        embedding
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Get error:', error);
    res.status(500).json({ error: 'Failed to fetch miniatures' });
  }
});

// Get single miniature by ID
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM miniatures WHERE id = ?');
    stmt.bind([id]);
    
    let miniature: any = null;
    if (stmt.step()) {
      miniature = stmt.getAsObject();
    }
    stmt.free();

    if (!miniature) {
      return res.status(404).json({ error: 'Miniature not found' });
    }

    res.json({
      ...miniature,
      painted: miniature.painted === 1
    });
  } catch (error) {
    console.error('Get error:', error);
    res.status(500).json({ error: 'Failed to fetch miniature' });
  }
});

// Update miniature
router.put('/:id', express.json(), (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const db = getDb();

    // Build dynamic UPDATE query for only provided fields
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
      console.log(`Updating embedding for ${id}, length: ${updates.embedding.length}`);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const query = `UPDATE miniatures SET ${fields.join(', ')} WHERE id = ?`;
    
    // Ensure values are in correct order (fields first, then id)
    // The values array already has the field values pushed in order
    // We just need to make sure 'id' is the last one, which it is.
    
    db.run(query, values);
    
    // Verify the update
    const verifyStmt = db.prepare('SELECT embedding FROM miniatures WHERE id = ?');
    verifyStmt.bind([id]);
    if (verifyStmt.step()) {
      const row = verifyStmt.getAsObject();
      if (updates.embedding && !row.embedding) {
        console.error('CRITICAL: Embedding was NOT saved for', id);
      } else if (updates.embedding) {
         console.log('Verified embedding saved for', id);
      }
    }
    verifyStmt.free();

    saveDatabase();
    res.json({ message: 'Miniature updated successfully' });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ error: 'Failed to update miniature' });
  }
});

// Delete miniature
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDb();
    
    // Get the miniature to find the image path
    const getStmt = db.prepare('SELECT * FROM miniatures WHERE id = ?');
    getStmt.bind([id]);
    
    let miniature: any = null;
    if (getStmt.step()) {
      miniature = getStmt.getAsObject();
    }
    getStmt.free();

    if (!miniature) {
      return res.status(404).json({ error: 'Miniature not found' });
    }

    // Delete the image file
    if (miniature.image_path) {
      const imagePath = path.join(__dirname, '../../../', miniature.image_path as string);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // Delete from database
    db.run('DELETE FROM miniatures WHERE id = ?', [id]);
    saveDatabase();

    res.json({ message: 'Miniature deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete miniature' });
  }
});

// Get unique games list
router.get('/meta/games', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const stmt = db.prepare('SELECT DISTINCT game FROM miniatures WHERE game != "" ORDER BY game');
    
    const games: any[] = [];
    while (stmt.step()) {
      games.push(stmt.getAsObject());
    }
    stmt.free();
    
    res.json(games.map((g: any) => g.game));
  } catch (error) {
    console.error('Get games error:', error);
    res.status(500).json({ error: 'Failed to fetch games' });
  }
});

// Get all unique keywords
router.get('/meta/keywords', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const stmt = db.prepare('SELECT keywords FROM miniatures WHERE keywords != ""');
    
    const allKeywords: any[] = [];
    while (stmt.step()) {
      allKeywords.push(stmt.getAsObject());
    }
    stmt.free();
    
    // Extract and deduplicate all keywords
    const keywordSet = new Set<string>();
    allKeywords.forEach((row: any) => {
      const keywords = row.keywords.split(',').map((k: string) => k.trim()).filter((k: string) => k);
      keywords.forEach((k: string) => keywordSet.add(k));
    });
    
    res.json(Array.from(keywordSet).sort());
  } catch (error) {
    console.error('Get keywords error:', error);
    res.status(500).json({ error: 'Failed to fetch keywords' });
  }
});

export default router;

