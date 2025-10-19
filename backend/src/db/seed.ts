import { db } from './index';
import path from 'path';
import { UserRole } from '../types';

const seed = async () => {
    const client = await db.getClient();
    try {
        console.log('Starting to seed the database...');
        await client.query('BEGIN');

        // --- Seed Admin ---
        // The default admin ('admin_default') is created in schema.sql.
        // This script adds another admin for development/testing.
        const adminId = 'admin_seed_01';
        await client.query(`
            INSERT INTO users (id, username, password, role, wallet_balance)
            VALUES ($1, 'seed_admin', 'Admin@123', $2, 1000000)
            ON CONFLICT (id) DO UPDATE SET
                username = EXCLUDED.username,
                password = EXCLUDED.password,
                role = EXCLUDED.role,
                wallet_balance = EXCLUDED.wallet_balance;
        `, [adminId, UserRole.ADMIN]);
        console.log(`- Upserted admin: ${adminId} (seed_admin)`);

        // --- Seed Dealer ---
        const dealerId = 'dlr_seed_01';
        await client.query(`
            INSERT INTO users (id, username, password, phone, role, wallet_balance, city, commission_rate)
            VALUES ($1, 'main_dealer', 'Admin@123', '03001234567', $2, 50000, 'Karachi', 5)
            ON CONFLICT (id) DO UPDATE SET
                username = EXCLUDED.username,
                password = EXCLUDED.password,
                phone = EXCLUDED.phone,
                role = EXCLUDED.role,
                wallet_balance = EXCLUDED.wallet_balance,
                city = EXCLUDED.city,
                commission_rate = EXCLUDED.commission_rate;
        `, [dealerId, UserRole.DEALER]);
        console.log(`- Upserted dealer: ${dealerId} (main_dealer)`);

        // --- Seed User ---
        // This user is assigned to the dealer created above.
        const userId = 'usr_seed_01';
        await client.query(`
            INSERT INTO users (id, username, password, phone, role, wallet_balance, dealer_id, city, commission_rate, prize_rate_2d, prize_rate_1d, bet_limit_2d, bet_limit_1d)
            VALUES ($1, 'test_user', 'Pak@123', '03123456789', $2, 10000, $3, 'Lahore', 2.5, 85, 9.5, 5000, 10000)
            ON CONFLICT (id) DO UPDATE SET
                username = EXCLUDED.username,
                password = EXCLUDED.password,
                phone = EXCLUDED.phone,
                role = EXCLUDED.role,
                wallet_balance = EXCLUDED.wallet_balance,
                dealer_id = EXCLUDED.dealer_id,
                city = EXCLUDED.city,
                commission_rate = EXCLUDED.commission_rate,
                prize_rate_2d = EXCLUDED.prize_rate_2d,
                prize_rate_1d = EXCLUDED.prize_rate_1d,
                bet_limit_2d = EXCLUDED.bet_limit_2d,
                bet_limit_1d = EXCLUDED.bet_limit_1d;
        `, [userId, UserRole.USER, dealerId]);
        console.log(`- Upserted user: ${userId} (test_user), assigned to dealer ${dealerId}`);

        await client.query('COMMIT');
        console.log('Database seeding completed successfully.');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error seeding database:', error);
        process.exit(1);
    } finally {
        client.release();
        await db.end();
    }
};

seed();