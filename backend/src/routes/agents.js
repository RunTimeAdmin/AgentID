/**
 * Agent Routes
 * Handles agent listing, detail retrieval, and A2A discovery
 */

const express = require('express');
const nacl = require('tweetnacl');
const bs58 = require('bs58');
const { getAgent, listAgents, discoverAgents, updateAgent } = require('../models/queries');
const { computeBagsScore } = require('../services/bagsReputation');
const { defaultLimiter, authLimiter } = require('../middleware/rateLimit');
const { transformAgent, transformAgents } = require('../utils/transform');

const router = express.Router();

// Timestamp window for replay protection (5 minutes in milliseconds)
const TIMESTAMP_WINDOW_MS = 5 * 60 * 1000;

/**
 * GET /agents
 * List agents with optional filters
 */
router.get('/agents', defaultLimiter, async (req, res, next) => {
  try {
    const { status, capability, limit, offset } = req.query;

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
      offset: parsedOffset
    });

    // Get total count for pagination (simplified - in production could use COUNT query)
    const total = agents.length;

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
 * GET /agents/:pubkey
 * Get single agent detail with reputation score
 */
router.get('/agents/:pubkey', defaultLimiter, async (req, res, next) => {
  try {
    const { pubkey } = req.params;

    const agent = await getAgent(pubkey);
    if (!agent) {
      return res.status(404).json({
        error: 'Agent not found',
        pubkey
      });
    }

    // Fetch reputation score
    const reputation = await computeBagsScore(pubkey);

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
 * PUT /agents/:pubkey/update
 * Update agent metadata with signature verification
 */
router.put('/agents/:pubkey/update', authLimiter, async (req, res, next) => {
  try {
    const { pubkey } = req.params;
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

    // 2. Verify ownership: construct message and verify Ed25519 signature
    const message = `AGENTID-UPDATE:${pubkey}:${timestamp}`;
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

    // 3. Check timestamp is within 5 minutes (replay protection)
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

    // 4. Check agent exists
    const agent = await getAgent(pubkey);
    if (!agent) {
      return res.status(404).json({
        error: 'Agent not found',
        pubkey
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
    const updatedAgent = await updateAgent(pubkey, updateFields);

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

module.exports = router;
