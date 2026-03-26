/**
 * timeline.js — Sentiment timeline visualization
 *
 * Draws user behavior trajectory on a canvas with color-coded zones
 * and hover tooltips.
 */

const Timeline = (() => {
    let canvas, ctx;
    let timelineData = null;
    let hoveredIndex = -1;

    const COLORS = {
        safe: '#00e676',
        mild: '#ffd740',
        moderate: '#ff9100',
        severe: '#ff1744',
        line: '#00e5ff',
        lineGlow: 'rgba(0, 229, 255, 0.2)',
        grid: 'rgba(255, 255, 255, 0.04)',
        text: 'rgba(255, 255, 255, 0.3)',
        bg: 'rgba(0, 0, 0, 0.15)',
        driftLine: '#b388ff',
    };

    function init() {
        canvas = document.getElementById('timeline-canvas');
        ctx = canvas.getContext('2d');
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseleave', () => {
            hoveredIndex = -1;
            document.getElementById('tooltip').style.display = 'none';
        });
    }

    function handleMouseMove(e) {
        if (!timelineData || !timelineData.timeline.length) return;

        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const scaleX = canvas.width / rect.width;
        const canvasX = mx * scaleX;

        const padding = { left: 40, right: 20, top: 20, bottom: 30 };
        const drawW = canvas.width - padding.left - padding.right;
        const n = timelineData.timeline.length;
        const stepX = drawW / Math.max(1, n - 1);

        let closest = -1;
        let closestDist = Infinity;

        for (let i = 0; i < n; i++) {
            const x = padding.left + i * stepX;
            const dist = Math.abs(canvasX - x);
            if (dist < closestDist && dist < stepX) {
                closestDist = dist;
                closest = i;
            }
        }

        if (closest !== hoveredIndex) {
            hoveredIndex = closest;
            if (closest >= 0) {
                const item = timelineData.timeline[closest];
                const tooltip = document.getElementById('tooltip');
                tooltip.innerHTML = `
                    <div style="margin-bottom:4px;font-weight:600;">Comment #${closest + 1}</div>
                    <div style="margin-bottom:6px;font-size:0.7rem;opacity:0.6;">${new Date(item.timestamp).toLocaleString()}</div>
                    <div style="margin-bottom:6px;">"${item.text.substring(0, 100)}${item.text.length > 100 ? '...' : ''}"</div>
                    <div style="display:flex;gap:12px;font-family:'JetBrains Mono',monospace;font-size:0.7rem;">
                        <span>Sentiment: <b style="color:${item.compound >= 0 ? '#00e676' : '#ff1744'}">${item.compound.toFixed(3)}</b></span>
                        <span>Toxicity: <b style="color:${getToxColor(item.toxicity_score)}">${(item.toxicity_score * 100).toFixed(0)}%</b></span>
                    </div>
                `;
                tooltip.style.display = 'block';
                tooltip.style.left = (e.clientX + 15) + 'px';
                tooltip.style.top = (e.clientY - 10) + 'px';
            } else {
                document.getElementById('tooltip').style.display = 'none';
            }
            render();
        }
    }

    function getToxColor(score) {
        if (score >= 0.65) return COLORS.severe;
        if (score >= 0.4) return COLORS.moderate;
        if (score >= 0.2) return COLORS.mild;
        return COLORS.safe;
    }

    function setData(data) {
        timelineData = data;
        render();
    }

    function render() {
        if (!canvas || !ctx || !timelineData) return;

        const parent = canvas.parentElement;
        canvas.width = parent.clientWidth;
        canvas.height = 220;

        const w = canvas.width;
        const h = canvas.height;
        const padding = { left: 40, right: 20, top: 20, bottom: 30 };
        const drawW = w - padding.left - padding.right;
        const drawH = h - padding.top - padding.bottom;

        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = COLORS.bg;
        ctx.fillRect(0, 0, w, h);

        const timeline = timelineData.timeline;
        const n = timeline.length;
        if (n === 0) return;

        const stepX = drawW / Math.max(1, n - 1);

        // Y-axis: compound sentiment [-1, 1]
        const mapY = (val) => padding.top + (1 - (val + 1) / 2) * drawH;

        // Draw risk zones
        drawZones(padding, drawW, drawH, mapY);

        // Grid lines
        ctx.strokeStyle = COLORS.grid;
        ctx.lineWidth = 1;
        for (let v = -1; v <= 1; v += 0.5) {
            const y = mapY(v);
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(w - padding.right, y);
            ctx.stroke();
        }

        // Zero line
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        const zeroY = mapY(0);
        ctx.beginPath();
        ctx.moveTo(padding.left, zeroY);
        ctx.lineTo(w - padding.right, zeroY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw sentiment line
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
            const x = padding.left + i * stepX;
            const y = mapY(timeline[i].compound);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = COLORS.line;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Area fill under line
        ctx.lineTo(padding.left + (n - 1) * stepX, mapY(-1));
        ctx.lineTo(padding.left, mapY(-1));
        ctx.closePath();
        ctx.fillStyle = COLORS.lineGlow;
        ctx.fill();

        // Draw dots at each point
        for (let i = 0; i < n; i++) {
            const x = padding.left + i * stepX;
            const y = mapY(timeline[i].compound);
            const r = i === hoveredIndex ? 5 : 2;
            const color = getToxColor(timeline[i].toxicity_score);

            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();

            if (i === hoveredIndex) {
                ctx.beginPath();
                ctx.arc(x, y, 10, 0, Math.PI * 2);
                ctx.fillStyle = color.replace(')', ', 0.2)').replace('#', 'rgba(').replace(
                    /([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i,
                    (_, r, g, b) => `${parseInt(r, 16)}, ${parseInt(g, 16)}, ${parseInt(b, 16)}`
                );
                ctx.fillStyle = `rgba(0, 229, 255, 0.15)`;
                ctx.fill();

                // Crosshair
                ctx.strokeStyle = 'rgba(255,255,255,0.15)';
                ctx.lineWidth = 1;
                ctx.setLineDash([3, 3]);
                ctx.beginPath();
                ctx.moveTo(x, padding.top);
                ctx.lineTo(x, h - padding.bottom);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }

        // Draw drift line if available
        if (timelineData.drift && timelineData.drift.windows.length > 1) {
            const windows = timelineData.drift.windows;
            ctx.beginPath();
            for (let i = 0; i < windows.length; i++) {
                const x = padding.left + ((windows[i].start + windows[i].end) / 2) * stepX;
                const y = mapY(windows[i].mean_sentiment);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.strokeStyle = COLORS.driftLine;
            ctx.lineWidth = 2.5;
            ctx.setLineDash([8, 4]);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Y-axis labels
        ctx.font = "11px 'JetBrains Mono', monospace";
        ctx.fillStyle = COLORS.text;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText('+1', padding.left - 8, mapY(1));
        ctx.fillText('0', padding.left - 8, mapY(0));
        ctx.fillText('-1', padding.left - 8, mapY(-1));

        // X-axis labels
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const labelStep = Math.max(1, Math.floor(n / 6));
        for (let i = 0; i < n; i += labelStep) {
            const x = padding.left + i * stepX;
            ctx.fillText(`#${i + 1}`, x, h - padding.bottom + 6);
        }

        // Legend
        ctx.textAlign = 'right';
        ctx.fillStyle = COLORS.line;
        ctx.fillText('— Sentiment', w - padding.right, padding.top - 6);
        ctx.fillStyle = COLORS.driftLine;
        ctx.fillText('--- Drift Avg', w - padding.right - 100, padding.top - 6);
    }

    function drawZones(padding, drawW, drawH, mapY) {
        // Danger zone (below -0.3)
        const dangerTop = mapY(-0.3);
        const dangerBottom = mapY(-1);
        const dangerGrad = ctx.createLinearGradient(0, dangerTop, 0, dangerBottom);
        dangerGrad.addColorStop(0, 'rgba(255, 23, 68, 0.02)');
        dangerGrad.addColorStop(1, 'rgba(255, 23, 68, 0.08)');
        ctx.fillStyle = dangerGrad;
        ctx.fillRect(padding.left, dangerTop, drawW, dangerBottom - dangerTop);

        // Warning zone (-0.3 to 0)
        const warnTop = mapY(0);
        ctx.fillStyle = 'rgba(255, 145, 0, 0.02)';
        ctx.fillRect(padding.left, warnTop, drawW, dangerTop - warnTop);

        // Safe zone (above 0.3)
        const safeTop = mapY(1);
        const safeBottom = mapY(0.3);
        ctx.fillStyle = 'rgba(0, 230, 118, 0.02)';
        ctx.fillRect(padding.left, safeTop, drawW, safeBottom - safeTop);
    }

    return { init, setData, render };
})();
