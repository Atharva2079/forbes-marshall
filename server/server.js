const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app  = express();
const PORT = 3001;

// ---- Middleware ----
app.use(cors({ origin: '*' }));
app.use(express.json());

// ---- Database ----
const db = require('./data/store');

// ============================================================
//  GET /api/layout  —  warehouse metadata + rack info + stats
// ============================================================
app.get('/api/layout', (req, res) => {
    res.json({
        metadata: db.metadata,
        racks:    Object.values(db.racks),
        stats: {
            total_items:  db.metadata.total_items,
            total_racks:  db.metadata.total_racks,
            zones:        db.metadata.zones.length,
            categories:   4,  // PALLET, BLUE_BIN, CABINET, CHEMICAL
        }
    });
});

// ============================================================
//  GET /api/products  —  paginated product list with zone filter
//  Query: ?page=1&limit=100&zone=Pallet
// ============================================================
app.get('/api/products', (req, res) => {
    const page  = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit) || 100));
    const zone  = (req.query.zone || '').trim();

    let list = Object.values(db.products);

    // Optional zone filter
    if (zone) {
        list = list.filter(p => p.zone.toLowerCase() === zone.toLowerCase());
    }

    const total = list.length;
    const start = (page - 1) * limit;
    const paged = list.slice(start, start + limit);

    const result = paged.map(p => ({
        item_code:            p.item_code,
        org_name:             p.org_name,
        primary_rack:         p.primary_rack,
        primary_locator_type: p.primary_locator_type,
        zone:                 p.zone,
        location_count:       p.locations.length,
        primary_locator_name: p.locations.length > 0 ? p.locations[0].locator_name : '',
    }));

    res.json({
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
        data: result,
    });
});

// ============================================================
//  GET /api/search?q=xxx  —  search by item_code, locator, rack
//  Returns top 30 matches with FULL location data
// ============================================================
app.get('/api/search', (req, res) => {
    const q = (req.query.q || '').toLowerCase().trim();
    if (!q) return res.json([]);

    const results = Object.values(db.products)
        .filter(p => {
            // Search by item_code (partial match)
            if (p.item_code.toLowerCase().includes(q)) return true;
            // Search by rack
            if (p.primary_rack && p.primary_rack.toLowerCase().includes(q)) return true;
            // Search by any locator_name
            if (p.locations.some(loc => loc.locator_name.toLowerCase().includes(q))) return true;
            return false;
        })
        .slice(0, 30)
        .map(p => ({
            item_code:            p.item_code,
            org_name:             p.org_name,
            primary_rack:         p.primary_rack,
            primary_locator_type: p.primary_locator_type,
            zone:                 p.zone,
            location_count:       p.locations.length,
            locations:            p.locations,
            primary_locator_name: p.locations.length > 0 ? p.locations[0].locator_name : '',
        }));

    res.json(results);
});

// ============================================================
//  GET /api/item/:itemCode  —  single item with all locations
// ============================================================
app.get('/api/item/:itemCode', (req, res) => {
    const itemCode = req.params.itemCode.trim();
    const product  = db.products[itemCode];

    if (!product) {
        return res.status(404).json({ error: 'Item not found', item_code: itemCode });
    }

    res.json({
        item_code:            product.item_code,
        org_name:             product.org_name,
        primary_rack:         product.primary_rack,
        primary_locator_type: product.primary_locator_type,
        zone:                 product.zone,
        location_count:       product.locations.length,
        locations:            product.locations,
        primary_locator_name: product.locations.length > 0 ? product.locations[0].locator_name : '',
    });
});

// ============================================================
//  GET /api/locate/:locatorCode  —  lookup by locator name
//  e.g. /api/locate/A01-A01-B1
//  Returns: items at that locator + step-by-step route directions
// ============================================================
app.get('/api/locate/:locatorCode', (req, res) => {
    const code = (req.params.locatorCode || '').trim().toUpperCase();
    const entryPoint = req.query.entry || 'ENTRY_1';

    if (!code) {
        return res.status(400).json({ error: 'Locator code is required' });
    }

    // Try exact match first
    let itemCodes = db.locatorIndex[code];

    // If no exact match, try partial match
    if (!itemCodes || itemCodes.length === 0) {
        const partialMatches = Object.keys(db.locatorIndex)
            .filter(k => k.includes(code))
            .slice(0, 5);
        if (partialMatches.length > 0) {
            itemCodes = partialMatches.flatMap(k => db.locatorIndex[k]);
        }
    }

    if (!itemCodes || itemCodes.length === 0) {
        return res.status(404).json({
            error: 'Locator not found',
            locator_code: code,
            suggestion: 'Try searching with a partial code like A01 or V01',
        });
    }

    // Get unique item codes
    const uniqueItemCodes = [...new Set(itemCodes)];
    const items = uniqueItemCodes
        .map(ic => db.products[ic])
        .filter(Boolean)
        .map(p => ({
            item_code:            p.item_code,
            org_name:             p.org_name,
            primary_rack:         p.primary_rack,
            primary_locator_type: p.primary_locator_type,
            zone:                 p.zone,
            location_count:       p.locations.length,
            locations:            p.locations,
            primary_locator_name: p.locations.length > 0 ? p.locations[0].locator_name : '',
        }));

    // Generate route for the first item
    const firstItem = items[0];
    const firstLoc = firstItem?.locations?.find(l => l.locator_name.toUpperCase() === code) || firstItem?.locations?.[0];
    const route = firstLoc
        ? db.generateRouteDescription(firstLoc.locator_name, firstLoc.rack, firstLoc.locator_type, entryPoint)
        : null;

    res.json({
        locator_code: code,
        item_count: items.length,
        items,
        route,
    });
});

// ---- Start ----
app.listen(PORT, () => {
    console.log(`\n🏭  Forbes Marshall WMS API`);
    console.log(`   Server  : http://localhost:${PORT}`);
    console.log(`   Items   : ${db.metadata.total_items}`);
    console.log(`   Racks   : ${db.metadata.total_racks}`);
    console.log(`   Locators: ${Object.keys(db.locatorIndex).length}`);
    console.log(`   Zones   : ${db.metadata.zones.map(z => z.name).join(', ')}\n`);
});

