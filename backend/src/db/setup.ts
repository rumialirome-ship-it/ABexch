import { db } from './index';
import fs from 'fs';
import path from 'path';

/**
 * Sets up the PostgreSQL database schema by reading and executing schema.sql.
 * This version executes the whole file in one transaction to preserve order.
 */
const setupDatabase = async () => {
  // @google/genai-dev-tool: Fix: The method to get a client from the pool is `connect()`, not `getClient()`.
  const client = await db.connect();

  try {
    console.log('✅ Connected to PostgreSQL database.');

    // Resolve path to schema.sql
    const schemaPath = path.resolve(__dirname, 'schema.sql');
    console.log(`📄 Reading database schema from: ${schemaPath}`);

    // Read the entire schema file
    const schemaSQL = fs.readFileSync(schemaPath, 'utf-8');

    console.log('🧱 Executing schema.sql within a single transaction...');

    await client.query('BEGIN');
    // FIX: Explicitly set the search_path for this transaction to guarantee
    // that tables are created in the 'public' schema. This is a direct
    // fix for the "no schema has been selected" error.
    await client.query('SET search_path TO public;');
    await client.query(schemaSQL);
    await client.query('COMMIT');

    console.log('✅ Database schema and default admin user created successfully!');
  } catch (err) {
    // Ensure rollback on error
    try {
      await client.query('ROLLBACK');
      console.log('↩️ Transaction rolled back successfully.');
    } catch (rollbackError) {
      console.error('⚠️ Failed to rollback transaction:', rollbackError);
    }

    const message =
      err instanceof Error ? err.message : JSON.stringify(err, null, 2);
    console.error('❌ Database setup failed:', message);

    process.exit(1);
  } finally {
    client.release();
  }
};

// Run setup when this script is executed directly
setupDatabase()
  .then(() => {
    console.log('🎉 Setup completed successfully.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('🚨 Unexpected error during setup:', err);
    process.exit(1);
  });