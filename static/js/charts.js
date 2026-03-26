/**
 * charts.js — Risk distribution donut chart
 */

const Charts = (() => {
    const RISK_COLORS = {
        normal: '#00e676',
        drifting: '#ffd740',
        warning: '#ff9100',
        escalating: '#ff1744',
    };

    function drawDistribution(distribution) {
        const canvas = document.getElementById('distribution-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = 180;
        const w = canvas.width;
        const h = canvas.height;

        ctx.clearRect(0, 0, w, h);

        const cx = w * 0.35;
        const cy = h / 2;
        const outerR = Math.min(cx, cy) - 15;
        const innerR = outerR * 0.55;

        const total = Object.values(distribution).reduce((a, b) => a + b, 0);
        if (total === 0) return;

        // Draw donut segments
        let startAngle = -Math.PI / 2;
        const entries = Object.entries(distribution);

        for (const [level, count] of entries) {
            const sliceAngle = (count / total) * Math.PI * 2;
            const endAngle = startAngle + sliceAngle;

            ctx.beginPath();
            ctx.arc(cx, cy, outerR, startAngle, endAngle);
            ctx.arc(cx, cy, innerR, endAngle, startAngle, true);
            ctx.closePath();
            ctx.fillStyle = RISK_COLORS[level] || '#888';
            ctx.fill();

            // Subtle glow
            ctx.shadowColor = RISK_COLORS[level] || '#888';
            ctx.shadowBlur = 8;
            ctx.fill();
            ctx.shadowBlur = 0;

            startAngle = endAngle;
        }

        // Inner circle (dark center)
        ctx.beginPath();
        ctx.arc(cx, cy, innerR - 2, 0, Math.PI * 2);
        ctx.fillStyle = '#0b0f1a';
        ctx.fill();

        // Center text
        ctx.font = "700 1.2rem 'JetBrains Mono', monospace";
        ctx.fillStyle = '#f0f4ff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(total, cx, cy - 6);
        ctx.font = "500 0.6rem 'Inter', sans-serif";
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fillText('USERS', cx, cy + 12);

        // Legend (right side)
        const legendX = w * 0.62;
        let legendY = 25;

        for (const [level, count] of entries) {
            const pct = ((count / total) * 100).toFixed(0);

            // Dot
            ctx.beginPath();
            ctx.arc(legendX, legendY + 6, 5, 0, Math.PI * 2);
            ctx.fillStyle = RISK_COLORS[level];
            ctx.fill();

            // Label
            ctx.font = "500 0.78rem 'Inter', sans-serif";
            ctx.fillStyle = '#f0f4ff';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            const label = level.charAt(0).toUpperCase() + level.slice(1);
            ctx.fillText(label, legendX + 14, legendY + 6);

            // Count + percentage
            ctx.font = "400 0.7rem 'JetBrains Mono', monospace";
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.fillText(`${count} (${pct}%)`, legendX + 14, legendY + 22);

            legendY += 40;
        }
    }

    return { drawDistribution };
})();
