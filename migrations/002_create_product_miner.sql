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
  query_source VARCHAR(120) DEFAULT NULL,
  first_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tsp_sold_count (sold_count),
  INDEX idx_tsp_last_seen (last_seen_at),
  INDEX idx_tsp_seller (seller_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tiktok_shop_product_snapshots (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id VARCHAR(64) NOT NULL,
  sold_count BIGINT NOT NULL DEFAULT 0,
  price_cents INT DEFAULT NULL,
  video_views BIGINT DEFAULT NULL,
  query_source VARCHAR(120) DEFAULT NULL,
  captured_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tsps_product_time (product_id, captured_at),
  INDEX idx_tsps_captured (captured_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
