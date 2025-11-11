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
            // Build export data with image data already in base64
            const selected = miniatures.filter(m => selectedIds.has(m.id));

            const exportData = selected.map(m => ({
              id: m.id,
              game: m.game,
              name: m.name,
              amount: m.amount,
              painted: m.painted,
              keywords: m.keywords,
              image_data: m.image_data,
            }));

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
                  {/* Use srcSet so browsers can pick a higher-resolution image when available.
                      Prefer the full image as a higher-density source but fall back to thumbnail.
                      Add decoding and loading attributes to improve rendering behavior. */}
                  <img
                    src={mini.image_data}
                    alt={mini.name || 'Miniature'}
                    className="card-image"
                    decoding="async"
                    loading="lazy"
                    data-cache={cacheTimestamp}
                    style={{ imageRendering: 'auto' }}
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
                      setPreviewImage(mini.image_data);
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
                    {/* List view: prefer higher-res image if available and add decoding/loading */}
                    <img
                      src={mini.image_data}
                      alt={mini.name || 'Miniature'}
                      decoding="async"
                      loading="lazy"
                      data-cache={cacheTimestamp}
                      style={{ imageRendering: 'auto' }}
                    />
                    {isSelected && <div className="mini-selection-checkmark">✓</div>}
                    <button className="btn-edit-round" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(mini); }} aria-label={`Edit ${mini.name || 'miniature'}`} type="button">✏️</button>
                    <button className="btn-view-round" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPreviewImage(mini.image_data); }} aria-label={`View ${mini.name || 'miniature'}`} type="button">👁️</button>
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
