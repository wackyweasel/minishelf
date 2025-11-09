import axios from 'axios';

const API_BASE_URL = '/api';

export interface Miniature {
  id: string;
  game: string;
  name: string;
  amount: number;
  painted: boolean;
  keywords: string;
  image_path: string;
  thumbnail_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface UploadedFile {
  id: string;
  filename: string;
  path: string;
  originalName: string;
}

export const api = {
  // Upload images
  uploadImages: async (files: File[], onProgress?: (loaded: number, total: number) => void): Promise<UploadedFile[]> => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('images', file);
    });

    const response = await axios.post(`${API_BASE_URL}/miniatures/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          onProgress(progressEvent.loaded, progressEvent.total);
        }
      },
    });

    return response.data.files;
  },

  // Create miniatures
  createMiniatures: async (miniatures: Partial<Miniature>[]): Promise<void> => {
    await axios.post(`${API_BASE_URL}/miniatures`, { miniatures });
  },

  // Get all miniatures with optional search
  getMiniatures: async (params?: { search?: string; game?: string; painted?: boolean }): Promise<Miniature[]> => {
    const response = await axios.get(`${API_BASE_URL}/miniatures`, { params });
    return response.data;
  },

  // Get single miniature
  getMiniature: async (id: string): Promise<Miniature> => {
    const response = await axios.get(`${API_BASE_URL}/miniatures/${id}`);
    return response.data;
  },

  // Update miniature
  updateMiniature: async (id: string, data: Partial<Miniature>): Promise<void> => {
    await axios.put(`${API_BASE_URL}/miniatures/${id}`, data);
  },

  // Delete miniature
  deleteMiniature: async (id: string): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/miniatures/${id}`);
  },

  // Get list of games
  getGames: async (): Promise<string[]> => {
    const response = await axios.get(`${API_BASE_URL}/miniatures/meta/games`);
    return response.data;
  },

  // Get list of keywords
  getKeywords: async (): Promise<string[]> => {
    const response = await axios.get(`${API_BASE_URL}/miniatures/meta/keywords`);
    return response.data;
  },
};
