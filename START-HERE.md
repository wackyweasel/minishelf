# MiniShelf - Quick Start Commands

## ⚠️ IMPORTANT: Run from the ROOT folder!

The current directory should be: `C:\Users\Jean-Luc.Deziel\minishelf`

## Starting the Application

### Option 1: Use the batch file (Easiest)
Double-click: **start-dev.bat**

### Option 2: Use npm command
```powershell
# Make sure you're in the root folder first!
cd C:\Users\Jean-Luc.Deziel\minishelf

# Then run:
npm run dev
```

### Option 3: Start Backend and Frontend Separately

**Terminal 1 - Backend:**
```powershell
cd C:\Users\Jean-Luc.Deziel\minishelf
npm run server:dev
```

**Terminal 2 - Frontend:**
```powershell
cd C:\Users\Jean-Luc.Deziel\minishelf
npm run client:dev
```

## The Problem You Had

❌ **Wrong:** Running `npm run dev` from `C:\Users\Jean-Luc.Deziel\minishelf\client`
- This only starts the frontend
- Backend never starts → ECONNREFUSED error

✅ **Correct:** Running `npm run dev` from `C:\Users\Jean-Luc.Deziel\minishelf`
- This starts BOTH backend and frontend
- Both servers communicate properly

## What You'll See When It Works

```
[server] 🔧 Initializing database...
[server] ✅ Database initialized
[server] ✅ Database ready
[server] 🚀 Server running on http://localhost:3000
[client] VITE v5.x.x ready in xxx ms
[client] ➜  Local:   http://localhost:5173/
```

## Quick Test

After starting, test these URLs:

1. **Backend API:** http://localhost:3000/api/health
   - Should show: `{"status":"ok","message":"MiniShelf API is running"}`

2. **Frontend:** http://localhost:5173
   - Should show the MiniShelf interface

3. **Upload test:** Click "Upload & Add" and try uploading images
   - Should work now!

## Still Having Issues?

1. Make sure you're in the **root folder** (not client/ or server/)
2. Stop any running processes (Ctrl+C)
3. Check if ports 3000 or 5173 are already in use
4. Try running backend and frontend separately (Option 3 above)

## Directory Structure Reminder

```
C:\Users\Jean-Luc.Deziel\minishelf\     ← RUN COMMANDS FROM HERE!
├── client\                          ← Don't run from here
│   └── package.json
├── server\                          ← Don't run from here
│   └── index.ts
├── package.json                     ← This is the one you need!
└── start-dev.bat                    ← Or just double-click this!
```
