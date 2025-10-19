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

        // A more robust way to split statements, handling different line endings and whitespace.
        const statements = schemaSQL.split(';').filter(statement => {
            // Filter out empty statements and comments
            const trimmed = statement.trim();
            return trimmed.length > 0 && !trimmed.startsWith('--');
        });

        console.log(`Found ${statements.length} statements to execute.`);
        console.log('Executing schema script within a transaction...');

        await client.query('BEGIN');

        for (const statement of statements) {
            // Re-add the semicolon to ensure each statement is correctly terminated.
            await client.query(statement + ';');
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
