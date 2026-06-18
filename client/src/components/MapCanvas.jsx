import React, { useEffect, useRef } from 'react';

const MapCanvas = ({ path, width = 800, height = 1000 }) => {
    const canvasRef = useRef(null);

    // Coordinate Helper: Convert 0-100/0-120 to Canvas Pixels
    const toPixels = (x, y, ctxWidth, ctxHeight) => {
        return {
            x: (x / 100) * ctxWidth,
            y: (y / 120) * ctxHeight
        };
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const W = canvas.width;
        const H = canvas.height;

        // Clear
        ctx.clearRect(0, 0, W, H);

        // --- DRAW STATIC MAP LAYOUT ---
        // Background
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, W, H);

        // 1. Draw Gangways
        // Top Gangway
        const topGangway = toPixels(30, 2, W, H);
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(topGangway.x, topGangway.y, (60 / 100) * W, (10 / 120) * H);

        // Vertical Main Gangway (x=90 to 98)
        const commonArea = toPixels(90, 15, W, H);
        ctx.fillStyle = '#fef08a'; // Yellowish tint
        ctx.fillRect(commonArea.x, commonArea.y, (8 / 100) * W, (100 / 120) * H);

        // 2. Draw Racks (Blocks)
        ctx.fillStyle = '#cbd5e1';

        // Helper to draw row
        const drawRow = (yPos, label) => {
            const start = toPixels(32, yPos, W, H);
            ctx.fillRect(start.x, start.y, (50 / 100) * W, (3 / 120) * H);

            // Text Label
            ctx.fillStyle = '#475569';
            ctx.font = '12px Inter';
            ctx.fillText(label, start.x - 20, start.y + 10);
            ctx.fillStyle = '#cbd5e1'; // Reset
        };

        const rows = [
            { id: 'A', y: 17.5 }, { id: 'B', y: 22.5 }, { id: 'C', y: 27.5 },
            { id: 'D', y: 41.5 }, { id: 'E', y: 46.5 }, { id: 'F', y: 51.5 }, { id: 'G', y: 56.5 },
            { id: 'H', y: 71.5 }, { id: 'I', y: 76.5 }, { id: 'J', y: 81.5 }, { id: 'K', y: 86.5 }
        ];

        rows.forEach(r => drawRow(r.y, r.id));

        // 3. Entry Point
        const entry = toPixels(96, 87, W, H);
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(entry.x, entry.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = '10px Arial';
        ctx.fillText('EN', entry.x - 6, entry.y + 3);

        // --- DRAW PATH IF EXISTS ---
        if (path && path.points) {
            drawPath(ctx, path.points, W, H);
        }

    }, [path, width, height]);

    const drawPath = (ctx, points, W, H) => {
        if (points.length < 2) return;

        ctx.beginPath();
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Move to start
        const start = toPixels(points[0].x, points[0].y, W, H);
        ctx.moveTo(start.x, start.y);

        // Draw segments with Arrows?
        // For now, smooth line
        for (let i = 1; i < points.length; i++) {
            const p = toPixels(points[i].x, points[i].y, W, H);
            ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();

        // Draw End Marker
        const endPt = points[points.length - 1];
        const endPix = toPixels(endPt.x, endPt.y, W, H);

        ctx.beginPath();
        ctx.fillStyle = '#ef4444';
        ctx.arc(endPix.x, endPix.y, 6, 0, Math.PI * 2);
        ctx.fill();

        // Pulse effect (simple ring)
        ctx.beginPath();
        ctx.strokeStyle = '#ef4444'; // Red
        ctx.lineWidth = 2;
        ctx.arc(endPix.x, endPix.y, 10, 0, Math.PI * 2);
        ctx.stroke();
    };

    return (
        <div className="border rounded-lg overflow-hidden shadow-sm bg-white">
            <canvas
                ref={canvasRef}
                width={width}
                height={height}
                className="max-w-full h-auto"
                style={{ display: 'block' }}
            />
        </div>
    );
};

export default MapCanvas;
