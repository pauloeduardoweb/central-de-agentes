import express from 'express';
import { lookupKeyType, normalizeAccessCode, type KeyCategory } from './authKeys.js';
import { searchTikTokShopProducts, refreshMultiPageTikTokShopProducts, getProductMinerRanking, getCollectorCategoriesStats, ProductRankingSort } from './productMinerService.js';

export const productMinerRouter = express.Router();

function studentsEnabled(): boolean {
  return String(process.env.PRODUCT_MINER_STUDENTS_ENABLED || '').trim().toLowerCase() === 'true';
}

function getRequesterType(req: express.Request): KeyCategory {
  const raw =
    req.header('x-access-code') ||
    req.header('x-student-access-code') ||
    req.header('x-master-key') ||
    req.header('authorization')?.replace(/^Bearer\s+/i, '') ||
    '';
  const code = normalizeAccessCode(raw);
  return code ? lookupKeyType(code) : 'INVALID';
}

function requireProductMinerAccess(req: express.Request, res: express.Response): KeyCategory | null {
  const type = getRequesterType(req);
  if (type === 'INVALID') {
    res.status(401).json({ error: 'AUTH_REQUIRED' });
    return null;
  }
  if (type === 'STUDENT' && !studentsEnabled()) {
    res.status(403).json({ error: 'PRODUCT_MINER_STUDENTS_DISABLED' });
    return null;
  }
  return type;
}

function requireMentorRefresh(req: express.Request, res: express.Response): boolean {
  const type = getRequesterType(req);
  if (type === 'INVALID') {
    res.status(401).json({ error: 'AUTH_REQUIRED' });
    return false;
  }
  if (type !== 'MASTER') {
    res.status(403).json({ error: 'PRODUCT_MINER_REFRESH_MENTOR_ONLY' });
    return false;
  }
  return true;
}

// Cheap access probe used by the frontend. Never calls SocialCrawl.
productMinerRouter.get('/access', (req, res) => {
  const type = getRequesterType(req);
  if (type === 'INVALID') return res.status(401).json({ error: 'AUTH_REQUIRED' });
  const enabled = type === 'MASTER' || studentsEnabled();
  return res.json({
    success: true,
    enabled,
    canRefresh: type === 'MASTER',
    role: type === 'MASTER' ? 'mentor' : 'student',
  });
});

// FREE search: reads only our MySQL/cache. It never consumes SocialCrawl credits.
productMinerRouter.get('/search', async (req, res) => {
  if (!requireProductMinerAccess(req, res)) return;
  try {
    const query = String(req.query.query || req.query.q || '').trim();
    const page = Number(req.query.page || 1);
    const result = await searchTikTokShopProducts({ query, page, region: 'BR', forceRefresh: false });
    return res.json({ success: true, region: 'BR', query, page, ...result });
  } catch (error: any) {
    console.error('[Product Miner Search Error]:', error?.message || error);
    const message = String(error?.message || 'PRODUCT_MINER_ERROR');
    if (message === 'SEARCH_QUERY_TOO_SHORT' || message === 'SEARCH_QUERY_TOO_LONG') {
      return res.status(400).json({ error: message });
    }
    return res.status(500).json({ error: 'PRODUCT_MINER_SEARCH_ERROR', detail: message });
  }
});

// PAID refresh: only the Mentor can intentionally spend SocialCrawl credits.
productMinerRouter.post('/refresh', async (req, res) => {
  if (!requireMentorRefresh(req, res)) return;
  try {
    const query = String(req.body?.query || req.body?.q || req.query.query || req.query.q || '').trim();
    const page = req.body?.page ? Number(req.body.page) : undefined;
    const maxProducts = req.body?.maxProducts ? Number(req.body.maxProducts) : undefined;

    const result = await refreshMultiPageTikTokShopProducts({ query, region: 'BR', maxProducts, page });
    return res.json({ success: true, region: 'BR', ...result });
  } catch (error: any) {
    console.error('[Product Miner Refresh Error]:', error?.message || error);
    const message = String(error?.message || 'PRODUCT_MINER_ERROR');
    if (message === 'SEARCH_QUERY_TOO_SHORT' || message === 'SEARCH_QUERY_TOO_LONG') {
      return res.status(400).json({ error: message });
    }
    if (message === 'SOCIALCRAWL_API_KEY_MISSING') {
      return res.status(503).json({ error: 'SOCIALCRAWL_NOT_CONFIGURED' });
    }
    return res.status(502).json({ error: 'PRODUCT_MINER_PROVIDER_ERROR', detail: message });
  }
});

productMinerRouter.get('/ranking', async (req, res) => {
  if (!requireProductMinerAccess(req, res)) return;
  try {
    const requestedSort = String(req.query.sort || 'total');
    const sort: ProductRankingSort = requestedSort === '24h' || requestedSort === '7d' || requestedSort === 'spiking'
      ? requestedSort
      : 'total';
    const result = await getProductMinerRanking(Number(req.query.limit || 50), sort);
    return res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('[Product Miner Ranking Error]:', error?.message || error);
    return res.status(500).json({ error: 'PRODUCT_MINER_RANKING_ERROR' });
  }
});

// Coletor: Mentor-only category statistics
productMinerRouter.get('/collector/categories', async (req, res) => {
  if (!requireMentorRefresh(req, res)) return;
  try {
    const categories = await getCollectorCategoriesStats();
    return res.json({ success: true, categories });
  } catch (error: any) {
    console.error('[Product Miner Collector Stats Error]:', error?.message || error);
    return res.status(500).json({ error: 'PRODUCT_MINER_COLLECTOR_STATS_ERROR' });
  }
});

