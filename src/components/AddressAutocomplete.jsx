import React, { useState, useEffect, useRef } from 'react';
import { MapPin, X } from 'lucide-react';
import { geocodeSuggestions } from '../services/api';

const AddressAutocomplete = ({
  value,
  onChange,
  onSelect,
  placeholder,
  required,
  disabled,
  onEnter,
  leftIcon,
  rightSlot,
  inputClassName = 'input-field',
  containerStyle,
  maxSuggestions = 5
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);
  const lastQueryRef = useRef('');

  useEffect(() => {
    const onDocClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = (value || '').trim();
    if (q.length < 2 || q === lastQueryRef.current) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const results = await geocodeSuggestions(q, maxSuggestions);
      setSuggestions(results);
      setLoading(false);
      if (document.activeElement === wrapperRef.current?.querySelector('input')) {
        setOpen(true);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [value, maxSuggestions]);

  const pick = (s) => {
    lastQueryRef.current = s.label;
    onChange(s.label);
    onSelect(s);
    setOpen(false);
    setHighlight(-1);
  };

  const handleKey = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setHighlight(h => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      if (open && highlight >= 0 && suggestions[highlight]) {
        e.preventDefault();
        pick(suggestions[highlight]);
      } else if (onEnter) {
        onEnter();
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', flex: 1, ...containerStyle }}>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        {leftIcon}
        <input
          type="text"
          className={inputClassName}
          placeholder={placeholder}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onKeyDown={handleKey}
          required={required}
          disabled={disabled}
          autoComplete="off"
        />
        {rightSlot}
      </div>
      {open && suggestions.length > 0 && (
        <div
          className="glass-panel"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            zIndex: 60,
            padding: '0.35rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.15rem',
            maxHeight: '60vh',
            overflowY: 'auto',
            backgroundColor: 'var(--bg-secondary)',
            boxShadow: '0 12px 36px rgba(0,0,0,0.4)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.25rem 0.5rem', borderBottom: '1px solid var(--border-color)', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
              {suggestions.length} Vorschl{suggestions.length === 1 ? 'ag' : 'äge'}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex' }}
              title="Schließen"
            >
              <X size={14} />
            </button>
          </div>
          {suggestions.map((s, i) => (
            <button
              key={`${s.lat}-${s.lng}-${i}`}
              type="button"
              onClick={() => pick(s)}
              onMouseEnter={() => setHighlight(i)}
              style={{
                background: i === highlight ? 'rgba(0,210,255,0.12)' : 'transparent',
                border: '1px solid transparent',
                borderColor: i === highlight ? 'rgba(0,210,255,0.3)' : 'transparent',
                color: 'var(--text-primary)',
                padding: '0.7rem 0.75rem',
                textAlign: 'left',
                borderRadius: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.6rem',
                fontFamily: 'inherit',
                fontSize: '0.9rem',
                lineHeight: 1.3
              }}
            >
              <MapPin size={16} color="var(--accent-primary)" style={{ marginTop: 2, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title || s.label}</div>
                {s.subtitle && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                    {s.subtitle}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
      {loading && (
        <div style={{ position: 'absolute', right: 12, top: 12, fontSize: '0.7rem', color: 'var(--text-muted)' }}>…</div>
      )}
    </div>
  );
};

export default AddressAutocomplete;
