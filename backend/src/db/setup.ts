import { db } from './index';
import fs from 'fs';
import path from 'path';

const setupDatabase = async () => {
    const client = await db.getClient();
    try {
        console.log('Successfully connected to the PostgreSQL database.');
        
        const schemaPath = path.resolve(__dirname, 'schema.sql');
        console.log(`Reading database schema from: ${schemaPath}`);
        
        const schemaSQL = fs.readFileSync(schemaPath, 'utf-8');

        // Split the script into individual statements. This is more robust than a single query.
        // We split by a semicolon that is followed by a newline character.
        const statements = schemaSQL.split(/;\r?\n/).filter(s => s.trim().length > 0);

        console.log(`Found ${statements.length} statements to execute.`);
        console.log('Executing schema script within a transaction...');

        await client.query('BEGIN');

        for (const statement of statements) {
            // Add a semicolon back if it's not just a comment
            if (!statement.startsWith('--')) {
                 await client.query(statement);
            }
        }

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
