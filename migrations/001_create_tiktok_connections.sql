-- Migration: Create tiktok_connections table for TikTok Login Kit Integration
-- Date: 2026-08-06

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
