import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, MapPin, Package } from 'lucide-react';
import axios from 'axios';

/** Sanitize zone name for CSS class: "Blue Bin" → "BlueBin" */
const zoneClass = (zone) => (zone || '').replace(/\s+/g, '');

export default function SearchBar({ onSelect, selectedItemCode }) {
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState([]);
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const debounce  = useRef(null);
  const inputRef  = useRef(null);

  const search = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const res = await axios.get(`/api/search?q=${encodeURIComponent(q)}`);
      setResults(res.data);
      setOpen(true);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => search(query), 180);
    return () => clearTimeout(debounce.current);
  }, [query, search]);

  const handleSelect = (product) => {
    setQuery('');
    setOpen(false);
    onSelect(product);
  };

  const clear = () => { setQuery(''); setResults([]); setOpen(false); inputRef.current?.focus(); };

  // Detect if query looks like a locator code (has dashes)
  const isLocatorQuery = query.includes('-');

  return (
    <div style={{ position: 'relative' }}>
      <div className="input-group">
        <div className="input-group-icon">
          {loading
            ? <span style={{ fontSize: 12, color: 'var(--accent)', animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
            : isLocatorQuery ? <MapPin size={13} /> : <Search size={13} />}
        </div>
        <input
          ref={inputRef}
          className={`fm-input ${query ? 'has-value' : ''}`}
          placeholder="Enter locator code (A01-A01-B1) or item code..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
        />
        {query && (
          <button
            onClick={clear}
            style={{
              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', color: 'var(--text-muted)',
              cursor: 'pointer', padding: 2, display: 'flex'
            }}
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Search hint */}
      {!query && !open && (
        <div style={{
          fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)',
          marginTop: 4, paddingLeft: 2, lineHeight: 1.4,
        }}>
          💡 Tip: Enter locator code like <strong>A01-A01-B1</strong>, <strong>V01-E02-B1</strong>, or search by item code
        </div>
      )}

      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
          background: 'var(--bg-card)', border: '1.5px solid var(--border-strong)',
          borderRadius: 'var(--radius-md)', marginTop: 4,
          maxHeight: 320, overflowY: 'auto',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
          {/* Results count */}
          <div style={{
            padding: '6px 12px', fontSize: 9, color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)', borderBottom: '1px solid var(--border)',
            background: 'var(--bg-surface)',
          }}>
            {results.length} result{results.length !== 1 ? 's' : ''} found
          </div>

          {results.map(p => (
            <div
              key={p.item_code}
              onClick={() => handleSelect(p)}
              style={{
                padding: '10px 12px',
                cursor: 'pointer',
                borderBottom: '1px solid var(--border)',
                transition: 'background var(--transition)',
                background: p.item_code === selectedItemCode ? 'var(--accent-dim)' : 'transparent',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = p.item_code === selectedItemCode ? 'var(--accent-dim)' : 'transparent'}
            >
              {/* Locator name — primary display */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4,
              }}>
                <MapPin size={11} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                <span style={{
                  fontSize: 13, fontWeight: 700, color: 'var(--accent)',
                  fontFamily: 'var(--font-mono)',
                }}>
                  {p.primary_locator_name || p.locations?.[0]?.locator_name || '—'}
                </span>
              </div>

              {/* Item code + rack meta */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', paddingLeft: 17 }}>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                  {p.item_code}
                </span>
                <span className={`rack-badge zone-${zoneClass(p.zone)}`}>{p.primary_rack}</span>
                {p.location_count > 1 && (
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>
                    {p.location_count} locations
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {open && results.length === 0 && query.trim() && !loading && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
          background: 'var(--bg-card)', border: '1.5px solid var(--border-strong)',
          borderRadius: 'var(--radius-md)', marginTop: 4,
          padding: '16px 12px', textAlign: 'center',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
          <Package size={24} style={{ color: 'var(--text-muted)', marginBottom: 6 }} />
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            No results for "{query}"
          </div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 4 }}>
            Try a locator code like A01-A01-B1 or an item code
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
