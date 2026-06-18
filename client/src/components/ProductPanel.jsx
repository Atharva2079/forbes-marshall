import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Layers, Tag, Box, Grid3X3, Building, Navigation, Clock, Ruler } from 'lucide-react';

/** Sanitize zone name for CSS class: "Blue Bin" → "BlueBin" */
const zoneClass = (zone) => (zone || '').replace(/\s+/g, '');

/** Extract bin level number from bin string, e.g. "B1" → 1, "B3" → 3 */
const parseBinLevel = (bin) => {
  if (!bin) return null;
  const m = bin.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
};

export default function ProductPanel({ product, routeData, onClose }) {
  if (!product) return null;

  const {
    item_code, org_name, primary_rack, primary_locator_type,
    zone, location_count, primary_locator_name, locations = []
  } = product;

  const primaryLoc = locations[0] || {};
  const binLevel = parseBinLevel(primaryLoc.bin);
  const maxBins = Math.max(3, binLevel || 3); // show at least 3 bin levels

  return (
    <AnimatePresence>
      <motion.div
        className="product-panel"
        initial={{ x: 320 }}
        animate={{ x: 0 }}
        exit={{ x: 320 }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
      >
        {/* Header */}
        <div className="panel-header">
          <div style={{ minWidth: 0 }}>
            <div className="panel-title" title={item_code}>{item_code}</div>
            <div className="panel-barcode">{org_name}</div>
          </div>
          <button className="panel-close" onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="panel-body">

          {/* Location Hero */}
          <div className="location-hero">
            <div className="location-hero-top">
              <div className="location-icon">
                <MapPin size={18} />
              </div>
              <div>
                <div className="location-rack">{primary_locator_name}</div>
                <div className="location-shelf">Rack {primary_rack} · {primaryLoc.bin || '—'}</div>
              </div>
            </div>

            <div className="location-grid">
              <div className="loc-cell">
                <div className="loc-cell-label">Rack Section</div>
                <div className="loc-cell-value">{primaryLoc.rack_section || '—'}</div>
              </div>
              <div className="loc-cell">
                <div className="loc-cell-label">Row</div>
                <div className="loc-cell-value">{primaryLoc.row_letter || '—'}</div>
              </div>
              <div className="loc-cell">
                <div className="loc-cell-label">Column</div>
                <div className="loc-cell-value">{primaryLoc.col_number != null ? String(primaryLoc.col_number).padStart(2, '0') : '—'}</div>
              </div>
            </div>
          </div>

          {/* Zone Badge */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className={`rack-badge zone-${zoneClass(zone)}`} style={{ fontSize: 11, padding: '4px 10px' }}>
              {zone}
            </span>
            <span style={{
              fontSize: 10, fontFamily: 'var(--font-mono)',
              padding: '3px 8px', borderRadius: 20,
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              color: 'var(--text-secondary)'
            }}>
              {primary_locator_type}
            </span>
          </div>

          {/* ═══ NAVIGATION ROUTE ═══ */}
          {routeData && (
            <div className="route-panel">
              <div className="route-header">
                <Navigation size={12} style={{ color: 'var(--accent)' }} />
                <span className="route-header-title">Navigation Route</span>
              </div>

              {/* Route stats */}
              <div className="route-stats">
                <div className="route-stat">
                  <Ruler size={10} />
                  <span>{routeData.estimated_distance}</span>
                </div>
                <div className="route-stat">
                  <Clock size={10} />
                  <span>{routeData.estimated_time}</span>
                </div>
                <div className="route-stat">
                  <MapPin size={10} />
                  <span>{routeData.entry_point}</span>
                </div>
              </div>

              {/* Step-by-step directions */}
              <div className="route-steps">
                {routeData.steps.map((step, i) => (
                  <div key={i} className={`route-step ${i === routeData.steps.length - 1 ? 'final' : ''}`}>
                    <div className="route-step-connector">
                      <div className="route-step-dot">{step.icon}</div>
                      {i < routeData.steps.length - 1 && <div className="route-step-line" />}
                    </div>
                    <div className="route-step-content">
                      <div className="route-step-text">{step.text}</div>
                      <div className="route-step-detail">{step.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Spec Grid */}
          <div className="spec-grid">
            <div className="spec-card">
              <div className="spec-card-label"><Grid3X3 size={9} style={{ display: 'inline', marginRight: 3 }} />Locator Type</div>
              <div className="spec-card-value" style={{ fontSize: 11 }}>{primary_locator_type}</div>
            </div>
            <div className="spec-card">
              <div className="spec-card-label"><Layers size={9} style={{ display: 'inline', marginRight: 3 }} />Zone</div>
              <div className="spec-card-value accent">{zone}</div>
            </div>
            <div className="spec-card">
              <div className="spec-card-label"><Tag size={9} style={{ display: 'inline', marginRight: 3 }} />Locations</div>
              <div className={`spec-card-value ${location_count > 1 ? 'warning' : 'accent'}`}>{location_count}</div>
            </div>
            <div className="spec-card">
              <div className="spec-card-label"><Building size={9} style={{ display: 'inline', marginRight: 3 }} />Org</div>
              <div className="spec-card-value" style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{org_name}</div>
            </div>
          </div>

          {/* All Locations (if multiple) */}
          {locations.length > 1 && (
            <div className="dims-bar">
              <div className="dims-bar-label"><MapPin size={9} style={{ display: 'inline', marginRight: 3 }} />All Locations ({locations.length})</div>
              <div className="location-list">
                {locations.map((loc, i) => (
                  <div key={i} className="location-list-item">
                    <span className={`rack-badge zone-${zoneClass(zone)}`} style={{ fontSize: 9, padding: '1px 5px' }}>
                      {loc.rack}
                    </span>
                    <span className="location-list-name">{loc.locator_name}</span>
                    {loc.bin && (
                      <span className="location-list-bin">{loc.bin}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bin Level Visual */}
          <div className="dims-bar">
            <div className="dims-bar-label"><Box size={9} style={{ display: 'inline', marginRight: 3 }} />Bin Position</div>
            <div style={{ display: 'flex', flexDirection: 'column-reverse', gap: 3, marginTop: 6 }}>
              {Array.from({ length: maxBins }, (_, i) => i + 1).reverse().map(b => {
                const label = `B${b}`;
                const isActive = primaryLoc.bin === label;
                return (
                  <div key={b} style={{
                    height: 18, borderRadius: 3, display: 'flex', alignItems: 'center',
                    paddingLeft: 8, fontSize: 9, fontFamily: 'var(--font-mono)',
                    background: isActive ? 'var(--accent-dim)' : 'var(--bg-input)',
                    border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                    color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                    transition: 'all var(--transition)',
                  }}>
                    {isActive ? `▶ ${label} ← HERE` : `   ${label}`}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </motion.div>
    </AnimatePresence>
  );
}
