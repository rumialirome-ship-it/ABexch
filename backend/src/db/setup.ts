import { db } from './index';
import fs from 'fs';
import path from 'path';
// @google/genai-dev-tool: Fix: Import 'process' module to get correct types for process.exit.
import process from 'process';
// @google/genai-dev-tool: Fix: Polyfill __dirname for ES Module compatibility since it's not a global in that context.
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


/**
 * Sets up the PostgreSQL database schema by reading and executing schema.sql.
 * This version executes the whole file in one transaction to preserve order.
 */
const setupDatabase = async () => {
  const client = await db.connect();

  try {
    console.log('✅ Connected to PostgreSQL database.');

    // Resolve path to schema.sql
    const schemaPath = path.resolve(__dirname, 'schema.sql');
    console.log(`📄 Reading database schema from: ${schemaPath}`);

    // Read the entire schema file
    const schemaSQL = fs.readFileSync(schemaPath, 'utf-8');
    
    // Prepend the SET search_path command to the SQL file content.
    // This is more robust as it ensures the path is set correctly
    // for the entire script execution, even if schema.sql contains
    // commands that might reset the session's search_path.
    const fullQuery = `SET search_path TO public;\n\n${schemaSQL}`;


    console.log('🧱 Executing schema.sql within a single transaction...');

    await client.query('BEGIN');
    await client.query(fullQuery);
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
