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

export async function ensureProductsTable(): Promise<void> {
  if (!isDatabaseConfigured()) return;
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS produtos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        categoria VARCHAR(100) NOT NULL,
        pasta VARCHAR(255) NOT NULL UNIQUE,
        imagem_principal VARCHAR(500) NOT NULL,
        ativo TINYINT(1) NOT NULL DEFAULT 1,
        nivel ENUM('Facil', 'Medio', 'Dificil') NOT NULL DEFAULT 'Facil',
        xp INT NOT NULL DEFAULT 25,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Check if table is empty, seed initial default products
    const [rows]: any = await db.query('SELECT COUNT(*) AS count FROM produtos');
    if (Array.isArray(rows) && rows[0] && Number(rows[0].count) === 0) {
      const defaultProducts = [
        ['Bolsa Feminina Elegante', 'Moda e Acessórios', 'bolsa-feminina-elegante', 'https://midia.geracaozpro.com/produtos/bolsa-feminina-elegante/1.jpg', 1, 'Facil', 25],
        ['Escova Secadora Multifuncional', 'Beleza e Cuidados', 'escova-secadora-multifuncional', 'https://midia.geracaozpro.com/produtos/escova-secadora-multifuncional/1.jpg', 1, 'Facil', 25],
        ['Mini Processador Elétrico', 'Casa e Cozinha', 'mini-processador-eletrico', 'https://midia.geracaozpro.com/produtos/mini-processador-eletrico/1.jpg', 1, 'Facil', 25],
        ['Smartwatch Ultra Series', 'Eletrônicos e Gadgets', 'smartwatch-ultra-series', 'https://midia.geracaozpro.com/produtos/smartwatch-ultra-series/1.jpg', 1, 'Facil', 25],
        ['Luminária Sunset LED', 'Decoração e Casa', 'luminaria-sunset-led', 'https://midia.geracaozpro.com/produtos/luminaria-sunset-led/1.jpg', 1, 'Facil', 25],
        ['Fones Bluetooth Pro Noise Canceling', 'Eletrônicos e Gadgets', 'fones-bluetooth-pro', 'https://midia.geracaozpro.com/produtos/fones-bluetooth-pro/1.jpg', 1, 'Facil', 25],
        ['Massageador Facial Lifting', 'Beleza e Cuidados', 'massageador-facial-lifting', 'https://midia.geracaozpro.com/produtos/massageador-facial-lifting/1.jpg', 1, 'Facil', 25],
        ['Garrafa Térmica Digital com Sensor', 'Casa e Cozinha', 'garrafa-termica-digital', 'https://midia.geracaozpro.com/produtos/garrafa-termica-digital/1.jpg', 1, 'Facil', 25],
        ['Umidificador de Ar Flame LED', 'Decoração e Casa', 'humidificador-ar-flame', 'https://midia.geracaozpro.com/produtos/humidificador-ar-flame/1.jpg', 1, 'Facil', 25],
        ['Depilador Laser Portátil IPL', 'Beleza e Cuidados', 'depilador-laser-portatil', 'https://midia.geracaozpro.com/produtos/depilador-laser-portatil/1.jpg', 1, 'Facil', 25],
        ['Copo Térmico Inox Pro', 'Casa e Cozinha', 'copo-termico-stanley-style', 'https://midia.geracaozpro.com/produtos/copo-termico-stanley-style/1.jpg', 1, 'Facil', 25],
        ['Óculos de Sol Vintage Steampunk', 'Moda e Acessórios', 'oculos-sol-vintage-steampunk', 'https://midia.geracaozpro.com/produtos/oculos-sol-vintage-steampunk/1.jpg', 1, 'Facil', 25],
      ];

      for (const p of defaultProducts) {
        await db.query(
          `INSERT IGNORE INTO produtos (nome, categoria, pasta, imagem_principal, ativo, nivel, xp)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          p
        );
      }
    }
  } catch (err: any) {
    console.warn('[MySQL ensureProductsTable Error]:', err?.message || err);
  }
}

export async function ensureProgressTable(): Promise<void> {
  if (!isDatabaseConfigured()) return;
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS progresso_alunos (
        codigo VARCHAR(100) PRIMARY KEY,
        xp_total INT NOT NULL DEFAULT 0,
        nivel INT NOT NULL DEFAULT 1,
        desafios_jogados INT NOT NULL DEFAULT 0,
        desafios_corretos INT NOT NULL DEFAULT 0,
        sequencia_atual INT NOT NULL DEFAULT 0,
        maior_sequencia INT NOT NULL DEFAULT 0,
        ultimo_desafio_em DATETIME NULL,
        atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
  } catch (err: any) {
    console.warn('[MySQL ensureProgressTable Error]:', err?.message || err);
  }
}

export async function ensureProfilesTable(): Promise<void> {
  if (!isDatabaseConfigured()) return;
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS perfis_alunos (
        codigo VARCHAR(100) PRIMARY KEY,
        nome_usuario VARCHAR(20) NOT NULL,
        nome_usuario_normalizado VARCHAR(20) NOT NULL UNIQUE,
        avatar LONGTEXT NULL,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Ensure existing avatar column is LONGTEXT for data URLs
    await db.query(`ALTER TABLE perfis_alunos MODIFY COLUMN avatar LONGTEXT NULL`).catch(() => {});
  } catch (err: any) {
    console.warn('[MySQL ensureProfilesTable Error]:', err?.message || err);
  }
}



