/**
 * Verification Routes
 * Handles PKI challenge-response and agent metadata updates
 */

const express = require('express');
const { issueChallenge, verifyChallenge } = require('../services/pkiChallenge');
const { getAgent } = require('../models/queries');
const { authLimiter } = require('../middleware/rateLimit');
const { isValidSolanaAddress } = require('../utils/transform');

const router = express.Router();

/**
 * POST /verify/challenge
 * Issue a PKI challenge for an agent
 */
router.post('/verify/challenge', authLimiter, async (req, res, next) => {
  try {
    // 1. Validate: requires pubkey in body
    const { pubkey } = req.body;

    if (!pubkey || typeof pubkey !== 'string' || pubkey.length === 0) {
      return res.status(400).json({
        error: 'pubkey is required and must be a non-empty string'
      });
    }

    if (!isValidSolanaAddress(pubkey)) {
      return res.status(400).json({ error: 'Invalid Solana public key format' });
    }

    // 2. Check agent exists
    const agent = await getAgent(pubkey);
    if (!agent) {
      return res.status(404).json({
        error: 'Agent not found',
        pubkey
      });
    }

    // 3. Issue challenge
    const challengeData = await issueChallenge(pubkey);

    // 4. Return challenge data
    return res.status(200).json(challengeData);

  } catch (error) {
    next(error);
  }
});

/**
 * POST /verify/response
 * Verify signed challenge response
 */
router.post('/verify/response', authLimiter, async (req, res, next) => {
  try {
    // 1. Validate: requires pubkey, nonce, signature in body
    const { pubkey, nonce, signature } = req.body;

    if (!pubkey || typeof pubkey !== 'string') {
      return res.status(400).json({
        error: 'pubkey is required and must be a string'
      });
    }

    if (!isValidSolanaAddress(pubkey)) {
      return res.status(400).json({ error: 'Invalid Solana public key format' });
    }

    if (!nonce || typeof nonce !== 'string') {
      return res.status(400).json({
        error: 'nonce is required and must be a string'
      });
    }

    if (!signature || typeof signature !== 'string') {
      return res.status(400).json({
        error: 'signature is required and must be a string'
      });
    }

    // 2. Call verifyChallenge
    try {
      const result = await verifyChallenge(pubkey, nonce, signature);

      // 3. If valid, return success response
      return res.status(200).json(result);

    } catch (verifyError) {
      // Handle specific error types
      if (verifyError.message.includes('not found')) {
        return res.status(404).json({
          error: 'Challenge not found or already completed'
        });
      }

      if (verifyError.message.includes('expired')) {
        return res.status(401).json({
          error: 'Challenge has expired'
        });
      }

      if (verifyError.message.includes('Invalid signature') || verifyError.message.includes('Invalid encoding')) {
        return res.status(401).json({
          error: 'Invalid signature'
        });
      }

      // Re-throw unexpected errors
      throw verifyError;
    }

  } catch (error) {
    next(error);
  }
});

module.exports = router;
