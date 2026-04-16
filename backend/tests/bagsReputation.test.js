/**
 * BAGS Reputation Service Tests
 * Tests for computeBagsScore scoring logic
 * 
 * NOTE: These tests require a database connection or proper mocking setup.
 * The tests demonstrate the expected behavior but may need DB mocks to run without a database.
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';

// Mock the database module before any imports that use it
vi.mock('../src/models/db.js', async () => {
  return {
    pool: {
      query: vi.fn(),
      on: vi.fn()
    },
    query: vi.fn()
  };
});

// Mock axios
vi.mock('axios', () => ({
  default: { get: vi.fn() }
}));

// Mock saidBinding
vi.mock('../src/services/saidBinding.js', () => ({
  getSAIDTrustScore: vi.fn()
}));

// Mock config
vi.mock('../src/config/index.js', () => ({
  default: {
    databaseUrl: 'postgresql://test:test@localhost:5432/test',
    nodeEnv: 'test',
    saidGatewayUrl: 'https://test-gateway.example.com'
  }
}));

// Import after mocks are established
const { getAgent, getAgentActions, getUnresolvedFlagCount } = await import('../src/models/queries.js');
const axios = (await import('axios')).default;
const { getSAIDTrustScore } = await import('../src/services/saidBinding.js');
const { computeBagsScore } = await import('../src/services/bagsReputation.js');

describe('BAGS Reputation Service', () => {
  beforeAll(() => {
    vi.clearAllMocks();
  });

  describe('Scoring logic', () => {
    it('should compute score with all 5 factors', async () => {
      const pubkey = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
      const tokenMint = 'TokenMint123';
      
      // Mock agent data
      getAgent.mockResolvedValue({
        pubkey,
        token_mint: tokenMint,
        registered_at: new Date(Date.now() - 10 * 86400000) // 10 days ago
      });

      // Mock fee activity (3 SOL = 30 points max)
      axios.get.mockResolvedValueOnce({
        data: { totalFeesSOL: 3.0 }
      });

      // Mock success rate (80% = 20 points)
      getAgentActions.mockResolvedValue({
        total: 100,
        successful: 80,
        failed: 20
      });

      // Mock SAID trust score (80/100 = 12 points)
      getSAIDTrustScore.mockResolvedValue({
        score: 80,
        label: 'HIGH'
      });

      // Mock no flags (10 points)
      getUnresolvedFlagCount.mockResolvedValue(0);

      const result = await computeBagsScore(pubkey);

      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('label');
      expect(result).toHaveProperty('breakdown');
      expect(result.breakdown).toHaveProperty('feeActivity');
      expect(result.breakdown).toHaveProperty('successRate');
      expect(result.breakdown).toHaveProperty('age');
      expect(result.breakdown).toHaveProperty('saidTrust');
      expect(result.breakdown).toHaveProperty('community');
    });

    it('should have breakdown that sums to total score', async () => {
      const pubkey = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
      
      getAgent.mockResolvedValue({
        pubkey,
        token_mint: null,
        registered_at: new Date()
      });

      axios.get.mockRejectedValue(new Error('API error'));
      getAgentActions.mockResolvedValue({ total: 0, successful: 0, failed: 0 });
      getSAIDTrustScore.mockRejectedValue(new Error('API error'));
      getUnresolvedFlagCount.mockResolvedValue(0);

      const result = await computeBagsScore(pubkey);

      const sum = result.breakdown.feeActivity.score +
                  result.breakdown.successRate.score +
                  result.breakdown.age.score +
                  result.breakdown.saidTrust.score +
                  result.breakdown.community.score;

      expect(result.score).toBe(sum);
    });
  });

  describe('Label thresholds', () => {
    it('should return HIGH label for score >= 80', async () => {
      const pubkey = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
      
      getAgent.mockResolvedValue({
        pubkey,
        token_mint: 'token123',
        registered_at: new Date(Date.now() - 100 * 86400000) // 100 days
      });

      // High fee activity
      axios.get.mockResolvedValue({ data: { totalFeesSOL: 10 } });
      // High success rate
      getAgentActions.mockResolvedValue({ total: 100, successful: 100, failed: 0 });
      // High SAID score
      getSAIDTrustScore.mockResolvedValue({ score: 100, label: 'HIGH' });
      // No flags
      getUnresolvedFlagCount.mockResolvedValue(0);

      const result = await computeBagsScore(pubkey);

      expect(result.score).toBeGreaterThanOrEqual(80);
      expect(result.label).toBe('HIGH');
    });

    it('should return MEDIUM label for score >= 60 and < 80', async () => {
      const pubkey = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
      
      getAgent.mockResolvedValue({
        pubkey,
        token_mint: 'token123',
        registered_at: new Date(Date.now() - 30 * 86400000) // 30 days
      });

      // Medium fee activity
      axios.get.mockResolvedValue({ data: { totalFeesSOL: 2 } });
      // Medium success rate
      getAgentActions.mockResolvedValue({ total: 100, successful: 70, failed: 30 });
      // Medium SAID score
      getSAIDTrustScore.mockResolvedValue({ score: 60, label: 'MEDIUM' });
      // No flags
      getUnresolvedFlagCount.mockResolvedValue(0);

      const result = await computeBagsScore(pubkey);

      expect(result.score).toBeGreaterThanOrEqual(60);
      expect(result.score).toBeLessThan(80);
      expect(result.label).toBe('MEDIUM');
    });

    it('should return LOW label for score >= 40 and < 60', async () => {
      const pubkey = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
      
      getAgent.mockResolvedValue({
        pubkey,
        token_mint: null,
        registered_at: new Date() // Just registered
      });

      // No token mint = no fee activity
      axios.get.mockRejectedValue(new Error('No token'));
      // Low success rate
      getAgentActions.mockResolvedValue({ total: 100, successful: 40, failed: 60 });
      // Low SAID score
      getSAIDTrustScore.mockResolvedValue({ score: 30, label: 'LOW' });
      // One flag
      getUnresolvedFlagCount.mockResolvedValue(1);

      const result = await computeBagsScore(pubkey);

      expect(result.score).toBeGreaterThanOrEqual(40);
      expect(result.score).toBeLessThan(60);
      expect(result.label).toBe('LOW');
    });

    it('should return UNVERIFIED label for score < 40', async () => {
      const pubkey = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
      
      getAgent.mockResolvedValue({
        pubkey,
        token_mint: null,
        registered_at: new Date() // Just registered
      });

      // No token mint
      axios.get.mockRejectedValue(new Error('No token'));
      // Very low success rate
      getAgentActions.mockResolvedValue({ total: 100, successful: 10, failed: 90 });
      // No SAID score
      getSAIDTrustScore.mockResolvedValue({ score: 0, label: 'UNKNOWN' });
      // Multiple flags
      getUnresolvedFlagCount.mockResolvedValue(3);

      const result = await computeBagsScore(pubkey);

      expect(result.score).toBeLessThan(40);
      expect(result.label).toBe('UNVERIFIED');
    });
  });

  describe('Graceful degradation', () => {
    it('should handle SAID API failure gracefully', async () => {
      const pubkey = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
      
      getAgent.mockResolvedValue({
        pubkey,
        token_mint: null,
        registered_at: new Date()
      });

      axios.get.mockRejectedValue(new Error('SAID API error'));
      getAgentActions.mockResolvedValue({ total: 0, successful: 0, failed: 0 });
      getSAIDTrustScore.mockRejectedValue(new Error('SAID API error'));
      getUnresolvedFlagCount.mockResolvedValue(0);

      const result = await computeBagsScore(pubkey);

      expect(result.breakdown.saidTrust.score).toBe(0);
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('label');
    });

    it('should handle Bags API failure gracefully', async () => {
      const pubkey = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
      
      getAgent.mockResolvedValue({
        pubkey,
        token_mint: 'token123',
        registered_at: new Date()
      });

      // Bags API fails
      axios.get.mockRejectedValue(new Error('Bags API error'));
      getAgentActions.mockResolvedValue({ total: 0, successful: 0, failed: 0 });
      getSAIDTrustScore.mockResolvedValue({ score: 0, label: 'UNKNOWN' });
      getUnresolvedFlagCount.mockResolvedValue(0);

      const result = await computeBagsScore(pubkey);

      expect(result.breakdown.feeActivity.score).toBe(0);
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('label');
    });

    it('should handle both SAID and Bags API failures gracefully', async () => {
      const pubkey = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
      
      getAgent.mockResolvedValue({
        pubkey,
        token_mint: 'token123',
        registered_at: new Date()
      });

      axios.get.mockRejectedValue(new Error('Bags API error'));
      getAgentActions.mockResolvedValue({ total: 0, successful: 0, failed: 0 });
      getSAIDTrustScore.mockRejectedValue(new Error('SAID API error'));
      getUnresolvedFlagCount.mockResolvedValue(0);

      const result = await computeBagsScore(pubkey);

      expect(result.breakdown.feeActivity.score).toBe(0);
      expect(result.breakdown.saidTrust.score).toBe(0);
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('label');
    });
  });
});
