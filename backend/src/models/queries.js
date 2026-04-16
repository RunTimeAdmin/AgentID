/**
 * Reusable database query functions
 * All functions use parameterized queries for safety
 */

const { query } = require('./db');

// ============================================================================
// Agent Identity Queries
// ============================================================================

/**
 * Create a new agent identity
 * @param {Object} params - Agent data
 * @returns {Promise<Object>} - Created agent row
 */
async function createAgent({ pubkey, name, description, tokenMint, bagsApiKeyId, capabilitySet, creatorX, creatorWallet }) {
  const sql = `
    INSERT INTO agent_identities 
      (pubkey, name, description, token_mint, bags_api_key_id, capability_set, creator_x, creator_wallet)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;
  const result = await query(sql, [
    pubkey, name, description, tokenMint, bagsApiKeyId, 
    JSON.stringify(capabilitySet || []), creatorX, creatorWallet
  ]);
  return result.rows[0];
}

/**
 * Get an agent by pubkey
 * @param {string} pubkey - Agent public key
 * @returns {Promise<Object|null>} - Agent row or null
 */
async function getAgent(pubkey) {
  const result = await query('SELECT * FROM agent_identities WHERE pubkey = $1', [pubkey]);
  return result.rows[0] || null;
}

/**
 * Update agent fields dynamically
 * @param {string} pubkey - Agent public key
 * @param {Object} fields - Fields to update
 * @returns {Promise<Object|null>} - Updated agent row
 */
async function updateAgent(pubkey, fields) {
  const allowedFields = [
    'name', 'description', 'token_mint', 'bags_api_key_id', 'said_registered', 
    'said_trust_score', 'capability_set', 'creator_x', 'creator_wallet',
    'status', 'flag_reason', 'bags_score'
  ];
  
  const updates = [];
  const values = [];
  let paramIndex = 1;
  
  for (const [key, value] of Object.entries(fields)) {
    const dbField = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    if (allowedFields.includes(dbField)) {
      updates.push(`${dbField} = $${paramIndex}`);
      values.push(key === 'capabilitySet' ? JSON.stringify(value) : value);
      paramIndex++;
    }
  }
  
  if (updates.length === 0) return null;
  
  values.push(pubkey);
  const sql = `UPDATE agent_identities SET ${updates.join(', ')} WHERE pubkey = $${paramIndex} RETURNING *`;
  const result = await query(sql, values);
  return result.rows[0] || null;
}

/**
 * List agents with optional filters
 * @param {Object} params - Filter parameters
 * @returns {Promise<Array>} - Array of agent rows
 */
async function listAgents({ status, capability, limit = 20, offset = 0 } = {}) {
  const conditions = [];
  const values = [];
  let paramIndex = 1;
  
  if (status) {
    conditions.push(`status = $${paramIndex}`);
    values.push(status);
    paramIndex++;
  }
  
  if (capability) {
    conditions.push(`capability_set @> $${paramIndex}::jsonb`);
    values.push(JSON.stringify([capability]));
    paramIndex++;
  }
  
  values.push(limit, offset);
  
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `
    SELECT * FROM agent_identities 
    ${whereClause}
    ORDER BY bags_score DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  
  const result = await query(sql, values);
  return result.rows;
}

/**
 * Update agent status
 * @param {string} pubkey - Agent public key
 * @param {string} status - New status
 * @param {string} flagReason - Optional flag reason
 * @returns {Promise<Object|null>} - Updated agent row
 */
async function updateAgentStatus(pubkey, status, flagReason = null) {
  const sql = `
    UPDATE agent_identities 
    SET status = $1, flag_reason = $2 
    WHERE pubkey = $3 
    RETURNING *
  `;
  const result = await query(sql, [status, flagReason, pubkey]);
  return result.rows[0] || null;
}

/**
 * Update last_verified timestamp
 * @param {string} pubkey - Agent public key
 * @returns {Promise<Object|null>} - Updated agent row
 */
async function updateLastVerified(pubkey) {
  const sql = `
    UPDATE agent_identities 
    SET last_verified = NOW() 
    WHERE pubkey = $1 
    RETURNING *
  `;
  const result = await query(sql, [pubkey]);
  return result.rows[0] || null;
}

/**
 * Update BAGS score
 * @param {string} pubkey - Agent public key
 * @param {number} score - New BAGS score
 * @returns {Promise<Object|null>} - Updated agent row
 */
async function updateBagsScore(pubkey, score) {
  const sql = `
    UPDATE agent_identities 
    SET bags_score = $1 
    WHERE pubkey = $2 
    RETURNING *
  `;
  const result = await query(sql, [score, pubkey]);
  return result.rows[0] || null;
}

/**
 * Increment action counters
 * @param {string} pubkey - Agent public key
 * @param {boolean} success - Whether action was successful
 * @returns {Promise<Object|null>} - Updated agent row
 */
async function incrementActions(pubkey, success) {
  const sql = `
    UPDATE agent_identities 
    SET 
      total_actions = total_actions + 1,
      successful_actions = successful_actions + CASE WHEN $1 THEN 1 ELSE 0 END,
      failed_actions = failed_actions + CASE WHEN $1 THEN 0 ELSE 1 END
    WHERE pubkey = $2 
    RETURNING *
  `;
  const result = await query(sql, [success, pubkey]);
  return result.rows[0] || null;
}

/**
 * Get agent action statistics
 * @param {string} pubkey - Agent public key
 * @returns {Promise<Object>} - Action stats { total, successful, failed }
 */
async function getAgentActions(pubkey) {
  const sql = `
    SELECT total_actions, successful_actions, failed_actions 
    FROM agent_identities 
    WHERE pubkey = $1
  `;
  const result = await query(sql, [pubkey]);
  if (!result.rows[0]) return null;
  
  const row = result.rows[0];
  return {
    total: parseInt(row.total_actions, 10),
    successful: parseInt(row.successful_actions, 10),
    failed: parseInt(row.failed_actions, 10)
  };
}

// ============================================================================
// Verification Queries
// ============================================================================

/**
 * Create a new verification challenge
 * @param {Object} params - Verification data
 * @returns {Promise<Object>} - Created verification row
 */
async function createVerification({ pubkey, nonce, challenge, expiresAt }) {
  const sql = `
    INSERT INTO agent_verifications 
      (pubkey, nonce, challenge, expires_at)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  const result = await query(sql, [pubkey, nonce, challenge, expiresAt]);
  return result.rows[0];
}

/**
 * Get a pending verification by pubkey and nonce
 * @param {string} pubkey - Agent public key
 * @param {string} nonce - Verification nonce
 * @returns {Promise<Object|null>} - Verification row or null
 */
async function getVerification(pubkey, nonce) {
  const sql = `
    SELECT * FROM agent_verifications 
    WHERE pubkey = $1 
      AND nonce = $2 
      AND completed = false 
      AND expires_at > NOW()
  `;
  const result = await query(sql, [pubkey, nonce]);
  return result.rows[0] || null;
}

/**
 * Mark a verification as completed
 * @param {string} nonce - Verification nonce
 * @returns {Promise<Object|null>} - Updated verification row
 */
async function completeVerification(nonce) {
  const sql = `
    UPDATE agent_verifications 
    SET completed = true 
    WHERE nonce = $1 
    RETURNING *
  `;
  const result = await query(sql, [nonce]);
  return result.rows[0] || null;
}

// ============================================================================
// Flag Queries
// ============================================================================

/**
 * Create a new flag report
 * @param {Object} params - Flag data
 * @returns {Promise<Object>} - Created flag row
 */
async function createFlag({ pubkey, reporterPubkey, reason, evidence }) {
  const sql = `
    INSERT INTO agent_flags 
      (pubkey, reporter_pubkey, reason, evidence)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  const result = await query(sql, [
    pubkey, reporterPubkey, reason, 
    evidence ? JSON.stringify(evidence) : null
  ]);
  return result.rows[0];
}

/**
 * Get all flags for an agent
 * @param {string} pubkey - Agent public key
 * @returns {Promise<Array>} - Array of flag rows
 */
async function getFlags(pubkey) {
  const result = await query(
    'SELECT * FROM agent_flags WHERE pubkey = $1 ORDER BY created_at DESC',
    [pubkey]
  );
  return result.rows;
}

/**
 * Get count of unresolved flags for an agent
 * @param {string} pubkey - Agent public key
 * @returns {Promise<number>} - Count of unresolved flags
 */
async function getUnresolvedFlagCount(pubkey) {
  const result = await query(
    'SELECT COUNT(*) as count FROM agent_flags WHERE pubkey = $1 AND resolved = false',
    [pubkey]
  );
  return parseInt(result.rows[0].count, 10);
}

/**
 * Resolve a flag
 * @param {number} id - Flag ID
 * @returns {Promise<Object|null>} - Updated flag row
 */
async function resolveFlag(id) {
  const sql = `
    UPDATE agent_flags 
    SET resolved = true 
    WHERE id = $1 
    RETURNING *
  `;
  const result = await query(sql, [id]);
  return result.rows[0] || null;
}

// ============================================================================
// Discovery Queries
// ============================================================================

/**
 * Discover agents by capability
 * @param {Object} params - Discovery parameters
 * @returns {Promise<Array>} - Array of verified agent rows
 */
async function discoverAgents({ capability, limit = 20 } = {}) {
  let sql;
  let values;
  
  if (capability) {
    sql = `
      SELECT * FROM agent_identities 
      WHERE status = 'verified' 
        AND capability_set @> $1::jsonb
      ORDER BY bags_score DESC
      LIMIT $2
    `;
    values = [JSON.stringify([capability]), limit];
  } else {
    sql = `
      SELECT * FROM agent_identities 
      WHERE status = 'verified'
      ORDER BY bags_score DESC
      LIMIT $1
    `;
    values = [limit];
  }
  
  const result = await query(sql, values);
  return result.rows;
}

module.exports = {
  // Agent Identity queries
  createAgent,
  getAgent,
  updateAgent,
  listAgents,
  updateAgentStatus,
  updateLastVerified,
  updateBagsScore,
  incrementActions,
  getAgentActions,
  
  // Verification queries
  createVerification,
  getVerification,
  completeVerification,
  
  // Flag queries
  createFlag,
  getFlags,
  getUnresolvedFlagCount,
  resolveFlag,
  
  // Discovery queries
  discoverAgents
};
