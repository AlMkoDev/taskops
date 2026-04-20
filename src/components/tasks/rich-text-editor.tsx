'use client';

import { useEffect, useRef, useState } from 'react';

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  height?: string;
};

export function RichTextEditor({ value, onChange, placeholder = 'Start typing...', readOnly = false, height = '200px' }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [showMentionInput, setShowMentionInput] = useState(false);
  const [showHashtagInput, setShowHashtagInput] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [hashtagQuery, setHashtagQuery] = useState('');

  // Common mentions (would come from user list in real app)
  const mentionSuggestions = [
    'MaintenanceTeam',
    'SafetyTeam',
    'OperationsTeam',
    'ShiftLead',
    'FarmManager',
    'FinanceController'
  ];

  // Common hashtags
  const hashtagSuggestions = [
    'Safety',
    'Maintenance',
    'Production',
    'Equipment',
    'Quality',
    'Environment'
  ];

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowMentionInput(false);
        setShowHashtagInput(false);
        setMentionQuery('');
        setHashtagQuery('');
      }
    }

    if (showMentionInput || showHashtagInput) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMentionInput, showHashtagInput]);

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    updateContent();
  };

  const updateContent = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleMention = () => {
    setShowMentionInput(true);
    setMentionQuery('');
    editorRef.current?.focus();
  };

  const insertMention = (username: string) => {
    execCommand('insertHTML', `<span class="reports-mention">@${username}</span>&nbsp;`);
    setShowMentionInput(false);
    setMentionQuery('');
  };

  const insertHashtag = (tag: string) => {
    execCommand('insertHTML', `<span class="reports-hashtag">#${tag}</span>&nbsp;`);
    setShowHashtagInput(false);
    setHashtagQuery('');
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          execCommand('insertImage', e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowMentionInput(false);
      setShowHashtagInput(false);
    }
  };

  const filteredMentions = mentionQuery
    ? mentionSuggestions.filter(m => m.toLowerCase().includes(mentionQuery.toLowerCase()))
    : mentionSuggestions;

  const filteredHashtags = hashtagQuery
    ? hashtagSuggestions.filter(h => h.toLowerCase().includes(hashtagQuery.toLowerCase()))
    : hashtagSuggestions;

  if (readOnly) {
    return (
      <div 
        className="reports-rich-editor-readonly"
        dangerouslySetInnerHTML={{ __html: value }}
      />
    );
  }

  return (
    <div ref={containerRef} className="reports-rich-editor-container" onKeyDown={handleKeyDown}>
      {/* Toolbar */}
      <div className="reports-rich-editor-toolbar">
        <button
          type="button"
          className="reports-toolbar-btn"
          onClick={() => execCommand('bold')}
          title="Bold"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          className="reports-toolbar-btn"
          onClick={() => execCommand('italic')}
          title="Italic"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          className="reports-toolbar-btn"
          onClick={() => execCommand('underline')}
          title="Underline"
        >
          <u>U</u>
        </button>
        
        <div className="reports-toolbar-divider" />
        
        <button
          type="button"
          className="reports-toolbar-btn"
          onClick={() => execCommand('insertUnorderedList')}
          title="Bullet List"
        >
          • List
        </button>
        <button
          type="button"
          className="reports-toolbar-btn"
          onClick={() => execCommand('insertOrderedList')}
          title="Numbered List"
        >
          1. List
        </button>
        
        <div className="reports-toolbar-divider" />
        
        <button
          type="button"
          className="reports-toolbar-btn"
          onClick={handleMention}
          title="Add Mention"
        >
          @ Mention
        </button>
        <button
          type="button"
          className="reports-toolbar-btn"
          onClick={() => setShowHashtagInput(true)}
          title="Add Hashtag"
        >
          # Tag
        </button>
        
        <div className="reports-toolbar-divider" />
        
        <label className="reports-toolbar-btn reports-toolbar-file-label" title="Insert Image">
          🖼️ Image
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="reports-toolbar-file-input"
          />
        </label>
      </div>

      {/* Mention Dropdown */}
      {showMentionInput && (
        <div className="reports-mention-dropdown">
          <div className="reports-dropdown-header">
            <span className="reports-dropdown-title">@ Mention User</span>
            <button
              type="button"
              className="reports-dropdown-close"
              onClick={() => {
                setShowMentionInput(false);
                setMentionQuery('');
              }}
              title="Close"
            >
              ×
            </button>
          </div>
          <input
            type="text"
            className="reports-mention-input"
            placeholder="Search users..."
            value={mentionQuery}
            onChange={(e) => setMentionQuery(e.target.value)}
            autoFocus
          />
          <div className="reports-mention-list">
            {filteredMentions.length > 0 ? filteredMentions.map((mention) => (
              <button
                key={mention}
                type="button"
                className="reports-mention-item"
                onClick={() => insertMention(mention)}
              >
                <div className="reports-mention-avatar">
                  {mention.split(/[\s@]/).filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                </div>
                <span>{mention}</span>
              </button>
            )) : (
              <div className="reports-empty-state">No users found matching "{mentionQuery}"</div>
            )}
          </div>
        </div>
      )}

      {/* Hashtag Dropdown */}
      {showHashtagInput && (
        <div className="reports-hashtag-dropdown">
          <div className="reports-dropdown-header">
            <span className="reports-dropdown-title"># Add Tag</span>
            <button
              type="button"
              className="reports-dropdown-close"
              onClick={() => {
                setShowHashtagInput(false);
                setHashtagQuery('');
              }}
              title="Close"
            >
              ×
            </button>
          </div>
          <input
            type="text"
            className="reports-hashtag-input"
            placeholder="Search tags..."
            value={hashtagQuery}
            onChange={(e) => setHashtagQuery(e.target.value)}
            autoFocus
          />
          <div className="reports-hashtag-list">
            {filteredHashtags.length > 0 ? filteredHashtags.map((tag) => (
              <button
                key={tag}
                type="button"
                className="reports-hashtag-item"
                onClick={() => insertHashtag(tag)}
              >
                {tag}
              </button>
            )) : (
              <div className="reports-empty-state">No tags found matching "{hashtagQuery}"</div>
            )}
          </div>
        </div>
      )}

      {/* Editor */}
      <div
        ref={editorRef}
        className={`reports-rich-editor ${isFocused ? 'is-focused' : ''}`}
        style={{ minHeight: height }}
        contentEditable={!readOnly}
        suppressContentEditableWarning
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          setIsFocused(false);
          updateContent();
        }}
        onInput={updateContent}
        data-placeholder={placeholder}
      />
    </div>
  );
}
