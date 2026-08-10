import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  database: process.env.DB_NAME || '',
  user: process.env.DB_USER || '',
  password: process.env.DB_PASSWORD || '',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 3,
  maxIdle: 3,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  ssl: process.env.DB_SSL === 'true'
    ? { rejectUnauthorized: false }
    : undefined,
});

try {
  const poolObj = (db as any).pool || db;
  if (typeof poolObj.on === 'function') {
    poolObj.on('connection', () => console.log('[MYSQL POOL CONNECTION] Nova conexão estabelecida no pool'));
    poolObj.on('acquire', () => console.log('[MYSQL POOL ACQUIRE] Conexão adquirida do pool'));
    poolObj.on('release', () => console.log('[MYSQL POOL RELEASE] Conexão devolvida ao pool'));
    poolObj.on('enqueue', () => console.log('[MYSQL POOL ENQUEUE] Aguardando conexão disponível no pool'));
  }
} catch (e) {}

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

let codigosAcessoPromise: Promise<void> | null = null;
export function ensureCodigosAcessoTable(): Promise<void> {
  if (!isDatabaseConfigured()) return Promise.resolve();
  if (!codigosAcessoPromise) {
    codigosAcessoPromise = (async () => {
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
          product_miner_enabled TINYINT(1) DEFAULT 0,
          product_miner_enabled_at DATETIME DEFAULT NULL,
          product_miner_enabled_by VARCHAR(100) DEFAULT NULL,
          criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_codigo (codigo),
          INDEX idx_access_status (access_status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

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
        `ALTER TABLE codigos_acesso ADD COLUMN product_miner_enabled TINYINT(1) DEFAULT 0`,
        `ALTER TABLE codigos_acesso ADD COLUMN product_miner_enabled_at DATETIME DEFAULT NULL`,
        `ALTER TABLE codigos_acesso ADD COLUMN product_miner_enabled_by VARCHAR(100) DEFAULT NULL`,
      ];

      for (const q of alterQueries) {
        await db.query(q).catch(() => {});
      }
    })().catch((err: any) => {
      codigosAcessoPromise = null;
      console.warn('[MySQL ensureCodigosAcessoTable Error]:', err?.message || err);
      throw err;
    });
  }
  return codigosAcessoPromise;
}

let sessionsTablePromise: Promise<void> | null = null;
export function ensureSessionsTable(): Promise<void> {
  if (!isDatabaseConfigured()) return Promise.resolve();
  if (!sessionsTablePromise) {
    sessionsTablePromise = (async () => {
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

      const alterQueries = [
        `ALTER TABLE sessoes ADD COLUMN id INT AUTO_INCREMENT UNIQUE KEY`,
        `ALTER TABLE sessoes ADD COLUMN current_page VARCHAR(255) DEFAULT 'TikTok 2K'`,
        `ALTER TABLE sessoes ADD COLUMN current_action VARCHAR(255) DEFAULT 'Visualizando'`,
        `ALTER TABLE sessoes ADD COLUMN current_agent_id VARCHAR(255) DEFAULT NULL`,
        `ALTER TABLE sessoes ADD COLUMN current_agent_name VARCHAR(255) DEFAULT NULL`,
        `ALTER TABLE sessoes ADD COLUMN agent_category VARCHAR(255) DEFAULT NULL`,
        `ALTER TABLE sessoes ADD COLUMN ip_address VARCHAR(100) DEFAULT NULL`,
        `ALTER TABLE sessoes ADD COLUMN user_agent TEXT DEFAULT NULL`,
        `ALTER TABLE sessoes ADD COLUMN device_type VARCHAR(50) DEFAULT 'Computador'`,
        `ALTER TABLE sessoes ADD COLUMN browser_name VARCHAR(50) DEFAULT 'Desconhecido'`,
        `ALTER TABLE sessoes ADD COLUMN operating_system VARCHAR(50) DEFAULT 'Desconhecido'`,
        `ALTER TABLE sessoes ADD COLUMN login_at DATETIME DEFAULT NULL`,
        `ALTER TABLE sessoes ADD COLUMN logout_at DATETIME DEFAULT NULL`,
        `ALTER TABLE sessoes ADD COLUMN disconnect_source VARCHAR(50) DEFAULT NULL`,
        `ALTER TABLE sessoes ADD COLUMN disconnected_at DATETIME DEFAULT NULL`,
        `ALTER TABLE sessoes ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`,
        `ALTER TABLE sessoes ADD INDEX idx_sessoes_active_session (active_session_id)`,
        `ALTER TABLE sessoes ADD INDEX idx_sessoes_current_page (current_page)`,
        `ALTER TABLE sessoes ADD INDEX idx_sessoes_current_agent_id (current_agent_id)`,
        `ALTER TABLE sessoes ADD INDEX idx_sessoes_operating_system (operating_system)`,
        `ALTER TABLE sessoes ADD INDEX idx_sessoes_device_type (device_type)`,
        `ALTER TABLE sessoes ADD INDEX idx_sessoes_browser_name (browser_name)`,
        `ALTER TABLE sessoes ADD INDEX idx_sessoes_status (status)`,
        `ALTER TABLE sessoes ADD INDEX idx_sessoes_heartbeat (last_heartbeat_at)`,
        `ALTER TABLE sessoes ADD INDEX idx_sessoes_updated (updated_at)`,
      ];

      for (const q of alterQueries) {
        await db.query(q).catch(() => {});
      }
      await deduplicateSessionsTable();
      await ensureCodigosAcessoTable();
      await ensureAdminAccessTable();
      await ensureSessionHistoryTable();
      await ensureAgentInteractionsTable();
      await cleanLegacyDisconnections();
      await migrateLegacyStatsAndPages();
    })().catch((err: any) => {
      sessionsTablePromise = null;
      console.warn('[MySQL ensureSessionsTable Error]:', err?.message || err);
      throw err;
    });
  }
  return sessionsTablePromise;
}

let sessionHistoryPromise: Promise<void> | null = null;
export function ensureSessionHistoryTable(): Promise<void> {
  if (!isDatabaseConfigured()) return Promise.resolve();
  if (!sessionHistoryPromise) {
    sessionHistoryPromise = (async () => {
      await db.query(`
        CREATE TABLE IF NOT EXISTS session_history (
          id INT AUTO_INCREMENT PRIMARY KEY,
          codigo VARCHAR(100) NOT NULL,
          session_id INT DEFAULT NULL,
          event_type VARCHAR(50) NOT NULL,
          page VARCHAR(255) DEFAULT NULL,
          category VARCHAR(255) DEFAULT NULL,
          device VARCHAR(255) DEFAULT NULL,
          browser VARCHAR(255) DEFAULT NULL,
          ip VARCHAR(100) DEFAULT NULL,
          details TEXT DEFAULT NULL,
          mentor_responsavel VARCHAR(100) DEFAULT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_hist_codigo (codigo),
          INDEX idx_hist_event (event_type),
          INDEX idx_hist_created (created_at),
          INDEX idx_hist_page (page)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      const alterHistQueries = [
        `ALTER TABLE session_history ADD COLUMN category VARCHAR(255) DEFAULT NULL`,
        `ALTER TABLE session_history ADD COLUMN current_action VARCHAR(255) DEFAULT NULL`,
        `ALTER TABLE session_history ADD COLUMN agent_id VARCHAR(255) DEFAULT NULL`,
        `ALTER TABLE session_history ADD COLUMN agent_name VARCHAR(255) DEFAULT NULL`,
        `ALTER TABLE session_history ADD COLUMN agent_category VARCHAR(255) DEFAULT NULL`,
        `ALTER TABLE session_history ADD COLUMN browser VARCHAR(255) DEFAULT NULL`,
        `ALTER TABLE session_history ADD COLUMN mentor_responsavel VARCHAR(100) DEFAULT NULL`,
        `ALTER TABLE session_history ADD INDEX idx_hist_page (page)`,
        `ALTER TABLE session_history ADD INDEX idx_hist_agent_id (agent_id)`,
        `ALTER TABLE session_history ADD INDEX idx_hist_agent_cat (agent_category)`,
      ];
      for (const q of alterHistQueries) {
        await db.query(q).catch(() => {});
      }
    })().catch((err: any) => {
      sessionHistoryPromise = null;
      console.warn('[MySQL ensureSessionHistoryTable Error]:', err?.message || err);
      throw err;
    });
  }
  return sessionHistoryPromise;
}

export async function migrateLegacyStatsAndPages(): Promise<{
  agentesGptSessoes: number;
  agentesGptHistory: number;
  agentesGptInteracoes: number;
  bibliotecaAfiliadosSessoes: number;
  bibliotecaAfiliadosHistory: number;
}> {
  const result = {
    agentesGptSessoes: 0,
    agentesGptHistory: 0,
    agentesGptInteracoes: 0,
    bibliotecaAfiliadosSessoes: 0,
    bibliotecaAfiliadosHistory: 0,
  };

  if (!isDatabaseConfigured()) return result;

  try {
    // 1. Agentes GPT in sessoes -> Dashboard
    const [res1]: any = await db.query(
      `UPDATE sessoes SET current_page = 'Dashboard' WHERE current_page = 'Agentes GPT'`
    ).catch(() => [null]);
    result.agentesGptSessoes = res1?.affectedRows || 0;

    // 2. Agentes GPT in session_history -> Dashboard
    const [res2]: any = await db.query(
      `UPDATE session_history SET page = 'Dashboard' WHERE page = 'Agentes GPT'`
    ).catch(() => [null]);
    const [res2cat]: any = await db.query(
      `UPDATE session_history SET category = 'Dashboard' WHERE category = 'Agentes GPT'`
    ).catch(() => [null]);
    result.agentesGptHistory = (res2?.affectedRows || 0) + (res2cat?.affectedRows || 0);

    // 3. Agentes GPT in interacoes_agentes -> Dashboard
    const [res3]: any = await db.query(
      `UPDATE interacoes_agentes SET category = 'Dashboard' WHERE category = 'Agentes GPT'`
    ).catch(() => [null]);
    result.agentesGptInteracoes = res3?.affectedRows || 0;

    // 4. Biblioteca de Produtos wrongly set for student sessoes -> Programa de Afiliados
    const [res4]: any = await db.query(
      `UPDATE sessoes SET current_page = 'Programa de Afiliados' WHERE current_page = 'Biblioteca de Produtos' AND codigo NOT LIKE 'MASTER%'`
    ).catch(() => [null]);
    result.bibliotecaAfiliadosSessoes = res4?.affectedRows || 0;

    // 5. Biblioteca de Produtos in session_history for students -> Programa de Afiliados
    const [res5]: any = await db.query(
      `UPDATE session_history SET page = 'Programa de Afiliados' WHERE page = 'Biblioteca de Produtos' AND codigo NOT LIKE 'MASTER%'`
    ).catch(() => [null]);
    const [res5cat]: any = await db.query(
      `UPDATE session_history SET category = 'Programa de Afiliados' WHERE category = 'Biblioteca de Produtos' AND codigo NOT LIKE 'MASTER%'`
    ).catch(() => [null]);
    result.bibliotecaAfiliadosHistory = (res5?.affectedRows || 0) + (res5cat?.affectedRows || 0);

    if (
      result.agentesGptSessoes > 0 ||
      result.agentesGptHistory > 0 ||
      result.bibliotecaAfiliadosSessoes > 0 ||
      result.bibliotecaAfiliadosHistory > 0
    ) {
      console.log('[MIGRATION STATS COMPLETED]', result);
    }
  } catch (err: any) {
    console.warn('[Migration Warning]:', err?.message || err);
  }

  return result;
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

let adminAccessPromise: Promise<void> | null = null;
export function ensureAdminAccessTable(): Promise<void> {
  if (!isDatabaseConfigured()) return Promise.resolve();
  if (!adminAccessPromise) {
    adminAccessPromise = (async () => {
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

      await db.query(`ALTER TABLE admin_access_actions ADD COLUMN target_access_key_id INT NOT NULL`).catch(() => {});
      await db.query(`ALTER TABLE admin_access_actions MODIFY COLUMN target_access_key_id INT NOT NULL`).catch(() => {});
    })().catch((err: any) => {
      adminAccessPromise = null;
      console.warn('[MySQL ensureAdminAccessTable Error]:', err?.message || err);
      throw err;
    });
  }
  return adminAccessPromise;
}

let productsTablePromise: Promise<void> | null = null;
export function ensureProductsTable(): Promise<void> {
  if (!isDatabaseConfigured()) return Promise.resolve();
  if (!productsTablePromise) {
    productsTablePromise = (async () => {
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
    })().catch((err: any) => {
      productsTablePromise = null;
      console.warn('[MySQL ensureProductsTable Error]:', err?.message || err);
      throw err;
    });
  }
  return productsTablePromise;
}

let progressTablePromise: Promise<void> | null = null;
export function ensureProgressTable(): Promise<void> {
  if (!isDatabaseConfigured()) return Promise.resolve();
  if (!progressTablePromise) {
    progressTablePromise = (async () => {
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
    })().catch((err: any) => {
      progressTablePromise = null;
      console.warn('[MySQL ensureProgressTable Error]:', err?.message || err);
      throw err;
    });
  }
  return progressTablePromise;
}

let profilesTablePromise: Promise<void> | null = null;
export function ensureProfilesTable(): Promise<void> {
  if (!isDatabaseConfigured()) return Promise.resolve();
  if (!profilesTablePromise) {
    profilesTablePromise = (async () => {
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

      await db.query(`ALTER TABLE perfis_alunos MODIFY COLUMN avatar LONGTEXT NULL`).catch(() => {});
    })().catch((err: any) => {
      profilesTablePromise = null;
      console.warn('[MySQL ensureProfilesTable Error]:', err?.message || err);
      throw err;
    });
  }
  return profilesTablePromise;
}

let agentInteractionsPromise: Promise<void> | null = null;
export function ensureAgentInteractionsTable(): Promise<void> {
  if (!isDatabaseConfigured()) return Promise.resolve();
  if (!agentInteractionsPromise) {
    agentInteractionsPromise = (async () => {
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
    })().catch((err: any) => {
      agentInteractionsPromise = null;
      console.warn('[MySQL ensureAgentInteractionsTable Error]:', err?.message || err);
      throw err;
    });
  }
  return agentInteractionsPromise;
}

let chatTablesPromise: Promise<void> | null = null;

async function runChatTablesSetup(): Promise<void> {
  // 1. chat_profiles
  await db.query(`
    CREATE TABLE IF NOT EXISTS chat_profiles (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      access_key_id BIGINT UNSIGNED DEFAULT NULL,
      codigo VARCHAR(100) NOT NULL UNIQUE,
      nickname VARCHAR(30) NOT NULL UNIQUE,
      photo_url VARCHAR(500) DEFAULT NULL,
      phone VARCHAR(30) NOT NULL,
      phone_visibility ENUM('MENTOR_ONLY', 'MEMBERS') DEFAULT 'MENTOR_ONLY',
      bio VARCHAR(160) DEFAULT NULL,
      chat_status ENUM('ACTIVE', 'SUSPENDED', 'BANNED') DEFAULT 'ACTIVE',
      community_rules_accepted_at DATETIME DEFAULT NULL,
      last_chat_activity_at DATETIME DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_chat_codigo (codigo),
      INDEX idx_chat_nickname (nickname),
      INDEX idx_chat_status (chat_status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

    // Ensure V1.2 profile columns
    const profColQueries = [
      `ALTER TABLE chat_profiles ADD COLUMN bio VARCHAR(255) DEFAULT NULL`,
      `ALTER TABLE chat_profiles ADD COLUMN cidade VARCHAR(100) DEFAULT NULL`,
      `ALTER TABLE chat_profiles ADD COLUMN instagram VARCHAR(100) DEFAULT NULL`,
      `ALTER TABLE chat_profiles ADD COLUMN tiktok VARCHAR(100) DEFAULT NULL`,
      `ALTER TABLE chat_profiles ADD COLUMN xp INT UNSIGNED DEFAULT 0`,
      `ALTER TABLE chat_profiles ADD COLUMN xp_total BIGINT UNSIGNED NOT NULL DEFAULT 0`,
      `ALTER TABLE chat_profiles ADD COLUMN current_level INT UNSIGNED NOT NULL DEFAULT 1`,
      `ALTER TABLE chat_profiles ADD COLUMN message_count BIGINT UNSIGNED NOT NULL DEFAULT 0`,
      `ALTER TABLE chat_profiles ADD COLUMN reply_count BIGINT UNSIGNED NOT NULL DEFAULT 0`,
      `ALTER TABLE chat_profiles ADD COLUMN reaction_given_count BIGINT UNSIGNED NOT NULL DEFAULT 0`,
      `ALTER TABLE chat_profiles ADD COLUMN reaction_received_count BIGINT UNSIGNED NOT NULL DEFAULT 0`,
      `ALTER TABLE chat_profiles ADD COLUMN image_count BIGINT UNSIGNED NOT NULL DEFAULT 0`,
      `ALTER TABLE chat_profiles ADD COLUMN audio_count BIGINT UNSIGNED NOT NULL DEFAULT 0`,
      `ALTER TABLE chat_profiles ADD COLUMN poll_vote_count BIGINT UNSIGNED NOT NULL DEFAULT 0`,
      `ALTER TABLE chat_profiles ADD COLUMN current_streak INT UNSIGNED NOT NULL DEFAULT 0`,
      `ALTER TABLE chat_profiles ADD COLUMN longest_streak INT UNSIGNED NOT NULL DEFAULT 0`,
      `ALTER TABLE chat_profiles ADD COLUMN last_participation_date DATE DEFAULT NULL`,
      `ALTER TABLE chat_profiles ADD COLUMN last_xp_event_at DATETIME DEFAULT NULL`,
      `ALTER TABLE chat_profiles ADD COLUMN profile_rank INT UNSIGNED DEFAULT NULL`,
      `ALTER TABLE chat_profiles ADD COLUMN is_moderator TINYINT(1) NOT NULL DEFAULT 0`,
    ];
    for (const q of profColQueries) {
      await db.query(q).catch(() => {});
    }

    // 2. chat_rooms
    await db.query(`
      CREATE TABLE IF NOT EXISTS chat_rooms (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(120) NOT NULL UNIQUE,
        description VARCHAR(255) DEFAULT NULL,
        room_type ENUM('PUBLIC', 'PRIVATE', 'SYSTEM') DEFAULT 'PUBLIC',
        is_active TINYINT(1) DEFAULT 1,
        created_by BIGINT UNSIGNED DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_room_slug (slug)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Initial room seeding
    await db.query(`
      INSERT INTO chat_rooms (name, slug, description, room_type, is_active)
      VALUES ('💬 Comunidade Geração Z Pro', 'comunidade-geracao-z-pro', 'Sala geral exclusiva para alunos da Mentoria Geração Z Pro.', 'PUBLIC', 1)
      ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description)
    `).catch(() => {});

    // 3. chat_room_members
    await db.query(`
      CREATE TABLE IF NOT EXISTS chat_room_members (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        room_id BIGINT UNSIGNED NOT NULL,
        profile_id BIGINT UNSIGNED NOT NULL,
        member_role ENUM('MEMBER', 'MODERATOR', 'MENTOR') DEFAULT 'MEMBER',
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_read_message_id BIGINT UNSIGNED DEFAULT NULL,
        is_muted TINYINT(1) DEFAULT 0,
        is_active TINYINT(1) DEFAULT 1,
        UNIQUE KEY uk_room_profile (room_id, profile_id),
        INDEX idx_room_m_profile (room_id, profile_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 4. chat_messages
    await db.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        room_id BIGINT UNSIGNED NOT NULL,
        profile_id BIGINT UNSIGNED NOT NULL,
        reply_to_message_id BIGINT UNSIGNED DEFAULT NULL,
        message_type VARCHAR(30) DEFAULT 'TEXT',
        content TEXT NOT NULL,
        image_url VARCHAR(1000) DEFAULT NULL,
        image_width INT DEFAULT NULL,
        image_height INT DEFAULT NULL,
        image_size BIGINT DEFAULT NULL,
        image_mime VARCHAR(100) DEFAULT NULL,
        caption VARCHAR(1000) DEFAULT NULL,
        edited_at DATETIME DEFAULT NULL,
        deleted_at DATETIME DEFAULT NULL,
        deleted_by BIGINT UNSIGNED DEFAULT NULL,
        is_pinned TINYINT(1) DEFAULT 0,
        pinned_at DATETIME DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_msg_room_id (room_id, id),
        INDEX idx_msg_room_created (room_id, created_at),
        INDEX idx_msg_profile_created (profile_id, created_at),
        INDEX idx_msg_reply (reply_to_message_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    const msgColQueries = [
      `ALTER TABLE chat_messages MODIFY COLUMN message_type VARCHAR(30) DEFAULT 'TEXT'`,
      `ALTER TABLE chat_messages ADD COLUMN image_url VARCHAR(1000) DEFAULT NULL`,
      `ALTER TABLE chat_messages ADD COLUMN image_width INT DEFAULT NULL`,
      `ALTER TABLE chat_messages ADD COLUMN image_height INT DEFAULT NULL`,
      `ALTER TABLE chat_messages ADD COLUMN image_size BIGINT DEFAULT NULL`,
      `ALTER TABLE chat_messages ADD COLUMN image_mime VARCHAR(100) DEFAULT NULL`,
      `ALTER TABLE chat_messages ADD COLUMN caption VARCHAR(1000) DEFAULT NULL`,
      `ALTER TABLE chat_messages ADD COLUMN client_request_id VARCHAR(100) DEFAULT NULL`,
      `ALTER TABLE chat_messages ADD UNIQUE KEY uk_prof_client_req (profile_id, client_request_id)`,
    ];
    for (const q of msgColQueries) {
      await db.query(q).catch(() => {});
    }

    // 5. chat_message_reports
    await db.query(`
      CREATE TABLE IF NOT EXISTS chat_message_reports (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        message_id BIGINT UNSIGNED NOT NULL,
        reporter_profile_id BIGINT UNSIGNED NOT NULL,
        reason VARCHAR(50) NOT NULL,
        details VARCHAR(500) DEFAULT NULL,
        report_status ENUM('OPEN', 'REVIEWED', 'RESOLVED', 'DISMISSED') DEFAULT 'OPEN',
        reviewed_by BIGINT UNSIGNED DEFAULT NULL,
        reviewed_at DATETIME DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_report_msg_reporter (message_id, reporter_profile_id),
        INDEX idx_rep_message (message_id),
        INDEX idx_rep_status (report_status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 6. chat_moderation_actions
    await db.query(`
      CREATE TABLE IF NOT EXISTS chat_moderation_actions (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        mentor_identifier VARCHAR(100) NOT NULL,
        target_profile_id BIGINT UNSIGNED DEFAULT NULL,
        message_id BIGINT UNSIGNED DEFAULT NULL,
        action_type ENUM(
          'MESSAGE_DELETE',
          'WARNING',
          'CHAT_SUSPEND',
          'CHAT_BAN',
          'CHAT_REACTIVATE',
          'MESSAGE_PIN',
          'NOTICE_CREATE'
        ) NOT NULL,
        reason VARCHAR(500) DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_mod_target (target_profile_id),
        INDEX idx_mod_action (action_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 7. chat_notices
    await db.query(`
      CREATE TABLE IF NOT EXISTS chat_notices (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        room_id BIGINT UNSIGNED NOT NULL,
        content TEXT NOT NULL,
        created_by VARCHAR(100) NOT NULL,
        is_active TINYINT(1) DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_notice_room (room_id, is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 8. chat_reactions
    await db.query(`
      CREATE TABLE IF NOT EXISTS chat_reactions (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        message_id BIGINT UNSIGNED NOT NULL,
        profile_id BIGINT UNSIGNED NOT NULL,
        emoji VARCHAR(20) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_msg_prof_emoji (message_id, profile_id, emoji),
        INDEX idx_react_msg (message_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 9. chat_mentions
    await db.query(`
      CREATE TABLE IF NOT EXISTS chat_mentions (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        message_id BIGINT UNSIGNED NOT NULL,
        source_profile_id BIGINT UNSIGNED NOT NULL,
        target_profile_id BIGINT UNSIGNED NOT NULL,
        is_read TINYINT(1) DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_mention_target (target_profile_id, is_read)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 10. chat_polls
    await db.query(`
      CREATE TABLE IF NOT EXISTS chat_polls (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        room_id BIGINT UNSIGNED NOT NULL,
        question VARCHAR(255) NOT NULL,
        options_json JSON NOT NULL,
        created_by VARCHAR(100) NOT NULL,
        is_active TINYINT(1) DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_poll_room (room_id, is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 11. chat_poll_votes
    await db.query(`
      CREATE TABLE IF NOT EXISTS chat_poll_votes (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        poll_id BIGINT UNSIGNED NOT NULL,
        profile_id BIGINT UNSIGNED NOT NULL,
        option_index INT UNSIGNED NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_poll_prof (poll_id, profile_id),
        INDEX idx_poll_v_id (poll_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 12. chat_favorites
    await db.query(`
      CREATE TABLE IF NOT EXISTS chat_favorites (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        profile_id BIGINT UNSIGNED NOT NULL,
        message_id BIGINT UNSIGNED NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_fav_prof_msg (profile_id, message_id),
        INDEX idx_fav_prof (profile_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 13. chat_xp_events
    await db.query(`
      CREATE TABLE IF NOT EXISTS chat_xp_events (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        profile_id BIGINT UNSIGNED NOT NULL,
        event_type VARCHAR(50) NOT NULL,
        reference_type VARCHAR(50) DEFAULT NULL,
        reference_id BIGINT UNSIGNED DEFAULT NULL,
        xp_amount INT NOT NULL,
        deduplication_key VARCHAR(191) DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_chat_xp_deduplication (deduplication_key),
        INDEX idx_xp_prof_created (profile_id, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 14. chat_achievements
    await db.query(`
      CREATE TABLE IF NOT EXISTS chat_achievements (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(80) NOT NULL UNIQUE,
        name VARCHAR(120) NOT NULL,
        description VARCHAR(255) DEFAULT NULL,
        icon VARCHAR(50) DEFAULT NULL,
        xp_reward INT NOT NULL DEFAULT 0,
        criteria_type VARCHAR(50) NOT NULL,
        criteria_value INT NOT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 15. chat_profile_achievements
    await db.query(`
      CREATE TABLE IF NOT EXISTS chat_profile_achievements (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        profile_id BIGINT UNSIGNED NOT NULL,
        achievement_id BIGINT UNSIGNED NOT NULL,
        unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_prof_ach (profile_id, achievement_id),
        INDEX idx_prof_ach_prof (profile_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 16. chat_announcements
    await db.query(`
      CREATE TABLE IF NOT EXISTS chat_announcements (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(150) NOT NULL,
        content TEXT NOT NULL,
        announcement_type ENUM('NOTICE', 'UPDATE', 'NEW_AGENT', 'LIVE', 'IMPORTANT') NOT NULL DEFAULT 'NOTICE',
        badge VARCHAR(100) DEFAULT NULL,
        is_pinned TINYINT(1) NOT NULL DEFAULT 0,
        starts_at DATETIME DEFAULT NULL,
        ends_at DATETIME DEFAULT NULL,
        created_by VARCHAR(100) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_ann_pinned (is_pinned, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 17. chat_notifications
    await db.query(`
      CREATE TABLE IF NOT EXISTS chat_notifications (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        profile_id BIGINT UNSIGNED NOT NULL,
        notification_type VARCHAR(50) NOT NULL,
        reference_type VARCHAR(50) DEFAULT NULL,
        reference_id BIGINT UNSIGNED DEFAULT NULL,
        title VARCHAR(150) NOT NULL,
        content TEXT DEFAULT NULL,
        related_message_id BIGINT UNSIGNED DEFAULT NULL,
        related_profile_id BIGINT UNSIGNED DEFAULT NULL,
        related_room_id BIGINT UNSIGNED DEFAULT NULL,
        related_poll_id BIGINT UNSIGNED DEFAULT NULL,
        related_achievement_id BIGINT UNSIGNED DEFAULT NULL,
        deduplication_key VARCHAR(255) DEFAULT NULL,
        is_read TINYINT(1) DEFAULT 0,
        read_at DATETIME DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_notif_prof (profile_id, is_read, created_at),
        UNIQUE KEY uq_notif_dedup (deduplication_key)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    const notifColQueries = [
      `ALTER TABLE chat_notifications ADD COLUMN content TEXT DEFAULT NULL`,
      `ALTER TABLE chat_notifications ADD COLUMN related_message_id BIGINT UNSIGNED DEFAULT NULL`,
      `ALTER TABLE chat_notifications ADD COLUMN related_profile_id BIGINT UNSIGNED DEFAULT NULL`,
      `ALTER TABLE chat_notifications ADD COLUMN related_room_id BIGINT UNSIGNED DEFAULT NULL`,
      `ALTER TABLE chat_notifications ADD COLUMN related_poll_id BIGINT UNSIGNED DEFAULT NULL`,
      `ALTER TABLE chat_notifications ADD COLUMN related_achievement_id BIGINT UNSIGNED DEFAULT NULL`,
      `ALTER TABLE chat_notifications ADD COLUMN deduplication_key VARCHAR(255) DEFAULT NULL`,
      `ALTER TABLE chat_notifications ADD UNIQUE KEY uq_notif_dedup (deduplication_key)`,
    ];
    for (const q of notifColQueries) {
      await db.query(q).catch(() => {});
    }

    // 18. chat_message_reads
    await db.query(`
      CREATE TABLE IF NOT EXISTS chat_message_reads (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        message_id BIGINT UNSIGNED NOT NULL,
        profile_id BIGINT UNSIGNED NOT NULL,
        read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_msg_read_prof (message_id, profile_id),
        INDEX idx_msg_reads (message_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 19. chat_media
    await db.query(`
      CREATE TABLE IF NOT EXISTS chat_media (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        profile_id BIGINT UNSIGNED NOT NULL,
        room_id BIGINT UNSIGNED DEFAULT NULL,
        message_id BIGINT UNSIGNED DEFAULT NULL,
        media_type ENUM('IMAGE', 'AUDIO', 'AVATAR', 'STICKER', 'GIF') NOT NULL,
        storage_provider VARCHAR(50) NOT NULL DEFAULT 'LOCAL',
        storage_key VARCHAR(500) NOT NULL,
        public_url VARCHAR(1000) NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        file_size BIGINT UNSIGNED NOT NULL,
        width INT DEFAULT NULL,
        height INT DEFAULT NULL,
        duration_seconds DECIMAL(10,2) DEFAULT NULL,
        upload_status ENUM('PENDING', 'READY', 'FAILED', 'DELETED') DEFAULT 'READY',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME DEFAULT NULL,
        INDEX idx_media_prof (profile_id),
        INDEX idx_media_msg (message_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await db.query(`ALTER TABLE chat_media MODIFY COLUMN media_type ENUM('IMAGE', 'AUDIO', 'AVATAR', 'STICKER', 'GIF') NOT NULL`).catch(() => {});

    // 20. chat_message_edits
    await db.query(`
      CREATE TABLE IF NOT EXISTS chat_message_edits (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        message_id BIGINT UNSIGNED NOT NULL,
        edited_by_profile_id BIGINT UNSIGNED NOT NULL,
        previous_content TEXT NOT NULL,
        new_content TEXT NOT NULL,
        edited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_edits_msg (message_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 21. chat_user_mutes
    await db.query(`
      CREATE TABLE IF NOT EXISTS chat_user_mutes (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        profile_id BIGINT UNSIGNED NOT NULL,
        muted_profile_id BIGINT UNSIGNED NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_prof_muted (profile_id, muted_profile_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 22. chat_user_blocks
    await db.query(`
      CREATE TABLE IF NOT EXISTS chat_user_blocks (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        profile_id BIGINT UNSIGNED NOT NULL,
        blocked_profile_id BIGINT UNSIGNED NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_prof_blocked (profile_id, blocked_profile_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 23. chat_contacts
    await db.query(`
      CREATE TABLE IF NOT EXISTS chat_contacts (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        owner_profile_id BIGINT UNSIGNED NOT NULL,
        contact_profile_id BIGINT UNSIGNED NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_owner_contact (owner_profile_id, contact_profile_id),
        INDEX idx_owner (owner_profile_id),
        INDEX idx_contact (contact_profile_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
}

export function ensureChatTables(): Promise<void> {
  if (!isDatabaseConfigured()) return Promise.resolve();
  if (!chatTablesPromise) {
    chatTablesPromise = runChatTablesSetup().catch((err: any) => {
      chatTablesPromise = null;
      console.warn('[MySQL ensureChatTables Error]:', err?.message || err);
      throw err;
    });
  }
  return chatTablesPromise;
}


let productMinerTablesPromise: Promise<void> | null = null;
export function ensureProductMinerTables(): Promise<void> {
  if (!isDatabaseConfigured()) return Promise.resolve();
  if (!productMinerTablesPromise) {
    productMinerTablesPromise = (async () => {
      await db.query(`
        CREATE TABLE IF NOT EXISTS tiktok_shop_products (
          product_id VARCHAR(64) PRIMARY KEY,
          title TEXT NOT NULL,
          image_url TEXT DEFAULT NULL,
          price_cents INT DEFAULT NULL,
          original_price_cents INT DEFAULT NULL,
          discount_percent INT DEFAULT NULL,
          currency_symbol VARCHAR(10) DEFAULT 'R$',
          rating DECIMAL(4,2) DEFAULT NULL,
          sold_count BIGINT NOT NULL DEFAULT 0,
          seller_id VARCHAR(64) DEFAULT NULL,
          seller_name VARCHAR(255) DEFAULT NULL,
          product_url TEXT DEFAULT NULL,
          category_path VARCHAR(500) DEFAULT NULL,
          video_id VARCHAR(64) DEFAULT NULL,
          video_url TEXT DEFAULT NULL,
          video_author VARCHAR(255) DEFAULT NULL,
          video_author_followers BIGINT DEFAULT NULL,
          video_views BIGINT DEFAULT NULL,
          video_likes BIGINT DEFAULT NULL,
          video_comments BIGINT DEFAULT NULL,
          video_shares BIGINT DEFAULT NULL,
          video_saves BIGINT DEFAULT NULL,
          estimated_commission_cents INT DEFAULT NULL,
          commission_rate_percent INT DEFAULT NULL,
          query_source VARCHAR(120) DEFAULT NULL,
          first_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_tsp_sold_count (sold_count),
          INDEX idx_tsp_last_seen (last_seen_at),
          INDEX idx_tsp_seller (seller_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS tiktok_shop_product_snapshots (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          product_id VARCHAR(64) NOT NULL,
          sold_count BIGINT NOT NULL DEFAULT 0,
          price_cents INT DEFAULT NULL,
          video_views BIGINT DEFAULT NULL,
          query_source VARCHAR(120) DEFAULT NULL,
          rating FLOAT DEFAULT NULL,
          seller_id VARCHAR(64) DEFAULT NULL,
          seller_name VARCHAR(255) DEFAULT NULL,
          collection_position INT DEFAULT NULL,
          captured_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_tsps_product_time (product_id, captured_at),
          INDEX idx_tsps_captured (captured_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      try {
        const [cols]: any = await db.query(`SHOW COLUMNS FROM tiktok_shop_product_snapshots`);
        const colNames = Array.isArray(cols) ? cols.map((c: any) => c.Field) : [];
        if (!colNames.includes('rating')) {
          await db.query(`ALTER TABLE tiktok_shop_product_snapshots ADD COLUMN rating FLOAT DEFAULT NULL`).catch(() => {});
        }
        if (!colNames.includes('seller_id')) {
          await db.query(`ALTER TABLE tiktok_shop_product_snapshots ADD COLUMN seller_id VARCHAR(64) DEFAULT NULL`).catch(() => {});
        }
        if (!colNames.includes('seller_name')) {
          await db.query(`ALTER TABLE tiktok_shop_product_snapshots ADD COLUMN seller_name VARCHAR(255) DEFAULT NULL`).catch(() => {});
        }
        if (!colNames.includes('collection_position')) {
          await db.query(`ALTER TABLE tiktok_shop_product_snapshots ADD COLUMN collection_position INT DEFAULT NULL`).catch(() => {});
        }
      } catch (colErr: any) {
        console.warn('[MySQL Snapshot Columns Check Warning]:', colErr?.message || colErr);
      }

      await db.query(`
        CREATE TABLE IF NOT EXISTS tiktok_shop_search_cache (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          search_query VARCHAR(120) NOT NULL,
          region VARCHAR(8) NOT NULL DEFAULT 'BR',
          page INT NOT NULL DEFAULT 1,
          payload_json LONGTEXT NOT NULL,
          expires_at DATETIME NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uq_tssc_query_region_page (search_query, region, page),
          INDEX idx_tssc_expires (expires_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS tiktok_shop_video_downloads (
          product_id VARCHAR(128) PRIMARY KEY,
          video_page_url VARCHAR(500),
          video_post_id VARCHAR(128),
          direct_media_url TEXT,
          media_type VARCHAR(50) DEFAULT 'video',
          provider VARCHAR(50) DEFAULT 'socialcrawl',
          provider_cached TINYINT DEFAULT 0,
          prepared_at DATETIME DEFAULT NULL,
          status VARCHAR(50) NOT NULL,
          error_message TEXT DEFAULT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_tsv_downloads_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS product_miner_script_logs (
          id BIGINT AUTO_INCREMENT PRIMARY KEY,
          student_code VARCHAR(100) NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_pmsl_code_time (student_code, created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      await ensureDailyCollectionsTable();
    })().catch((err: any) => {
      productMinerTablesPromise = null;
      console.warn('[MySQL ensureProductMinerTables Error]:', err?.message || err);
      throw err;
    });
  }
  return productMinerTablesPromise;
}

let dailyCollectionsPromise: Promise<void> | null = null;
export function ensureDailyCollectionsTable(): Promise<void> {
  if (!isDatabaseConfigured()) return Promise.resolve();
  if (!dailyCollectionsPromise) {
    dailyCollectionsPromise = (async () => {
      await db.query(`
        CREATE TABLE IF NOT EXISTS product_miner_daily_collections (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          completed_at DATETIME DEFAULT NULL,
          categories_processed INT NOT NULL DEFAULT 0,
          unique_products_count INT NOT NULL DEFAULT 0,
          credits_used INT NOT NULL DEFAULT 0,
          status ENUM('RUNNING', 'COMPLETED', 'PARTIAL_FAILED', 'FAILED') NOT NULL DEFAULT 'RUNNING',
          current_category VARCHAR(120) DEFAULT NULL,
          failed_categories TEXT DEFAULT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_pmdc_completed (completed_at),
          INDEX idx_pmdc_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    })().catch((err: any) => {
      dailyCollectionsPromise = null;
      console.warn('[MySQL ensureDailyCollectionsTable Error]:', err?.message || err);
      throw err;
    });
  }
  return dailyCollectionsPromise;
}

let tiktokConnectionsPromise: Promise<void> | null = null;
export function ensureTikTokConnectionsTable(): Promise<void> {
  if (!isDatabaseConfigured()) return Promise.resolve();
  if (!tiktokConnectionsPromise) {
    tiktokConnectionsPromise = (async () => {
      await db.query(`
        CREATE TABLE IF NOT EXISTS tiktok_connections (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          codigo VARCHAR(100) NOT NULL,
          open_id VARCHAR(255) NOT NULL,
          union_id VARCHAR(255) DEFAULT NULL,
          display_name VARCHAR(255) DEFAULT NULL,
          avatar_url VARCHAR(500) DEFAULT NULL,
          access_token TEXT NOT NULL,
          refresh_token TEXT DEFAULT NULL,
          access_token_expires_at DATETIME DEFAULT NULL,
          refresh_token_expires_at DATETIME DEFAULT NULL,
          scopes VARCHAR(255) DEFAULT 'user.info.basic',
          connected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          revoked_at DATETIME DEFAULT NULL,
          UNIQUE KEY uk_tiktok_codigo (codigo),
          INDEX idx_tiktok_openid (open_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    })().catch((err: any) => {
      tiktokConnectionsPromise = null;
      console.warn('[MySQL ensureTikTokConnectionsTable Error]:', err?.message || err);
      throw err;
    });
  }
  return tiktokConnectionsPromise;
}

let tiktokOAuthStatesPromise: Promise<void> | null = null;
export function ensureTikTokOAuthStatesTable(): Promise<void> {
  if (!isDatabaseConfigured()) return Promise.resolve();
  if (!tiktokOAuthStatesPromise) {
    tiktokOAuthStatesPromise = (async () => {
      await db.query(`
        CREATE TABLE IF NOT EXISTS tiktok_oauth_states (
          state VARCHAR(100) PRIMARY KEY,
          codigo VARCHAR(100) NOT NULL,
          code_verifier VARCHAR(255) NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    })().catch((err: any) => {
      tiktokOAuthStatesPromise = null;
      console.warn('[MySQL ensureTikTokOAuthStatesTable Error]:', err?.message || err);
      throw err;
    });
  }
  return tiktokOAuthStatesPromise;
}




