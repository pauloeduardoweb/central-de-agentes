-- =========================================================
-- MIGRATION: CONTROLE DE ACESSO E AÇÕES ADMINISTRATIVAS
-- PROJETO: Central de Agentes GPT - Geração Z Pro
-- DATA: 2026-07-31
-- FONTE DA VERDADE PERMANENTE: codigos_acesso
-- COMPATÍVEL COM PHPMYADMIN (HOSTINGER)
-- =========================================================

-- 1. ADICIONAR CAMPOS DE STATUS ADMINISTRATIVO NA TABELA PERMANENTE (codigos_acesso)
-- A tabela 'sessoes' guarda SOMENTE conexões, presença, login, logout e invalidação.

ALTER TABLE codigos_acesso 
  ADD COLUMN access_status ENUM('ACTIVE', 'SUSPENDED', 'BANNED') NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN suspension_reason VARCHAR(255) DEFAULT NULL,
  ADD COLUMN suspended_at DATETIME DEFAULT NULL,
  ADD COLUMN suspended_by VARCHAR(100) DEFAULT NULL,
  ADD COLUMN banned_reason VARCHAR(255) DEFAULT NULL,
  ADD COLUMN banned_at DATETIME DEFAULT NULL,
  ADD COLUMN banned_by VARCHAR(100) DEFAULT NULL,
  ADD COLUMN reactivated_at DATETIME DEFAULT NULL,
  ADD COLUMN reactivated_by VARCHAR(100) DEFAULT NULL,
  ADD COLUMN last_admin_action VARCHAR(50) DEFAULT NULL,
  ADD COLUMN last_admin_action_at DATETIME DEFAULT NULL;

-- 2. CRIAR ÍNDICE DE STATUS NA TABELA PERMANENTE DE CHAVES
CREATE INDEX idx_codigos_access_status ON codigos_acesso(access_status);

-- 3. GARANTIR QUE DADOS ANTIGOS COM CAMPO VAZIO RECEBAM 'ACTIVE'
-- Preserva estritamente chaves que eventualmente já estejam SUSPENDED ou BANNED.
UPDATE codigos_acesso 
SET access_status = 'ACTIVE' 
WHERE access_status IS NULL OR access_status = '';

-- 4. CRIAR TABELA DE AUDITORIA DE AÇÕES ADMINISTRATIVAS (admin_access_actions)
-- SEGURANÇA DA AUDITORIA:
-- - Sem armazenamento de chaves em texto puro.
-- - target_access_key_id INT NOT NULL com Chave Estrangeira para codigos_acesso(id).
-- - ON UPDATE CASCADE ON DELETE RESTRICT para preservar o histórico.
-- - target_masked_key para exibição segura (ex: GZ-****-1234).
-- - Sem valor padrão fixo para admin_identifier (preenchido dinamicamente pelo backend).

CREATE TABLE IF NOT EXISTS admin_access_actions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  target_access_key_id INT NOT NULL,
  target_masked_key VARCHAR(50) NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  reason VARCHAR(255) DEFAULT NULL,
  admin_identifier VARCHAR(100) DEFAULT NULL,
  ip_address VARCHAR(100) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_admin_target_key_id (target_access_key_id),
  INDEX idx_admin_action_type (action_type),
  INDEX idx_admin_created_at (created_at),
  CONSTRAINT fk_admin_access_key
    FOREIGN KEY (target_access_key_id)
    REFERENCES codigos_acesso(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
