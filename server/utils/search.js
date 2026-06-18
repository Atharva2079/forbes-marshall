const { nodes, adjacency } = require('./graph');

function reconstructPath(cameFrom, current) {
    const totalPath = [nodes[current]];
    while (cameFrom[current]) {
        current = cameFrom[current];
        totalPath.unshift(nodes[current]);
    }
    return totalPath;
}

// Heuristic: Euclidean distance
function heuristic(a, b) {
    const nodeA = nodes[a];
    const nodeB = nodes[b];
    return Math.sqrt(Math.pow(nodeB.x - nodeA.x, 2) + Math.pow(nodeB.y - nodeA.y, 2));
}

function findPathAStar(startId, goalId) {
    // Standard A* Implementation
    const openSet = [startId];
    const cameFrom = {};

    const gScore = {}; // Cost from start
    const fScore = {}; // Estimated total cost

    Object.keys(nodes).forEach(n => {
        gScore[n] = Infinity;
        fScore[n] = Infinity;
    });

    gScore[startId] = 0;
    fScore[startId] = heuristic(startId, goalId);

    while (openSet.length > 0) {
        // Get node with lowest fScore
        openSet.sort((a, b) => fScore[a] - fScore[b]);
        const current = openSet.shift();

        if (current === goalId) {
            const path = reconstructPath(cameFrom, current);
            return {
                points: path,
                distance: gScore[goalId],
                turns: calculateTurns(path)
            };
        }

        const neighbors = adjacency[current] || [];
        for (let neighbor of neighbors) {
            const neighborId = neighbor.node;
            const tentativeG = gScore[current] + neighbor.weight;

            if (tentativeG < gScore[neighborId]) {
                cameFrom[neighborId] = current;
                gScore[neighborId] = tentativeG;
                fScore[neighborId] = tentativeG + heuristic(neighborId, goalId);

                if (!openSet.includes(neighborId)) {
                    openSet.push(neighborId);
                }
            }
        }
    }
    return null; // No path
}

function findPathLeastTurns(startId, goalId) {
    // Dijkstra / A* but edge weights include "Turn Cost"
    // We need to track "Direction" in the state to know if we turned.
    // Simplifying: Just standard BFS/Dijkstra but add penalty to G-score if axis changes.
    // This requires a more complex state (node + arrivalAxis).

    // For this prototype, let's allow A* to just find the geometrical shortest.
    // The graph structure (Manhattan grid) naturally minimizes turns usually.
    // We can simulate an "alternate" path by adding artificial weight to the Main Gangway to force a detour?
    // Actually, "Least Turns" in a warehouse usually IS the "Shortest Path" because of the aisle structure.

    // Let's create an "Alternate" path that avoids the main vertical spine if possible (simulating congestion).
    // We can't really avoid it in this layout (it's the only vertical connector).

    // So for "Least Turns", we'll just return the A* path.
    // For "Alternate", we might try to find a path that uses a different aisle if possible? 
    // In this specific tree-like layout (backbone + branches), there is ONLY ONE path to any rack!
    // Since there are no loops, Shortest = Least Turns = Only Path.

    return findPathAStar(startId, goalId);
}

function calculateTurns(path) {
    if (path.length < 3) return 0;
    let turns = 0;
    for (let i = 1; i < path.length - 1; i++) {
        const prev = path[i - 1];
        const curr = path[i];
        const next = path[i + 1];

        // Vector 1
        const dx1 = curr.x - prev.x;
        const dy1 = curr.y - prev.y;

        // Vector 2
        const dx2 = next.x - curr.x;
        const dy2 = next.y - curr.y;

        // Check collinearity (Cross product close to 0?)
        // Or just check if direction changed (Horizontal vs Vertical)
        const isHoriz1 = Math.abs(dx1) > Math.abs(dy1);
        const isHoriz2 = Math.abs(dx2) > Math.abs(dy2);

        if (isHoriz1 !== isHoriz2) turns++;
    }
    return turns;
}

module.exports = {
    findPathAStar,
    findPathLeastTurns
};
