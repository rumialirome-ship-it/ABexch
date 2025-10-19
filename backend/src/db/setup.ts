import { db } from './index';
import fs from 'fs';
import path from 'path';

const setupDatabase = async () => {
    const client = await db.getClient();
    try {
        console.log('Successfully connected to the PostgreSQL database.');
        
        // When using ts-node, __dirname resolves to the .ts file's location in src/
        const schemaPath = path.resolve(__dirname, 'schema.sql');
        console.log(`Reading database schema from: ${schemaPath}`);
        
        const schemaSQL = fs.readFileSync(schemaPath, 'utf-8');

        console.log(`Executing schema script within a transaction...`);

        await client.query('BEGIN');

        // Execute the entire schema file as a single multi-statement query.
        // This is more robust than splitting by ';', which can fail with complex SQL.
        await client.query(schemaSQL);

        await client.query('COMMIT');
        
        console.log('✅ Database schema and default admin user created successfully!');
        
    } catch (error) {
        console.error('❌ Error setting up the database:', error);
        // Attempt to roll back the transaction on error
        try {
            await client.query('ROLLBACK');
            console.log('Transaction rolled back successfully.');
        } catch (rollbackError) {
            console.error('Failed to rollback transaction:', rollbackError);
        }
        process.exit(1);
    } finally {
        client.release();
        await db.end();
        console.log('Database connection closed.');
    }
};

setupDatabase();
