# MiniShelf

A full-stack TypeScript application for managing board game miniature collections with batch upload, metadata management, and powerful search capabilities.

## Features

- Batch image upload with drag-and-drop support
- Efficient batch metadata editing
- Keyword-based search with multi-tag filtering
- Paint status tracking
- Local SQLite database with SQL.js
- Cloud storage synchronization (Google Drive, Dropbox)
- Responsive grid and list views

## Tech Stack

**Backend:** Node.js, Express, TypeScript, SQL.js, Sharp, Multer  
**Frontend:** React, TypeScript, Vite

## Quick Start

Install dependencies:
```bash
npm install
cd client && npm install && cd ..
```

Run development servers:
```bash
npm run dev
```

Access the application at `http://localhost:5173`

## Available Scripts

- `npm run dev` - Start both frontend and backend in development mode
- `npm run server:dev` - Start backend only
- `npm run client:dev` - Start frontend only
- `npm run build` - Build for production
- `npm start` - Run production build

## Database Schema

```sql
CREATE TABLE miniatures (
  id TEXT PRIMARY KEY,
  game TEXT NOT NULL,
  name TEXT NOT NULL,
  amount INTEGER DEFAULT 1,
  painted INTEGER DEFAULT 0,
  keywords TEXT DEFAULT '',
  image_path TEXT NOT NULL,
  thumbnail_path TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

## Project Structure

```
├── client/              # React frontend
│   └── src/
│       ├── components/  # UI components
│       ├── utils/       # Utilities
│       └── api.ts       # API client
├── server/              # Express backend
│   ├── routes/          # API routes
│   └── database.ts      # Database layer
├── data/                # SQLite database (auto-created)
└── uploads/             # Image storage (auto-created)
```

## License

ISC
