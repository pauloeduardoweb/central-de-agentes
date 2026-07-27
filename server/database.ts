import mysql from 'mysql2/promise';

export const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  database: process.env.DB_NAME || '',
  user: process.env.DB_USER || '',
  password: process.env.DB_PASSWORD || '',
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  ssl: process.env.DB_SSL === 'true'
    ? { rejectUnauthorized: false }
    : undefined,
});

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DB_HOST && process.env.DB_NAME && process.env.DB_USER);
}

export async function testDatabaseConnection(): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;
  try {
    const [rows] = await db.query('SELECT 1 AS connected');
    return Array.isArray(rows) && rows.length > 0;
  } catch (err: any) {
    console.error('[MySQL Connection Error]:', err?.message || err?.code || 'Connection failed');
    return false;
  }
}

export async function ensureSessionsTable(): Promise<void> {
  if (!isDatabaseConfigured()) return;
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS sessoes (
        codigo VARCHAR(100) PRIMARY KEY,
        active BOOLEAN DEFAULT TRUE,
        active_session_id VARCHAR(255),
        device_id VARCHAR(255),
        session_started_at DATETIME,
        last_heartbeat_at DATETIME,
        expires_at DATETIME,
        is_online BOOLEAN DEFAULT FALSE,
        status VARCHAR(20) DEFAULT 'offline',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
  } catch (err: any) {
    console.warn('[MySQL ensureSessionsTable Error]:', err?.message || err);
  }
}
