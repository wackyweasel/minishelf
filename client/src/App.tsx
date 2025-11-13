import { useState, useEffect } from 'react';
import { api, Miniature } from './api';
import { initDatabase } from './database';
import { parseKeywords } from './utils/keywords';
import UploadSection from './components/UploadSection';
import Synchronize from './components/Synchronize';
import SearchSection, { SortOption, ImageSize, WidthMode } from './components/SearchSection';
import Gallery from './components/Gallery';
import MetadataEditor from './components/MetadataEditor';
import './App.css';
import { notify } from './utils/notify';
import { confirmAction } from './utils/confirm';

// Load setting from localStorage with fallback
const loadSetting = <T,>(key: string, defaultValue: T): T => {
  try {
    const saved = localStorage.getItem(key);
    return saved !== null ? JSON.parse(saved) : defaultValue;
  } catch {
    return defaultValue;
  }
};

// Save setting to localStorage
const saveSetting = <T,>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn('Failed to save setting to localStorage:', error);
  }
};

function App() {
  const [miniatures, setMiniatures] = useState<Miniature[]>([]);
  const [selectedMiniature, setSelectedMiniature] = useState<Miniature | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number>(-1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>(() => loadSetting('sortBy', 'updated-desc'));
  const [imageSize, setImageSize] = useState<ImageSize>(() => loadSetting('imageSize', 'medium'));
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => loadSetting('viewMode', 'grid'));
  const [widthMode, setWidthMode] = useState<WidthMode>(() => loadSetting('widthMode', 'constrained'));
  const [activeTab, setActiveTab] = useState<'browse' | 'upload' | 'sync'>('browse');
  const [loading, setLoading] = useState(false);
  const [hasUnsavedWork, setHasUnsavedWork] = useState(false);
  const [cacheTimestamp, setCacheTimestamp] = useState(Date.now());
  const [dbInitialized, setDbInitialized] = useState(false);
  

  // Initialize database on app load
  useEffect(() => {
    initDatabase().then(() => {
      setDbInitialized(true);
      loadMiniatures();
    }).catch(error => {
      console.error('Failed to initialize database:', error);
      notify.error('Failed to initialize database. Please refresh the page.');
    });
  }, []);

  // Save settings to localStorage when they change
  useEffect(() => {
    saveSetting('sortBy', sortBy);
  }, [sortBy]);

  useEffect(() => {
    saveSetting('imageSize', imageSize);
  }, [imageSize]);

  useEffect(() => {
    saveSetting('viewMode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    saveSetting('widthMode', widthMode);
  }, [widthMode]);

  useEffect(() => {
    if (dbInitialized) {
      loadMiniatures();
    }
  }, [searchTerm, dbInitialized]);

  const loadMiniatures = async () => {
    try {
      setLoading(true);
      const data = await api.getMiniatures({ search: searchTerm || undefined });
      setMiniatures(sortMiniatures(data, sortBy));
    } catch (error) {
      console.error('Failed to load miniatures:', error);
    } finally {
      setLoading(false);
    }
  };

  const sortMiniatures = (data: Miniature[], sort: SortOption): Miniature[] => {
    const sorted = [...data];

    const nameKey = (s?: string) => (s || '').trim();
    // comparator that sends empty names to the end in both directions
    const compareNames = (aName: string, bName: string, desc = false) => {
      const a = nameKey(aName);
      const b = nameKey(bName);
      const aEmpty = a === '';
      const bEmpty = b === '';
      if (aEmpty && bEmpty) return 0;
      if (aEmpty) return 1; // a should come after b
      if (bEmpty) return -1; // b should come after a
      return desc ? b.localeCompare(a) : a.localeCompare(b);
    };

    switch (sort) {
      case 'name-asc':
        return sorted.sort((a, b) => compareNames(a.name, b.name, false));
      case 'name-desc':
        return sorted.sort((a, b) => compareNames(a.name, b.name, true));
      case 'game-asc':
        return sorted.sort((a, b) => (a.game || '').localeCompare(b.game || ''));
      case 'game-desc':
        return sorted.sort((a, b) => (b.game || '').localeCompare(a.game || ''));
      case 'updated-asc':
        return sorted.sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime());
      case 'updated-desc':
        return sorted.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      case 'created-asc':
        return sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      case 'created-desc':
        return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      default:
        return sorted;
    }
  };

  const handleSortChange = (sort: SortOption) => {
    setSortBy(sort);
    setMiniatures(prev => sortMiniatures(prev, sort));
  };

  const handleUploadComplete = () => {
    setCacheTimestamp(Date.now()); // Force image reload
    loadMiniatures();
    setActiveTab('browse');
    setHasUnsavedWork(false);
  };

  // Import miniatures JSON from exported file
  const handleImportFile = async (data: any) => {
    // Expecting { miniatures: [ ... ] }
    if (!data || !Array.isArray(data.miniatures)) {
      notify.error('Invalid import file');
      return;
    }

    // Map to the shape expected by createMiniatures (Partial<Miniature>)
    const toCreate = data.miniatures.map((m: any) => ({
      game: m.game || '',
      name: m.name || '',
      amount: m.amount || 1,
      painted: !!m.painted,
      keywords: m.keywords || '',
      image_data: m.image?.data || m.image_data || '',
    }));

    try {
      await api.createMiniatures(toCreate);
      setCacheTimestamp(Date.now());
      loadMiniatures();
      setActiveTab('browse');
      notify.success(`Imported ${toCreate.length} miniatures`);
    } catch (err) {
      console.error('Import failed:', err);
      notify.error('Failed to import miniatures');
    }
  };

  const handleTabChange = async (tab: 'browse' | 'upload' | 'sync') => {
    if (hasUnsavedWork) {
      const confirmed = await confirmAction(
        'You have unsaved work. Are you sure you want to leave? All unsaved changes will be lost.'
      );
      if (!confirmed) {
        return;
      }
      setHasUnsavedWork(false);
    }
    setActiveTab(tab);
  };

  const handleSynchronized = (_count: number) => {
    // After synchronization, reload miniatures from local DB
    setCacheTimestamp(Date.now());
    loadMiniatures();
    setActiveTab('browse');
  };

  const handleUpdate = async (id: string, data: Partial<Miniature>) => {
    try {
      await api.updateMiniature(id, data);
      loadMiniatures();
      setSelectedMiniature(null);
    } catch (error) {
      console.error('Failed to update miniature:', error);
    }
  };

  const handleBatchUpdate = async (data: Partial<Miniature> & { addKeywords?: string; removeKeywords?: string }) => {
    try {
      const updatePromises = Array.from(selectedIds).map(async (id) => {
        const updateData: Partial<Miniature> = { ...data };
        
        // Handle keyword additions/removals
        if (data.addKeywords || data.removeKeywords) {
          // Find the current miniature to get existing keywords
          const currentMini = miniatures.find(m => m.id === id);
          if (currentMini) {
            const currentKeywords = currentMini.keywords
              ? currentMini.keywords.split(',').map(k => k.trim()).filter(k => k)
              : [];
            
            let newKeywords = [...currentKeywords];
            
            // Add keywords (normalize)
            if (data.addKeywords) {
              const toAdd = parseKeywords(data.addKeywords);
              toAdd.forEach(keyword => {
                if (!newKeywords.includes(keyword)) {
                  newKeywords.push(keyword);
                }
              });
            }
            
            // Remove keywords (normalize)
            if (data.removeKeywords) {
              const toRemove = parseKeywords(data.removeKeywords);
              newKeywords = newKeywords.filter(k => !toRemove.includes(k));
            }
            
            updateData.keywords = newKeywords.join(', ');
          }
          
          // Remove the special fields before sending to API
          delete (updateData as any).addKeywords;
          delete (updateData as any).removeKeywords;
        }
        
        return api.updateMiniature(id, updateData);
      });
      
      await Promise.all(updatePromises);
      await loadMiniatures();
      setSelectedIds(new Set());
      setLastSelectedIndex(-1);
    } catch (error) {
      console.error('Failed to batch update miniatures:', error);
      notify.error('Failed to update some miniatures. Please try again.');
      throw error;
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    try {
      await Promise.all(ids.map(id => api.deleteMiniature(id)));
      await loadMiniatures();
      setSelectedIds(new Set());
      setLastSelectedIndex(-1);
    } catch (error) {
      console.error('Failed to delete selected miniatures:', error);
      notify.error('Failed to delete some selected miniatures.');
      throw error;
    }
  };

  const handleCardClick = (miniature: Miniature, index: number, shiftKey: boolean) => {
    if (shiftKey && lastSelectedIndex >= 0) {
      // Shift-click: select range
      const newSelectedIds = new Set(selectedIds);
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      
      for (let i = start; i <= end; i++) {
        newSelectedIds.add(miniatures[i].id);
      }
      
      setSelectedIds(newSelectedIds);
    } else {
      // Normal click: toggle selection
      const newSelectedIds = new Set(selectedIds);
      if (newSelectedIds.has(miniature.id)) {
        newSelectedIds.delete(miniature.id);
      } else {
        newSelectedIds.add(miniature.id);
      }
      setSelectedIds(newSelectedIds);
      setLastSelectedIndex(index);
    }
  };

  const handleKeywordClick = (keyword: string) => {
    const trimmedKeyword = keyword.trim();
    if (!trimmedKeyword) return;

    // Add keyword to search term if not already present
    const currentKeywords = searchTerm.split(',').map(k => k.trim()).filter(k => k);
    if (!currentKeywords.includes(trimmedKeyword)) {
      const newSearchTerm = currentKeywords.length > 0 
        ? `${searchTerm}, ${trimmedKeyword}`
        : trimmedKeyword;
      setSearchTerm(newSearchTerm);
    }
  };

  const handleGameClick = (game: string) => {
    const trimmedGame = game.trim();
    if (!trimmedGame) return;

    // Add game to search term if not already present
    const currentTerms = searchTerm.split(',').map(k => k.trim()).filter(k => k);
    if (!currentTerms.includes(trimmedGame)) {
      const newSearchTerm = currentTerms.length > 0 
        ? `${searchTerm}, ${trimmedGame}`
        : trimmedGame;
      setSearchTerm(newSearchTerm);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1 className="logo">MiniShelf</h1>
          <p className="tagline">Miniature Collection Manager</p>
        </div>
        <nav className="nav-tabs">
          <button
            className={`nav-tab ${activeTab === 'browse' ? 'active' : ''}`}
            onClick={() => handleTabChange('browse')}
          >
            Browse
          </button>
          
          <button
            className={`nav-tab ${activeTab === 'upload' ? 'active' : ''}`}
            onClick={() => handleTabChange('upload')}
          >
            Upload
          </button>

          <button
            className={`nav-tab ${activeTab === 'sync' ? 'active' : ''}`}
            onClick={() => handleTabChange('sync')}
          >
            Synchronize
          </button>
        </nav>
      </header>

      <main className={`main-content ${widthMode === 'full' ? 'main-content-full' : ''}`}>
        {activeTab === 'browse' && (
          <>
            <SearchSection
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              resultCount={miniatures.length}
              sortBy={sortBy}
              onSortChange={handleSortChange}
              imageSize={imageSize}
              onImageSizeChange={setImageSize}
              view={viewMode}
              onViewChange={setViewMode}
              widthMode={widthMode}
              onWidthModeChange={setWidthMode}
            />
            <Gallery
              miniatures={miniatures}
              loading={loading}
              onEdit={setSelectedMiniature}
              onDeleteSelected={handleDeleteSelected}
              onKeywordClick={handleKeywordClick}
              onGameClick={handleGameClick}
              imageSize={imageSize}
              viewMode={viewMode}
              cacheTimestamp={cacheTimestamp}
              selectedIds={selectedIds}
              onCardClick={handleCardClick}
              onBatchUpdate={handleBatchUpdate}
              onClearSelection={() => {
                setSelectedIds(new Set());
                setLastSelectedIndex(-1);
              }}
            />
          </>
        )}

        {activeTab === 'upload' && (
          <UploadSection 
            onUploadComplete={handleUploadComplete}
            onUnsavedWorkChange={setHasUnsavedWork}
            onImportFile={handleImportFile}
          />
        )}

        {activeTab === 'sync' && (
          <Synchronize onSynchronized={handleSynchronized} />
        )}
      </main>

      {selectedMiniature && (
        <MetadataEditor
          miniature={selectedMiniature}
          onClose={() => setSelectedMiniature(null)}
          onSave={handleUpdate}
          cacheTimestamp={cacheTimestamp}
        />
      )}

      
    </div>
  );
}

export default App;
