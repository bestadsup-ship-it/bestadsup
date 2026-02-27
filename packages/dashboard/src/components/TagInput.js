import React, { useState, useRef } from 'react';
import '../styles/taginput.css';

function TagInput({ tags = [], onChange, placeholder = 'Add tags...' }) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);

  const handleInputChange = (e) => {
    const value = e.target.value;

    // Only allow alphanumeric, spaces, and #
    const sanitized = value.replace(/[^a-zA-Z0-9#\s]/g, '');
    setInputValue(sanitized);
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
      // Remove last tag on backspace if input is empty
      removeTag(tags.length - 1);
    }
  };

  const addTag = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    // Ensure tag starts with #
    const tag = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;

    // Check for duplicates (case insensitive)
    const normalized = tag.toLowerCase();
    if (tags.some(t => t.toLowerCase() === normalized)) {
      setInputValue('');
      return;
    }

    // Limit to 10 tags
    if (tags.length >= 10) {
      alert('Maximum 10 tags allowed');
      return;
    }

    onChange([...tags, tag]);
    setInputValue('');
  };

  const removeTag = (index) => {
    const newTags = tags.filter((_, i) => i !== index);
    onChange(newTags);
  };

  return (
    <div className="tag-input-container">
      <div className="tag-input-wrapper" onClick={() => inputRef.current?.focus()}>
        {tags.map((tag, index) => (
          <div key={index} className="tag-chip">
            <span>{tag}</span>
            <button
              type="button"
              className="tag-remove"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(index);
              }}
            >
              ×
            </button>
          </div>
        ))}
        <input
          ref={inputRef}
          type="text"
          className="tag-input"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          onBlur={addTag}
          placeholder={tags.length === 0 ? placeholder : ''}
          maxLength={30}
        />
      </div>
      <div className="tag-hint">
        Press Enter, Space, or Comma to add tags. Max 10 tags.
      </div>
    </div>
  );
}

export default TagInput;
