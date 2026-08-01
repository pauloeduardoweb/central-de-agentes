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

export async function ensureCodigosAcessoTable(): Promise<void> {
  if (!isDatabaseConfigured()) return;
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS codigos_acesso (
        id INT AUTO_INCREMENT PRIMARY KEY,
        codigo VARCHAR(100) NOT NULL UNIQUE,
        usado TINYINT(1) DEFAULT 0,
        usuario_id INT DEFAULT NULL,
        access_status ENUM('ACTIVE', 'SUSPENDED', 'BANNED') NOT NULL DEFAULT 'ACTIVE',
        suspension_reason VARCHAR(255) DEFAULT NULL,
        suspended_at DATETIME DEFAULT NULL,
        suspended_by VARCHAR(100) DEFAULT NULL,
        banned_reason VARCHAR(255) DEFAULT NULL,
        banned_at DATETIME DEFAULT NULL,
        banned_by VARCHAR(100) DEFAULT NULL,
        reactivated_at DATETIME DEFAULT NULL,
        reactivated_by VARCHAR(100) DEFAULT NULL,
        last_admin_action VARCHAR(50) DEFAULT NULL,
        last_admin_action_at DATETIME DEFAULT NULL,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_codigo (codigo),
        INDEX idx_access_status (access_status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Ensure columns exist on codigos_acesso if created previously without them
    const alterQueries = [
      `ALTER TABLE codigos_acesso ADD COLUMN criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
      `ALTER TABLE codigos_acesso ADD COLUMN access_status ENUM('ACTIVE', 'SUSPENDED', 'BANNED') NOT NULL DEFAULT 'ACTIVE'`,
      `ALTER TABLE codigos_acesso MODIFY COLUMN access_status ENUM('ACTIVE', 'SUSPENDED', 'BANNED') NOT NULL DEFAULT 'ACTIVE'`,
      `ALTER TABLE codigos_acesso ADD COLUMN suspension_reason VARCHAR(255) DEFAULT NULL`,
      `ALTER TABLE codigos_acesso ADD COLUMN suspended_at DATETIME DEFAULT NULL`,
      `ALTER TABLE codigos_acesso ADD COLUMN suspended_by VARCHAR(100) DEFAULT NULL`,
      `ALTER TABLE codigos_acesso ADD COLUMN banned_reason VARCHAR(255) DEFAULT NULL`,
      `ALTER TABLE codigos_acesso ADD COLUMN banned_at DATETIME DEFAULT NULL`,
      `ALTER TABLE codigos_acesso ADD COLUMN banned_by VARCHAR(100) DEFAULT NULL`,
      `ALTER TABLE codigos_acesso ADD COLUMN reactivated_at DATETIME DEFAULT NULL`,
      `ALTER TABLE codigos_acesso ADD COLUMN reactivated_by VARCHAR(100) DEFAULT NULL`,
      `ALTER TABLE codigos_acesso ADD COLUMN last_admin_action VARCHAR(50) DEFAULT NULL`,
      `ALTER TABLE codigos_acesso ADD COLUMN last_admin_action_at DATETIME DEFAULT NULL`,
    ];

    for (const q of alterQueries) {
      await db.query(q).catch(() => {});
    }
  } catch (err: any) {
    console.warn('[MySQL ensureCodigosAcessoTable Error]:', err?.message || err);
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
        current_page VARCHAR(255) DEFAULT 'TikTok 2K',
        ip_address VARCHAR(100) DEFAULT NULL,
        user_agent TEXT DEFAULT NULL,
        device_type VARCHAR(50) DEFAULT 'Desktop',
        browser_name VARCHAR(50) DEFAULT 'Desconhecido',
        operating_system VARCHAR(50) DEFAULT 'Desconhecido',
        login_at DATETIME DEFAULT NULL,
        logout_at DATETIME DEFAULT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Ensure columns exist if table was created previously without them
    const alterQueries = [
      `ALTER TABLE sessoes ADD COLUMN id INT AUTO_INCREMENT UNIQUE KEY`,
      `ALTER TABLE sessoes ADD COLUMN current_page VARCHAR(255) DEFAULT 'TikTok 2K'`,
      `ALTER TABLE sessoes ADD COLUMN ip_address VARCHAR(100) DEFAULT NULL`,
      `ALTER TABLE sessoes ADD COLUMN user_agent TEXT DEFAULT NULL`,
      `ALTER TABLE sessoes ADD COLUMN device_type VARCHAR(50) DEFAULT 'Desktop'`,
      `ALTER TABLE sessoes ADD COLUMN browser_name VARCHAR(50) DEFAULT 'Desconhecido'`,
      `ALTER TABLE sessoes ADD COLUMN operating_system VARCHAR(50) DEFAULT 'Desconhecido'`,
      `ALTER TABLE sessoes ADD COLUMN login_at DATETIME DEFAULT NULL`,
      `ALTER TABLE sessoes ADD COLUMN logout_at DATETIME DEFAULT NULL`,
      `ALTER TABLE sessoes ADD COLUMN disconnect_source VARCHAR(50) DEFAULT NULL`,
      `ALTER TABLE sessoes ADD COLUMN disconnected_at DATETIME DEFAULT NULL`,
      `ALTER TABLE sessoes ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`,
    ];

    for (const q of alterQueries) {
      await db.query(q).catch(() => {});
    }
    await deduplicateSessionsTable();
    await ensureCodigosAcessoTable();
    await ensureAdminAccessTable();
    await ensureSessionHistoryTable();
    await cleanLegacyDisconnections();
  } catch (err: any) {
    console.warn('[MySQL ensureSessionsTable Error]:', err?.message || err);
  }
}

export async function ensureSessionHistoryTable(): Promise<void> {
  if (!isDatabaseConfigured()) return;
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS session_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        codigo VARCHAR(100) NOT NULL,
        session_id INT DEFAULT NULL,
        event_type VARCHAR(50) NOT NULL,
        page VARCHAR(255) DEFAULT NULL,
        device VARCHAR(255) DEFAULT NULL,
        ip VARCHAR(100) DEFAULT NULL,
        details TEXT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_hist_codigo (codigo),
        INDEX idx_hist_event (event_type),
        INDEX idx_hist_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } catch (err: any) {
    console.warn('[MySQL ensureSessionHistoryTable Error]:', err?.message || err);
  }
}

export async function cleanLegacyDisconnections(): Promise<void> {
  if (!isDatabaseConfigured()) return;
  try {
    // 1. Clear disconnect metadata from active sessions (if active_session_id IS NOT NULL, session is active)
    await db.query(`
      UPDATE sessoes
      SET disconnect_source = NULL, disconnected_at = NULL
      WHERE active_session_id IS NOT NULL
    `).catch(() => {});

    // 2. Clear invalid disconnect sources
    await db.query(`
      UPDATE sessoes
      SET disconnect_source = NULL, disconnected_at = NULL
      WHERE active_session_id IS NULL
        AND disconnect_source IS NOT NULL
        AND disconnect_source NOT IN ('MENTOR_SINGLE', 'MENTOR_ALL', 'STUDENT_LOGOUT')
    `).catch(() => {});
  } catch (err: any) {
    console.warn('[cleanLegacyDisconnections Warning]:', err?.message || err);
  }
}

export async function deduplicateSessionsTable(): Promise<void> {
  if (!isDatabaseConfigured()) return;
  try {
    const [dupCodes]: any = await db.query(
      `SELECT codigo, COUNT(*) as cnt FROM sessoes GROUP BY codigo HAVING cnt > 1`
    );
    if (Array.isArray(dupCodes) && dupCodes.length > 0) {
      console.log(`[Deduplicate] Found ${dupCodes.length} duplicate session codes in database. Cleaning up...`);
      for (const item of dupCodes) {
        const code = item.codigo;
        const [rows]: any = await db.query(
          `SELECT id, active_session_id, expires_at, last_heartbeat_at
           FROM sessoes
           WHERE codigo = ?
           ORDER BY
             (CASE WHEN active_session_id IS NOT NULL AND expires_at > NOW() THEN 1 ELSE 0 END) DESC,
             last_heartbeat_at DESC,
             id DESC`,
          [code]
        );
        if (Array.isArray(rows) && rows.length > 1) {
          const canonicalId = rows[0].id;
          const deleteIds = rows.slice(1).map((r: any) => r.id);
          if (deleteIds.length > 0) {
            await db.query(`DELETE FROM sessoes WHERE id IN (?)`, [deleteIds]);
            console.log(`[Deduplicate] Code ${code}: kept canonical row ${canonicalId}, removed duplicate rows ${deleteIds.join(',')}`);
          }
        }
      }
    }

    // Try adding unique key uk_sessoes_codigo if not already present
    await db.query(`ALTER TABLE sessoes ADD UNIQUE KEY uk_sessoes_codigo (codigo)`).catch(() => {});
  } catch (err: any) {
    console.warn('[deduplicateSessionsTable Warning]:', err?.message || err);
  }
}

export async function ensureAdminAccessTable(): Promise<void> {
  if (!isDatabaseConfigured()) return;
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS admin_access_actions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        target_access_key_id INT NOT NULL,
        target_masked_key VARCHAR(50) NOT NULL,
        action_type VARCHAR(50) NOT NULL,
        reason VARCHAR(255) DEFAULT NULL,
        admin_identifier VARCHAR(100) DEFAULT NULL,
        ip_address VARCHAR(100) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_target_key_id (target_access_key_id),
        INDEX idx_action_type (action_type),
        INDEX idx_created_at (created_at),
        CONSTRAINT fk_admin_access_key
          FOREIGN KEY (target_access_key_id)
          REFERENCES codigos_acesso(id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Migrate column if existing table had target_access_key
    await db.query(`ALTER TABLE admin_access_actions ADD COLUMN target_access_key_id INT NOT NULL`).catch(() => {});
    await db.query(`ALTER TABLE admin_access_actions MODIFY COLUMN target_access_key_id INT NOT NULL`).catch(() => {});
  } catch (err: any) {
    console.warn('[MySQL ensureAdminAccessTable Error]:', err?.message || err);
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

export async function ensureAgentInteractionsTable(): Promise<void> {
  if (!isDatabaseConfigured()) return;
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS interacoes_agentes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        codigo VARCHAR(100),
        agent_id VARCHAR(100),
        agent_name VARCHAR(150),
        category VARCHAR(100),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_agent_id (agent_id),
        INDEX idx_category (category),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } catch (err: any) {
    console.warn('[MySQL ensureAgentInteractionsTable Error]:', err?.message || err);
  }
}



