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
    if (suggestions.length > 0 && isFocused) {
      const { currentKeyword } = getCurrentKeyword(value);
      const searchTerm = currentKeyword || '';

      // Detect if the character immediately before the caret is a comma or comma+space
      let lastCharIsComma = false;
      try {
        const cursorPosition = inputRef.current?.selectionStart ?? value.length;
        const before = value.substring(0, cursorPosition);
        if (before.length > 0) {
          const last = before.charAt(before.length - 1);
          const secondLast = before.length > 1 ? before.charAt(before.length - 2) : '';
          if (last === ',') lastCharIsComma = true;
          else if (last === ' ' && secondLast === ',') lastCharIsComma = true;
        }
      } catch (e) {
        // ignore
      }

      // If this is a keyword field and the current keyword is empty OR the last char before caret is a comma,
      // show all suggestions. Otherwise filter by the current keyword.
      const filtered = (isKeywordField && (searchTerm === '' || lastCharIsComma))
        ? suggestions.slice()
        : suggestions.filter(s =>
            s.toLowerCase().includes(searchTerm.toLowerCase())
          );
      setFilteredSuggestions(filtered);
      setShowSuggestions(filtered.length > 0 && (searchTerm !== '' || isKeywordField || lastCharIsComma));
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

      let prefix: string;
      if (lastCommaIndex >= 0) {
        // Keep everything up to and including the last comma and a space
        prefix = beforeCursor.substring(0, lastCommaIndex + 1);
        // ensure single space after comma
        if (!prefix.endsWith(', ')) prefix = prefix + ' ';
      } else {
        prefix = '';
      }

      // Insert the suggestion followed by a comma and space
      const insertion = suggestion + ', ';
      const newValue = prefix + insertion + afterCursor.trim();

      onChange(newValue);

      // After updating the value, put focus back into input and move caret after the inserted text
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          const caretPos = (prefix + insertion).length;
          inputRef.current.setSelectionRange(caretPos, caretPos);
        }
      }, 0);
    }
    if (!isKeywordField) {
      // Non-keyword fields: hide suggestions and blur
      setShowSuggestions(false);
      setActiveSuggestionIndex(-1);
      setIsFocused(false);
    } else {
      // Keyword field: keep suggestions visible (full list) so user can click more
      const full = suggestions.slice();
      setFilteredSuggestions(full);
      setShowSuggestions(full.length > 0);
      setActiveSuggestionIndex(-1);
      setIsFocused(true);

      // ensure the input's position is recalculated by the effect that watches showSuggestions
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
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
              onMouseDown={(e) => { e.preventDefault(); }}
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
