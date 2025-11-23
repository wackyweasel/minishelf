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
  onSelectVisible?: () => void;
  showKeywords?: boolean;
  showGame?: boolean;
  showName?: boolean;
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
  onSelectVisible,
  showKeywords,
  showGame,
  showName,
}) => {
  const [previewImage, setPreviewImage] = React.useState<string | null>(null);
  const [openMenuForId, setOpenMenuForId] = React.useState<string | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [computedColumns, setComputedColumns] = React.useState<number | null>(null);

  // close on escape
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setPreviewImage(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // close menu on escape or when selection changes
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpenMenuForId(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // close menu when clicking outside cards
  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (!target.closest('.gallery-card') && !target.closest('.mini-list-row') && !target.closest('.mini-action-menu')) {
        setOpenMenuForId(null);
      }
    }
    window.addEventListener('click', onDocClick);
    return () => window.removeEventListener('click', onDocClick);
  }, []);

  // Enforce minimum columns per image size when the container is narrow.
  React.useEffect(() => {
    if (!containerRef.current) return;

    const minColsForSize: Record<string, number | null> = {
      tiny: 4,
      small: 3,
      medium: 2,
      large: null,
    };

    // Approximate desired thumbnail width per size (should match CSS minmax values)
    const thumbMinWidthForSize: Record<string, number> = {
      tiny: 110, // matches Gallery.css .gallery-tiny
      small: 150,
      medium: 200,
      large: 280,
    };

    function recompute() {
      const el = containerRef.current;
      if (!el) return;
      const w = el.clientWidth || el.getBoundingClientRect().width;

      const minCols = minColsForSize[imageSize] ?? null;
      if (!minCols) {
        // no minimum for large
        setComputedColumns(null);
        return;
      }

      const thumbMin = thumbMinWidthForSize[imageSize] || 150;

      // columns that fit at thumbMin width
      const colsFit = Math.max(1, Math.floor(w / thumbMin));

      // Desired columns is at least the minimum, but don't exceed items available.
      const desired = Math.max(minCols, colsFit);
      const cols = Math.min(desired, Math.max(1, miniatures.length));
      setComputedColumns(cols);
    }

    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [imageSize, miniatures.length, viewMode]);
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

    const showAny = !!(showName || showGame || showKeywords);

    return (
    <>
      {selectedIds.size > 0 && (
        <BatchEditSection
          selectedCount={selectedIds.size}
          onBatchUpdate={onBatchUpdate}
          onClearSelection={onClearSelection}
          onDeleteSelected={onDeleteSelected}
          onSelectVisible={onSelectVisible}
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
        <div
          ref={containerRef}
          className={`gallery gallery-${imageSize}`}
          style={
            computedColumns && imageSize !== 'large'
              ? (() => {
                  const pxForSize: Record<string, number> = { tiny: 110, small: 150, medium: 200 };
                  const px = pxForSize[imageSize] || 150;
                  return { gridTemplateColumns: `repeat(${computedColumns}, ${px}px)` };
                })()
              : undefined
          }
        >
          {miniatures.map((mini, index) => {
            const isSelected = selectedIds.has(mini.id);
            const isMenuOpen = openMenuForId === mini.id;
            return (
              <div
                key={mini.id}
                className={`gallery-card ${isSelected ? 'selected' : ''}`}
                onClick={(e) => {
                  if (selectedIds.size > 0) {
                    onCardClick(mini, index, (e as any).shiftKey);
                    return;
                  }
                  if (isMenuOpen) return;
                  setOpenMenuForId(mini.id);
                }}
              >
                <div className="card-image-container">
                  <img
                    src={mini.image_data}
                    alt={mini.name || 'Miniature'}
                    className="card-image"
                    decoding="async"
                    loading="lazy"
                    data-cache={cacheTimestamp}
                    style={{ imageRendering: 'auto' }}
                  />
                  {mini.painted && <span className="painted-badge">🎨</span>}
                  {isMenuOpen && (
                    <div className="mini-action-menu" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="menu-btn"
                        onClick={() => {
                          onCardClick(mini, index, false);
                          setOpenMenuForId(null);
                        }}
                        type="button"
                      >
                        Select
                      </button>
                      <button
                        className="menu-btn"
                        onClick={() => {
                          setPreviewImage(mini.image_data);
                          setOpenMenuForId(null);
                        }}
                        type="button"
                      >
                        View
                      </button>
                      <button
                        className="menu-btn"
                        onClick={() => {
                          onEdit(mini);
                          setOpenMenuForId(null);
                        }}
                        type="button"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </div>
                {showAny && (
                  <div className="card-content">
                  <h3 className="card-title">
                    {showName ? (
                      <>
                        {mini.name || 'Unnamed'}
                        {mini.amount > 1 && ` (x${mini.amount})`}
                      </>
                    ) : ''}
                  </h3>
                  {mini.game && (
                    showGame && (
                      <p
                        className="card-game"
                        onClick={(e) => {
                          e.stopPropagation();
                          onGameClick(mini.game);
                        }}
                      >
                        🎲 {mini.game}
                      </p>
                    )
                  )}
                  {showKeywords && mini.keywords && (
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
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className={`mini-list mini-list-${imageSize}`}>
          {showAny ? (
            <>
              <div className="mini-list-header">
                <div className="col-img">Image</div>
                <div className="col-name">Name</div>
                {showGame && <div className="col-game">Game</div>}
                <div className="col-amount">Qty</div>
                <div className="col-painted">Painted</div>
                <div className="col-keywords">Keywords</div>
              </div>
              {miniatures.map((mini, index) => {
                const isSelected = selectedIds.has(mini.id);
                const isMenuOpen = openMenuForId === mini.id;
                return (
                  <div
                    key={mini.id}
                    className={`mini-list-row ${isSelected ? 'selected' : ''}`}
                    onClick={(e) => {
                      if (selectedIds.size > 0) {
                        onCardClick(mini, index, (e as any).shiftKey);
                        return;
                      }
                      if (isMenuOpen) return;
                      setOpenMenuForId(mini.id);
                    }}
                  >
                    <div className="col-img">
                      <div className="mini-img-wrap">
                        <img
                          src={mini.image_data}
                          alt={mini.name || 'Miniature'}
                          decoding="async"
                          loading="lazy"
                          data-cache={cacheTimestamp}
                          style={{ imageRendering: 'auto' }}
                        />
                        {isMenuOpen && (
                          <div className="mini-action-menu" onClick={(e) => e.stopPropagation()}>
                            <button className="menu-btn" onClick={() => { onCardClick(mini, index, false); setOpenMenuForId(null); }} type="button">Select</button>
                            <button className="menu-btn" onClick={() => { setPreviewImage(mini.image_data); setOpenMenuForId(null); }} type="button">View</button>
                            <button className="menu-btn" onClick={() => { onEdit(mini); setOpenMenuForId(null); }} type="button">Edit</button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="col-name">{showName ? (mini.name || 'Unnamed') : ''}</div>
                    {showGame && (
                      <div className="col-game" onClick={(e) => { e.stopPropagation(); onGameClick(mini.game); }}>{mini.game}</div>
                    )}
                    <div className="col-amount">{showName ? mini.amount : ''}</div>
                    <div className="col-painted">{mini.painted ? 'Yes' : 'No'}</div>
                    <div className="col-keywords">
                      {showKeywords && mini.keywords && (
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
            </>
          ) : (
            // simplified rows showing image only
            <>
              <div className="mini-list-header">
                <div className="col-img">Image</div>
              </div>
              {miniatures.map((mini, index) => {
                const isSelected = selectedIds.has(mini.id);
                const isMenuOpen = openMenuForId === mini.id;
                return (
                  <div
                    key={mini.id}
                    className={`mini-list-row ${isSelected ? 'selected' : ''}`}
                    onClick={(e) => {
                      if (selectedIds.size > 0) {
                        onCardClick(mini, index, (e as any).shiftKey);
                        return;
                      }
                      if (isMenuOpen) return;
                      setOpenMenuForId(mini.id);
                    }}
                  >
                    <div className="col-img">
                      <div className="mini-img-wrap">
                        <img
                          src={mini.image_data}
                          alt={mini.name || 'Miniature'}
                          decoding="async"
                          loading="lazy"
                          data-cache={cacheTimestamp}
                          style={{ imageRendering: 'auto' }}
                        />
                        {isMenuOpen && (
                          <div className="mini-action-menu" onClick={(e) => e.stopPropagation()}>
                            <button className="menu-btn" onClick={() => { onCardClick(mini, index, false); setOpenMenuForId(null); }} type="button">Select</button>
                            <button className="menu-btn" onClick={() => { setPreviewImage(mini.image_data); setOpenMenuForId(null); }} type="button">View</button>
                            <button className="menu-btn" onClick={() => { onEdit(mini); setOpenMenuForId(null); }} type="button">Edit</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
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
