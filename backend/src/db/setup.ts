import { db } from './index';
import fs from 'fs';
import path from 'path';
// @google/genai-dev-tool: Fix: Import 'process' module to get correct types for process.exit.
import process from 'process';
import { TransactionType } from '../types';

/**
 * Sets up the PostgreSQL database schema and ensures all enums are synchronized.
 */
const setupDatabase = async () => {
  const client = await db.connect();

  try {
    console.log('✅ Connected to PostgreSQL database.');

    // Step 1: Execute the main schema file within a transaction.
    const schemaPath = path.resolve('src/db/schema.sql');
    console.log(`📄 Reading database schema from: ${schemaPath}`);
    const schemaSQL = fs.readFileSync(schemaPath, 'utf-8');
    const fullQuery = `SET search_path TO public;\n\n${schemaSQL}`;

    console.log('🧱 Executing schema.sql within a transaction...');
    await client.query('BEGIN');
    await client.query(fullQuery);
    await client.query('COMMIT');
    console.log('✅ Database schema and default admin user created successfully!');

    // Step 2: Synchronize enums outside of a transaction.
    // This is required because `ALTER TYPE ... ADD VALUE` cannot run inside a transaction block.
    console.log('🔄 Synchronizing transaction_type enum with application code...');
    for (const type of Object.values(TransactionType)) {
        try {
            // This command will attempt to add the value. It will throw an error if the value already exists.
            await client.query(`ALTER TYPE transaction_type ADD VALUE '${type}'`);
            console.log(`    -> Added missing value '${type}' to transaction_type enum.`);
        } catch (error: any) {
            // Error code '42710' is for "duplicate_object" (e.g., enum value already exists).
            // We can safely ignore this specific error, as it means the enum is already up-to-date.
            if (error.code !== '42710') {
                // If it's a different error, we should stop and report it.
                throw error;
            }
        }
    }
    console.log('✅ Enum synchronization complete.');

  } catch (err) {
    // Attempt to rollback if an error occurred during the initial schema transaction.
    try {
      await client.query('ROLLBACK');
      console.log('↩️ Transaction rolled back due to error.');
    } catch (rollbackError) {
      // This may fail if the connection was lost or the error happened before 'BEGIN'. This is acceptable.
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
