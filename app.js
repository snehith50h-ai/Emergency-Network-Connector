/* ===================================================================
   Emergency Network Connector — Application Logic
   Kruskal's MST Algorithm Visualizer
   =================================================================== */

// ===== Data Model =====

class Location {
    constructor(id, name) {
        this.id = id;
        this.name = name;
        this.x = 0;
        this.y = 0;
    }
}

class Link {
    constructor(src, dest, cost) {
        this.src = src;
        this.dest = dest;
        this.cost = cost;
        this.state = 'default'; // 'default' | 'examining' | 'accepted' | 'rejected'
    }
}

class DisjointSet {
    constructor(n) {
        this.parent = Array.from({ length: n }, (_, i) => i);
        this.rank = new Array(n).fill(0);
    }

    find(x) {
        if (this.parent[x] !== x) {
            this.parent[x] = this.find(this.parent[x]); // path compression
        }
        return this.parent[x];
    }

    union(a, b) {
        const ra = this.find(a);
        const rb = this.find(b);
        if (ra === rb) return false;
        if (this.rank[ra] < this.rank[rb]) {
            this.parent[ra] = rb;
        } else if (this.rank[ra] > this.rank[rb]) {
            this.parent[rb] = ra;
        } else {
            this.parent[rb] = ra;
            this.rank[ra]++;
        }
        return true;
    }
}

// ===== Application State =====

const state = {
    locations: [],
    links: [],
    mstLinks: [],
    totalCost: 0,
    isRunning: false,
    animationSteps: [],
    currentStep: -1,
};

// ===== DOM References =====

const dom = {
    // Inputs
    locationName: document.getElementById('location-name'),
    linkFrom: document.getElementById('link-from'),
    linkTo: document.getElementById('link-to'),
    linkCost: document.getElementById('link-cost'),

    // Buttons
    btnAddLocation: document.getElementById('btn-add-location'),
    btnAddLink: document.getElementById('btn-add-link'),
    btnRun: document.getElementById('btn-run'),
    btnSample: document.getElementById('btn-sample'),
    btnSampleOverlay: document.getElementById('btn-sample-overlay'),
    btnReset: document.getElementById('btn-reset'),
    speedSlider: document.getElementById('speed-slider'),

    // Lists
    locationList: document.getElementById('location-list'),
    linkList: document.getElementById('link-list'),
    locationCount: document.getElementById('location-count'),
    linkCount: document.getElementById('link-count'),

    // Canvas
    graphCanvas: document.getElementById('graph-canvas'),
    heroCanvas: document.getElementById('hero-canvas'),
    canvasOverlay: document.getElementById('canvas-overlay'),
    btnAutoLayout: document.getElementById('btn-autolayout'),

    // Results & Live Code Tracker
    tabCode: document.getElementById('tab-code'),
    tabTrace: document.getElementById('tab-trace'),
    codeTrackerView: document.getElementById('code-tracker-view'),
    traceView: document.getElementById('trace-view'),
    varEdge: document.getElementById('var-edge'),
    varCost: document.getElementById('var-cost'),
    varCycle: document.getElementById('var-cycle'),
    statusPulseDot: document.getElementById('status-pulse-dot'),
    statusStepMsg: document.getElementById('status-step-msg'),
    codeExecutionBox: document.getElementById('code-execution-box'),
    traceLog: document.getElementById('trace-log'),
    resultSummary: document.getElementById('result-summary'),
    navbar: document.getElementById('navbar'),
};

// ===== Utility =====

function getAnimDelay() {
    const speeds = [1800, 1200, 800, 500, 250];
    return speeds[parseInt(dom.speedSlider.value) - 1] || 800;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ===== Location Management =====

function addLocation(name) {
    if (!name || name.trim() === '') return;
    name = name.trim();

    // Check duplicate
    if (state.locations.some(l => l.name.toLowerCase() === name.toLowerCase())) {
        shakeElement(dom.locationName);
        return;
    }

    if (state.locations.length >= 15) {
        shakeElement(dom.locationName);
        return;
    }

    const loc = new Location(state.locations.length, name);
    state.locations.push(loc);
    positionLocations();
    renderLocationList();
    updateDropdowns();
    renderGraph();
    dom.locationName.value = '';
    dom.locationName.focus();

    if (state.locations.length >= 2) {
        dom.canvasOverlay.classList.add('hidden');
    }
}

function removeLocation(id) {
    if (state.isRunning) return;

    // Remove links connected to this location
    state.links = state.links.filter(l => l.src !== id && l.dest !== id);

    // Remove the location
    state.locations.splice(id, 1);

    // Re-index locations
    state.locations.forEach((l, i) => {
        l.id = i;
    });

    // Re-index links
    state.links.forEach(link => {
        // Adjust indices after removal
        if (link.src > id) link.src--;
        if (link.dest > id) link.dest--;
    });

    positionLocations();
    renderLocationList();
    renderLinkList();
    updateDropdowns();
    renderGraph();
    clearResults();

    if (state.locations.length < 2) {
        dom.canvasOverlay.classList.remove('hidden');
    }
}

function positionLocations() {
    const canvas = dom.graphCanvas;
    const w = canvas._logicalWidth || (canvas.parentElement ? canvas.parentElement.clientWidth : 600);
    const h = canvas._logicalHeight || (canvas.parentElement ? canvas.parentElement.clientHeight : 550);
    const n = state.locations.length;
    if (n === 0) return;

    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w * 0.38, h * 0.36);

    state.locations.forEach((loc, i) => {
        const angle = (2 * Math.PI * i) / n - Math.PI / 2;
        loc.x = Math.round(cx + radius * Math.cos(angle));
        loc.y = Math.round(cy + radius * Math.sin(angle));
    });
}

// ===== Link Management =====

function addLink(fromId, toId, cost) {
    if (fromId === '' || toId === '' || !cost) return;
    fromId = parseInt(fromId);
    toId = parseInt(toId);
    cost = parseInt(cost);

    if (fromId === toId || cost <= 0) {
        shakeElement(dom.linkCost);
        return;
    }

    // Check duplicate
    const exists = state.links.some(l =>
        (l.src === fromId && l.dest === toId) || (l.src === toId && l.dest === fromId)
    );
    if (exists) {
        shakeElement(dom.linkCost);
        return;
    }

    const link = new Link(fromId, toId, cost);
    state.links.push(link);
    renderLinkList();
    renderGraph();

    dom.linkFrom.value = '';
    dom.linkTo.value = '';
    dom.linkCost.value = '';
}

function removeLink(index) {
    if (state.isRunning) return;
    state.links.splice(index, 1);
    renderLinkList();
    renderGraph();
    clearResults();
}

// ===== UI Rendering =====

function renderLocationList() {
    dom.locationList.innerHTML = '';
    dom.locationCount.textContent = state.locations.length;

    state.locations.forEach(loc => {
        const item = document.createElement('div');
        item.className = 'location-item';
        item.innerHTML = `
            <span class="location-id">${loc.id}</span>
            <span class="location-name">${escapeHtml(loc.name)}</span>
            <button class="item-remove" data-id="${loc.id}" title="Remove">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        `;
        item.querySelector('.item-remove').addEventListener('click', () => removeLocation(loc.id));
        dom.locationList.appendChild(item);
    });
}

function renderLinkList() {
    dom.linkList.innerHTML = '';
    dom.linkCount.textContent = state.links.length;

    state.links.forEach((link, index) => {
        const fromName = state.locations[link.src]?.name || link.src;
        const toName = state.locations[link.dest]?.name || link.dest;

        const item = document.createElement('div');
        item.className = 'link-item';
        item.innerHTML = `
            <span class="link-detail">${escapeHtml(fromName)} → ${escapeHtml(toName)}</span>
            <span class="link-cost">${link.cost}</span>
            <button class="item-remove" title="Remove">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        `;
        item.querySelector('.item-remove').addEventListener('click', () => removeLink(index));
        dom.linkList.appendChild(item);
    });
}

function updateDropdowns() {
    const options = '<option value="">—</option>' +
        state.locations.map(l => `<option value="${l.id}">${escapeHtml(l.name)}</option>`).join('');
    dom.linkFrom.innerHTML = options;
    dom.linkTo.innerHTML = options;
}

function shakeElement(el) {
    el.classList.add('shake');
    setTimeout(() => el.classList.remove('shake'), 400);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== Graph Rendering (Canvas) =====

let prevLogicalWidth = 0;
let prevLogicalHeight = 0;
let draggedNode = null;
let hoveredNode = null;

function resizeCanvas() {
    const wrapper = dom.graphCanvas.parentElement;
    if (!wrapper) return;
    const dpr = window.devicePixelRatio || 1;
    const logicalW = wrapper.clientWidth;
    const logicalH = wrapper.clientHeight;

    dom.graphCanvas.width = logicalW * dpr;
    dom.graphCanvas.height = logicalH * dpr;
    dom.graphCanvas.style.width = logicalW + 'px';
    dom.graphCanvas.style.height = logicalH + 'px';

    const ctx = dom.graphCanvas.getContext('2d');
    ctx.scale(dpr, dpr);

    // Store logical dimensions for position calculations
    dom.graphCanvas._logicalWidth = logicalW;
    dom.graphCanvas._logicalHeight = logicalH;

    if (prevLogicalWidth > 0 && prevLogicalHeight > 0 && state.locations.length > 0) {
        const sx = logicalW / prevLogicalWidth;
        const sy = logicalH / prevLogicalHeight;
        state.locations.forEach(loc => {
            loc.x *= sx;
            loc.y *= sy;
        });
    } else {
        positionLocations();
    }

    prevLogicalWidth = logicalW;
    prevLogicalHeight = logicalH;

    renderGraph();
}

function renderGraph() {
    const canvas = dom.graphCanvas;
    const ctx = canvas.getContext('2d');
    const w = canvas._logicalWidth || (canvas.parentElement ? canvas.parentElement.clientWidth : canvas.width);
    const h = canvas._logicalHeight || (canvas.parentElement ? canvas.parentElement.clientHeight : canvas.height);

    ctx.clearRect(0, 0, w, h);

    if (state.locations.length === 0) return;

    // Draw edges
    state.links.forEach(link => {
        const from = state.locations[link.src];
        const to = state.locations[link.dest];
        if (!from || !to) return;

        drawEdge(ctx, from, to, link);
    });

    // Draw nodes
    state.locations.forEach(loc => {
        drawNode(ctx, loc);
    });
}

function drawEdge(ctx, from, to, link) {
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);

    let color, width, dash = [];
    switch (link.state) {
        case 'examining':
            color = '#f59e0b';
            width = 3.5;
            dash = [8, 4];
            break;
        case 'accepted':
            color = '#10b981';
            width = 3.5;
            break;
        case 'rejected':
            color = 'rgba(239, 68, 68, 0.45)';
            width = 1.5;
            dash = [4, 4];
            break;
        default:
            color = 'rgba(99, 102, 241, 0.28)';
            width = 1.5;
    }

    ctx.setLineDash(dash);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
    ctx.setLineDash([]);

    // Edge label (cost)
    const mx = (from.x + to.x) / 2;
    const my = (from.y + to.y) / 2;

    // Offset the label slightly perpendicular to the edge
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const nx = len ? -dy / len : 0;
    const ny = len ? dx / len : 0;
    const offset = 14;

    const labelX = mx + nx * offset;
    const labelY = my + ny * offset;

    ctx.font = '600 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Background pill
    const text = String(link.cost);
    const tm = ctx.measureText(text);
    const pw = tm.width + 12;
    const ph = 18;

    let bgColor, textColor, borderColor;
    switch (link.state) {
        case 'examining':
            bgColor = 'rgba(245, 158, 11, 0.2)';
            textColor = '#fbbf24';
            borderColor = 'rgba(245, 158, 11, 0.5)';
            break;
        case 'accepted':
            bgColor = 'rgba(16, 185, 129, 0.2)';
            textColor = '#34d399';
            borderColor = 'rgba(16, 185, 129, 0.5)';
            break;
        case 'rejected':
            bgColor = 'rgba(239, 68, 68, 0.15)';
            textColor = 'rgba(239, 68, 68, 0.6)';
            borderColor = 'rgba(239, 68, 68, 0.3)';
            break;
        default:
            bgColor = 'rgba(14, 19, 30, 0.85)';
            textColor = 'rgba(148, 163, 184, 0.85)';
            borderColor = 'rgba(99, 102, 241, 0.25)';
    }

    ctx.fillStyle = bgColor;
    roundRect(ctx, labelX - pw / 2, labelY - ph / 2, pw, ph, 6);
    ctx.fill();
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.fillText(text, labelX, labelY);
}

function drawNode(ctx, loc) {
    const isDragged = loc === draggedNode;
    const isHovered = loc === hoveredNode;
    const r = isDragged ? 24 : 22;

    // Outer Glow
    let glowColor = 'rgba(99, 102, 241, 0.15)';
    if (isDragged) glowColor = 'rgba(129, 140, 248, 0.45)';
    else if (isHovered) glowColor = 'rgba(99, 102, 241, 0.35)';

    const gradient = ctx.createRadialGradient(loc.x, loc.y, r * 0.3, loc.x, loc.y, r * 2.6);
    gradient.addColorStop(0, glowColor);
    gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(loc.x, loc.y, r * 2.6, 0, Math.PI * 2);
    ctx.fill();

    // Node Body
    ctx.beginPath();
    ctx.arc(loc.x, loc.y, r, 0, Math.PI * 2);
    const nodeGrad = ctx.createLinearGradient(loc.x - r, loc.y - r, loc.x + r, loc.y + r);
    if (isDragged) {
        nodeGrad.addColorStop(0, '#818cf8');
        nodeGrad.addColorStop(1, '#6366f1');
    } else if (isHovered) {
        nodeGrad.addColorStop(0, '#7073f4');
        nodeGrad.addColorStop(1, '#534ded');
    } else {
        nodeGrad.addColorStop(0, '#6366f1');
        nodeGrad.addColorStop(1, '#4f46e5');
    }
    ctx.fillStyle = nodeGrad;
    ctx.fill();

    // Node Border
    ctx.strokeStyle = isDragged ? '#c7d2fe' : (isHovered ? '#a5b4fc' : 'rgba(129, 140, 248, 0.6)');
    ctx.lineWidth = isDragged ? 3 : 2;
    ctx.stroke();

    // Node ID
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 12px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(loc.id, loc.x, loc.y);

    // Node Label with pill background
    const labelText = loc.name;
    ctx.font = '600 11px "Inter", sans-serif';
    const tm = ctx.measureText(labelText);
    const pillW = tm.width + 12;
    const pillH = 18;
    const pillY = loc.y + r + 7;

    ctx.fillStyle = 'rgba(6, 8, 13, 0.85)';
    roundRect(ctx, loc.x - pillW / 2, pillY, pillW, pillH, 5);
    ctx.fill();
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.fillText(labelText, loc.x, pillY + pillH / 2);
}

function setupCanvasInteraction() {
    const canvas = dom.graphCanvas;

    function getCoords(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: clientX - rect.left,
            y: clientY - rect.top,
            w: rect.width,
            h: rect.height
        };
    }

    function findNodeAt(x, y, radius = 26) {
        for (let i = state.locations.length - 1; i >= 0; i--) {
            const loc = state.locations[i];
            if (Math.hypot(loc.x - x, loc.y - y) <= radius) {
                return loc;
            }
        }
        return null;
    }

    canvas.addEventListener('mousedown', (e) => {
        if (state.isRunning) return;
        const pos = getCoords(e);
        const node = findNodeAt(pos.x, pos.y);
        if (node) {
            draggedNode = node;
            canvas.style.cursor = 'grabbing';
            renderGraph();
        }
    });

    window.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (draggedNode) {
            const pad = 30;
            draggedNode.x = Math.max(pad, Math.min(rect.width - pad, x));
            draggedNode.y = Math.max(pad, Math.min(rect.height - pad, y));
            renderGraph();
        } else {
            const isInside = x >= 0 && x <= rect.width && y >= 0 && y <= rect.height;
            if (isInside) {
                const node = findNodeAt(x, y);
                if (node !== hoveredNode) {
                    hoveredNode = node;
                    canvas.style.cursor = node ? 'grab' : 'default';
                    renderGraph();
                }
            } else if (hoveredNode) {
                hoveredNode = null;
                canvas.style.cursor = 'default';
                renderGraph();
            }
        }
    });

    window.addEventListener('mouseup', () => {
        if (draggedNode) {
            draggedNode = null;
            canvas.style.cursor = hoveredNode ? 'grab' : 'default';
            renderGraph();
        }
    });

    // Touch support for mobile / touchscreens
    canvas.addEventListener('touchstart', (e) => {
        if (state.isRunning) return;
        const pos = getCoords(e);
        const node = findNodeAt(pos.x, pos.y, 32);
        if (node) {
            draggedNode = node;
            renderGraph();
            e.preventDefault();
        }
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        if (draggedNode) {
            const pos = getCoords(e);
            const pad = 30;
            draggedNode.x = Math.max(pad, Math.min(pos.w - pad, pos.x));
            draggedNode.y = Math.max(pad, Math.min(pos.h - pad, pos.y));
            renderGraph();
            e.preventDefault();
        }
    }, { passive: false });

    canvas.addEventListener('touchend', () => {
        if (draggedNode) {
            draggedNode = null;
            renderGraph();
        }
    });
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

// ===== Live Code Execution Tracker =====

function highlightCodeLine(lineNums, stateClass = 'active-examining') {
    document.querySelectorAll('.code-line').forEach(el => {
        el.className = 'code-line';
    });

    const lines = Array.isArray(lineNums) ? lineNums : [lineNums];
    lines.forEach(n => {
        const el = document.querySelector(`.code-line[data-line="${n}"]`);
        if (el) {
            el.classList.add(stateClass);
        }
    });
}

function clearCodeHighlights() {
    document.querySelectorAll('.code-line').forEach(el => {
        el.className = 'code-line';
    });
}

function updateLiveVars({ edge = 'Idle', cost = '—', cycle = '—', badgeState = '' }) {
    if (dom.varEdge) dom.varEdge.innerHTML = `<span>Edge:</span> <strong>${escapeHtml(edge)}</strong>`;
    if (dom.varCost) dom.varCost.innerHTML = `<span>Cost:</span> <strong>${escapeHtml(String(cost))}</strong>`;
    if (dom.varCycle) {
        dom.varCycle.innerHTML = `<span>Cycle:</span> <strong>${escapeHtml(cycle)}</strong>`;
        dom.varCycle.className = `var-badge ${badgeState ? 'highlight-' + badgeState : ''}`;
    }
}

function updateLiveStepStatus(msg, pulseState = '') {
    if (dom.statusStepMsg) dom.statusStepMsg.textContent = msg;
    if (dom.statusPulseDot) {
        dom.statusPulseDot.className = `status-pulse-dot ${pulseState ? 'pulse-' + pulseState : ''}`;
    }
}

function initTabs() {
    if (dom.tabCode && dom.tabTrace) {
        dom.tabCode.addEventListener('click', () => {
            dom.tabCode.classList.add('active');
            dom.tabTrace.classList.remove('active');
            if (dom.codeTrackerView) dom.codeTrackerView.classList.remove('hidden');
            if (dom.traceView) dom.traceView.classList.add('hidden');
        });

        dom.tabTrace.addEventListener('click', () => {
            dom.tabTrace.classList.add('active');
            dom.tabCode.classList.remove('active');
            if (dom.traceView) dom.traceView.classList.remove('hidden');
            if (dom.codeTrackerView) dom.codeTrackerView.classList.add('hidden');
        });
    }
}

// ===== Kruskal's Algorithm (Animated with Live Code Tracking) =====

async function runKruskal() {
    if (state.isRunning) return;
    if (state.locations.length < 2) return;
    if (state.links.length === 0) return;

    state.isRunning = true;
    state.mstLinks = [];
    state.totalCost = 0;
    dom.btnRun.disabled = true;

    // Reset link states
    state.links.forEach(l => l.state = 'default');
    renderGraph();

    clearTraceLog();
    clearResultSummary();

    const n = state.locations.length;
    const sortedLinks = [...state.links].sort((a, b) => a.cost - b.cost);
    const ds = new DisjointSet(n);

    // Live Code: Init & Sort
    highlightCodeLine([1, 2], 'active-sorting');
    updateLiveVars({ edge: 'MAKE-SET', cost: '—', cycle: 'Initialized' });
    updateLiveStepStatus(`MAKE-SET: Initialized ${n} disjoint sets for all emergency stations.`, 'examining');
    await sleep(getAnimDelay() * 0.4);

    highlightCodeLine(3, 'active-sorting');
    updateLiveVars({ edge: `Sorted ${sortedLinks.length} links`, cost: 'E log E', cycle: 'Ascending' });
    updateLiveStepStatus(`SORT: Sorted all ${sortedLinks.length} candidate communication links by weight in non-decreasing order.`, 'examining');
    addTraceEntry('—', `Sorted ${sortedLinks.length} links by cost`, 'sorting');
    await sleep(getAnimDelay());

    let step = 0;
    for (const link of sortedLinks) {
        step++;

        // Highlight examining
        link.state = 'examining';
        renderGraph();
        const fromName = state.locations[link.src].name;
        const toName = state.locations[link.dest].name;

        highlightCodeLine([4, 5, 6], 'active-examining');
        updateLiveVars({
            edge: `${fromName} ↔ ${toName}`,
            cost: link.cost,
            cycle: 'Testing FIND()',
            badgeState: 'active'
        });
        updateLiveStepStatus(`Testing edge (${fromName} — ${toName}, cost ${link.cost}). Checking if endpoints belong to different components...`, 'examining');
        addTraceEntry(step, `Examining <strong>${fromName} — ${toName}</strong> (cost ${link.cost})`, 'sorting');
        await sleep(getAnimDelay());

        if (ds.union(link.src, link.dest)) {
            // Accepted
            link.state = 'accepted';
            state.mstLinks.push(link);
            state.totalCost += link.cost;

            highlightCodeLine([7, 8, 9], 'active-accepted');
            updateLiveVars({
                edge: `${fromName} ↔ ${toName}`,
                cost: link.cost,
                cycle: 'No (Accepted ✓)',
                badgeState: 'accept'
            });
            updateLiveStepStatus(`Accept! rootU ≠ rootV (different components). UNION performed. Added to MST (${state.mstLinks.length}/${n - 1} edges, Cost: ${state.totalCost}).`, 'accepted');
            addTraceEntry('✓', `<strong>Accept</strong> ${fromName} — ${toName} (different components)`, 'accepted');
        } else {
            // Rejected
            link.state = 'rejected';

            highlightCodeLine([11, 12], 'active-rejected');
            updateLiveVars({
                edge: `${fromName} ↔ ${toName}`,
                cost: link.cost,
                cycle: 'YES (Cycle ✗)',
                badgeState: 'reject'
            });
            updateLiveStepStatus(`Reject! rootU == rootV. ${fromName} and ${toName} are already in the same component. Discarding cycle!`, 'rejected');
            addTraceEntry('✗', `<strong>Reject</strong> ${fromName} — ${toName} (would form cycle)`, 'rejected');
        }

        renderGraph();
        await sleep(getAnimDelay() * 0.6);

        // Check if MST is complete
        if (state.mstLinks.length === n - 1) {
            highlightCodeLine(10, 'active-accepted');
            updateLiveVars({
                edge: 'MST Complete',
                cost: state.totalCost,
                cycle: 'Optimal MST ✓',
                badgeState: 'accept'
            });
            updateLiveStepStatus(`Tree complete! Exactly ${n - 1} edges selected connecting all ${n} emergency stations with minimum total cost ${state.totalCost}.`, 'accepted');
            addTraceEntry('★', `MST complete — <strong>${n - 1} edges</strong> selected`, 'complete');
            await sleep(getAnimDelay() * 0.5);
            break;
        }
    }

    if (state.mstLinks.length < n - 1) {
        highlightCodeLine(13, 'active-rejected');
        updateLiveVars({
            edge: 'Forest',
            cost: state.totalCost,
            cycle: 'Disconnected',
            badgeState: 'reject'
        });
        updateLiveStepStatus(`Finished: Network is disconnected. Only ${state.mstLinks.length} of ${n - 1} edges could be connected.`, 'rejected');
        addTraceEntry('!', `Network is <strong>disconnected</strong> — only ${state.mstLinks.length} of ${n - 1} edges selected`, 'rejected');
    } else {
        highlightCodeLine(13, 'active-accepted');
    }

    showResults();
    state.isRunning = false;
    dom.btnRun.disabled = false;
}

// ===== Trace Log =====

function clearTraceLog() {
    dom.traceLog.innerHTML = '';
}

function addTraceEntry(step, html, type) {
    const entry = document.createElement('div');
    entry.className = `trace-entry ${type}`;
    entry.innerHTML = `
        <span class="trace-step">${step}</span>
        <span class="trace-text">${html}</span>
    `;
    dom.traceLog.appendChild(entry);
    dom.traceLog.scrollTop = dom.traceLog.scrollHeight;
}

// ===== Results =====

function clearResultSummary() {
    dom.resultSummary.innerHTML = '<div class="result-placeholder">Results will appear after running the algorithm.</div>';
}

function clearResults() {
    clearTraceLog();
    dom.traceLog.innerHTML = '<div class="trace-placeholder">Run the algorithm to see the step-by-step trace.</div>';
    clearResultSummary();
    clearCodeHighlights();
    updateLiveVars({ edge: 'Idle', cost: '—', cycle: '—' });
    updateLiveStepStatus('Ready. Click "Run Kruskal\'s Algorithm" to watch code execute live.', '');
    state.mstLinks = [];
    state.totalCost = 0;

    // Reset link states
    state.links.forEach(l => l.state = 'default');
    renderGraph();
}

function showResults() {
    const n = state.locations.length;
    const isConnected = state.mstLinks.length === n - 1;

    let html = `
        <div class="result-card">
            <div class="result-row">
                <span class="result-label">Vertices (Locations)</span>
                <span class="result-value">${n}</span>
            </div>
            <div class="result-row">
                <span class="result-label">Candidate Links</span>
                <span class="result-value">${state.links.length}</span>
            </div>
            <div class="result-row">
                <span class="result-label">MST Edges Selected</span>
                <span class="result-value">${state.mstLinks.length}</span>
            </div>
            <div class="result-row">
                <span class="result-label">Minimum Total Cost</span>
                <span class="result-value result-total">${state.totalCost}</span>
            </div>
        </div>
        <div class="result-status ${isConnected ? 'connected' : 'disconnected'}">
            <span class="status-dot"></span>
            ${isConnected ? 'All locations are connected' : 'Network is disconnected — spanning forest produced'}
        </div>
    `;

    if (state.mstLinks.length > 0) {
        html += `
            <div class="mst-edge-list">
                <div class="mst-edge-header">Selected Edges</div>
                ${state.mstLinks.map((link, i) => `
                    <div class="mst-edge-item">
                        <span class="mst-edge-num">${i + 1}.</span>
                        <span class="mst-edge-from">${escapeHtml(state.locations[link.src].name)}</span>
                        <span class="mst-edge-arrow">→</span>
                        <span class="mst-edge-to">${escapeHtml(state.locations[link.dest].name)}</span>
                        <span class="mst-edge-cost">${link.cost}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    dom.resultSummary.innerHTML = html;
}

// ===== Sample Data =====

function loadSampleData() {
    if (state.isRunning) return;

    resetAll();

    const sampleLocations = [
        'ControlRoom', 'Hospital', 'FireStation', 'PoliceHQ',
        'ReliefCamp', 'PowerGrid', 'Airport'
    ];

    sampleLocations.forEach((name, i) => {
        state.locations.push(new Location(i, name));
    });

    const sampleLinks = [
        [0, 1, 4], [0, 2, 8], [1, 2, 2], [1, 3, 6], [2, 3, 3],
        [2, 4, 7], [3, 4, 5], [3, 5, 9], [4, 5, 4], [4, 6, 10], [5, 6, 2]
    ];

    sampleLinks.forEach(([s, d, c]) => {
        state.links.push(new Link(s, d, c));
    });

    positionLocations();
    renderLocationList();
    renderLinkList();
    updateDropdowns();
    renderGraph();
    dom.canvasOverlay.classList.add('hidden');
}

function resetAll() {
    if (state.isRunning) return;

    state.locations = [];
    state.links = [];
    state.mstLinks = [];
    state.totalCost = 0;
    state.currentStep = -1;

    renderLocationList();
    renderLinkList();
    updateDropdowns();
    renderGraph();
    clearResults();

    dom.traceLog.innerHTML = '<div class="trace-placeholder">Run the algorithm to see the step-by-step trace.</div>';
    dom.canvasOverlay.classList.remove('hidden');
}

// ===== Hero Background Animation =====

function initHeroCanvas() {
    const canvas = dom.heroCanvas;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    function resize() {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
        ctx.scale(dpr, dpr);
        canvas._w = rect.width;
        canvas._h = rect.height;
    }

    resize();

    // Create random nodes
    const nodeCount = 18;
    const nodes = [];
    for (let i = 0; i < nodeCount; i++) {
        nodes.push({
            x: Math.random() * canvas._w,
            y: Math.random() * canvas._h,
            vx: (Math.random() - 0.5) * 0.4,
            vy: (Math.random() - 0.5) * 0.4,
            r: 3 + Math.random() * 3,
        });
    }

    // Create edges between close nodes
    function getEdges() {
        const edges = [];
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const dx = nodes[i].x - nodes[j].x;
                const dy = nodes[i].y - nodes[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 180) {
                    edges.push({ i, j, dist });
                }
            }
        }
        return edges;
    }

    function animate() {
        ctx.clearRect(0, 0, canvas._w, canvas._h);

        // Update node positions
        nodes.forEach(n => {
            n.x += n.vx;
            n.y += n.vy;
            if (n.x < 0 || n.x > canvas._w) n.vx *= -1;
            if (n.y < 0 || n.y > canvas._h) n.vy *= -1;
        });

        // Draw edges
        const edges = getEdges();
        edges.forEach(e => {
            const alpha = 1 - e.dist / 180;
            ctx.beginPath();
            ctx.moveTo(nodes[e.i].x, nodes[e.i].y);
            ctx.lineTo(nodes[e.j].x, nodes[e.j].y);
            ctx.strokeStyle = `rgba(99, 102, 241, ${alpha * 0.2})`;
            ctx.lineWidth = 1;
            ctx.stroke();
        });

        // Draw nodes
        nodes.forEach(n => {
            ctx.beginPath();
            ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(99, 102, 241, 0.4)';
            ctx.fill();

            // Glow
            const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 3);
            g.addColorStop(0, 'rgba(99, 102, 241, 0.08)');
            g.addColorStop(1, 'rgba(99, 102, 241, 0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(n.x, n.y, n.r * 3, 0, Math.PI * 2);
            ctx.fill();
        });

        requestAnimationFrame(animate);
    }

    animate();

    window.addEventListener('resize', () => {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        resize();
    });
}

// ===== Scroll Animations =====

function initScrollAnimations() {
    const observer = new IntersectionObserver(
        entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        },
        { threshold: 0.1 }
    );

    document.querySelectorAll('.algo-step, .ds-card, .about-card').forEach(el => {
        observer.observe(el);
    });
}

// ===== Active Nav Link =====

function initNavTracking() {
    const sections = ['hero', 'visualizer', 'algorithm', 'about'];
    const links = document.querySelectorAll('.nav-link');

    window.addEventListener('scroll', () => {
        // Navbar scrolled state
        dom.navbar.classList.toggle('scrolled', window.scrollY > 50);

        // Active section
        let current = 'hero';
        sections.forEach(id => {
            const el = document.getElementById(id);
            if (el && el.getBoundingClientRect().top <= 200) {
                current = id;
            }
        });

        links.forEach(link => {
            link.classList.toggle('active', link.dataset.section === current);
        });
    });
}

// ===== Keyboard Shortcuts =====

function initKeyboard() {
    dom.locationName.addEventListener('keydown', e => {
        if (e.key === 'Enter') addLocation(dom.locationName.value);
    });

    dom.linkCost.addEventListener('keydown', e => {
        if (e.key === 'Enter') addLink(dom.linkFrom.value, dom.linkTo.value, dom.linkCost.value);
    });
}

// ===== Shake animation CSS injection =====
function injectShakeStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            20% { transform: translateX(-6px); }
            40% { transform: translateX(6px); }
            60% { transform: translateX(-4px); }
            80% { transform: translateX(4px); }
        }
        .shake { animation: shake 0.4s ease; }
    `;
    document.head.appendChild(style);
}

// ===== Event Listeners & Init =====

function init() {
    injectShakeStyles();

    // Resize canvas
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Buttons
    dom.btnAddLocation.addEventListener('click', () => addLocation(dom.locationName.value));
    dom.btnAddLink.addEventListener('click', () => addLink(dom.linkFrom.value, dom.linkTo.value, dom.linkCost.value));
    dom.btnRun.addEventListener('click', runKruskal);
    dom.btnSample.addEventListener('click', loadSampleData);
    dom.btnSampleOverlay.addEventListener('click', loadSampleData);
    dom.btnReset.addEventListener('click', resetAll);
    if (dom.btnAutoLayout) {
        dom.btnAutoLayout.addEventListener('click', () => {
            positionLocations();
            renderGraph();
        });
    }

    // Init modules
    initTabs();
    setupCanvasInteraction();
    initHeroCanvas();
    initScrollAnimations();
    initNavTracking();
    initKeyboard();
}

document.addEventListener('DOMContentLoaded', init);
