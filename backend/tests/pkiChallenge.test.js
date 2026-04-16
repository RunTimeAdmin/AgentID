/**
 * PKI Challenge Service Tests
 * Tests for issueChallenge and verifyChallenge functions
 */

// Jest mocks - these must be BEFORE require()
jest.mock('../src/models/queries', () => ({
  createVerification: jest.fn(),
  getVerification: jest.fn(),
  completeVerification: jest.fn(),
  updateLastVerified: jest.fn(),
}));

jest.mock('../src/config', () => ({
  challengeExpirySeconds: 300,
}));

const { createVerification, getVerification, completeVerification, updateLastVerified } = require('../src/models/queries');
const { issueChallenge, verifyChallenge } = require('../src/services/pkiChallenge');
const nacl = require('tweetnacl');
const bs58 = require('bs58');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('PKI Challenge Service', () => {
  describe('issueChallenge()', () => {
    it('should return challenge data with nonce, challenge, and expiresIn', async () => {
      const pubkey = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
      
      createVerification.mockResolvedValue({
        id: 1,
        pubkey,
        nonce: 'test-nonce-123',
        challenge: `AGENTID-VERIFY:${pubkey}:test-nonce-123:1234567890`,
        expires_at: new Date(Date.now() + 300000)
      });

      const result = await issueChallenge(pubkey);

      expect(result).toHaveProperty('nonce');
      expect(result).toHaveProperty('challenge');
      expect(result).toHaveProperty('expiresIn', 300);
      expect(typeof result.nonce).toBe('string');
      expect(typeof result.challenge).toBe('string');
      expect(createVerification).toHaveBeenCalled();
    });

    it('should create challenge with correct format that decodes from base58', async () => {
      const pubkey = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
      
      createVerification.mockImplementation((params) => {
        // Return the inserted row with the nonce that was passed
        return Promise.resolve({
          id: 1,
          pubkey: params.pubkey,
          nonce: params.nonce,
          challenge: params.challenge,
          expires_at: params.expiresAt
        });
      });

      const result = await issueChallenge(pubkey);

      // Decode the challenge from base58
      const decodedChallenge = Buffer.from(bs58.decode(result.challenge)).toString('utf-8');
      
      // Verify format: AGENTID-VERIFY:{pubkey}:{nonce}:{timestamp}
      const pattern = new RegExp(`^AGENTID-VERIFY:${pubkey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:[^:]+:\\d+$`);
      expect(decodedChallenge).toMatch(pattern);
      
      // Verify the parts
      const parts = decodedChallenge.split(':');
      expect(parts).toHaveLength(4);
      expect(parts[0]).toBe('AGENTID-VERIFY');
      expect(parts[1]).toBe(pubkey);
      expect(parts[2]).toBe(result.nonce);
      expect(parseInt(parts[3], 10)).toBeGreaterThan(0);
    });
  });

  describe('verifyChallenge() with valid signature', () => {
    it('should verify a valid Ed25519 signature', async () => {
      // Generate a real Ed25519 keypair
      const keypair = nacl.sign.keyPair();
      const pubkey = bs58.encode(keypair.publicKey);
      const nonce = 'test-nonce-456';
      const challengeString = `AGENTID-VERIFY:${pubkey}:${nonce}:${Date.now()}`;
      
      // Sign the challenge
      const messageBytes = Buffer.from(challengeString, 'utf-8');
      const signatureBytes = nacl.sign.detached(messageBytes, keypair.secretKey);
      const signature = bs58.encode(signatureBytes);

      // Mock the database responses
      getVerification.mockResolvedValue({
        id: 1,
        pubkey,
        nonce,
        challenge: challengeString,
        expires_at: new Date(Date.now() + 300000),
        completed: false
      });

      completeVerification.mockResolvedValue({ id: 1 });
      updateLastVerified.mockResolvedValue({ id: 1 });

      const result = await verifyChallenge(pubkey, nonce, signature);

      expect(result).toEqual({
        verified: true,
        pubkey,
        timestamp: expect.any(Number)
      });
    });
  });

  describe('verifyChallenge() with invalid signature', () => {
    it('should throw error for invalid signature', async () => {
      // Generate two different keypairs
      const keypair1 = nacl.sign.keyPair();
      const keypair2 = nacl.sign.keyPair();
      const pubkey = bs58.encode(keypair1.publicKey);
      const nonce = 'test-nonce-789';
      const challengeString = `AGENTID-VERIFY:${pubkey}:${nonce}:${Date.now()}`;
      
      // Sign with wrong key
      const messageBytes = Buffer.from(challengeString, 'utf-8');
      const signatureBytes = nacl.sign.detached(messageBytes, keypair2.secretKey);
      const signature = bs58.encode(signatureBytes);

      // Mock the verification record
      getVerification.mockResolvedValue({
        id: 1,
        pubkey,
        nonce,
        challenge: challengeString,
        expires_at: new Date(Date.now() + 300000),
        completed: false
      });

      await expect(verifyChallenge(pubkey, nonce, signature)).rejects.toThrow('Invalid signature');
    });
  });

  describe('verifyChallenge() with expired challenge', () => {
    it('should throw error for expired challenge', async () => {
      const keypair = nacl.sign.keyPair();
      const pubkey = bs58.encode(keypair.publicKey);
      const nonce = 'test-nonce-expired';
      
      // Mock an expired verification record
      getVerification.mockResolvedValue({
        id: 1,
        pubkey,
        nonce,
        challenge: `AGENTID-VERIFY:${pubkey}:${nonce}:${Date.now()}`,
        expires_at: new Date(Date.now() - 1000), // Expired 1 second ago
        completed: false
      });

      const signature = bs58.encode(Buffer.from('dummy'));

      await expect(verifyChallenge(pubkey, nonce, signature)).rejects.toThrow('expired');
    });
  });
});
