import { db } from './index';
import fs from 'fs';
import path from 'path';
import process from 'process';
import { TransactionType } from '../types';

/**
 * A self-healing database setup script.
 * It executes the main schema, then verifies and synchronizes the critical
 * `transaction_type` enum to ensure it perfectly matches the application code.
 */
const setupDatabase = async () => {
  const client = await db.connect();

  try {
    console.log('✅ Connected to PostgreSQL database.');

    // Step 1: Execute the main schema file within a transaction.
    const schemaPath = path.resolve('src/db/schema.sql');
    if (!fs.existsSync(schemaPath)) {
        throw new Error(`Schema file not found at ${schemaPath}. Please ensure src/db/schema.sql exists.`);
    }
    console.log(`📄 Reading database schema from: ${schemaPath}`);
    const schemaSQL = fs.readFileSync(schemaPath, 'utf-8');
    const fullQuery = `SET search_path TO public;\n\n${schemaSQL}`;

    console.log('🧱 Executing schema.sql within a transaction...');
    await client.query('BEGIN');
    await client.query(fullQuery);
    await client.query('COMMIT');
    console.log('✅ Schema executed successfully.');

    // Step 2: Self-heal the `transaction_type` enum. This cannot be in a transaction.
    console.log('🔄 Checking and synchronizing transaction_type enum...');
    const checkTypeExistsQuery = `SELECT 1 FROM pg_type WHERE typname = 'transaction_type'`;
    const { rowCount } = await client.query(checkTypeExistsQuery);

    const allEnumValues = Object.values(TransactionType);

    if (rowCount === 0) {
      // The type is completely missing. Create it from scratch.
      console.log("    -> 'transaction_type' enum not found. Creating it now...");
      const enumValuesString = allEnumValues.map(v => `'${v}'`).join(', ');
      const createTypeQuery = `CREATE TYPE transaction_type AS ENUM (${enumValuesString});`;
      await client.query(createTypeQuery);
      console.log("🎉 Successfully created 'transaction_type' enum with all application values.");
    } else {
      // The type exists. Add any values defined in the code that are missing in the DB.
      console.log("    -> 'transaction_type' enum exists. Verifying all values are present...");
      for (const type of allEnumValues) {
        // Using `ADD VALUE IF NOT EXISTS` is idempotent and safe to run multiple times.
        // It's supported in modern PostgreSQL versions (10+).
        await client.query(`ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS '${type}'`);
      }
      console.log('✅ All transaction_type enum values are synchronized.');
    }

  } catch (err) {
    try {
      await client.query('ROLLBACK');
      console.log('↩️ Transaction rolled back due to error.');
    } catch (rollbackError) {
      // This may fail if the connection was lost or the error happened before 'BEGIN'.
    }

    const message = err instanceof Error ? err.message : JSON.stringify(err, null, 2);
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