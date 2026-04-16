/**
 * Badge Builder Service
 * Generates trust badges in multiple formats (JSON, SVG, HTML widget)
 */

const queries = require('../models/queries');
const { computeBagsScore } = require('./bagsReputation');
const { getCache, setCache } = require('../models/redis');
const config = require('../config');
const { escapeHtml } = require('../utils/transform');

/**
 * Get badge data as JSON with caching
 * @param {string} pubkey - Agent public key
 * @returns {Promise<Object>} - Badge JSON data
 */
async function getBadgeJSON(pubkey) {
  try {
    // Check cache first
    const cacheKey = `badge:${pubkey}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Get agent from DB
    const agent = await queries.getAgent(pubkey);
    if (!agent) {
      throw new Error(`Agent not found: ${pubkey}`);
    }

    // Compute reputation score
    const reputation = await computeBagsScore(pubkey);

    // Get action stats
    const actions = await queries.getAgentActions(pubkey) || { total: 0, successful: 0, failed: 0 };
    const successRate = actions.total > 0 ? actions.successful / actions.total : 0;

    // Determine status and badge
    let status, badge, label;
    if (agent.status === 'flagged') {
      status = 'flagged';
      badge = '🔴';
      label = 'FLAGGED';
    } else if (agent.status === 'verified' && reputation.score >= 60) {
      status = 'verified';
      badge = '✅';
      label = 'VERIFIED AGENT';
    } else {
      status = 'unverified';
      badge = '⚠️';
      label = 'UNVERIFIED';
    }

    const widgetUrl = `${config.agentIdBaseUrl}/widget/${pubkey}`;

    const result = {
      pubkey,
      name: agent.name,
      status,
      badge,
      label,
      score: reputation.score,
      bags_score: reputation.score,
      saidTrustScore: reputation.saidScore || 0,
      saidLabel: reputation.label,
      registeredAt: agent.registered_at,
      lastVerified: agent.last_verified,
      totalActions: actions.total,
      successRate: successRate,
      capabilities: agent.capability_set || [],
      tokenMint: agent.token_mint,
      widgetUrl
    };

    // Cache the result
    await setCache(cacheKey, JSON.stringify(result), config.badgeCacheTtl);

    return result;
  } catch (error) {
    throw new Error(`Failed to generate badge JSON: ${error.message}`);
  }
}

/**
 * Get badge as SVG string
 * @param {string} pubkey - Agent public key
 * @returns {Promise<string>} - SVG badge string
 */
async function getBadgeSVG(pubkey) {
  try {
    const badgeData = await getBadgeJSON(pubkey);

    // Determine colors based on status
    let bgColor, accentColor, iconColor;
    if (badgeData.status === 'verified') {
      bgColor = '#1a2e1a';
      accentColor = '#22c55e';
      iconColor = '#22c55e';
    } else if (badgeData.status === 'flagged') {
      bgColor = '#2e1a1a';
      accentColor = '#ef4444';
      iconColor = '#ef4444';
    } else {
      bgColor = '#2e2a1a';
      accentColor = '#f59e0b';
      iconColor = '#f59e0b';
    }

    // Status icon SVG
    let statusIcon;
    if (badgeData.status === 'verified') {
      statusIcon = `<circle cx="24" cy="40" r="12" fill="${iconColor}"/><path d="M18 40l4 4 8-8" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    } else if (badgeData.status === 'flagged') {
      statusIcon = `<circle cx="24" cy="40" r="12" fill="${iconColor}"/><path d="M20 36l8 8M28 36l-8 8" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/>`;
    } else {
      statusIcon = `<circle cx="24" cy="40" r="12" fill="${iconColor}"/><path d="M24 34v8M24 46v2" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/>`;
    }

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="320" height="80" viewBox="0 0 320 80" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${bgColor};stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0f0f0f;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="320" height="80" rx="12" fill="url(#bg)" stroke="${accentColor}" stroke-width="2"/>
  
  <!-- Status Icon -->
  ${statusIcon}
  
  <!-- Agent Name -->
  <text x="48" y="32" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="600" fill="white">
    ${escapeXml(badgeData.name)}
  </text>
  
  <!-- Status Label -->
  <text x="48" y="52" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="${accentColor}" font-weight="500">
    ${badgeData.label}
  </text>
  
  <!-- Score -->
  <text x="280" y="36" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="700" fill="white" text-anchor="end">
    ${badgeData.score}
  </text>
  <text x="280" y="56" font-family="system-ui, -apple-system, sans-serif" font-size="10" fill="#888" text-anchor="end">
    TRUST SCORE
  </text>
  
  <!-- Score Bar -->
  <rect x="140" y="44" width="80" height="6" rx="3" fill="#333"/>
  <rect x="140" y="44" width="${Math.max(4, (badgeData.score / 100) * 80)}" height="6" rx="3" fill="${accentColor}"/>
</svg>`;

    return svg;
  } catch (error) {
    throw new Error(`Failed to generate badge SVG: ${error.message}`);
  }
}

/**
 * Get widget HTML for iframe embedding
 * @param {string} pubkey - Agent public key
 * @returns {Promise<string>} - Complete HTML page string
 */
async function getWidgetHTML(pubkey) {
  try {
    const badgeData = await getBadgeJSON(pubkey);

    // Determine theme colors
    let themeColor, accentColor, glowColor;
    if (badgeData.status === 'verified') {
      themeColor = '#22c55e';
      accentColor = '#16a34a';
      glowColor = 'rgba(34, 197, 94, 0.3)';
    } else if (badgeData.status === 'flagged') {
      themeColor = '#ef4444';
      accentColor = '#dc2626';
      glowColor = 'rgba(239, 68, 68, 0.3)';
    } else {
      themeColor = '#f59e0b';
      accentColor = '#d97706';
      glowColor = 'rgba(245, 158, 11, 0.3)';
    }

    // Format dates
    const registeredDate = badgeData.registeredAt 
      ? new Date(badgeData.registeredAt).toLocaleDateString() 
      : 'Unknown';
    const lastVerifiedDate = badgeData.lastVerified 
      ? new Date(badgeData.lastVerified).toLocaleDateString() 
      : 'Never';

    // Format success rate
    const successRatePercent = Math.round((badgeData.successRate || 0) * 100);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AgentID Badge - ${escapeHtml(badgeData.name)}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    
    .widget-container {
      background: rgba(20, 20, 30, 0.8);
      border: 1px solid ${themeColor}40;
      border-radius: 16px;
      padding: 24px;
      max-width: 400px;
      width: 100%;
      box-shadow: 0 0 40px ${glowColor}, inset 0 1px 0 rgba(255,255,255,0.05);
      backdrop-filter: blur(10px);
    }
    
    .header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    
    .status-icon {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: ${themeColor}20;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      border: 2px solid ${themeColor};
      box-shadow: 0 0 20px ${glowColor};
    }
    
    .agent-info h2 {
      color: #fff;
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 4px;
    }
    
    .agent-info .status-label {
      color: ${themeColor};
      font-size: 12px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .score-section {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(0,0,0,0.3);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 20px;
    }
    
    .score-value {
      text-align: center;
    }
    
    .score-number {
      font-size: 36px;
      font-weight: 700;
      color: ${themeColor};
      line-height: 1;
    }
    
    .score-label {
      font-size: 10px;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 4px;
    }
    
    .score-bar {
      flex: 1;
      margin: 0 16px;
    }
    
    .score-bar-bg {
      height: 8px;
      background: rgba(255,255,255,0.1);
      border-radius: 4px;
      overflow: hidden;
    }
    
    .score-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, ${accentColor}, ${themeColor});
      border-radius: 4px;
      transition: width 0.5s ease;
      width: ${badgeData.bags_score}%;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-bottom: 16px;
    }
    
    .stat-item {
      background: rgba(255,255,255,0.03);
      border-radius: 8px;
      padding: 12px;
      text-align: center;
    }
    
    .stat-value {
      color: #fff;
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 2px;
    }
    
    .stat-label {
      color: #888;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .capabilities {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 12px;
    }
    
    .capability-tag {
      background: ${themeColor}20;
      color: ${themeColor};
      font-size: 10px;
      padding: 4px 10px;
      border-radius: 12px;
      border: 1px solid ${themeColor}40;
    }
    
    .footer {
      text-align: center;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid rgba(255,255,255,0.05);
    }
    
    .footer-text {
      color: #666;
      font-size: 11px;
    }
    
    .footer-text a {
      color: ${themeColor};
      text-decoration: none;
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
    
    .live-indicator {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: ${themeColor};
      font-size: 10px;
      margin-top: 8px;
    }
    
    .live-dot {
      width: 6px;
      height: 6px;
      background: ${themeColor};
      border-radius: 50%;
      animation: pulse 2s infinite;
    }
  </style>
</head>
<body>
  <div class="widget-container">
    <div class="header">
      <div class="status-icon">${badgeData.badge}</div>
      <div class="agent-info">
        <h2>${escapeHtml(badgeData.name)}</h2>
        <div class="status-label">${badgeData.label}</div>
      </div>
    </div>
    
    <div class="score-section">
      <div class="score-value">
        <div class="score-number">${badgeData.score}</div>
        <div class="score-label">Trust Score</div>
      </div>
      <div class="score-bar">
        <div class="score-bar-bg">
          <div class="score-bar-fill"></div>
        </div>
      </div>
    </div>
    
    <div class="stats-grid">
      <div class="stat-item">
        <div class="stat-value">${badgeData.totalActions}</div>
        <div class="stat-label">Total Actions</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${successRatePercent}%</div>
        <div class="stat-label">Success Rate</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${registeredDate}</div>
        <div class="stat-label">Registered</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${lastVerifiedDate}</div>
        <div class="stat-label">Last Verified</div>
      </div>
    </div>
    
    ${badgeData.capabilities && badgeData.capabilities.length > 0 ? `
    <div class="capabilities">
      ${badgeData.capabilities.map(cap => `<span class="capability-tag">${escapeHtml(cap)}</span>`).join('')}
    </div>
    ` : ''}
    
    <div class="footer">
      <div class="footer-text">
        Verified by <a href="https://agentid.io" target="_blank">AgentID</a>
      </div>
      <div class="live-indicator">
        <span class="live-dot"></span>
        <span>Live Badge</span>
      </div>
    </div>
  </div>
  
  <script>
    // Auto-refresh every 60 seconds
    setInterval(() => {
      location.reload();
    }, 60000);
  </script>
</body>
</html>`;

    return html;
  } catch (error) {
    throw new Error(`Failed to generate widget HTML: ${error.message}`);
  }
}

/**
 * Escape XML special characters
 * @param {string} text - Input text
 * @returns {string} - Escaped text
 */
function escapeXml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

module.exports = {
  getBadgeJSON,
  getBadgeSVG,
  getWidgetHTML
};
