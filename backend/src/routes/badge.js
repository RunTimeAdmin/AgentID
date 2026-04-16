/**
 * Badge Routes
 * Returns trust badge JSON and SVG for agents
 */

const express = require('express');
const { getBadgeJSON, getBadgeSVG } = require('../services/badgeBuilder');
const { defaultLimiter } = require('../middleware/rateLimit');

const router = express.Router();

/**
 * GET /badge/:pubkey
 * Returns trust badge JSON
 */
router.get('/badge/:pubkey', defaultLimiter, async (req, res, next) => {
  try {
    const { pubkey } = req.params;

    const badgeData = await getBadgeJSON(pubkey);

    return res.status(200).json(badgeData);
  } catch (error) {
    if (error.message.includes('Agent not found')) {
      return res.status(404).json({
        error: 'Agent not found',
        pubkey: req.params.pubkey
      });
    }
    next(error);
  }
});

/**
 * GET /badge/:pubkey/svg
 * Returns trust badge SVG
 */
router.get('/badge/:pubkey/svg', defaultLimiter, async (req, res, next) => {
  try {
    const { pubkey } = req.params;

    const svg = await getBadgeSVG(pubkey);

    res.setHeader('Content-Type', 'image/svg+xml');
    return res.status(200).send(svg);
  } catch (error) {
    if (error.message.includes('Agent not found')) {
      return res.status(404).json({
        error: 'Agent not found',
        pubkey: req.params.pubkey
      });
    }
    next(error);
  }
});

module.exports = router;
