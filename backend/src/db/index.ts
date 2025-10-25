import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';
import * as process from 'process';

dotenv.config();

const poolConfig: PoolConfig = {
    connectionString: process.env.DATABASE_URL,
};

// Conditionally add SSL configuration for non-local databases, which are common in production.
if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost') && !process.env.DATABASE_URL.includes('127.0.0.1')) {
    poolConfig.ssl = {
        rejectUnauthorized: false
    };
}

const pool = new Pool(poolConfig);

pool.on('connect', client => {
    // This ensures every connection from the pool uses the 'public' schema by default.
    // This is a more robust fix than setting it only in the setup script.
    client.query('SET search_path TO public');
});

pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

// Export the correctly configured pool as 'db'.
export { pool as db };