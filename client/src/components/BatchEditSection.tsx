import React, { useState, useEffect } from 'react';
import { api, Miniature } from '../api';
import AutocompleteInput from './AutocompleteInput';
import './BatchEditSection.css';
import { notify } from '../utils/notify';
import { confirmAction } from '../utils/confirm';

interface BatchEditSectionProps {
  selectedCount: number;
  onBatchUpdate: (data: Partial<Miniature>) => Promise<void>;
  onClearSelection: () => void;
  onDeleteSelected: () => Promise<void>;
  onExportSelected?: () => void;
  onSelectVisible?: () => void;
}

const BatchEditSection: React.FC<BatchEditSectionProps> = ({ 
  selectedCount, 
  onBatchUpdate,
  onClearSelection,
  onDeleteSelected,
  onExportSelected,
  onSelectVisible,
}) => {
  const [batchGame, setBatchGame] = useState('');
  const [addKeywords, setAddKeywords] = useState('');
  const [removeKeywords, setRemoveKeywords] = useState('');
  const [batchPainted, setBatchPainted] = useState<boolean|null>(null);
  const [editing, setEditing] = useState(false);
  const [gameSuggestions, setGameSuggestions] = useState<string[]>([]);
  const [keywordSuggestions, setKeywordSuggestions] = useState<string[]>([]);

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

  const handleApplyBatch = async () => {
    const updates: Partial<Miniature> & { addKeywords?: string; removeKeywords?: string } = {};
    
    if (batchGame) updates.game = batchGame;
  if (addKeywords) updates.addKeywords = addKeywords;
  if (removeKeywords) updates.removeKeywords = removeKeywords;
    if (batchPainted !== null) updates.painted = batchPainted;

    if (Object.keys(updates).length === 0) {
      notify.error('Please enter at least one field to update');
      return;
    }

    try {
      // Normalize keywords server-side in App.handleBatchUpdate will accept comma-separated strings,
      // but ensure the strings are sanitized here as well (lowercase, strip weird chars)
      const normalizedUpdates = { ...updates } as any;
      if (normalizedUpdates.addKeywords) normalizedUpdates.addKeywords = normalizedUpdates.addKeywords.toLowerCase().replace(/[^a-z0-9,\s-]/g, '').replace(/\s+/g, ' ').trim();
      if (normalizedUpdates.removeKeywords) normalizedUpdates.removeKeywords = normalizedUpdates.removeKeywords.toLowerCase().replace(/[^a-z0-9,\s-]/g, '').replace(/\s+/g, ' ').trim();
      await onBatchUpdate(normalizedUpdates);
      
      // Clear form
      setBatchGame('');
      setAddKeywords('');
      setRemoveKeywords('');
  setBatchPainted(null);
    } catch (error) {
      console.error('Batch update failed:', error);
      notify.error('Failed to update miniatures');
    }
  };

  return (
    <div className="batch-edit-section">
      <div className="batch-edit-header">
        <h3>
          {selectedCount > 0 
            ? <><span className="count">{selectedCount}</span> miniature{selectedCount !== 1 ? 's' : ''} selected</>
            : 'No miniatures selected'
          }
        </h3>
      </div>

      <div className="batch-edit-form">
        {/* Primary Actions Row */}
        <div className="batch-edit-primary-actions">
          <button
            type="button"
            onClick={onSelectVisible}
            className="batch-edit-btn"
          >
            Select All Visible
          </button>
          
          <button
            type="button"
            className="batch-edit-btn primary"
            onClick={() => setEditing((v) => !v)}
            aria-pressed={editing}
          >
            {editing ? '✕ Close Editor' : '✎ Edit Selection'}
          </button>
          
          <button 
            onClick={onClearSelection} 
            className="batch-edit-btn" 
            type="button" 
            disabled={selectedCount === 0}
          >
            Clear Selection
          </button>
          
          {onExportSelected && (
            <button
              onClick={onExportSelected}
              className="batch-edit-btn"
              type="button"
              disabled={selectedCount === 0}
            >
              Export Selected
            </button>
          )}
          
          <button
            onClick={async () => {
              const ok = await confirmAction(`Delete ${selectedCount} selected miniature${selectedCount !== 1 ? 's' : ''}? This cannot be undone.`);
              if (!ok) return;
              try {
                await onDeleteSelected();
              } catch (err) {
                console.error('Failed to delete selected miniatures:', err);
                notify.error('Failed to delete selected miniatures');
              }
            }}
            className="batch-edit-btn danger"
            type="button"
            disabled={selectedCount === 0}
          >
            Delete Selected
          </button>
        </div>

        {/* Edit Form (shown when editing is true) */}
        {editing && (
          <div className="batch-edit-inputs-container">
            <div className="batch-edit-inputs">
              <AutocompleteInput
                type="text"
                placeholder="Game name"
                value={batchGame}
                onChange={setBatchGame}
                suggestions={gameSuggestions}
                className="batch-edit-input"
              />
              <AutocompleteInput
                type="text"
                placeholder="Add keywords"
                value={addKeywords}
                onChange={setAddKeywords}
                suggestions={keywordSuggestions}
                className="batch-edit-input"
                isKeywordField={true}
              />
              <AutocompleteInput
                type="text"
                placeholder="Remove keywords"
                value={removeKeywords}
                onChange={setRemoveKeywords}
                suggestions={keywordSuggestions}
                className="batch-edit-input"
                isKeywordField={true}
              />
              <div className="batch-edit-painted-toggle">
                <div className="painted-toggle-group">
                  <button
                    type="button"
                    className={`painted-toggle-btn${batchPainted === null ? ' active' : ''}`}
                    onClick={() => setBatchPainted(null)}
                    title="Don't change painted status"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    className={`painted-toggle-btn${batchPainted === true ? ' active painted' : ''}`}
                    onClick={() => setBatchPainted(true)}
                    title="Set as painted"
                  >
                    Painted
                  </button>
                  <button
                    type="button"
                    className={`painted-toggle-btn${batchPainted === false ? ' active unpainted' : ''}`}
                    onClick={() => setBatchPainted(false)}
                    title="Set as unpainted"
                  >
                    Unpainted
                  </button>
                </div>
              </div>
            </div>

            <div className="batch-edit-apply-section">
              <button
                type="button"
                onClick={handleApplyBatch}
                className="batch-edit-apply-btn"
                disabled={selectedCount === 0 || (!batchGame && batchPainted === null && !addKeywords && !removeKeywords)}
              >
                Apply Changes to {selectedCount} Miniature{selectedCount !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BatchEditSection;
