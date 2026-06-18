document.addEventListener('DOMContentLoaded', () => {
    populateSidebar();
});

function populateSidebar() {
    const list = document.getElementById('productList');
    const products = warehouseData.products;

    // Sort by name for nicer display
    const sortedIds = Object.keys(products).sort((a, b) =>
        products[a].name.localeCompare(products[b].name)
    );

    sortedIds.forEach(id => {
        const item = document.createElement('div');
        item.className = 'product-item';
        item.innerHTML = `<strong>${products[id].name}</strong><span>ID: ${id} | Rack: ${products[id].rackId}</span>`;
        item.onclick = () => {
            document.getElementById('productIdInput').value = id;
            findProduct();
        };
        list.appendChild(item);
    });
}

function findProduct() {
    const productId = document.getElementById('productIdInput').value.trim();
    const statusDiv = document.getElementById('statusMessage');
    const product = warehouseData.products[productId];

    // Reset UI
    statusDiv.textContent = '';
    statusDiv.style.color = 'black';
    clearPath();

    if (!productId) {
        statusDiv.textContent = 'Please select or enter a Product ID.';
        statusDiv.style.color = '#ef4444';
        return;
    }

    if (!product) {
        statusDiv.textContent = `Product ID "${productId}" not found.`;
        statusDiv.style.color = '#ef4444';
        return;
    }

    const rackId = product.rackId;
    const rackLocation = warehouseData.racks[rackId];

    if (!rackLocation) {
        statusDiv.textContent = `Location data missing for Rack "${rackId}".`;
        statusDiv.style.color = '#eab308';
        return;
    }

    statusDiv.textContent = `Routing to: ${product.name} (${rackId})`;
    statusDiv.style.color = '#10b981';

    drawPath(warehouseData.entryPoint, rackLocation);
}

function clearPath() {
    const canvas = document.getElementById('pathCanvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    document.getElementById('startMarker').style.display = 'none';
    document.getElementById('endMarker').style.display = 'none';
}

function drawPath(start, end) {
    const canvas = document.getElementById('pathCanvas');
    const container = document.getElementById('mapContainer');

    // Match resolution
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    const ctx = canvas.getContext('2d');

    // SCALE: Map coordinates are based on 100x120 viewBox
    // We need to scale them to the canvas size
    // Canvas Aspect Ratio might not match 100/120 exactly due to CSS,
    // but the coordinates (0-100, 0-120) are consistent relative to the image.

    const scaleX = canvas.width / 100;
    const scaleY = canvas.height / 120;

    const startX = start.x * scaleX;
    const startY = start.y * scaleY;
    const endX = end.x * scaleX;
    const endY = end.y * scaleY;

    // Gangway X coordinate (Vertical Highway on the right) is roughly x=94
    const gangwayX = 94 * scaleX;

    // Drawing settings
    ctx.beginPath();
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.moveTo(startX, startY);

    // ROUTING LOGIC (Manhattan-ish)
    // 1. Start is at Main Gate (96, 87)
    // 2. Move left to Main Gangway center (94, 87)
    ctx.lineTo(gangwayX, startY);

    // 3. Move UP along Gangway to the Target's Y level
    ctx.lineTo(gangwayX, endY);

    // 4. Move LEFT into the Row to the Target
    ctx.lineTo(endX, endY);

    ctx.stroke();

    // Place Markers
    showMarker('startMarker', start, 'Entry');
    showMarker('endMarker', end, 'Target');
}

function showMarker(elementId, pos, text) {
    const el = document.getElementById(elementId);
    // Position using percentages relative to the 100x120 system
    // We need to convert 120-scale Y to %
    const topPct = (pos.y / 120) * 100;

    el.style.left = pos.x + '%';
    el.style.top = topPct + '%';
    el.style.display = 'block';
    if (text) el.textContent = text;
}

window.addEventListener('resize', () => {
    const productId = document.getElementById('productIdInput').value.trim();
    if (productId && warehouseData.products[productId]) {
        drawPath(warehouseData.entryPoint, warehouseData.racks[warehouseData.products[productId].rackId]);
    }
});
