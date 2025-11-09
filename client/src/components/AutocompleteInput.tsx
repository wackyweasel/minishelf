import React, { useState, useRef, useEffect } from 'react';
import './AutocompleteInput.css';

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  className?: string;
  type?: string;
  min?: string;
  isKeywordField?: boolean;
}

const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
  value,
  onChange,
  suggestions,
  placeholder,
  className,
  type = 'text',
  min,
  isKeywordField = false,
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [isFocused, setIsFocused] = useState(false);
  const [suggestionsPosition, setSuggestionsPosition] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Get the current keyword being typed (for comma-separated fields)
  const getCurrentKeyword = (fullValue: string): { currentKeyword: string; beforeCursor: string; afterCursor: string } => {
    if (!isKeywordField) {
      return { currentKeyword: fullValue, beforeCursor: '', afterCursor: '' };
    }
    
    const cursorPosition = inputRef.current?.selectionStart || fullValue.length;
    const beforeCursor = fullValue.substring(0, cursorPosition);
    const afterCursor = fullValue.substring(cursorPosition);
    
    // Find the last comma before cursor
    const lastCommaIndex = beforeCursor.lastIndexOf(',');
    const currentKeyword = beforeCursor.substring(lastCommaIndex + 1).trim();
    
    return { currentKeyword, beforeCursor, afterCursor };
  };

  useEffect(() => {
    if (value && suggestions.length > 0 && isFocused) {
      const { currentKeyword } = getCurrentKeyword(value);
      const searchTerm = currentKeyword || value;
      
      const filtered = suggestions.filter(s =>
        s.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredSuggestions(filtered);
      setShowSuggestions(filtered.length > 0 && searchTerm !== '');
    } else {
      setFilteredSuggestions([]);
      setShowSuggestions(false);
    }
    setActiveSuggestionIndex(-1);
  }, [value, suggestions, isFocused, isKeywordField]);

  // Update suggestions position
  useEffect(() => {
    if (showSuggestions && inputRef.current) {
      const updatePosition = () => {
        if (inputRef.current) {
          const rect = inputRef.current.getBoundingClientRect();
          setSuggestionsPosition({
            top: rect.bottom,
            left: rect.left,
            width: rect.width,
          });
        }
      };
      
      updatePosition();
      
      // Update position on scroll and resize
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [showSuggestions]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (!isKeywordField) {
      onChange(suggestion);
    } else {
      // For keyword fields, replace the current keyword being typed
      const { beforeCursor, afterCursor } = getCurrentKeyword(value);
      const lastCommaIndex = beforeCursor.lastIndexOf(',');
      
      let newValue: string;
      if (lastCommaIndex >= 0) {
        // There are previous keywords
        const prefix = beforeCursor.substring(0, lastCommaIndex + 1) + ' ';
        newValue = prefix + suggestion + (afterCursor.trim() ? ', ' + afterCursor.trim() : '');
      } else {
        // This is the first keyword
        newValue = suggestion + (afterCursor.trim() ? ', ' + afterCursor.trim() : '');
      }
      
      onChange(newValue);
    }
    setShowSuggestions(false);
    setActiveSuggestionIndex(-1);
    setIsFocused(false);
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    // Delay to allow click on suggestion
    setTimeout(() => {
      setIsFocused(false);
      setShowSuggestions(false);
    }, 200);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIndex(prev =>
        prev < filteredSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && activeSuggestionIndex >= 0) {
      e.preventDefault();
      handleSuggestionClick(filteredSuggestions[activeSuggestionIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setActiveSuggestionIndex(-1);
    }
  };

  return (
    <div className="autocomplete-wrapper">
      <input
        ref={inputRef}
        type={type}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={className}
        min={min}
      />
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div 
          ref={suggestionsRef} 
          className="autocomplete-suggestions"
          style={{
            top: `${suggestionsPosition.top}px`,
            left: `${suggestionsPosition.left}px`,
            width: `${suggestionsPosition.width}px`,
          }}
        >
          {filteredSuggestions.map((suggestion, index) => (
            <div
              key={index}
              className={`suggestion-item ${index === activeSuggestionIndex ? 'active' : ''}`}
              onClick={() => handleSuggestionClick(suggestion)}
            >
              {suggestion}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AutocompleteInput;
