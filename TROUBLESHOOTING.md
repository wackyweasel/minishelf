# Troubleshooting Guide

## Upload Error Fix

The upload error `ECONNREFUSED` means the backend server isn't running or isn't accessible.

### Solution Steps:

1. **Check if backend server is running**
   - Look for the terminal running `npm run dev`
   - You should see messages like:
     ```
     🔧 Initializing database...
     ✅ Database ready
     🚀 Server running on http://localhost:3000
     ```

2. **If you don't see those messages:**
   - Stop the current process (Ctrl+C)
   - Run `npm run dev` again from the project root
   - Watch for any error messages during startup

3. **Common Issues:**

   **Database initialization error:**
   - The sql.js library needs to download a WASM file
   - Check your internet connection
   - The error will be logged with "❌ Database initialization error"

   **Port already in use:**
   - Another app might be using port 3000
   - Kill the process or change the port in `server/index.ts` (line 8)

   **TypeScript compilation errors:**
   - Run: `npm install` in the root directory
   - Run: `cd server && npm install` (if needed)

4. **Test the backend directly:**
   - Open browser to: http://localhost:3000/api/health
   - You should see: `{"status":"ok","message":"MiniShelf API is running"}`
   - If this works, the backend is fine

5. **Check the console output:**
   - Backend should show initialization messages
   - Frontend (Vite) should show proxy configuration
   - Look for any red error messages

### What I Fixed:

1. ✅ Added better error handling in database initialization
2. ✅ Added detailed logging during server startup
3. ✅ Fixed TypeScript type definitions
4. ✅ Configured sql.js to load WASM file from CDN
5. ✅ Added proper Request/Response types to routes

### Next Steps:

1. **Restart the dev server:**
   ```powershell
   npm run dev
   ```

2. **Watch the console output** - you should see:
   ```
   [server] 🔧 Initializing database...
   [server] ✅ Database ready
   [server] 🚀 Server running on http://localhost:3000
   [client] VITE ready in XXX ms
   [client] Local: http://localhost:5173/
   ```

3. **If backend fails to start:**
   - Copy the error message
   - Check if it's a database error or port conflict
   - The logs will now show exactly what's failing

4. **Test step by step:**
   - Backend health check: http://localhost:3000/api/health
   - Frontend loads: http://localhost:5173
   - Upload should work if both are running

### Manual Backend Test:

If `npm run dev` isn't working, try running backend separately:

```powershell
# In one terminal - Backend only
npm run server:dev

# In another terminal - Frontend only  
npm run client:dev
```

This will help identify if the issue is with backend or frontend.
