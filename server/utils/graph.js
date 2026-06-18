// Geometry & Graph Builder

// Coordinate System: 0-100 (W) x 120 (H)
// Gangways:
// - Main Vertical: x=94, from y=10 to y=100
// - Top Area: y=10
// - Connection to Entry: (96, 87)

// Rows Configuration (y-coordinates centered)
const ROWS = [
    { id: 'A', y: 17.5 }, { id: 'B', y: 22.5 }, { id: 'C', y: 27.5 },
    { id: 'D', y: 41.5 }, { id: 'E', y: 46.5 }, { id: 'F', y: 51.5 }, { id: 'G', y: 56.5 },
    { id: 'H', y: 71.5 }, { id: 'I', y: 76.5 }, { id: 'J', y: 81.5 }, { id: 'K', y: 86.5 }
];

const NODES = {};
const ADJACENCY = {};

function addNode(id, x, y, type = 'intersection') {
    NODES[id] = { id, x, y, type };
    if (!ADJACENCY[id]) ADJACENCY[id] = [];
}

function addEdge(fromId, toId, weight = null) {
    const from = NODES[fromId];
    const to = NODES[toId];
    if (!from || !to) return;

    // Calculate Euclidean distance if weight not provided
    const dist = Math.sqrt(Math.pow(to.x - from.x, 2) + Math.pow(to.y - from.y, 2));
    const finalWeight = weight !== null ? weight : dist;

    ADJACENCY[fromId].push({ node: toId, weight: finalWeight });
    ADJACENCY[toId].push({ node: fromId, weight: finalWeight }); // Undirected
}

function buildGraph() {
    // 1. Entry Node
    addNode('ENTRY', 96, 87, 'entry');

    // 2. Main Vertical Gangway Nodes
    // We create intersection nodes at every Row Y-level along the private gangway (x=94)
    addNode('MAIN_GANGWAY_ENTRY', 94, 87, 'intersection');
    addEdge('ENTRY', 'MAIN_GANGWAY_ENTRY');

    ROWS.forEach(row => {
        const intersectionId = `INT_${row.id}`;
        addNode(intersectionId, 94, row.y, 'intersection');

        // Connect this intersection to the previous one in the gangway?
        // Or better: Connect all main gangway nodes linearly.
    });

    // Sort Row Intersections by Y to connect them vertically
    const gangwayNodes = ROWS.map(r => ({ id: `INT_${r.id}`, y: r.y })).sort((a, b) => a.y - b.y);

    // Connect Main Gangway Vertical Spine
    for (let i = 0; i < gangwayNodes.length - 1; i++) {
        addEdge(gangwayNodes[i].id, gangwayNodes[i + 1].id);
    }

    // Connect Entry Point to the Spine (Start at K since it's at y=86.5, closest to Entry y=87)
    addEdge('MAIN_GANGWAY_ENTRY', 'INT_K');

    // 3. Create Rack Nodes and Row Corridors
    ROWS.forEach(row => {
        const intersectionId = `INT_${row.id}`;

        // Assume row goes from X=30 to X=80
        // We create nodes for discrete rack positions or just a "corridor"
        // Let's create specific nodes for Racks 1-10

        for (let i = 1; i <= 10; i++) {
            const colId = i.toString().padStart(2, '0');
            const rackId = `RACK-${row.id}${colId}`;
            // Simple linear spacing
            const x = 35 + (i * 5);

            addNode(rackId, x, row.y, 'rack');

            // Connect to previous (either intersection or previous rack)
            const prevId = i === 1 ? intersectionId : `RACK-${row.id}${(i - 1).toString().padStart(2, '0')}`;
            addEdge(prevId, rackId);
        }
    });

    return { NODES, ADJACENCY };
}

// Build once on load
const GRAPH = buildGraph();

module.exports = {
    nodes: GRAPH.NODES,
    adjacency: GRAPH.ADJACENCY
};
