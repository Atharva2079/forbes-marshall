import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Package, AlertTriangle, ChevronDown, ChevronRight, Navigation, Layers, Clock, Eye } from 'lucide-react';

/** Sanitize zone name for CSS class: "Blue Bin" → "BlueBin" */
const zoneClass = (zone) => (zone || '').replace(/\s+/g, '');

export default function TicketResultsPanel({ ticketData, onSelectItem, activeItemCode, onClose }) {
  const [expandedItem, setExpandedItem] = useState(null);
  const [showNotFound, setShowNotFound] = useState(false);

  const { results = [], notFound = [], ticketNo, total_found = 0, total_not_found = 0 } = ticketData || {};

  // Group results by zone
  const zoneGroups = useMemo(() => {
    const groups = {};
    results.forEach(product => {
      const zone = product.zone || 'Unknown';
      if (!groups[zone]) groups[zone] = [];
      groups[zone].push(product);
    });
    return groups;
  }, [results]);

  const zoneOrder = ['Pallet', 'Blue Bin', 'Cabinet', 'Chemical', 'Unknown'];
  const sortedZones = zoneOrder.filter(z => zoneGroups[z]);

  // Estimate total pick time (rough estimate)
  const estimatedTime = useMemo(() => {
    const zones = Object.keys(zoneGroups).length;
    const items = results.length;
    const mins = Math.max(2, items * 1.5 + zones * 2);
    return mins < 60 ? `~${Math.round(mins)} min` : `~${Math.round(mins / 60 * 10) / 10} hr`;
  }, [results, zoneGroups]);

  if (!ticketData) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="product-panel ticket-results-panel"
        initial={{ x: 320 }}
        animate={{ x: 0 }}
        exit={{ x: 320 }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
      >
        {/* Header */}
        <div className="panel-header ticket-results-header">
          <div style={{ minWidth: 0 }}>
            <div className="panel-title">
              <Package size={14} style={{ marginRight: 4, flexShrink: 0 }} />
              Ticket Results
            </div>
            {ticketNo && (
              <div className="panel-barcode">{ticketNo}</div>
            )}
          </div>
          <button className="panel-close" onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </div>

        {/* Stats Summary */}
        <div className="ticket-stats-bar">
          <div className="ticket-stat">
            <div className="ticket-stat-value ticket-stat-success">{total_found}</div>
            <div className="ticket-stat-label">Found</div>
          </div>
          <div className="ticket-stat">
            <div className="ticket-stat-value ticket-stat-warning">{total_not_found}</div>
            <div className="ticket-stat-label">Not Found</div>
          </div>
          <div className="ticket-stat">
            <div className="ticket-stat-value">{Object.keys(zoneGroups).length}</div>
            <div className="ticket-stat-label">Zones</div>
          </div>
          <div className="ticket-stat">
            <div className="ticket-stat-value">{estimatedTime}</div>
            <div className="ticket-stat-label">Est. Time</div>
          </div>
        </div>

        {/* Body — Item List by Zone */}
        <div className="panel-body">

          {/* Found Items grouped by zone */}
          {sortedZones.map(zone => (
            <div key={zone} className="ticket-zone-group">
              <div className="ticket-zone-header">
                <span className={`rack-badge zone-${zoneClass(zone)}`} style={{ fontSize: 10, padding: '3px 8px' }}>
                  {zone}
                </span>
                <span className="ticket-zone-count">
                  {zoneGroups[zone].length} item{zoneGroups[zone].length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="ticket-items-list">
                {zoneGroups[zone].map((product) => {
                  const isActive = product.item_code === activeItemCode;
                  const isExpanded = expandedItem === product.item_code;
                  const primaryLoc = product.locations?.[0];

                  return (
                    <div
                      key={product.item_code}
                      className={`ticket-item ${isActive ? 'active' : ''}`}
                    >
                      {/* Main Row — Clickable */}
                      <div
                        className="ticket-item-main"
                        onClick={() => onSelectItem(product)}
                      >
                        <div className="ticket-item-left">
                          <MapPin size={11} className="ticket-item-pin" />
                          <div className="ticket-item-info">
                            <div className="ticket-item-locator">
                              {product.primary_locator_name || '—'}
                            </div>
                            <div className="ticket-item-code">{product.item_code}</div>
                          </div>
                        </div>
                        <div className="ticket-item-right">
                          <span className={`rack-badge zone-${zoneClass(zone)}`} style={{ fontSize: 9, padding: '1px 5px' }}>
                            {product.primary_rack}
                          </span>
                          <button
                            className="ticket-item-expand"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedItem(isExpanded ? null : product.item_code);
                            }}
                          >
                            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                          </button>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="ticket-item-details">
                          <div className="ticket-detail-row">
                            <span className="ticket-detail-label">Type</span>
                            <span className="ticket-detail-value">{product.primary_locator_type}</span>
                          </div>
                          <div className="ticket-detail-row">
                            <span className="ticket-detail-label">Org</span>
                            <span className="ticket-detail-value">{product.org_name}</span>
                          </div>
                          {product.locations && product.locations.length > 1 && (
                            <div className="ticket-detail-locations">
                              <span className="ticket-detail-label">All Locations ({product.locations.length})</span>
                              {product.locations.map((loc, i) => (
                                <div key={i} className="ticket-detail-loc">
                                  <MapPin size={9} />
                                  <span>{loc.locator_name}</span>
                                  {loc.bin && <span className="ticket-detail-bin">{loc.bin}</span>}
                                </div>
                              ))}
                            </div>
                          )}
                          <button
                            className="btn btn-primary btn-sm btn-full"
                            style={{ marginTop: 6 }}
                            onClick={() => onSelectItem(product)}
                          >
                            <Eye size={11} /> Navigate to Item
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Not Found Section */}
          {notFound.length > 0 && (
            <div className="ticket-not-found">
              <div
                className="ticket-not-found-header"
                onClick={() => setShowNotFound(!showNotFound)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertTriangle size={12} style={{ color: 'var(--warning)' }} />
                  <span>{notFound.length} code(s) not found</span>
                </div>
                {showNotFound ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </div>
              {showNotFound && (
                <div className="ticket-not-found-list">
                  {notFound.map((code, i) => (
                    <div key={i} className="ticket-not-found-item">
                      <AlertTriangle size={9} />
                      <span>{code}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {results.length === 0 && notFound.length === 0 && (
            <div className="empty-state" style={{ padding: '32px 0' }}>
              <Package size={32} className="empty-state-icon" />
              <div className="empty-state-text">No items found in ticket</div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
