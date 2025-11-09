import React, { useState, useEffect } from 'react';
import { Miniature, api } from '../api';
import AutocompleteInput from './AutocompleteInput';
import { normalizeKeywords } from '../utils/keywords';
import './MetadataEditor.css';

interface MetadataEditorProps {
  miniature: Miniature;
  onClose: () => void;
  onSave: (id: string, data: Partial<Miniature>) => void;
  cacheTimestamp: number;
}

const MetadataEditor: React.FC<MetadataEditorProps> = ({ miniature, onClose, onSave, cacheTimestamp }) => {
  const [formData, setFormData] = useState({
    game: miniature.game,
    name: miniature.name,
    amount: miniature.amount,
    painted: miniature.painted,
    keywords: miniature.keywords,
  });
  const [gameSuggestions, setGameSuggestions] = useState<string[]>([]);
  const [keywordSuggestions, setKeywordSuggestions] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ loaded: 0, total: 0 });
  const [localImagePath, setLocalImagePath] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    loadSuggestions();
  }, []);

  const loadSuggestions = async () => {
    try {
      const [games, keywords] = await Promise.all([
        api.getGames(),
        api.getKeywords(),
      ]);
      setGameSuggestions(games);
      setKeywordSuggestions(keywords);
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(miniature.id, { ...formData, keywords: normalizeKeywords(formData.keywords) });
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleReplaceClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    try {
      setUploadingImage(true);
      setUploadProgress({ loaded: 0, total: 0 });
      const uploaded = await api.uploadImages([file], (loaded, total) => {
        setUploadProgress({ loaded, total });
      });
      if (uploaded && uploaded.length > 0) {
        const newPath = uploaded[0].path;
        // Immediately show the uploaded image in the editor
        setLocalImagePath(newPath + `?t=${Date.now()}`);
        // Persist change via onSave so parent updates
        onSave(miniature.id, { image_path: newPath });
      }
    } catch (err) {
      console.error('Image replace/upload failed', err);
      alert('Failed to upload new image');
    } finally {
      setUploadingImage(false);
      // clear input so same file can be selected again if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Miniature</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="modal-image">
            <img src={localImagePath || `${miniature.image_path}?t=${cacheTimestamp}`} alt={miniature.name} />
            <div className="image-controls">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileSelected}
              />
              <button type="button" className="btn-replace-image" onClick={handleReplaceClick} disabled={uploadingImage}>
                {uploadingImage ? `Uploading...` : 'Replace image'}
              </button>
            </div>
            {uploadingImage && uploadProgress.total > 0 && (
              <div className="replace-progress">{Math.round((uploadProgress.loaded / uploadProgress.total) * 100)}%</div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="editor-form">
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="editor-input"
              />
            </div>

            <div className="form-group">
              <label>Game</label>
              <AutocompleteInput
                type="text"
                value={formData.game}
                onChange={(value) => handleChange('game', value)}
                suggestions={gameSuggestions}
                className="editor-input"
              />
            </div>

            <div className="form-group">
              <label>Amount</label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => handleChange('amount', parseInt(e.target.value) || 1)}
                min="1"
                className="editor-input"
              />
            </div>

            <div className="form-group">
              <label>Keywords (comma-separated)</label>
              <AutocompleteInput
                type="text"
                value={formData.keywords}
                onChange={(value) => handleChange('keywords', value)}
                suggestions={keywordSuggestions}
                placeholder="e.g., woman, sword, warrior"
                className="editor-input"
                isKeywordField={true}
              />
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.painted}
                  onChange={(e) => handleChange('painted', e.target.checked)}
                />
                <span>Painted</span>
              </label>
            </div>

            <div className="modal-actions">
              <button type="button" onClick={onClose} className="btn-modal-cancel">
                Cancel
              </button>
              <button type="submit" className="btn-modal-save">
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MetadataEditor;
