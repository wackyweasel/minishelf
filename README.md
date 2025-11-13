# MiniShelf - Miniature Collection Manager

A modern, full-stack TypeScript application for managing your board game miniature collection. Upload images in batch, add metadata efficiently, and search your collection with ease.

## Features

- 📸 **Batch Image Upload** - Upload multiple miniature photos at once
- 🏷️ **Batch Metadata Entry** - Efficiently add game names, keywords, and other details to multiple miniatures
- 🔍 **Powerful Search** - Search by keywords (e.g., "woman, sword" finds all minis with both tags)
- 🎨 **Track Painted Status** - Mark miniatures as painted
- 📊 **Collection Overview** - Browse your entire collection in a beautiful gallery
- ✏️ **Easy Editing** - Update miniature details anytime
- 🗑️ **Manage Collection** - Delete miniatures you no longer have

## Tech Stack

### Backend
- **Node.js** with **Express**
- **TypeScript** for type safety
- **better-sqlite3** for fast local database
- **Multer** for file uploads

### Frontend
- **React** with **TypeScript**
- **Vite** for fast development
- **Axios** for API calls
- Modern CSS with responsive design

## Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

## Installation

1. **Clone the repository** (or navigate to the project folder)

2. **Install backend dependencies:**
   ```bash
   npm install
   ```

3. **Install frontend dependencies:**
   ```bash
   cd client
   npm install
   cd ..
   ```

## Running the Application

### Development Mode

Run both backend and frontend concurrently:

```bash
npm run dev
```

This will start:
- Backend server on `http://localhost:3000`
- Frontend dev server on `http://localhost:5173`

Open your browser to `http://localhost:5173` to use the application.

### Individual Servers

**Backend only:**
```bash
npm run server:dev
```

**Frontend only:**
```bash
npm run client:dev
```

## Project Structure

```
minishelf/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── api.ts         # API client
│   │   ├── App.tsx        # Main app component
│   │   └── ...
│   ├── package.json
│   └── vite.config.ts
├── server/                # Express backend
│   ├── routes/           # API routes
│   ├── database.ts       # Database setup
│   ├── index.ts          # Server entry point
│   └── tsconfig.json
├── data/                 # SQLite database (created automatically)
├── uploads/              # Uploaded images (created automatically)
└── package.json          # Root package.json
```

## Usage Guide

### 1. Upload Miniatures

1. Click **"Upload"** tab
2. Click or drag images to upload (supports PNG, JPG, GIF, WebP)
3. Use **Batch Edit** to apply common metadata (game name, keywords) to all images
4. Fill in individual names for each miniature
5. Click **"Save X Miniatures"**

### 2. Browse

1. Go to **"Browse"** tab
2. View all your miniatures in a grid layout
3. Click on any miniature to view details or edit

### 3. Search

1. Use the search bar to find specific miniatures
2. Search by keywords, name, or game name
3. Multiple keywords work together (e.g., "elf wizard" finds miniatures with both keywords)

### 4. Edit Miniatures

1. Click on a miniature card or click **"Edit"**
2. Update any fields in the modal
3. Click **"Save Changes"**

### 5. Delete Miniatures

1. Click **"Delete"** on any miniature card
2. Confirm deletion

## API Endpoints

- `POST /api/miniatures/upload` - Upload images
- `POST /api/miniatures` - Create miniatures with metadata
- `GET /api/miniatures` - Get all miniatures (supports search)
- `GET /api/miniatures/:id` - Get single miniature
- `PUT /api/miniatures/:id` - Update miniature
- `DELETE /api/miniatures/:id` - Delete miniature
- `GET /api/miniatures/meta/games` - Get list of unique games

## Database Schema

```sql
CREATE TABLE miniatures (
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
);
```

## Building for Production

1. **Build both frontend and backend:**
   ```bash
   npm run build
   ```

2. **Start production server:**
   ```bash
   npm start
   ```

## Customization

### Change Ports

**Backend:** Edit `server/index.ts` and change the `PORT` variable

**Frontend Dev Server:** Edit `client/vite.config.ts` and change the `server.port` value

### Styling

All CSS files are in `client/src/` and `client/src/components/`. The color scheme uses:
- Primary: `#e94560` (pink/red)
- Background: Dark theme with `#0f0f0f`
- Accents: Various shades of gray and blue

## License

ISC

## Future Enhancements

- Image thumbnails for faster loading
- Advanced filters (by game, painted status, etc.)
- Export/import collection data
- Print labels or inventories
- Multiple image views per miniature
- Tags autocomplete
- Statistics dashboard
