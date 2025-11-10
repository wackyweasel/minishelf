import React, { useState, useEffect } from 'react';
import { api, UploadedFile } from '../api';
import AutocompleteInput from './AutocompleteInput';
import { normalizeKeywords } from '../utils/keywords';
import './UploadSection.css';

interface UploadSectionProps {
  onUploadComplete: () => void;
  onUnsavedWorkChange: (hasUnsavedWork: boolean) => void;
  onImportFile?: (data: any) => Promise<void>;
}

interface MiniatureForm {
  id: string;
  game: string;
  name: string;
  amount: number;
  painted: boolean;
  keywords: string;
  image_data: string;
  thumbnail_data: string | null;
  rotation: number;
}

const UploadSection: React.FC<UploadSectionProps> = ({ onUploadComplete, onUnsavedWorkChange, onImportFile }) => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [miniatures, setMiniatures] = useState<MiniatureForm[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [gameSuggestions, setGameSuggestions] = useState<string[]>([]);
  const [keywordSuggestions, setKeywordSuggestions] = useState<string[]>([]);
  const [batchGame, setBatchGame] = useState('');
  const [batchPainted, setBatchPainted] = useState(false);
  const [batchAmount, setBatchAmount] = useState<number | ''>('');
  const [batchKeywords, setBatchKeywords] = useState('');
  const [uploadProgress, setUploadProgress] = useState({ loaded: 0, total: 0 });

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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploading(true);
      setUploadProgress({ loaded: 0, total: 0 });
      const fileArray = Array.from(files);
      const uploaded = await api.uploadImages(fileArray, (loaded, total) => {
        setUploadProgress({ loaded, total });
      });
      
      setUploadedFiles(uploaded);
      
      // Initialize form data for each uploaded file
      const initialForms = uploaded.map(file => ({
        id: file.id,
        game: '',
        name: '',
        amount: 1,
        painted: false,
        keywords: '',
        image_data: file.data,
        thumbnail_data: file.thumbnailData,
        rotation: 0,
      }));
      
      setMiniatures(initialForms);
      onUnsavedWorkChange(true); // Mark as having unsaved work
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload images');
    } finally {
      setUploading(false);
      setUploadProgress({ loaded: 0, total: 0 });
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    // If the user dropped a single JSON file and nothing else, try to import it
    if (files.length === 1 && files[0].type === 'application/json') {
      try {
        const text = await files[0].text();
        const data = JSON.parse(text);

        // If there are embedded images (data URLs), convert them to Files and upload
        if (Array.isArray(data.miniatures) && data.miniatures.some((m: any) => m.image && m.image.data)) {
          // Convert data URLs to File objects
          const filesToUpload: File[] = data.miniatures.map((m: any, idx: number) => {
            const img = m.image;
            const dataUrl = img && img.data;
            const filename = (img && img.filename) || `import-${idx}.png`;
            if (!dataUrl) return null as any;

            // Parse data URL
            const match = dataUrl.match(/^data:(.*?);base64,(.*)$/);
            if (!match) return null as any;
            const mime = match[1];
            const bstr = atob(match[2]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
              u8arr[n] = bstr.charCodeAt(n);
            }
            return new File([u8arr], filename, { type: mime });
          }).filter(Boolean) as File[];

          if (filesToUpload.length > 0) {
            setUploading(true);
            const uploaded = await api.uploadImages(filesToUpload, (loaded, total) => {
              setUploadProgress({ loaded, total });
            });

            // Build miniatures payload mapping uploaded data to entries
            const miniaturesToCreate = data.miniatures.map((m: any, idx: number) => ({
              game: m.game || '',
              name: m.name || '',
              amount: m.amount || 1,
              painted: !!m.painted,
              keywords: m.keywords || '',
              image_data: uploaded[idx] ? uploaded[idx].data : (m.image_data || ''),
              thumbnail_data: uploaded[idx] ? uploaded[idx].thumbnailData : (m.thumbnail_data || null),
            }));

            try {
              await api.createMiniatures(miniaturesToCreate);
              onUploadComplete();
            } catch (err) {
              console.error('Failed to create miniatures from import:', err);
              alert('Failed to import miniatures');
            } finally {
              setUploading(false);
              setUploadProgress({ loaded: 0, total: 0 });
            }
          }
        } else if (onImportFile) {
          // No embedded images: delegate to parent
          await onImportFile(data);
        } else {
          // If no handler provided, try to merge into the upload form (best-effort)
          if (Array.isArray(data.miniatures)) {
            const imports = data.miniatures.map((m: any, idx: number) => ({
              id: `import-${Date.now()}-${idx}`,
              game: m.game || '',
              name: m.name || '',
              amount: m.amount || 1,
              painted: !!m.painted,
              keywords: m.keywords || '',
              image_data: m.image_data || m.image?.data || '',
              thumbnail_data: m.thumbnail_data || null,
              rotation: 0,
            }));
            setMiniatures(imports);
            setUploadedFiles([]);
            onUnsavedWorkChange(true);
          } else {
            alert('Invalid import file');
          }
        }
      } catch (err) {
        console.error('Import failed:', err);
        alert('Failed to import file');
      }
      setIsDragging(false);
      return;
    }

    try {
      setUploading(true);
      setUploadProgress({ loaded: 0, total: 0 });
      const fileArray = Array.from(files);
      const uploaded = await api.uploadImages(fileArray, (loaded, total) => {
        setUploadProgress({ loaded, total });
      });
      
      setUploadedFiles(uploaded);
      
      // Initialize form data for each uploaded file
      const initialForms = uploaded.map(file => ({
        id: file.id,
        game: '',
        name: '',
        amount: 1,
        painted: false,
        keywords: '',
        image_data: file.data,
        thumbnail_data: file.thumbnailData,
        rotation: 0,
      }));
      
      setMiniatures(initialForms);
      onUnsavedWorkChange(true); // Mark as having unsaved work
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload images');
    } finally {
      setUploading(false);
      setUploadProgress({ loaded: 0, total: 0 });
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleApplyBatchEdits = () => {
    setMiniatures(prev =>
      prev.map(mini => ({
        ...mini,
        ...(batchGame && { game: batchGame }),
        ...(batchAmount && { amount: batchAmount }),
        ...(batchKeywords && { keywords: batchKeywords }),
        painted: batchPainted,
      }))
    );
    // Clear batch fields after applying
    setBatchGame('');
    setBatchPainted(false);
    setBatchAmount('');
    setBatchKeywords('');
  };

  const handleSingleUpdate = (id: string, field: keyof MiniatureForm, value: any) => {
    setMiniatures(prev =>
      prev.map(mini => (mini.id === id ? { ...mini, [field]: value } : mini))
    );
  };

  const handleRemoveMiniature = (id: string) => {
    setMiniatures(prev => prev.filter(mini => mini.id !== id));
    setUploadedFiles(prev => prev.filter(file => file.id !== id));
    
    // If no more miniatures, clear unsaved work flag
    if (miniatures.length === 1) {
      onUnsavedWorkChange(false);
    }
  };

  const handleRotateImage = (id: string) => {
    setMiniatures(prev =>
      prev.map(mini =>
        mini.id === id ? { ...mini, rotation: (mini.rotation + 90) % 360 } : mini
      )
    );
  };

  const handleSave = async () => {
    if (miniatures.length === 0) {
      alert('No miniatures to save');
      return;
    }

    try {
      setSaving(true);
      // Normalize keywords for all miniatures before sending to API
      const payload = miniatures.map(m => ({
        ...m,
        keywords: normalizeKeywords(m.keywords),
      }));

      console.log('Saving miniatures, count:', payload.length);
      console.log('First miniature sample:', {
        id: payload[0]?.id,
        name: payload[0]?.name,
        hasImageData: !!payload[0]?.image_data,
        imageDataLength: payload[0]?.image_data?.length,
        imageDataPreview: payload[0]?.image_data?.substring(0, 50)
      });

      await api.createMiniatures(payload);
      
      console.log('Miniatures saved successfully');
      
  // Reset state
  setUploadedFiles([]);
  setMiniatures([]);
  // Notify parent that upload/save completed (no popup)
  onUploadComplete();
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save miniatures');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="upload-section">
      <div className="upload-header">
        <h2>Upload Miniatures</h2>
        <p>Upload multiple images and add metadata in batch</p>
      </div>

      {uploadedFiles.length === 0 ? (
        <div 
          className={`upload-dropzone ${isDragging ? 'dragging' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <label htmlFor="file-upload" className="file-upload-label">
            <div className="dropzone-content">
              <span className="upload-icon">📸</span>
              <h3>Click to upload images or import JSON</h3>
              <p>or drag and drop images or exported JSON files</p>
              <p className="upload-hint">For images: PNG, JPG, GIF up to 20MB each</p>
            </div>
            <input
              id="file-upload"
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              disabled={uploading}
              style={{ display: 'none' }}
            />
          </label>
          {/* JSON import now accepted via drag-and-drop; removed dedicated import button */}
          {uploading && (
            <div className="upload-progress">
              {uploadProgress.total > 0 ? (
                <>
                  Uploading... {Math.round((uploadProgress.loaded / uploadProgress.total) * 100)}%
                  <div className="progress-bar">
                    <div 
                      className="progress-bar-fill" 
                      style={{ width: `${(uploadProgress.loaded / uploadProgress.total) * 100}%` }}
                    />
                  </div>
                </>
              ) : (
                'Preparing upload...'
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="metadata-section">
          <div className="batch-controls">
            <h3>Batch Edit (apply to all)</h3>
            <div className="batch-form">
              <div className="batch-form-inputs">
                <AutocompleteInput
                  type="text"
                  placeholder="Game name"
                  value={batchGame}
                  onChange={setBatchGame}
                  suggestions={gameSuggestions}
                  className="batch-input"
                />
                <input
                  type="number"
                  placeholder="Quantity"
                  value={batchAmount}
                  onChange={(e) => setBatchAmount(e.target.value ? parseInt(e.target.value) : '')}
                  className="batch-input"
                  min="1"
                />
                <AutocompleteInput
                  type="text"
                  placeholder="Keywords"
                  value={batchKeywords}
                  onChange={setBatchKeywords}
                  suggestions={keywordSuggestions}
                  className="batch-input"
                  isKeywordField={true}
                />
                <label className="batch-checkbox">
                  <input
                    type="checkbox"
                    checked={batchPainted}
                    onChange={(e) => setBatchPainted(e.target.checked)}
                  />
                  <span>Painted</span>
                </label>
              </div>
              <div className="batch-form-actions">
                <button
                  type="button"
                  onClick={handleApplyBatchEdits}
                  className="batch-apply-btn"
                  disabled={!batchGame && !batchPainted && !batchAmount && !batchKeywords}
                >
                  Apply to All
                </button>
              </div>
            </div>
          </div>

          <div className="miniatures-grid">
            {miniatures.map((mini, index) => (
              <div key={mini.id} className="miniature-form-card">
                <div className="form-card-image">
                  <img 
                    src={mini.thumbnail_data || mini.image_data} 
                    alt={`Upload ${index + 1}`}
                    style={{ transform: `rotate(${mini.rotation}deg)` }}
                  />
                  <span className="image-number">#{index + 1}</span>
                  <button
                    className="rotate-mini-btn"
                    onClick={() => handleRotateImage(mini.id)}
                    title="Rotate 90° clockwise"
                    type="button"
                  >
                    ⟳
                  </button>
                  <button
                    className="remove-mini-btn"
                    onClick={() => handleRemoveMiniature(mini.id)}
                    title="Remove this miniature"
                    type="button"
                  >
                    ✕
                  </button>
                </div>
                <div className="form-card-fields">
                  <input
                    type="text"
                    placeholder="Miniature name"
                    value={mini.name}
                    onChange={(e) => handleSingleUpdate(mini.id, 'name', e.target.value)}
                    className="form-input"
                  />
                  <AutocompleteInput
                    type="text"
                    placeholder="Game"
                    value={mini.game}
                    onChange={(value) => handleSingleUpdate(mini.id, 'game', value)}
                    suggestions={gameSuggestions}
                    className="form-input"
                  />
                  <input
                    type="number"
                    placeholder="Amount"
                    value={mini.amount}
                    onChange={(e) => handleSingleUpdate(mini.id, 'amount', parseInt(e.target.value) || 1)}
                    className="form-input"
                    min="1"
                  />
                  <AutocompleteInput
                    type="text"
                    placeholder="Keywords"
                    value={mini.keywords}
                    onChange={(value) => handleSingleUpdate(mini.id, 'keywords', value)}
                    suggestions={keywordSuggestions}
                    className="form-input"
                    isKeywordField={true}
                  />
                  <label className="form-checkbox">
                    <input
                      type="checkbox"
                      checked={mini.painted}
                      onChange={(e) => handleSingleUpdate(mini.id, 'painted', e.target.checked)}
                    />
                    <span>Painted</span>
                  </label>
                </div>
              </div>
            ))}
          </div>

          <div className="form-actions">
            <button
              onClick={() => {
                setUploadedFiles([]);
                setMiniatures([]);
                onUnsavedWorkChange(false); // Clear unsaved work flag
              }}
              className="btn-cancel"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-save"
            >
              {saving ? 'Saving...' : `Save ${miniatures.length} Miniature${miniatures.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadSection;
