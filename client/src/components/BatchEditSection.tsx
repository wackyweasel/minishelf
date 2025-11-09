import React, { useState, useEffect } from 'react';
import { api, Miniature } from '../api';
import AutocompleteInput from './AutocompleteInput';
import './BatchEditSection.css';

interface BatchEditSectionProps {
  selectedCount: number;
  onBatchUpdate: (data: Partial<Miniature>) => Promise<void>;
  onClearSelection: () => void;
  onDeleteSelected: () => Promise<void>;
  onExportSelected?: () => void;
}

const BatchEditSection: React.FC<BatchEditSectionProps> = ({ 
  selectedCount, 
  onBatchUpdate,
  onClearSelection,
  onDeleteSelected,
  onExportSelected,
}) => {
  const [batchGame, setBatchGame] = useState('');
  const [batchAmount, setBatchAmount] = useState<number | ''>('');
  const [addKeywords, setAddKeywords] = useState('');
  const [removeKeywords, setRemoveKeywords] = useState('');
  const [batchPainted, setBatchPainted] = useState<boolean|null>(null);
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
    if (batchAmount) updates.amount = batchAmount as number;
  if (addKeywords) updates.addKeywords = addKeywords;
  if (removeKeywords) updates.removeKeywords = removeKeywords;
    if (batchPainted !== null) updates.painted = batchPainted;

    if (Object.keys(updates).length === 0) {
      alert('Please enter at least one field to update');
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
      setBatchAmount('');
      setAddKeywords('');
      setRemoveKeywords('');
  setBatchPainted(null);
    } catch (error) {
      console.error('Batch update failed:', error);
      alert('Failed to update miniatures');
    }
  };

  return (
    <div className="batch-edit-section">
      <div className="batch-edit-header">
        <h3>{selectedCount} miniature{selectedCount !== 1 ? 's' : ''} selected</h3>
      </div>
      <div className="batch-edit-form">
        <div className="batch-edit-inputs">
          <AutocompleteInput
            type="text"
            placeholder="Game name"
            value={batchGame}
            onChange={setBatchGame}
            suggestions={gameSuggestions}
            className="batch-edit-input"
          />
          <input
            type="number"
            placeholder="Quantity"
            value={batchAmount}
            onChange={(e) => setBatchAmount(e.target.value ? parseInt(e.target.value) : '')}
            className="batch-edit-input"
            min="1"
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
            <span className="painted-toggle-label">Painted</span>
            <div className="painted-toggle-group">
              <button
                type="button"
                className={`painted-toggle-btn${batchPainted === null ? ' active' : ''}`}
                onClick={() => setBatchPainted(null)}
                title="Don't change painted status"
              >
                —
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
        <div className="batch-edit-actions">
          <div className="batch-edit-actions-left">
            <button onClick={onClearSelection} className="clear-selection-btn" type="button">
              Clear Selection
            </button>
              {onExportSelected && (
                <button
                  onClick={onExportSelected}
                  className="export-selected-btn"
                  type="button"
                >
                  Export Selected
                </button>
              )}
            <button
              onClick={async () => {
                const ok = confirm(`Delete ${selectedCount} selected miniature${selectedCount !== 1 ? 's' : ''}? This cannot be undone.`);
                if (!ok) return;
                try {
                  await onDeleteSelected();
                } catch (err) {
                  console.error('Failed to delete selected miniatures:', err);
                  alert('Failed to delete selected miniatures');
                }
              }}
              className="delete-selected-btn"
              type="button"
            >
              Delete Selected
            </button>
          </div>
          <div className="batch-edit-actions-right">
            <button
              type="button"
              onClick={handleApplyBatch}
              className="batch-edit-apply-btn"
              disabled={!batchGame && !batchPainted && !batchAmount && !addKeywords && !removeKeywords}
            >
              Apply to Selected
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchEditSection;
