import express from 'express';
import { lookupKeyType, normalizeAccessCode } from './authKeys.js';
import { searchTikTokShopProducts, getProductMinerRanking } from './productMinerService.js';

export const productMinerRouter = express.Router();

function requireProductMinerAccess(req: express.Request, res: express.Response): string | null {
  const raw = req.header('x-student-access-code') || req.query.code || req.query.accessCode || '';
  const code = normalizeAccessCode(raw);
  if (!code) {
    res.status(401).json({ error: 'AUTH_REQUIRED' });
    return null;
  }
  const type = lookupKeyType(code);
  if (type !== 'STUDENT' && type !== 'MASTER') {
    res.status(403).json({ error: 'ACCESS_DENIED' });
    return null;
  }
  return code;
}

productMinerRouter.get('/search', async (req, res) => {
  if (!requireProductMinerAccess(req, res)) return;
  try {
    const query = String(req.query.query || req.query.q || '').trim();
    const page = Number(req.query.page || 1);
    const result = await searchTikTokShopProducts({ query, page, region: 'BR' });
    return res.json({ success: true, region: 'BR', query, page, ...result });
  } catch (error: any) {
    console.error('[Product Miner Search Error]:', error?.message || error);
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
    const products = await getProductMinerRanking(Number(req.query.limit || 50));
    return res.json({ success: true, products });
  } catch (error: any) {
    console.error('[Product Miner Ranking Error]:', error?.message || error);
    return res.status(500).json({ error: 'PRODUCT_MINER_RANKING_ERROR' });
  }
});
