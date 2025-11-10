# MiniShelf - Deployment Guide

## ✅ Conversion Complete!

Your app has been successfully converted to a **fully client-side application** that can be deployed to GitHub Pages! 

### What Changed

1. **No Backend Required**: The app now runs entirely in the browser using SQL.js (SQLite compiled to WebAssembly)
2. **Local Storage**: All data is stored in the browser's IndexedDB, so each user's data stays on their own device
3. **Base64 Images**: Images are converted to base64 and stored in the database instead of as files on a server
4. **Static Site**: The entire app is now just HTML, CSS, and JavaScript files

### How to Deploy

#### Option 1: Push to GitHub (Automatic Deployment)

Since you have a GitHub Actions workflow set up, simply push your changes to trigger automatic deployment:

```bash
git push origin main
```

The workflow will:
1. Build the client app
2. Deploy it to the `gh-pages` branch
3. Make it available at https://wackyweasel.github.io/minishelf/

**Note**: You may need to:
- Check your repository settings under Settings > Actions > General > Workflow permissions
- Ensure "Read and write permissions" is selected
- Or create a Personal Access Token if the default GITHUB_TOKEN doesn't have permission

#### Option 2: Manual Deployment

1. Build the app:
   ```bash
   cd client
   npm run build:prod
   ```

2. The built files will be in `client/dist/`

3. Deploy the contents of `client/dist/` to any static hosting service:
   - GitHub Pages
   - Netlify
   - Vercel
   - Cloudflare Pages
   - etc.

### Testing Locally

To test the app locally:

```bash
cd client
npm run build:prod
npm run preview
```

Then open http://localhost:4173/minishelf/ in your browser.

### Important Notes

#### Data Storage
- **Each user's data is completely separate** - stored only in their browser
- Data persists across sessions (stored in IndexedDB)
- Clearing browser data will delete all miniatures
- Users can export their collection as JSON and re-import later

#### Browser Compatibility
- Requires modern browsers with IndexedDB and WebAssembly support
- Works in Chrome, Firefox, Safari, Edge (recent versions)

#### Limitations
- No server-side processing
- No user accounts or authentication
- Data is local to each browser/device
- No sharing collections between users (without manual export/import)

### Exporting & Importing Data

Users can export their collection:
1. Select miniatures in the gallery
2. Use the export function (in BatchEditSection)
3. Save the JSON file

To import:
1. Drag and drop the JSON file into the upload area
2. All miniatures and images will be restored

### File Structure

```
client/
├── src/
│   ├── database.ts        # Client-side SQLite database
│   ├── api.ts             # API layer (now calls local database)
│   ├── App.tsx            # Main app component
│   └── components/        # React components
├── dist/                  # Built files (after npm run build)
└── package.json
```

### Troubleshooting

**App won't load:**
- Check browser console for errors
- Ensure you're accessing via HTTP/HTTPS (not file://)
- Clear browser cache and reload

**Data disappeared:**
- Browser data may have been cleared
- Check if in incognito/private mode
- Restore from a JSON export if available

**Images not showing:**
- Large images may exceed browser storage limits
- Try using smaller image files
- Consider compressing images before upload

### Next Steps

1. **Push your code** to GitHub (you may need to set up authentication)
2. **Wait for GitHub Actions** to deploy (check the Actions tab in GitHub)
3. **Visit** https://wackyweasel.github.io/minishelf/
4. **Test** uploading some miniatures!

Enjoy your fully functional client-side miniature collection manager! 🎨🎲
