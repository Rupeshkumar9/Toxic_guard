/**
 * app.js — Main application controller
 *
 * Fetches data from Django API, wires up UI, manages state.
 */

const App = (() => {
    let allUsers = [];
    let selectedUserId = null;
    let currentFilter = 'all';
    let currentPlatform = 'reddit';

    // ===== INIT =====
    async function init() {
        Timeline.init();
        setupEventListeners();
        await loadDatasetsList();
        await loadData();
    }

    async function loadDatasetsList() {
        try {
            const res = await fetch('/api/datasets/');
            if (res.ok) {
                const data = await res.json();
                const platformSelect = document.getElementById('platform-select');
                
                if (data.datasets && data.datasets.length > 0) {
                    platformSelect.innerHTML = '';
                    let foundCurrent = false;
                    
                    data.datasets.forEach(ds => {
                        const opt = document.createElement('option');
                        opt.value = ds.id;
                        opt.textContent = ds.name;
                        opt.style.color = 'black';
                        platformSelect.appendChild(opt);
                        if (ds.id === currentPlatform) foundCurrent = true;
                    });
                    
                    if (!foundCurrent) {
                        currentPlatform = data.datasets[0].id;
                    }
                    platformSelect.value = currentPlatform;
                    platformSelect.disabled = false;
                    document.getElementById('btn-refresh').disabled = false;
                    return true;
                } else {
                    platformSelect.innerHTML = '<option value="">No datasets available</option>';
                    platformSelect.disabled = true;
                    document.getElementById('btn-refresh').disabled = true;
                    currentPlatform = null;
                    return false;
                }
            }
        } catch (err) {
            console.error('Failed to load datasets list:', err);
        }
        return false;
    }

    function setupEventListeners() {
        document.getElementById('platform-select').addEventListener('change', async (e) => {
            currentPlatform = e.target.value;
            // Clear current view
            selectedUserId = null;
            document.getElementById('chart-area').style.display = 'none';
            document.getElementById('comment-list').style.display = 'none';
            document.getElementById('timeline-content').innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">📈</span>
                    <p>Click on a user from the left panel to view their behavioral timeline</p>
                </div>`;
            document.getElementById('timeline-title').textContent = 'Select a User';
            document.getElementById('user-meta').style.display = 'none';
            
            await loadData();
        });

        document.getElementById('csv-upload').addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const statusEl = document.getElementById('upload-status');
            statusEl.textContent = 'Uploading...';
            statusEl.style.display = 'inline';
            statusEl.style.color = 'var(--accent-cyan)';
            
            const formData = new FormData();
            formData.append('file', file);
            
            try {
                const res = await fetch('/api/upload-csv/', {
                    method: 'POST',
                    body: formData
                });
                
                if (res.ok) {
                    const data = await res.json();
                    statusEl.textContent = 'Processing Data...';
                    currentPlatform = data.platform_id;
                    
                    await loadDatasetsList();
                    
                    // Clear current view
                    selectedUserId = null;
                    document.getElementById('chart-area').style.display = 'none';
                    document.getElementById('comment-list').style.display = 'none';
                    document.getElementById('timeline-content').innerHTML = `
                        <div class="empty-state">
                            <span class="empty-icon">📈</span>
                            <p>Click on a user from the left panel to view their behavioral timeline</p>
                        </div>`;
                    document.getElementById('timeline-title').textContent = 'Select a User';
                    document.getElementById('user-meta').style.display = 'none';
                    
                    await loadData();
                    statusEl.style.display = 'none';
                } else {
                    statusEl.textContent = errData.error || 'Upload failed';
                    statusEl.style.color = 'var(--risk-escalating)';
                }
            } catch (err) {
                console.error('Upload error', err);
                statusEl.textContent = 'Connection error';
                statusEl.style.color = 'var(--risk-escalating)';
            }
            
            // Reset input so the same file can be selected again if needed
            e.target.value = '';
        });

        document.getElementById('risk-filter').addEventListener('change', (e) => {
            currentFilter = e.target.value;
            renderUserList();
        });

        document.getElementById('btn-refresh').addEventListener('click', async () => {
            const btn = document.getElementById('btn-refresh');
            btn.textContent = '⏳ Analyzing...';
            btn.disabled = true;
            await fetch('/api/analyze/?platform=' + currentPlatform, { method: 'POST' });
            await loadData();
            btn.textContent = '🔄 Re-Analyze';
            btn.disabled = false;
        });
    }

    // ===== DATA LOADING =====
    async function loadData() {
        if (!currentPlatform) {
            document.getElementById('user-list').innerHTML = `
                <div class="empty-state" style="margin-top: 40px;">
                    <span class="empty-icon">📁</span>
                    <p style="margin-top: 10px;">No datasets found</p>
                    <p style="font-size: 0.85rem; color: var(--text-secondary);">Please upload a CSV file to begin sentiment analysis.</p>
                </div>`;
            document.getElementById('stats-row').innerHTML = '';
            document.getElementById('chart-area').style.display = 'none';
            document.getElementById('comment-list').style.display = 'none';
            return;
        }

        try {
            document.getElementById('user-list').innerHTML = '<div class="loading-spinner">Loading users...</div>';
            
            const [usersRes, statsRes] = await Promise.all([
                fetch('/api/users/?platform=' + currentPlatform),
                fetch('/api/platform-stats/?platform=' + currentPlatform),
            ]);

            const usersData = await usersRes.json();
            const statsData = await statsRes.json();

            allUsers = usersData.users;
            updateStats(statsData);
            renderUserList();
            renderAlerts(statsData.alerts);
            Charts.drawDistribution(statsData.risk_distribution);
        } catch (err) {
            console.error('Failed to load data:', err);
        }
    }

    // ===== STATS =====
    function updateStats(stats) {
        document.getElementById('val-total-users').textContent = stats.total_users;

        const flagged = (stats.risk_distribution.warning || 0) +
            (stats.risk_distribution.escalating || 0);
        document.getElementById('val-flagged').textContent = flagged;
        document.getElementById('val-escalating').textContent =
            stats.risk_distribution.escalating || 0;
        document.getElementById('val-avg-toxicity').textContent =
            (stats.avg_platform_toxicity * 100).toFixed(1) + '%';
        document.getElementById('val-total-comments').textContent =
            stats.total_comments_analyzed.toLocaleString();
    }

    // ===== USER LIST =====
    function renderUserList() {
        const container = document.getElementById('user-list');
        let filtered = allUsers;

        if (currentFilter !== 'all') {
            filtered = allUsers.filter(u => u.risk_level === currentFilter);
        }

        if (filtered.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No users match this filter</p></div>';
            return;
        }

        container.innerHTML = filtered.map(user => `
            <div class="user-item ${user.id === selectedUserId ? 'active' : ''}"
                 data-user-id="${user.id}"
                 onclick="App.selectUser(${user.id})">
                <div class="user-avatar" style="background:${user.avatar_color}">
                    ${user.display_name.charAt(0)}
                </div>
                <div class="user-details">
                    <div class="user-name">${user.display_name}</div>
                    <div class="user-handle">${user.username}</div>
                </div>
                <span class="risk-badge ${user.risk_level}">${getRiskEmoji(user.risk_level)} ${user.risk_level}</span>
            </div>
        `).join('');
    }

    function getRiskEmoji(level) {
        switch (level) {
            case 'escalating': return '🔴';
            case 'warning': return '🟠';
            case 'drifting': return '🟡';
            default: return '🟢';
        }
    }

    // ===== ALERTS =====
    function renderAlerts(alerts) {
        const container = document.getElementById('alerts-list');

        if (!alerts || alerts.length === 0) {
            container.innerHTML = '<div class="empty-state"><span class="empty-icon">✅</span><p>No active alerts</p></div>';
            return;
        }

        container.innerHTML = alerts.map(alert => `
            <div class="alert-item ${alert.risk_level === 'warning' ? 'warning-alert' : ''}"
                 onclick="App.selectUser(${alert.user_id})">
                <div class="alert-avatar" style="background:${alert.avatar_color}">
                    ${alert.display_name.charAt(0)}
                </div>
                <div class="alert-info">
                    <div class="alert-name">${alert.display_name}</div>
                    <div class="alert-detail">
                        ${alert.risk_level === 'escalating' ? '🔴 Escalating' : '🟠 Warning'} ·
                        Trend: ${getTrendIcon(alert.trend)} ${alert.trend}
                    </div>
                    <div class="alert-detail">
                        Risk: <span class="alert-prob ${alert.escalation_probability > 0.5 ? 'high' : 'medium'}">
                            ${(alert.escalation_probability * 100).toFixed(0)}%
                        </span> ·
                        Recent toxicity: ${(alert.recent_toxicity * 100).toFixed(0)}%
                    </div>
                </div>
            </div>
        `).join('');
    }

    function getTrendIcon(trend) {
        switch (trend) {
            case 'declining': return '📉';
            case 'improving': return '📈';
            default: return '➡️';
        }
    }

    // ===== SELECT USER =====
    async function selectUser(userId) {
        selectedUserId = userId;
        renderUserList();

        // Update title
        const user = allUsers.find(u => u.id === userId);
        if (user) {
            document.getElementById('timeline-title').textContent = user.display_name;

            // Show meta badges
            const meta = document.getElementById('user-meta');
            meta.style.display = 'flex';
            document.getElementById('meta-archetype').textContent =
                user.archetype.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
            document.getElementById('meta-risk').textContent =
                `${getRiskEmoji(user.risk_level)} ${user.risk_level}`;
            document.getElementById('meta-risk').style.color = getRiskColor(user.risk_level);
            document.getElementById('meta-trend').textContent =
                `${getTrendIcon(user.trend)} ${user.trend}`;
        }

        // Fetch timeline
        try {
            const res = await fetch(`/api/users/${userId}/timeline/?platform=${currentPlatform}`);
            const data = await res.json();

            // Show chart area
            document.getElementById('chart-area').style.display = 'block';
            document.getElementById('comment-list').style.display = 'flex';

            // Clear empty state
            const content = document.getElementById('timeline-content');
            content.innerHTML = `
                <div class="stats-grid-mini">
                    <div class="mini-stat">
                        <span class="mini-label">Drift</span>
                        <span class="mini-value" style="color:${getDriftColor(data.drift.current_drift)}">${data.drift.current_drift.toFixed(2)}</span>
                    </div>
                    <div class="mini-stat">
                        <span class="mini-label">Escalation Risk</span>
                        <span class="mini-value" style="color:${data.drift.escalation_probability > 0.5 ? '#ff1744' : '#ffd740'}">${(data.drift.escalation_probability * 100).toFixed(0)}%</span>
                    </div>
                    <div class="mini-stat">
                        <span class="mini-label">Comments</span>
                        <span class="mini-value">${data.timeline.length}</span>
                    </div>
                    <div class="mini-stat">
                        <span class="mini-label">Trend</span>
                        <span class="mini-value">${getTrendIcon(data.drift.trend)} ${data.drift.trend}</span>
                    </div>
                </div>
            `;

            // Draw timeline chart
            Timeline.setData(data);

            // Render recent comments (last 30)
            renderComments(data.timeline);

        } catch (err) {
            console.error('Failed to load timeline:', err);
        }
    }

    function getRiskColor(level) {
        switch (level) {
            case 'escalating': return '#ff1744';
            case 'warning': return '#ff9100';
            case 'drifting': return '#ffd740';
            default: return '#00e676';
        }
    }

    function getDriftColor(drift) {
        if (drift > 2.0) return '#ff1744';
        if (drift > 1.0) return '#ff9100';
        if (drift > 0.5) return '#ffd740';
        return '#00e676';
    }

    function renderComments(timeline) {
        const container = document.getElementById('comments-scroll');
        document.getElementById('comment-count').textContent = `(${timeline.length} total)`;

        // Show last 30 comments in reverse
        const recent = timeline.slice(-30).reverse();

        container.innerHTML = recent.map((item, i) => `
            <div class="comment-item">
                <div class="comment-dot ${item.toxicity_level}"></div>
                <div class="comment-body">
                    <div class="comment-text">${escapeHtml(item.text)}</div>
                    <div class="comment-meta">
                        <span>Sentiment: ${item.compound.toFixed(3)}</span>
                        <span>Toxicity: ${(item.toxicity_score * 100).toFixed(0)}%</span>
                        <span>${new Date(item.timestamp).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ===== PUBLIC =====
    return { init, selectUser };
})();

// ===== BOOT =====
document.addEventListener('DOMContentLoaded', () => {
    // Inject mini-stat styles
    const style = document.createElement('style');
    style.textContent = `
        .stats-grid-mini {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            margin-bottom: 4px;
        }
        .mini-stat {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 8px;
            background: rgba(0,0,0,0.15);
            border-radius: 8px;
            border: 1px solid rgba(255,255,255,0.05);
        }
        .mini-label {
            font-size: 0.6rem;
            color: rgba(255,255,255,0.4);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
        }
        .mini-value {
            font-size: 1rem;
            font-weight: 700;
            font-family: 'JetBrains Mono', monospace;
            color: #00e5ff;
        }
    `;
    document.head.appendChild(style);

    App.init();
});
