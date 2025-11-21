import React from 'react';
import { SortOption, ImageSize, ViewMode, WidthMode } from './SearchSection';
import './ViewOptionsSidebar.css';

interface ViewOptionsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  imageSize: ImageSize;
  onImageSizeChange: (size: ImageSize) => void;
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  widthMode: WidthMode;
  onWidthModeChange: (mode: WidthMode) => void;
  showKeywords: boolean;
  onShowKeywordsChange: (show: boolean) => void;
  showGame: boolean;
  onShowGameChange: (show: boolean) => void;
  showName: boolean;
  onShowNameChange: (show: boolean) => void;
}

const ViewOptionsSidebar: React.FC<ViewOptionsSidebarProps> = ({
  isOpen,
  onClose,
  sortBy,
  onSortChange,
  imageSize,
  onImageSizeChange,
  view,
  onViewChange,
  widthMode,
  onWidthModeChange,
  showKeywords,
  onShowKeywordsChange,
  showGame,
  onShowGameChange,
  showName,
  onShowNameChange,
}) => {
  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
      <div className={`view-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>View Options</h2>
          <button className="close-btn" onClick={onClose} aria-label="Close sidebar">
            ✕
          </button>
        </div>
        
        <div className="sidebar-content">
            <div className="sidebar-section">
                <label className="sidebar-label">Cards</label>
            <div className="sidebar-buttons">
              <label className="sidebar-checkbox">
                <input type="checkbox" checked={showName} onChange={(e) => onShowNameChange(e.target.checked)} />
                <span className="sidebar-checkbox-label">Show name</span>
              </label>
              <label className="sidebar-checkbox">
                <input type="checkbox" checked={showGame} onChange={(e) => onShowGameChange(e.target.checked)} />
                <span className="sidebar-checkbox-label">Show game</span>
              </label>
              <label className="sidebar-checkbox">
                <input type="checkbox" checked={showKeywords} onChange={(e) => onShowKeywordsChange(e.target.checked)} />
                <span className="sidebar-checkbox-label">Show keywords</span>
              </label>
            </div>
          </div>
          <div className="sidebar-section">
            <label className="sidebar-label">Sort by</label>
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              className="sidebar-select"
            >
              <option value="updated-desc">Last Updated (Newest)</option>
              <option value="updated-asc">Last Updated (Oldest)</option>
              <option value="created-desc">Date Added (Newest)</option>
              <option value="created-asc">Date Added (Oldest)</option>
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="game-asc">Game (A-Z)</option>
              <option value="game-desc">Game (Z-A)</option>
            </select>
          </div>

          <div className="sidebar-section">
            <label className="sidebar-label">View Mode</label>
            <div className="sidebar-buttons">
              <button
                className={`sidebar-btn ${view === 'grid' ? 'active' : ''}`}
                onClick={() => onViewChange('grid')}
              >
                Grid
              </button>
              <button
                className={`sidebar-btn ${view === 'list' ? 'active' : ''}`}
                onClick={() => onViewChange('list')}
              >
                List
              </button>
            </div>
          </div>

          <div className="sidebar-section">
            <label className="sidebar-label">Image Size</label>
            <div className="sidebar-buttons">
              <button
                className={`sidebar-btn ${imageSize === 'tiny' ? 'active' : ''}`}
                onClick={() => onImageSizeChange('tiny')}
              >
                Tiny
              </button>
              <button
                className={`sidebar-btn ${imageSize === 'small' ? 'active' : ''}`}
                onClick={() => onImageSizeChange('small')}
              >
                Small
              </button>
              <button
                className={`sidebar-btn ${imageSize === 'medium' ? 'active' : ''}`}
                onClick={() => onImageSizeChange('medium')}
              >
                Medium
              </button>
              <button
                className={`sidebar-btn ${imageSize === 'large' ? 'active' : ''}`}
                onClick={() => onImageSizeChange('large')}
              >
                Large
              </button>
            </div>
          </div>

          <div className="sidebar-section">
            <label className="sidebar-label">Width Mode</label>
            <div className="sidebar-buttons">
              <button
                className={`sidebar-btn ${widthMode === 'constrained' ? 'active' : ''}`}
                onClick={() => onWidthModeChange('constrained')}
              >
                Constrained
              </button>
              <button
                className={`sidebar-btn ${widthMode === 'full' ? 'active' : ''}`}
                onClick={() => onWidthModeChange('full')}
              >
                Full Width
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ViewOptionsSidebar;
