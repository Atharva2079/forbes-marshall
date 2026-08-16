import React, { useState } from 'react';
import { MapPin, Navigation2, Warehouse, DoorOpen, FileText, Search } from 'lucide-react';
import SearchBar       from './components/SearchBar';
import ProductList     from './components/ProductList';
import ProductPanel    from './components/ProductPanel';
import StatsBar        from './components/StatsBar';
import Warehouse3D     from './components/Warehouse3D';
import TicketUploader  from './components/TicketUploader';
import TicketResultsPanel from './components/TicketResultsPanel';

/* ── Zone legend config ──────────────────────────────── */
const ZONE_LEGEND = [
  { key: 'Pallet',   color: '#d45400', label: 'Pallet' },
  { key: 'BlueBin',  color: '#2563eb', label: 'Blue Bin' },
  { key: 'Cabinet',  color: '#7c3aed', label: 'Cabinet' },
  { key: 'Chemical', color: '#dc2626', label: 'Chemical' },
];

const ENTRY_POINTS = [
  { id: 'ENTRY_1', label: 'Middle-Right Gate' },
  { id: 'ENTRY_2', label: 'Bottom-Right Gate' },
];

export default function App() {
  const [scene3dLoaded, setScene3dLoaded] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [entryPoint, setEntryPoint] = useState('ENTRY_1');
  const [routeData, setRouteData] = useState(null);

  // ── Ticket Mode State ──
  const [ticketMode, setTicketMode] = useState(false);
  const [ticketData, setTicketData] = useState(null);
  const [ticketProducts, setTicketProducts] = useState([]);
  const [ticketPanelOpen, setTicketPanelOpen] = useState(false);

  // ── Single-item selection ──
  const handleProductLocated = (product) => {
    if (!product) { setSelectedProduct(null); setPanelOpen(false); setRouteData(null); return; }
    setSelectedProduct(product);
    setPanelOpen(true);

    // Fetch route data from server
    const locName = product.primary_locator_name || product.locations?.[0]?.locator_name;
    if (locName) {
      fetch(`/api/locate/${encodeURIComponent(locName)}?entry=${entryPoint}`)
        .then(r => r.json())
        .then(data => {
          if (data.route) setRouteData(data.route);
        })
        .catch(() => {});
    }
  };

  const handleRackClick = React.useCallback((rackId, row, col) => {
    if (selectedProduct?.primary_rack === rackId) {
      setPanelOpen(true);
    }
  }, [selectedProduct]);

  const handleSearchSelect = (product) => {
    // Exit ticket mode when selecting a single item
    if (ticketMode && !ticketPanelOpen) {
      setTicketMode(false);
      setTicketData(null);
      setTicketProducts([]);
    }
    handleProductLocated(product);
  };

  // ── Ticket Mode Handlers ──
  const handleTicketResults = (data) => {
    setTicketData(data);
    setTicketProducts(data.results || []);
    setTicketPanelOpen(true);
    // Clear single-item selection
    setSelectedProduct(null);
    setPanelOpen(false);
    setRouteData(null);
  };

  const handleTicketItemSelect = (product) => {
    // Highlight a single item from ticket results in the 3D view
    setSelectedProduct(product);
    setPanelOpen(false); // Don't show single-item panel, keep ticket panel

    // Fetch route
    const locName = product.primary_locator_name || product.locations?.[0]?.locator_name;
    if (locName) {
      fetch(`/api/locate/${encodeURIComponent(locName)}?entry=${entryPoint}`)
        .then(r => r.json())
        .then(data => {
          if (data.route) setRouteData(data.route);
        })
        .catch(() => {});
    }
  };

  const handleCloseTicket = () => {
    setTicketPanelOpen(false);
    setTicketData(null);
    setTicketProducts([]);
    setSelectedProduct(null);
    setRouteData(null);
  };

  const toggleTicketMode = () => {
    const newMode = !ticketMode;
    setTicketMode(newMode);
    if (!newMode) {
      // Exiting ticket mode — clear ticket data
      setTicketData(null);
      setTicketProducts([]);
      setTicketPanelOpen(false);
      setSelectedProduct(null);
      setRouteData(null);
    }
  };

  // Determine the active badge display
  const activeTargetLabel = ticketPanelOpen && ticketProducts.length > 0
    ? `${ticketProducts.length} items from ${ticketData?.ticketNo || 'ticket'}`
    : selectedProduct
      ? `${selectedProduct.item_code} → ${selectedProduct.primary_locator_name}`
      : null;

  return (
    <div className="app-layout">
      {/* ═══ TOP BAR ═══ */}
      <header className="topbar">
        <div className="topbar-brand">
          <div className="topbar-logo">FM</div>
          <div>
            <div className="topbar-title">Forbes Marshall</div>
            <div className="topbar-subtitle">Warehouse Management System v2.0</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="topbar-status">
            <div className="status-dot" />
            System Online
          </div>
          <div className="topbar-divider" />
          <StatsBar />
          <div className="topbar-divider" />
          {ZONE_LEGEND.map(z => (
            <div key={z.key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 9, height: 9, borderRadius: 2, background: z.color }} />
              <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                {z.label}
              </span>
            </div>
          ))}
        </div>
      </header>

      {/* ═══ SIDEBAR ═══ */}
      <aside className="sidebar">
        {/* Sidebar Header */}
        <div className="sidebar-header">
          <div className="sidebar-header-title">Forbes Marshall Central RMS</div>
        </div>

        {/* Entry Point Selector */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">
            <DoorOpen size={9} style={{ display: 'inline', marginRight: 4 }} />
            Your Position (Entry Gate)
          </div>
          <div className="entry-point-selector">
            {ENTRY_POINTS.map(ep => (
              <button
                key={ep.id}
                className={`entry-point-btn ${entryPoint === ep.id ? 'active' : ''}`}
                onClick={() => {
                  setEntryPoint(ep.id);
                  // Re-fetch route if product is selected
                  if (selectedProduct) {
                    const locName = selectedProduct.primary_locator_name || selectedProduct.locations?.[0]?.locator_name;
                    if (locName) {
                      fetch(`/api/locate/${encodeURIComponent(locName)}?entry=${ep.id}`)
                        .then(r => r.json())
                        .then(data => { if (data.route) setRouteData(data.route); })
                        .catch(() => {});
                    }
                  }
                }}
              >
                <span className="entry-dot" />
                {ep.label}
              </button>
            ))}
          </div>
        </div>

        {/* Mode Toggle: Single Search vs Ticket Mode */}
        <div className="sidebar-section" style={{ paddingBottom: 8 }}>
          <div className="mode-toggle">
            <button
              className={`mode-toggle-btn ${!ticketMode ? 'active' : ''}`}
              onClick={() => ticketMode && toggleTicketMode()}
            >
              <Search size={11} />
              Single Search
            </button>
            <button
              className={`mode-toggle-btn ${ticketMode ? 'active' : ''}`}
              onClick={() => !ticketMode && toggleTicketMode()}
            >
              <FileText size={11} />
              Ticket Mode
            </button>
          </div>
        </div>

        {/* Search / Ticket Uploader */}
        {!ticketMode ? (
          <>
            <div className="sidebar-section">
              <div className="sidebar-section-title">
                <Navigation2 size={9} style={{ display: 'inline', marginRight: 4 }} />
                Locator / Item Code Search
              </div>
              <SearchBar onSelect={handleSearchSelect} selectedItemCode={selectedProduct?.item_code} />
            </div>

            {/* Product List */}
            <div className="sidebar-section-title" style={{ padding: '8px 12px 0', margin: 0 }}>
              <Warehouse size={9} style={{ display: 'inline', marginRight: 4 }} />
              Inventory Directory
            </div>
            <ProductList
              selectedItemCode={selectedProduct?.item_code}
              onSelect={handleSearchSelect}
            />
          </>
        ) : (
          <div className="sidebar-section" style={{ flex: 1, overflow: 'auto', padding: 0 }}>
            <TicketUploader
              onResults={handleTicketResults}
              onClose={() => toggleTicketMode()}
            />
          </div>
        )}
      </aside>

      {/* ═══ MAIN 3D VIEW ═══ */}
      <main className="main-view">
        {/* Toolbar */}
        <div className="view-toolbar">
          <div className="view-toolbar-left">
            <span className="view-label">3D Warehouse View</span>
            {activeTargetLabel && (
              <div className="target-badge">
                <MapPin size={10} />
                {activeTargetLabel}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {ticketPanelOpen && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setTicketPanelOpen(v => !v)}
              >
                {ticketPanelOpen ? 'Hide' : 'Show'} Ticket
              </button>
            )}
            {selectedProduct && !ticketPanelOpen && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setPanelOpen(v => !v)}
              >
                {panelOpen ? 'Hide' : 'Show'} Details
              </button>
            )}
          </div>
        </div>

        {/* Canvas */}
        <div className="canvas-wrapper">
          <Warehouse3D
            targetProduct={selectedProduct}
            targetProducts={ticketPanelOpen ? ticketProducts : []}
            onRackClick={handleRackClick}
            onLoaded={() => setScene3dLoaded(true)}
            entryPoint={entryPoint}
          />

          {/* Empty state overlay */}
          {!selectedProduct && !ticketPanelOpen && scene3dLoaded && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex',
              flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 10, pointerEvents: 'none', background: 'rgba(200,216,232,0.25)'
            }}>
              <Warehouse size={56} style={{ color: '#0060b0', opacity: 0.3 }} />
              <div style={{ fontSize: 13, color: '#4a6280', fontFamily: 'var(--font-mono)' }}>
                Enter a locator code or upload a ticket to locate items
              </div>
            </div>
          )}

          {/* Controls hint */}
          <div className="controls-hint">
            <div className="hint-item"><span className="hint-key">drag</span> Rotate</div>
            <div className="hint-item"><span className="hint-key">scroll</span> Zoom</div>
            <div className="hint-item"><span className="hint-key">right-drag</span> Pan</div>
            <div className="hint-item"><span className="hint-key">click rack</span> Select</div>
          </div>
        </div>

        {/* Product Panel (single item mode) */}
        {panelOpen && selectedProduct && !ticketPanelOpen && (
          <ProductPanel
            product={selectedProduct}
            routeData={routeData}
            onClose={() => setPanelOpen(false)}
          />
        )}

        {/* Ticket Results Panel (ticket mode) */}
        {ticketPanelOpen && ticketData && (
          <TicketResultsPanel
            ticketData={ticketData}
            onSelectItem={handleTicketItemSelect}
            activeItemCode={selectedProduct?.item_code}
            onClose={handleCloseTicket}
          />
        )}
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
