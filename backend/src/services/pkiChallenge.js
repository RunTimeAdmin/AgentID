/**
 * PKI Challenge Service
 * Ed25519 challenge-response for ongoing verification
 */

const crypto = require('crypto');
const nacl = require('tweetnacl');
const bs58 = require('bs58');
const { createVerification, getVerification, completeVerification, updateLastVerified } = require('../models/queries');
const config = require('../config');

/**
 * Issue a new challenge for an agent
 * @param {string} pubkey - Agent public key
 * @returns {Promise<{nonce: string, challenge: string, expiresIn: number}>} - Challenge data
 */
async function issueChallenge(pubkey) {
  const nonce = crypto.randomUUID();
  const timestamp = Date.now();
  const challengeString = `AGENTID-VERIFY:${pubkey}:${nonce}:${timestamp}`;
  
  // Calculate expiration time
  const expiresAt = new Date(Date.now() + config.challengeExpirySeconds * 1000);
  
  // Store in database
  await createVerification({
    pubkey,
    nonce,
    challenge: challengeString,
    expiresAt
  });
  
  // Return base58-encoded challenge
  return {
    nonce,
    challenge: bs58.encode(Buffer.from(challengeString)),
    expiresIn: config.challengeExpirySeconds
  };
}

/**
 * Verify a challenge response
 * @param {string} pubkey - Agent public key
 * @param {string} nonce - Challenge nonce
 * @param {string} signature - Base58-encoded signature
 * @returns {Promise<{verified: boolean, pubkey: string, timestamp: number}>} - Verification result
 * @throws {Error} - If challenge not found, expired, or signature invalid
 */
async function verifyChallenge(pubkey, nonce, signature) {
  // Fetch verification record
  const verification = await getVerification(pubkey, nonce);
  
  // Check if challenge exists
  if (!verification) {
    throw new Error('Challenge not found or already completed');
  }
  
  // Check if challenge is expired
  const now = new Date();
  const expiresAt = new Date(verification.expires_at);
  if (now > expiresAt) {
    throw new Error('Challenge has expired');
  }
  
  // Decode inputs
  let sigBytes;
  let pubkeyBytes;
  let messageBytes;
  
  try {
    sigBytes = bs58.decode(signature);
    pubkeyBytes = bs58.decode(pubkey);
    messageBytes = Buffer.from(verification.challenge, 'utf-8');
  } catch (error) {
    throw new Error(`Invalid encoding: ${error.message}`);
  }
  
  // Verify Ed25519 signature
  const isValid = nacl.sign.detached.verify(messageBytes, sigBytes, pubkeyBytes);
  
  if (!isValid) {
    throw new Error('Invalid signature');
  }
  
  // Mark challenge as completed
  await completeVerification(nonce);
  
  // Update last verified timestamp
  await updateLastVerified(pubkey);
  
  return {
    verified: true,
    pubkey,
    timestamp: Date.now()
  };
}

module.exports = {
  issueChallenge,
  verifyChallenge
};
