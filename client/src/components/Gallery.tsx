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
  const [gridStyle, setGridStyle] = React.useState<React.CSSProperties | undefined>(undefined);

  // Thumbnail sizing presets used when rendering the grid.
  const thumbMinWidthForSize: Record<string, number> = {
    tiny: 110,
    small: 150,
    medium: 200,
    large: 280,
  };

  const thumbMaxWidthForSize: Record<string, number> = {
    tiny: 180,
    small: 260,
    medium: 340,
    large: 560,
  };

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

  // Compute grid style to either evenly stretch columns to fill the row
  // or clamp thumbnails to a maximum size and left-align when they would grow too large.
  React.useEffect(() => {
    if (!containerRef.current) return;

    function recompute() {
      const el = containerRef.current;
      if (!el) return;
      const w = el.clientWidth || el.getBoundingClientRect().width;
      const thumbMin = thumbMinWidthForSize[imageSize] || 150;
      const thumbMax = thumbMaxWidthForSize[imageSize] || 340;

      // Minimum columns per row based on image size
      const minColsPerSize: Record<string, number> = {
        tiny: 5,
        small: 3,
        medium: 2,
        large: 1,
      };
      const minCols = minColsPerSize[imageSize] || 1;

      // columns that fit at thumbMin width
      const colsFit = Math.max(minCols, Math.floor(w / thumbMin));
      const cols = Math.min(colsFit, Math.max(minCols, miniatures.length));

      const avgWidth = w / Math.max(1, cols);

      if (avgWidth <= thumbMax) {
        // evenly distribute columns to fill the row exactly
        setGridStyle({ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` });
      } else {
        // keep thumbnails under max width and left-align
        setGridStyle({ gridTemplateColumns: `repeat(auto-fit, minmax(${thumbMin}px, ${thumbMax}px))`, justifyContent: 'start' });
      }
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
            imageSize !== 'large'
              ? gridStyle ?? {
                  gridTemplateColumns: `repeat(auto-fit, minmax(${thumbMinWidthForSize[imageSize]}px, ${thumbMaxWidthForSize[imageSize]}px))`,
                  justifyContent: 'start',
                }
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
