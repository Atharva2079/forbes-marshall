const warehouseData = {
    // Main Entry at bottom right (based on map "Entry" icon)
    // Coordinates based on 100x120 viewBox in SVG
    entryPoint: { x: 96, y: 87 },

    racks: {},
    products: {},

    // Key navigation points for "Manhattan" routing
    // We will define a thoroughfare node.
    waypoints: {
        'MainGangway-Bottom': { x: 94, y: 87 },
        'MainGangway-Top': { x: 94, y: 20 },
    }
};

// --- CONFIGURATION ---
// We have Rows A-C (Top), D-G (Middle), H-K (Bottom)
const ROWS_CONFIG = [
    { id: 'A', y: 17.5 },
    { id: 'B', y: 22.5 },
    { id: 'C', y: 27.5 },
    // Gap
    { id: 'D', y: 41.5 },
    { id: 'E', y: 46.5 },
    { id: 'F', y: 51.5 },
    { id: 'G', y: 56.5 },
    // Gap
    { id: 'H', y: 71.5 },
    { id: 'I', y: 76.5 },
    { id: 'J', y: 81.5 },
    { id: 'K', y: 86.5 },
];

const RACK_START_X = 32;
const RACK_WIDTH = 50;
const RACK_SECTIONS = 10; // 10 sections per row
const SECTION_WIDTH = RACK_WIDTH / RACK_SECTIONS;

// --- GENERATE RACKS ---
function generateRacks() {
    ROWS_CONFIG.forEach(row => {
        for (let i = 0; i < RACK_SECTIONS; i++) {
            const colId = (i + 1).toString().padStart(2, '0');
            const rackId = `RACK-${row.id}${colId}`;

            // Calculate center of the rack section
            warehouseData.racks[rackId] = {
                x: RACK_START_X + (i * SECTION_WIDTH) + (SECTION_WIDTH / 2),
                y: row.y
            };
        }
    });
}

// --- GENERATE RANDOM PRODUCTS (More for testing) ---
function generateProducts(count) {
    const rackIds = Object.keys(warehouseData.racks);

    const parts = ['Motor', 'Valve', 'Piston', 'Gear', 'Pump', 'Switch', 'Sensor', 'Lever', 'Seal', 'Bearing'];
    const types = ['Hydraulic', 'Pneumatic', 'Electric', 'Mechanical', 'Thermal'];

    for (let i = 0; i < count; i++) {
        // Generate random 5-digit ID
        let prodId = Math.floor(10000 + Math.random() * 90000).toString();
        while (warehouseData.products[prodId]) {
            prodId = Math.floor(10000 + Math.random() * 90000).toString();
        }

        const name = `${types[Math.floor(Math.random() * types.length)]} ${parts[Math.floor(Math.random() * parts.length)]}`;

        warehouseData.products[prodId] = {
            name: name,
            rackId: rackIds[Math.floor(Math.random() * rackIds.length)]
        };
    }
}

generateRacks();
generateProducts(200);

// Export for UI use
window.warehouseData = warehouseData;
