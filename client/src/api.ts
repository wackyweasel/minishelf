import * as db from './database';

export interface Miniature {
  id: string;
  game: string;
  name: string;
  amount: number;
  painted: boolean;
  keywords: string;
  image_data: string;
  thumbnail_data: string | null;
  created_at: string;
  updated_at: string;
}

export interface UploadedFile {
  id: string;
  filename: string;
  data: string; // base64 encoded image data
  thumbnailData: string | null; // base64 encoded thumbnail
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

// Helper function to create thumbnail from image
async function createThumbnail(base64Image: string, maxWidth: number = 200): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ratio = maxWidth / img.width;
      canvas.width = maxWidth;
      canvas.height = img.height * ratio;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = reject;
    img.src = base64Image;
  });
}

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
      const base64Data = await fileToBase64(file);
      console.log('Base64 conversion complete, length:', base64Data.length, 'preview:', base64Data.substring(0, 50));
      
      // Create thumbnail
      let thumbnailData: string | null = null;
      try {
        thumbnailData = await createThumbnail(base64Data);
        console.log('Thumbnail created, length:', thumbnailData?.length);
      } catch (error) {
        console.warn('Could not create thumbnail:', error);
      }
      
      uploadedFiles.push({
        id,
        filename: `${id}-${file.name}`,
        data: base64Data,
        thumbnailData,
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
