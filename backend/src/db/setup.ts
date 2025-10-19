import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Configure dotenv to find the .env file in the backend root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL environment variable is not set. Please create a .env file in the 'backend' directory.");
    process.exit(1);
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

const setupDatabase = async () => {
    const client = await pool.connect();
    try {
        console.log('Successfully connected to the PostgreSQL database.');
        
        const schemaPath = path.resolve(__dirname, 'schema.sql');
        console.log(`Reading database schema from: ${schemaPath}`);
        
        const schemaSQL = fs.readFileSync(schemaPath, 'utf-8');
        
        console.log('Executing schema script... This will drop existing tables and recreate them.');
        await client.query(schemaSQL);
        
        console.log('✅ Database schema and default admin user created successfully!');
        
    } catch (error) {
        console.error('❌ Error setting up the database:', error);
        process.exit(1); // Exit with an error code
    } finally {
        await client.release();
        await pool.end();
        console.log('Database connection closed.');
    }
};

setupDatabase();
