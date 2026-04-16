/**
 * PostgreSQL connection pool
 * Uses the 'pg' package for database connectivity
 */

const { Pool } = require('pg');
const config = require('../config');

// Create a new Pool instance using the connection string from config
const pool = new Pool({
  connectionString: config.databaseUrl,
  // Additional pool configuration for production stability
  ...(config.nodeEnv === 'production' && {
    ssl: {
      rejectUnauthorized: false
    }
  })
});

// Handle connection errors - log but don't crash
pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err.message);
});

/**
 * Execute a SQL query with parameters
 * @param {string} text - SQL query text
 * @param {Array} params - Query parameters
 * @returns {Promise} - Query result
 */
async function query(text, params) {
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (err) {
    console.error('Database query error:', err.message);
    throw err;
  }
}

module.exports = {
  pool,
  query
};
