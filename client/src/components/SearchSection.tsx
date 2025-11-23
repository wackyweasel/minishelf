import React from 'react';
import './SearchSection.css';

export type SortOption = 'name-asc' | 'name-desc' | 'game-asc' | 'game-desc' | 'updated-desc' | 'updated-asc' | 'created-desc' | 'created-asc';
export type ImageSize = 'tiny' | 'small' | 'medium' | 'large';
export type ViewMode = 'grid' | 'list';
export type WidthMode = 'constrained' | 'full';

interface SearchSectionProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  resultCount: number;
  onToggleSidebar: () => void;
  isAiSearchEnabled: boolean;
  onToggleAiSearch: (enabled: boolean) => void;
}

const SearchSection: React.FC<SearchSectionProps> = ({
  searchTerm,
  onSearchChange,
  resultCount,
  onToggleSidebar,
  isAiSearchEnabled,
  onToggleAiSearch,
}) => {
  return (
    <div className="search-section">
      <div className="search-header">
        <div className="search-container">
          <div className="ai-search-toggle">
            <label title="Enable AI Semantic Search">
              <input
                type="checkbox"
                checked={isAiSearchEnabled}
                onChange={(e) => onToggleAiSearch(e.target.checked)}
              />
              <span className="ai-label">AI Search</span>
            </label>
          </div>
          <input
            type="text"
            className="search-input"
            placeholder={isAiSearchEnabled ? "What are you looking for?" : "Search by keywords, name, or game (e.g., 'woman, sword')"}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <span className="search-icon">🔍</span>
        </div>
        <button className="hamburger-btn" onClick={onToggleSidebar} aria-label="View options">
          <span></span>
          <span></span>
          <span></span>
        </button>
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
      </div>
    </div>
  );
};

export default SearchSection;

