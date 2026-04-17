/**
 * Agent Routes
 * Handles agent listing, detail retrieval, and A2A discovery
 */

const express = require('express');
const nacl = require('tweetnacl');
const bs58 = require('bs58');
const { getAgent, getAgentsByOwner, listAgents, countAgents, discoverAgents, updateAgent, revokeAgent } = require('../models/queries');
const { computeBagsScore } = require('../services/bagsReputation');
const { defaultLimiter, authLimiter } = require('../middleware/rateLimit');
const { transformAgent, transformAgents, isValidSolanaAddress } = require('../utils/transform');

const router = express.Router();

// Timestamp window for replay protection (5 minutes in milliseconds)
const TIMESTAMP_WINDOW_MS = 5 * 60 * 1000;

/**
 * GET /agents
 * List agents with optional filters
 */
router.get('/agents', defaultLimiter, async (req, res, next) => {
  try {
    const { status, capability, limit, offset, includeDemo } = req.query;

    // Parse and validate pagination params
    let parsedLimit = parseInt(limit, 10) || 50;
    let parsedOffset = parseInt(offset, 10) || 0;

    // Enforce max limit
    if (parsedLimit > 100) {
      parsedLimit = 100;
    }

    const agents = await listAgents({
      status,
      capability,
      limit: parsedLimit,
      offset: parsedOffset,
      includeDemo: includeDemo === 'true'
    });

    // Get total count for pagination
    const total = await countAgents({ status, capability, includeDemo: includeDemo === 'true' });

    return res.status(200).json({
      agents: transformAgents(agents),
      total,
      limit: parsedLimit,
      offset: parsedOffset
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /agents/owner/:pubkey
 * Get all agents owned by a pubkey (must be defined BEFORE /:agentId route)
 */
router.get('/agents/owner/:pubkey', defaultLimiter, async (req, res, next) => {
  try {
    const { pubkey } = req.params;

    if (!isValidSolanaAddress(pubkey)) {
      return res.status(400).json({ error: 'Invalid Solana public key format' });
    }

    const agents = await getAgentsByOwner(pubkey);

    return res.status(200).json({
      pubkey,
      agents: transformAgents(agents),
      count: agents.length
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /agents/:agentId
 * Get single agent detail with reputation score
 */
router.get('/agents/:agentId', defaultLimiter, async (req, res, next) => {
  try {
    const { agentId } = req.params;

    const agent = await getAgent(agentId);
    if (!agent) {
      return res.status(404).json({
        error: 'Agent not found',
        agentId
      });
    }

    // Fetch reputation score
    const reputation = await computeBagsScore(agentId);

    return res.status(200).json({
      agent: transformAgent(agent),
      reputation: {
        score: reputation.score,
        label: reputation.label,
        breakdown: reputation.breakdown
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /discover
 * A2A discovery - find agents by capability
 */
router.get('/discover', defaultLimiter, async (req, res, next) => {
  try {
    const { capability } = req.query;

    // Validate capability is provided
    if (!capability) {
      return res.status(400).json({
        error: 'capability query parameter is required'
      });
    }

    const agents = await discoverAgents({ capability });

    return res.status(200).json({
      agents: transformAgents(agents),
      capability,
      count: agents.length
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /agents/:agentId/update
 * Update agent metadata with signature verification
 */
router.put('/agents/:agentId/update', authLimiter, async (req, res, next) => {
  try {
    const { agentId } = req.params;
    const { signature, timestamp, name, tokenMint, capabilities, creatorX, description } = req.body;

    // 1. Validate required fields
    if (!signature || typeof signature !== 'string') {
      return res.status(400).json({
        error: 'signature is required'
      });
    }

    if (!timestamp || typeof timestamp !== 'number') {
      return res.status(400).json({
        error: 'timestamp is required and must be a number'
      });
    }

    // 2. Check agent exists and get pubkey for verification
    const agent = await getAgent(agentId);
    if (!agent) {
      return res.status(404).json({
        error: 'Agent not found',
        agentId
      });
    }

    const pubkey = agent.pubkey;

    // 3. Verify ownership: construct message and verify Ed25519 signature
    const message = `AGENTID-UPDATE:${agentId}:${timestamp}`;
    let isSignatureValid = false;

    try {
      const messageBytes = Buffer.from(message, 'utf-8');
      const sigBytes = bs58.decode(signature);
      const pubkeyBytes = bs58.decode(pubkey);

      isSignatureValid = nacl.sign.detached.verify(messageBytes, sigBytes, pubkeyBytes);
    } catch (sigError) {
      console.error('Signature verification error:', sigError.message);
      return res.status(401).json({
        error: 'Invalid signature format'
      });
    }

    if (!isSignatureValid) {
      return res.status(401).json({
        error: 'Invalid signature'
      });
    }

    // 4. Check timestamp is within 5 minutes (replay protection)
    const now = Date.now();
    const timestampAge = now - timestamp;

    if (timestampAge > TIMESTAMP_WINDOW_MS) {
      return res.status(401).json({
        error: 'Timestamp too old. Request must be within 5 minutes.'
      });
    }

    if (timestamp > now + 60000) { // Allow 1 minute clock skew for future timestamps
      return res.status(401).json({
        error: 'Timestamp is in the future'
      });
    }

    // 5. Build update fields (only allowed fields)
    const updateFields = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.length === 0) {
        return res.status(400).json({
          error: 'name must be a non-empty string'
        });
      }
      if (name.length > 255) {
        return res.status(400).json({
          error: 'name must not exceed 255 characters'
        });
      }
      updateFields.name = name;
    }

    if (tokenMint !== undefined) {
      updateFields.tokenMint = tokenMint;
    }

    if (capabilities !== undefined) {
      if (!Array.isArray(capabilities)) {
        return res.status(400).json({
          error: 'capabilities must be an array'
        });
      }
      updateFields.capabilitySet = capabilities;
    }

    if (creatorX !== undefined) {
      updateFields.creatorX = creatorX;
    }

    if (description !== undefined) {
      updateFields.description = description;
    }

    // Check if there are any fields to update
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({
        error: 'No valid fields to update'
      });
    }

    // 6. Update agent
    const updatedAgent = await updateAgent(agentId, updateFields);

    if (!updatedAgent) {
      return res.status(500).json({
        error: 'Failed to update agent'
      });
    }

    // 7. Return updated agent
    return res.status(200).json({
      agent: transformAgent(updatedAgent)
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /agents/:agentId/revoke
 * Revoke an agent with signature verification
 */
router.post('/agents/:agentId/revoke', authLimiter, async (req, res, next) => {
  try {
    const { agentId } = req.params;
    const { pubkey, signature, message } = req.body;

    // 1. Validate required fields
    if (!pubkey || typeof pubkey !== 'string') {
      return res.status(400).json({
        error: 'pubkey is required and must be a string'
      });
    }

    if (!signature || typeof signature !== 'string') {
      return res.status(400).json({
        error: 'signature is required'
      });
    }

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        error: 'message is required'
      });
    }

    // 2. Check agent exists and get pubkey for verification
    const agent = await getAgent(agentId);
    if (!agent) {
      return res.status(404).json({
        error: 'Agent not found',
        agentId
      });
    }

    // 3. Check if agent is already revoked
    if (agent.revoked_at) {
      return res.status(410).json({
        error: 'Agent has already been revoked',
        agentId,
        revokedAt: agent.revoked_at
      });
    }

    // 4. Verify ownership: pubkey must match agent's registered owner
    if (agent.pubkey !== pubkey) {
      return res.status(403).json({
        error: 'Only the agent owner can revoke this agent'
      });
    }

    // 5. Parse message to extract timestamp
    // Expected format: AGENTID-REVOKE:{agentId}:{timestamp}
    const messageParts = message.split(':');
    if (messageParts.length !== 3 || messageParts[0] !== 'AGENTID-REVOKE') {
      return res.status(400).json({
        error: 'Invalid message format. Expected: AGENTID-REVOKE:{agentId}:{timestamp}'
      });
    }

    const messageAgentId = messageParts[1];
    const timestamp = parseInt(messageParts[2], 10);

    // Verify agentId in message matches
    if (messageAgentId !== agentId) {
      return res.status(400).json({
        error: 'Agent ID in message does not match URL parameter'
      });
    }

    // 6. Check timestamp is within valid window (replay protection)
    const now = Date.now();
    const timestampAge = now - timestamp;

    if (isNaN(timestamp) || timestampAge > TIMESTAMP_WINDOW_MS) {
      return res.status(401).json({
        error: 'Timestamp too old. Request must be within 5 minutes.'
      });
    }

    if (timestamp > now + 60000) { // Allow 1 minute clock skew for future timestamps
      return res.status(401).json({
        error: 'Timestamp is in the future'
      });
    }

    // 7. Verify Ed25519 signature
    let isSignatureValid = false;

    try {
      const messageBytes = Buffer.from(message, 'utf-8');
      const sigBytes = bs58.decode(signature);
      const pubkeyBytes = bs58.decode(pubkey);

      isSignatureValid = nacl.sign.detached.verify(messageBytes, sigBytes, pubkeyBytes);
    } catch (sigError) {
      console.error('Signature verification error:', sigError.message);
      return res.status(401).json({
        error: 'Invalid signature format'
      });
    }

    if (!isSignatureValid) {
      return res.status(401).json({
        error: 'Invalid signature'
      });
    }

    // 8. Revoke the agent
    const revokedAgent = await revokeAgent(agentId);

    if (!revokedAgent) {
      return res.status(500).json({
        error: 'Failed to revoke agent'
      });
    }

    // 9. Return success response
    return res.status(200).json({
      success: true,
      message: 'Agent revoked successfully',
      agent: transformAgent(revokedAgent),
      revokedAt: revokedAgent.revoked_at
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
