# Quick Start Guide - MiniShelf

## Installation Complete! ✅

Your MiniShelf project is ready to go. Here's how to start developing:

## Start Development

Open a terminal in the project root and run:

```powershell
npm run dev
```

This will start:
- **Backend** on http://localhost:3000
- **Frontend** on http://localhost:5173

Then open your browser to **http://localhost:5173**

## Project Overview

### What You Can Do

1. **Upload Miniatures**
   - Go to "Upload" tab
   - Select multiple images (drag & drop or click)
   - Use batch edit to apply common metadata to all
   - Fill in individual names
   - Save all at once

2. **Browse**
   - View all your miniatures in a gallery
   - See painted status, game names, and keywords
   - Click to edit or delete

3. **Search**
   - Type keywords in the search bar
   - Search multiple terms: "woman, sword" finds minis with both keywords
   - Results update automatically

### Tech Stack

- **Backend**: Node.js, Express, TypeScript, SQL.js (SQLite)
- **Frontend**: React, TypeScript, Vite
- **Styling**: Custom CSS with dark theme

### File Structure

```
minishelf/
├── client/           # React frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── App.tsx      # Main app
│   │   └── api.ts       # API client
│   └── package.json
├── server/           # Express backend
│   ├── routes/       # API routes
│   ├── database.ts   # Database logic
│   └── index.ts      # Server entry
├── data/            # SQLite database (auto-created)
├── uploads/         # Uploaded images (auto-created)
└── package.json     # Root package.json
```

## Next Steps

1. Start the dev server: `npm run dev`
2. Open http://localhost:5173 in your browser
3. Upload some miniature images
4. Add metadata and search!

## Troubleshooting

**Port already in use?**
- Edit `server/index.ts` to change backend port (default: 3000)
- Edit `client/vite.config.ts` to change frontend port (default: 5173)

**Need to rebuild?**
```powershell
npm run build
```

**Production mode?**
```powershell
npm run build
npm start
```

## Features to Explore

- ✨ Batch upload up to 50 images at once
- 🏷️ Batch edit metadata for efficiency
- 🔍 Multi-keyword search ("elf wizard" finds both)
- 🎨 Track painted vs unpainted miniatures
- 📊 Filter by game, painted status
- ✏️ Edit any miniature details
- 🗑️ Delete miniatures (removes image too)

Enjoy managing your miniature collection! 🎲
