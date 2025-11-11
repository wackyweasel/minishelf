import * as db from './database';

export interface Miniature {
  id: string;
  game: string;
  name: string;
  amount: number;
  painted: boolean;
  keywords: string;
  image_data: string;
  // thumbnail_data removed
  created_at: string;
  updated_at: string;
}

export interface UploadedFile {
  id: string;
  filename: string;
  data: string; // base64 encoded image data
  originalName: string;
}

// Helper function to convert File to base64
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Helper function to resize image to max dimensions
async function resizeImage(base64Image: string, maxWidth: number = 512, maxHeight: number = 512, quality: number = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      
      // Calculate new dimensions while maintaining aspect ratio
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      // Use better image smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);
      
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    img.src = base64Image;
  });
}

// (thumbnail generation removed)

// Helper to create a medium-sized image for gallery cards (better balance quality/size)
// (medium-sized image generation removed)

export const api = {
  // Upload images (convert to base64)
  uploadImages: async (files: File[], onProgress?: (loaded: number, total: number) => void): Promise<UploadedFile[]> => {
    const uploadedFiles: UploadedFile[] = [];
    
    console.log('uploadImages called with', files.length, 'files');
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const id = crypto.randomUUID();
      
      console.log('Processing file:', file.name, 'size:', file.size);
      
      // Convert to base64
      const base64Original = await fileToBase64(file);
      console.log('Base64 conversion complete, original length:', base64Original.length);
      
      // Resize to max 512x512 to save space
      const base64Data = await resizeImage(base64Original, 512, 512, 0.85);
      console.log('Image resized, new length:', base64Data.length, 'reduction:', 
        Math.round((1 - base64Data.length / base64Original.length) * 100) + '%');
      
      // No derived thumbnail created to save space; keep original resized image only
      uploadedFiles.push({
        id,
        filename: `${id}-${file.name}`,
        data: base64Data,
        originalName: file.name,
      });
      
      // Report progress
      if (onProgress) {
        onProgress(i + 1, files.length);
      }
    }
    
    console.log('Upload complete, returning', uploadedFiles.length, 'files');
    return uploadedFiles;
  },

  // (medium generation removed)

  // Create miniatures
  createMiniatures: async (miniatures: Partial<Miniature>[]): Promise<void> => {
    for (const miniature of miniatures) {
      await db.createMiniature(miniature);
    }
  },

  // Get all miniatures with optional search
  getMiniatures: async (params?: { search?: string; game?: string; painted?: boolean }): Promise<Miniature[]> => {
    return await db.getAllMiniatures(params);
  },

  // Get single miniature
  getMiniature: async (id: string): Promise<Miniature> => {
    const miniature = await db.getMiniature(id);
    if (!miniature) {
      throw new Error('Miniature not found');
    }
    return miniature;
  },

  // Update miniature
  updateMiniature: async (id: string, data: Partial<Miniature>): Promise<void> => {
    await db.updateMiniature(id, data);
  },

  // Delete miniature
  deleteMiniature: async (id: string): Promise<void> => {
    await db.deleteMiniature(id);
  },

  // Get list of games
  getGames: async (): Promise<string[]> => {
    return await db.getGames();
  },

  // Get list of keywords
  getKeywords: async (): Promise<string[]> => {
    return await db.getKeywords();
  },
};
