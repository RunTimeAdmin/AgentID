/**
 * Reputation Routes
 * Returns full reputation breakdown for agents
 */

const express = require('express');
const { computeBagsScore } = require('../services/bagsReputation');
const { getAgent } = require('../models/queries');
const { defaultLimiter } = require('../middleware/rateLimit');

const router = express.Router();

/**
 * GET /reputation/:pubkey
 * Returns full reputation breakdown
 */
router.get('/reputation/:pubkey', defaultLimiter, async (req, res, next) => {
  try {
    const { pubkey } = req.params;

    // Check agent exists first
    const agent = await getAgent(pubkey);
    if (!agent) {
      return res.status(404).json({
        error: 'Agent not found',
        pubkey
      });
    }

    const reputation = await computeBagsScore(pubkey);

    return res.status(200).json({
      pubkey,
      score: reputation.score,
      label: reputation.label,
      breakdown: reputation.breakdown
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
