import React from 'react';
import './SearchSection.css';

export type SortOption = 'name-asc' | 'name-desc' | 'game-asc' | 'game-desc' | 'updated-desc' | 'updated-asc' | 'created-desc' | 'created-asc';
export type ImageSize = 'small' | 'medium' | 'large';
export type ViewMode = 'grid' | 'list';
export type WidthMode = 'constrained' | 'full';

interface SearchSectionProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  resultCount: number;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  imageSize: ImageSize;
  onImageSizeChange: (size: ImageSize) => void;
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  widthMode: WidthMode;
  onWidthModeChange: (mode: WidthMode) => void;
}

const SearchSection: React.FC<SearchSectionProps> = ({
  searchTerm,
  onSearchChange,
  resultCount,
  sortBy,
  onSortChange,
  imageSize,
  onImageSizeChange,
  view,
  onViewChange,
  widthMode,
  onWidthModeChange,
}) => {
  return (
    <div className="search-section">
      <div className="search-container">
        <input
          type="text"
          className="search-input"
          placeholder="Search by keywords, name, or game (e.g., 'woman, sword')"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <span className="search-icon">🔍</span>
      </div>
      <div className="search-controls">
        <div className="search-info">
          <p>
            {searchTerm ? (
              <>
                Found <strong>{resultCount}</strong> miniature{resultCount !== 1 ? 's' : ''}
              </>
            ) : (
              <>
                Showing all <strong>{resultCount}</strong> miniature{resultCount !== 1 ? 's' : ''}
              </>
            )}
          </p>
        </div>
        <div className="controls-right">
          <div className="size-controls">
            <label>Size:</label>
            <div className="size-buttons">
              <button
                className={`size-btn ${imageSize === 'small' ? 'active' : ''}`}
                onClick={() => onImageSizeChange('small')}
                title="Small"
              >
                ◼◼◼
              </button>
              <button
                className={`size-btn ${imageSize === 'medium' ? 'active' : ''}`}
                onClick={() => onImageSizeChange('medium')}
                title="Medium"
              >
                ◼◼
              </button>
              <button
                className={`size-btn ${imageSize === 'large' ? 'active' : ''}`}
                onClick={() => onImageSizeChange('large')}
                title="Large"
              >
                ◼
              </button>
            </div>
          </div>
          <div className="view-controls">
            <label>View:</label>
            <div className="view-buttons">
              <button
                className={`view-btn ${view === 'grid' ? 'active' : ''}`}
                onClick={() => onViewChange('grid')}
                title="Grid view"
              >
                Grid
              </button>
              <button
                className={`view-btn ${view === 'list' ? 'active' : ''}`}
                onClick={() => onViewChange('list')}
                title="List view"
              >
                List
              </button>
            </div>
          </div>
          <div className="width-controls">
            <label>Width:</label>
            <div className="width-buttons">
              <button
                className={`width-btn ${widthMode === 'constrained' ? 'active' : ''}`}
                onClick={() => onWidthModeChange('constrained')}
                title="Constrained width"
              >
                ▢
              </button>
              <button
                className={`width-btn ${widthMode === 'full' ? 'active' : ''}`}
                onClick={() => onWidthModeChange('full')}
                title="Full width"
              >
                ▭
              </button>
            </div>
          </div>
          <div className="sort-controls">
            <label htmlFor="sort-select">Sort by:</label>
            <select
              id="sort-select"
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              className="sort-select"
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
        </div>
      </div>
    </div>
  );
};

export default SearchSection;

