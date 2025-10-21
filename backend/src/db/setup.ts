import { db } from './index';
import fs from 'fs';
import path from 'path';
// @google/genai-dev-tool: Fix: Changed import to resolve 'process.exit' type error.
import * as process from 'process';
import { TransactionType, UserRole } from '../types';
import { PoolClient } from 'pg';

/**
 * A self-healing database setup script.
 * It first executes the main schema to establish a baseline, then immediately
 * synchronizes critical ENUM types (`transaction_type` and `user_role`) to
 * ensure they match the application code, adding any missing values.
 */
const setupDatabase = async () => {
  const client = await db.connect();

  try {
    console.log('✅ Connected to PostgreSQL database.');

    // Step 1: Execute the main schema file first.
    // This establishes the tables and baseline ENUM types. It runs in a transaction.
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
    console.log('✅ Base schema executed successfully.');

    // Step 2: Now, synchronize the ENUM types. This MUST run AFTER the schema
    // and cannot be in a transaction. This ensures any new enum values from
    // the code are added to the types created by the schema.

    // --- Helper function for clarity ---
    const synchronizeEnum = async (client: PoolClient, typeName: string, enumValues: string[]) => {
      console.log(`🔄 Synchronizing ${typeName} enum...`);
      const checkExistsQuery = `SELECT 1 FROM pg_type WHERE typname = '${typeName}'`;
      const { rowCount: enumExists } = await client.query(checkExistsQuery);

      if (enumExists === 0) {
        // This case should ideally not be hit if schema.sql defines the types,
        // but it's a good safeguard.
        console.log(`    -> '${typeName}' enum not found. Creating it now...`);
        const valuesString = enumValues.map(v => `'${v}'`).join(', ');
        const createQuery = `CREATE TYPE ${typeName} AS ENUM (${valuesString});`;
        await client.query(createQuery);
        console.log(`🎉 Successfully created '${typeName}' enum.`);
      } else {
        console.log(`    -> '${typeName}' enum exists. Adding any missing values...`);
        for (const value of enumValues) {
          // This query is safe from SQL injection because `value` comes from our internal enum definition.
          await client.query(`ALTER TYPE ${typeName} ADD VALUE IF NOT EXISTS '${value}'`);
        }
        console.log(`✅ All ${typeName} enum values are synchronized.`);
      }
    };

    // --- Synchronize both enums ---
    await synchronizeEnum(client, 'transaction_type', Object.values(TransactionType));
    await synchronizeEnum(client, 'user_role', Object.values(UserRole));


  } catch (err) {
    try {
      // This will catch errors from the schema transaction
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
