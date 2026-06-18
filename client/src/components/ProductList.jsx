import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';

/** Sanitize zone name for CSS class: "Blue Bin" → "BlueBin" */
const zoneClass = (zone) => (zone || '').replace(/\s+/g, '');

const ZONE_TABS = ['ALL', 'Pallet', 'Blue Bin', 'Cabinet', 'Chemical'];

export default function ProductList({ selectedItemCode, onSelect }) {
  const [products, setProducts] = useState([]);
  const [filter,   setFilter]   = useState('ALL');

  useEffect(() => {
    const params = new URLSearchParams({ limit: '200' });
    if (filter !== 'ALL') params.set('zone', filter);
    axios.get(`/api/products?${params.toString()}`)
      .then(res => setProducts(res.data.data))
      .catch(() => {});
  }, [filter]);

  const handleClick = useCallback((product) => {
    onSelect(product);
  }, [onSelect]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      {/* Zone filter tabs */}
      <div style={{
        display: 'flex', gap: 4, padding: '6px 8px',
        borderBottom: '1px solid var(--border)', flexShrink: 0
      }}>
        {ZONE_TABS.map(z => (
          <button
            key={z}
            onClick={() => setFilter(z)}
            style={{
              flex: 1, padding: '4px 0', borderRadius: 6, border: 'none',
              fontSize: 9, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: 0.5,
              transition: 'all var(--transition)',
              background: filter === z ? 'var(--accent-dim)' : 'transparent',
              color: filter === z ? 'var(--accent)' : 'var(--text-muted)',
              outline: filter === z ? '1px solid var(--accent)' : 'none',
            }}
          >{z}</button>
        ))}
      </div>

      {/* Count */}
      <div style={{
        padding: '4px 12px', fontSize: 9, color: 'var(--text-muted)',
        fontFamily: 'var(--font-mono)', flexShrink: 0
      }}>
        {products.length} items
      </div>

      {/* List */}
      <div className="product-list">
        {products.map(p => (
          <div
            key={p.item_code}
            className={`product-item ${p.item_code === selectedItemCode ? 'active' : ''}`}
            onClick={() => handleClick(p)}
          >
            <div className="product-item-name">{p.item_code}</div>
            <div className="product-item-meta">
              <span className="product-item-id">{p.primary_locator_name}</span>
              <span className={`rack-badge zone-${zoneClass(p.zone)}`}>{p.primary_rack}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
