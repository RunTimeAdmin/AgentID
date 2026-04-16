/**
 * Database migration script
 * Creates all required tables and indexes
 * Run with: node src/models/migrate.js
 */

const { pool } = require('./db');

const CREATE_TABLES_SQL = `
-- Agent identities table
CREATE TABLE IF NOT EXISTS agent_identities (
  pubkey          VARCHAR(88) PRIMARY KEY,
  name            VARCHAR(255) NOT NULL,
  description     TEXT,
  token_mint      VARCHAR(88),
  bags_api_key_id VARCHAR(255),
  said_registered BOOLEAN DEFAULT false,
  said_trust_score INTEGER DEFAULT 0,
  capability_set  JSONB,
  creator_x       VARCHAR(255),
  creator_wallet  VARCHAR(88),
  registered_at   TIMESTAMPTZ DEFAULT NOW(),
  last_verified   TIMESTAMPTZ,
  status          VARCHAR(20) DEFAULT 'verified',
  flag_reason     TEXT,
  bags_score      INTEGER DEFAULT 0,
  total_actions   INTEGER DEFAULT 0,
  successful_actions INTEGER DEFAULT 0,
  failed_actions  INTEGER DEFAULT 0,
  fee_claims_count INTEGER DEFAULT 0,
  fee_claims_sol  DECIMAL(18,9) DEFAULT 0,
  swaps_count     INTEGER DEFAULT 0,
  launches_count  INTEGER DEFAULT 0
);

-- Agent verifications table
CREATE TABLE IF NOT EXISTS agent_verifications (
  id              SERIAL PRIMARY KEY,
  pubkey          VARCHAR(88) REFERENCES agent_identities(pubkey),
  nonce           VARCHAR(64) UNIQUE NOT NULL,
  challenge       TEXT NOT NULL,
  expires_at      TIMESTAMPTZ NOT NULL,
  completed       BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Agent flags table
CREATE TABLE IF NOT EXISTS agent_flags (
  id              SERIAL PRIMARY KEY,
  pubkey          VARCHAR(88) REFERENCES agent_identities(pubkey),
  reporter_pubkey VARCHAR(88),
  reason          TEXT NOT NULL,
  evidence        JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  resolved        BOOLEAN DEFAULT false
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_identities_status ON agent_identities(status);
CREATE INDEX IF NOT EXISTS idx_agent_identities_bags_score ON agent_identities(bags_score DESC);
CREATE INDEX IF NOT EXISTS idx_agent_verifications_pubkey ON agent_verifications(pubkey);
CREATE INDEX IF NOT EXISTS idx_agent_flags_pubkey ON agent_flags(pubkey);
CREATE INDEX IF NOT EXISTS idx_agent_flags_resolved ON agent_flags(resolved);
`;

async function migrate() {
  const client = await pool.connect();
  
  try {
    console.log('Starting database migration...');
    
    await client.query('BEGIN');
    await client.query(CREATE_TABLES_SQL);
    await client.query('COMMIT');
    
    console.log('✓ Database migration completed successfully');
    console.log('  - Created table: agent_identities');
    console.log('  - Created table: agent_verifications');
    console.log('  - Created table: agent_flags');
    console.log('  - Created indexes for performance');
    
    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('✗ Database migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrate();
}

module.exports = { migrate };
