import pkg from 'pg';
const { Pool } = pkg;
import { env } from './env.js';

const pool = new Pool({
  connectionString: env.databaseUrl,
});

pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
});

export default pool;


