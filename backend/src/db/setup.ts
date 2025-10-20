import { db } from './index';
import fs from 'fs';
import path from 'path';
import process from 'process';
import { TransactionType, UserRole } from '../types';

/**
 * A self-healing database setup script.
 * It executes the main schema, then verifies and synchronizes critical ENUM types
 * (`transaction_type` and `user_role`) to ensure they perfectly match the application code.
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

    // Step 2: Self-heal the ENUM types. This cannot be in a transaction.

    // --- Synchronize `transaction_type` enum ---
    console.log('🔄 Checking and synchronizing transaction_type enum...');
    const checkTransactionTypeExistsQuery = `SELECT 1 FROM pg_type WHERE typname = 'transaction_type'`;
    const { rowCount: transactionTypeExists } = await client.query(checkTransactionTypeExistsQuery);
    const allTransactionEnumValues = Object.values(TransactionType);

    if (transactionTypeExists === 0) {
      console.log("    -> 'transaction_type' enum not found. Creating it now...");
      const enumValuesString = allTransactionEnumValues.map(v => `'${v}'`).join(', ');
      const createTypeQuery = `CREATE TYPE transaction_type AS ENUM (${enumValuesString});`;
      await client.query(createTypeQuery);
      console.log("🎉 Successfully created 'transaction_type' enum with all application values.");
    } else {
      console.log("    -> 'transaction_type' enum exists. Verifying all values are present...");
      for (const type of allTransactionEnumValues) {
        await client.query(`ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS '${type}'`);
      }
      console.log('✅ All transaction_type enum values are synchronized.');
    }
    
    // --- Synchronize `user_role` enum ---
    console.log('🔄 Checking and synchronizing user_role enum...');
    const checkUserRoleExistsQuery = `SELECT 1 FROM pg_type WHERE typname = 'user_role'`;
    const { rowCount: userRoleExists } = await client.query(checkUserRoleExistsQuery);
    const allUserRoleEnumValues = Object.values(UserRole);

    if (userRoleExists === 0) {
      console.log("    -> 'user_role' enum not found. Creating it now...");
      const enumValuesString = allUserRoleEnumValues.map(v => `'${v}'`).join(', ');
      const createTypeQuery = `CREATE TYPE user_role AS ENUM (${enumValuesString});`;
      await client.query(createTypeQuery);
      console.log("🎉 Successfully created 'user_role' enum with all application values.");
    } else {
      console.log("    -> 'user_role' enum exists. Verifying all values are present...");
      for (const role of allUserRoleEnumValues) {
        await client.query(`ALTER TYPE user_role ADD VALUE IF NOT EXISTS '${role}'`);
      }
      console.log('✅ All user_role enum values are synchronized.');
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
