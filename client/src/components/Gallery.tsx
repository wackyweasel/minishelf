import React from 'react';
import { Miniature } from '../api';
import { ImageSize } from './SearchSection';
import BatchEditSection from './BatchEditSection';
import './Gallery.css';

interface GalleryProps {
  miniatures: Miniature[];
  loading: boolean;
  onEdit: (miniature: Miniature) => void;
  onKeywordClick: (keyword: string) => void;
  onGameClick: (game: string) => void;
  imageSize: ImageSize;
  viewMode: 'grid' | 'list';
  cacheTimestamp: number;
  selectedIds: Set<string>;
  onCardClick: (miniature: Miniature, index: number, shiftKey: boolean) => void;
  onBatchUpdate: (data: Partial<Miniature>) => Promise<void>;
  onClearSelection: () => void;
  onDeleteSelected: () => Promise<void>;
}

const Gallery: React.FC<GalleryProps> = ({
  miniatures,
  loading,
  onEdit,
  onKeywordClick,
  onGameClick,
  imageSize,
  viewMode,
  cacheTimestamp,
  selectedIds,
  onCardClick,
  onBatchUpdate,
  onClearSelection,
  onDeleteSelected,
}) => {
  const [previewImage, setPreviewImage] = React.useState<string | null>(null);

  // close on escape
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setPreviewImage(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  if (loading) {
    return (
      <div className="gallery-loading">
        <div className="spinner"></div>
        <p>Loading miniatures...</p>
      </div>
    );
  }

  if (miniatures.length === 0) {
    return (
      <div className="gallery-empty">
        <div className="empty-icon">📦</div>
        <h2>No miniatures found</h2>
        <p>Upload some miniatures to get started!</p>
      </div>
    );
  }

  return (
    <>
      {selectedIds.size > 0 && (
        <BatchEditSection
          selectedCount={selectedIds.size}
          onBatchUpdate={onBatchUpdate}
          onClearSelection={onClearSelection}
          onDeleteSelected={onDeleteSelected}
          onExportSelected={async () => {
            // Build export data and include image data URIs for each selected miniature
            const selected = miniatures.filter(m => selectedIds.has(m.id));

            // Helper to fetch image and convert to data URL
            const toDataUrl = (url: string) => new Promise<string>(async (resolve, reject) => {
              try {
                const r = await fetch(url);
                const blob = await r.blob();
                const reader = new FileReader();
                reader.onerror = () => reject(new Error('Failed reading blob'));
                reader.onload = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
              } catch (err) {
                reject(err);
              }
            });

            const exportData = [] as any[];

            for (const m of selected) {
              const imageUrl = m.image_path + (m.image_path.includes('?') ? `&t=${cacheTimestamp}` : `?t=${cacheTimestamp}`);
              try {
                const dataUrl = await toDataUrl(imageUrl);
                // derive filename from path
                const parts = m.image_path.split('/');
                const filename = parts[parts.length - 1] || `${m.id}.jpg`;
                exportData.push({
                  id: m.id,
                  game: m.game,
                  name: m.name,
                  amount: m.amount,
                  painted: m.painted,
                  keywords: m.keywords,
                  image: { filename, data: dataUrl },
                });
              } catch (err) {
                console.error('Failed to fetch image for export', m.id, err);
                // Fallback: export without image data, include image_path
                exportData.push({
                  id: m.id,
                  game: m.game,
                  name: m.name,
                  amount: m.amount,
                  painted: m.painted,
                  keywords: m.keywords,
                  image_path: m.image_path,
                });
              }
            }

            const blob = new Blob([JSON.stringify({ miniatures: exportData }, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `miniatures-export-${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
          }}
        />
      )}

      {viewMode === 'grid' ? (
        <div className={`gallery gallery-${imageSize}`}>
          {miniatures.map((mini, index) => {
            const isSelected = selectedIds.has(mini.id);
            return (
              <div 
                key={mini.id} 
                className={`gallery-card ${isSelected ? 'selected' : ''}`}
                onClick={(e) => onCardClick(mini, index, e.shiftKey)}
              >
                {isSelected && (
                  <div className="selection-checkmark">✓</div>
                )}
                <div className="card-image-container">
                  <img
                    src={`${mini.image_path}?t=${cacheTimestamp}`}
                    alt={mini.name || 'Miniature'}
                    className="card-image"
                  />
                  {mini.painted && (
                    <span className="painted-badge">🎨 Painted</span>
                  )}
                  <button
                    className="btn-edit-round"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onEdit(mini);
                    }}
                    aria-label={`Edit ${mini.name || 'miniature'}`}
                    type="button"
                  >
                    ✏️
                  </button>
                  <button
                    className="btn-view-round"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setPreviewImage(`${mini.image_path}?t=${cacheTimestamp}`);
                    }}
                    aria-label={`View ${mini.name || 'miniature'}`}
                    type="button"
                  >
                    👁️
                  </button>
                </div>
                <div className="card-content">
                  <h3 className="card-title">
                    {mini.name || 'Unnamed'}
                    {mini.amount > 1 && ` (x${mini.amount})`}
                  </h3>
                  {mini.game && (
                    <p 
                      className="card-game"
                      onClick={(e) => {
                        e.stopPropagation();
                        onGameClick(mini.game);
                      }}
                    >
                      🎲 {mini.game}
                    </p>
                  )}
                  {mini.keywords && (
                    <div className="card-keywords">
                      {mini.keywords.split(',').map((keyword, idx) => (
                        <span 
                          key={idx} 
                          className="keyword-tag"
                          onClick={(e) => {
                            e.stopPropagation();
                            onKeywordClick(keyword.trim());
                          }}
                        >
                          {keyword.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="card-actions">
                    {/* actions remain here if we want extras later */}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={`mini-list mini-list-${imageSize}`}>
          <div className="mini-list-header">
            <div className="col-img">Image</div>
            <div className="col-name">Name</div>
            <div className="col-game">Game</div>
            <div className="col-amount">Qty</div>
            <div className="col-painted">Painted</div>
            <div className="col-keywords">Keywords</div>
          </div>
          {miniatures.map((mini, index) => {
            const isSelected = selectedIds.has(mini.id);
            return (
              <div
                key={mini.id}
                className={`mini-list-row ${isSelected ? 'selected' : ''}`}
                onClick={(e) => onCardClick(mini, index, (e as any).shiftKey)}
              >
                <div className="col-img">
                  <div className="mini-img-wrap">
                    <img src={`${mini.image_path}?t=${cacheTimestamp}`} alt={mini.name || 'Miniature'} />
                    {isSelected && <div className="mini-selection-checkmark">✓</div>}
                    <button className="btn-edit-round" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(mini); }} aria-label={`Edit ${mini.name || 'miniature'}`} type="button">✏️</button>
                    <button className="btn-view-round" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPreviewImage(`${mini.image_path}?t=${cacheTimestamp}`); }} aria-label={`View ${mini.name || 'miniature'}`} type="button">👁️</button>
                  </div>
                </div>
                <div className="col-name">{mini.name || 'Unnamed'}</div>
                <div className="col-game" onClick={(e) => { e.stopPropagation(); onGameClick(mini.game); }}>{mini.game}</div>
                <div className="col-amount">{mini.amount}</div>
                <div className="col-painted">{mini.painted ? 'Yes' : 'No'}</div>
                <div className="col-keywords">
                  {mini.keywords && (
                    <div className="card-keywords">
                      {mini.keywords.split(',').map((keyword, idx) => (
                        <span
                          key={idx}
                          className="keyword-tag"
                          onClick={(e) => {
                            e.stopPropagation();
                            onKeywordClick(keyword.trim());
                          }}
                        >
                          {keyword.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* Image preview modal */}
      {previewImage && (
        <div className="image-preview-overlay" onClick={() => setPreviewImage(null)}>
          <div className="image-preview-content" onClick={(e) => e.stopPropagation()}>
            <button className="preview-close" onClick={() => setPreviewImage(null)} aria-label="Close preview">✕</button>
            <img src={previewImage} alt="Preview" />
          </div>
        </div>
      )}
    </>
  );
};

export default Gallery;
