import express from 'express';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { lookupKeyType, normalizeAccessCode, type KeyCategory } from './authKeys.js';
import {
  searchTikTokShopProducts,
  refreshMultiPageTikTokShopProducts,
  getProductMinerRanking,
  getCollectorCategoriesStats,
  prepareVideoDownload,
  getDailyRefreshStatus,
  executeDailyRefresh,
  reclassifyExistingDatabaseProducts,
  backfillLegacyVideosToProductVideos,
  extractVideosFromSearchCachePayloads,
  ProductRankingSort,
  logProductInteractionEvent,
  getDailyPickStatus,
  spinDailyPick,
} from './productMinerService.js';
import { getGeminiClient } from './geminiHelper.js';
import { db, isDatabaseConfigured, ensureCodigosAcessoTable, ensureProductMinerTables } from './database.js';
import { memoryKeyStatusMap, recordAdminAuditAction, getClientIp, maskKeyForAdmin } from './presenceService.js';

export const productMinerRouter = express.Router();

function getRequesterCode(req: express.Request): string | null {
  const raw =
    req.header('x-access-code') ||
    req.header('x-student-access-code') ||
    req.header('x-master-key') ||
    req.header('authorization')?.replace(/^Bearer\s+/i, '') ||
    '';
  const code = normalizeAccessCode(raw);
  return code || null;
}

function getRequesterType(req: express.Request): KeyCategory {
  const code = getRequesterCode(req);
  return code ? lookupKeyType(code) : 'INVALID';
}

export async function isProductMinerEnabledForCode(studentCode: string): Promise<boolean> {
  const norm = normalizeAccessCode(studentCode);
  if (!norm) return false;

  // Master/Mentor key ALWAYS has access
  if (lookupKeyType(norm) === 'MASTER') return true;

  if (isDatabaseConfigured()) {
    try {
      await ensureCodigosAcessoTable();
      const [rows]: any = await db.query(
        `SELECT product_miner_enabled FROM codigos_acesso WHERE codigo = ? LIMIT 1`,
        [norm]
      );
      if (Array.isArray(rows) && rows.length > 0) {
        return Boolean(rows[0].product_miner_enabled);
      }
    } catch (err) {
      console.warn('[isProductMinerEnabledForCode Error]:', err);
    }
  }

  // Memory store fallback
  const mem = memoryKeyStatusMap.get(norm);
  return Boolean(mem?.productMinerEnabled);
}

async function requireProductMinerAccess(req: express.Request, res: express.Response): Promise<KeyCategory | null> {
  const code = getRequesterCode(req);
  if (!code) {
    res.status(401).json({ error: 'AUTH_REQUIRED' });
    return null;
  }
  const type = lookupKeyType(code);
  if (type === 'INVALID') {
    res.status(401).json({ error: 'AUTH_REQUIRED' });
    return null;
  }
  if (type === 'MASTER') return 'MASTER';

  const enabled = await isProductMinerEnabledForCode(code);
  if (!enabled) {
    res.status(403).json({
      error: 'PRODUCT_MINER_STUDENTS_DISABLED',
      message: 'O Minerador de Produtos é um recurso opcional e não está liberado para sua conta. Entre em contato com seu Mentor.',
    });
    return null;
  }
  return 'STUDENT';
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
productMinerRouter.get('/access', async (req, res) => {
  const code = getRequesterCode(req);
  if (!code) return res.status(401).json({ error: 'AUTH_REQUIRED' });
  const type = lookupKeyType(code);
  if (type === 'INVALID') return res.status(401).json({ error: 'AUTH_REQUIRED' });

  const isMaster = type === 'MASTER';
  const enabled = isMaster || (await isProductMinerEnabledForCode(code));

  return res.json({
    success: true,
    enabled,
    canRefresh: isMaster,
    role: isMaster ? 'mentor' : 'student',
  });
});

// ADMIN: Get list of students and their Product Miner access status
productMinerRouter.get('/admin/students', async (req, res) => {
  if (!requireMentorRefresh(req, res)) return;
  try {
    let students: any[] = [];
    if (isDatabaseConfigured()) {
      await ensureCodigosAcessoTable();
      const query = `
        SELECT 
          ca.id AS accessKeyId,
          ca.codigo,
          ca.access_status,
          ca.product_miner_enabled,
          ca.product_miner_enabled_at,
          ca.product_miner_enabled_by,
          ca.criado_em,
          pf.nome_usuario AS name,
          cp.nickname AS nickname
        FROM codigos_acesso ca
        LEFT JOIN perfis_alunos pf ON ca.codigo = pf.codigo
        LEFT JOIN chat_profiles cp ON ca.codigo = cp.codigo
        ORDER BY ca.product_miner_enabled DESC, ca.id DESC
      `;
      const [rows]: any = await db.query(query);
      if (Array.isArray(rows)) {
        students = rows.map((r: any) => {
          const norm = normalizeAccessCode(r.codigo);
          const name = r.name || `Aluno ${norm.slice(-4)}`;
          const nickname = r.nickname || null;
          return {
            accessKeyId: r.accessKeyId,
            codigo: r.codigo,
            maskedKey: maskKeyForAdmin(norm),
            name,
            nickname,
            username: nickname ? `${name} (@${nickname})` : name,
            productMinerEnabled: Boolean(r.product_miner_enabled),
            productMinerEnabledAt: r.product_miner_enabled_at ? new Date(r.product_miner_enabled_at).toISOString() : null,
            productMinerEnabledBy: r.product_miner_enabled_by || null,
            createdAt: r.criado_em ? new Date(r.criado_em).toISOString() : new Date().toISOString(),
          };
        });
      }
    } else {
      // Memory fallback
      for (const [code, mem] of memoryKeyStatusMap.entries()) {
        const norm = normalizeAccessCode(code);
        students.push({
          accessKeyId: Math.abs(norm.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)),
          codigo: norm,
          maskedKey: maskKeyForAdmin(norm),
          username: `Aluno ${norm.slice(-4)}`,
          productMinerEnabled: Boolean(mem.productMinerEnabled),
          productMinerEnabledAt: mem.productMinerEnabledAt || null,
          productMinerEnabledBy: mem.productMinerEnabledBy || null,
          createdAt: new Date().toISOString(),
        });
      }
    }
    return res.json({ success: true, students });
  } catch (err: any) {
    console.error('[Admin Miner Students List Error]:', err?.message || err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Erro ao listar alunos.' });
  }
});

// ADMIN: Toggle Product Miner access for a student code
productMinerRouter.post('/admin/toggle', async (req, res) => {
  if (!requireMentorRefresh(req, res)) return;
  try {
    const { accessKeyId, codigo, enabled } = req.body || {};
    const wantEnable = Boolean(enabled);

    let targetCode = codigo ? normalizeAccessCode(codigo) : '';

    if (isDatabaseConfigured()) {
      await ensureCodigosAcessoTable();
      if (!targetCode && accessKeyId) {
        const [rows]: any = await db.query(`SELECT codigo FROM codigos_acesso WHERE id = ? LIMIT 1`, [accessKeyId]);
        if (Array.isArray(rows) && rows.length > 0) {
          targetCode = rows[0].codigo;
        }
      }

      if (!targetCode) {
        return res.status(404).json({ error: 'NOT_FOUND', message: 'Chave de acesso não encontrada.' });
      }

      await db.query(
        `UPDATE codigos_acesso
         SET 
           product_miner_enabled = ?,
           product_miner_enabled_at = IF(? = 1, NOW(), product_miner_enabled_at),
           product_miner_enabled_by = IF(? = 1, 'SESSION_MASTER', NULL)
         WHERE codigo = ? OR id = ?`,
        [wantEnable ? 1 : 0, wantEnable ? 1 : 0, wantEnable ? 1 : 0, targetCode, accessKeyId || 0]
      );
    }

    if (targetCode) {
      const nowIso = new Date().toISOString();
      const existingMem = memoryKeyStatusMap.get(targetCode) || { accessStatus: 'ACTIVE' };
      memoryKeyStatusMap.set(targetCode, {
        ...existingMem,
        productMinerEnabled: wantEnable,
        productMinerEnabledAt: wantEnable ? nowIso : existingMem.productMinerEnabledAt,
        productMinerEnabledBy: wantEnable ? 'SESSION_MASTER' : existingMem.productMinerEnabledBy,
      });

      const clientIp = getClientIp(req);
      const actionType = wantEnable ? 'ACTIVATED_MINER' : 'DEACTIVATED_MINER';
      const reason = wantEnable ? 'Acesso ao Minerador ativado pelo Mentor' : 'Acesso ao Minerador desativado pelo Mentor';
      await recordAdminAuditAction(targetCode, actionType, reason, clientIp).catch(() => {});
    }

    return res.json({
      success: true,
      productMinerEnabled: wantEnable,
      message: wantEnable
        ? 'Acesso ao Minerador ativado com sucesso para este aluno!'
        : 'Acesso ao Minerador desativado com sucesso.',
    });
  } catch (err: any) {
    console.error('[Admin Miner Toggle Access Error]:', err?.message || err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Erro ao alterar permissão do minerador.' });
  }
});

// ADMIN: Enable Product Miner access for ALL eligible students currently without access
productMinerRouter.post('/admin/activate-all', async (req, res) => {
  if (!requireMentorRefresh(req, res)) return;
  try {
    let activatedCount = 0;

    if (isDatabaseConfigured()) {
      await ensureCodigosAcessoTable();
      const [result]: any = await db.query(
        `UPDATE codigos_acesso
         SET 
           product_miner_enabled = 1,
           product_miner_enabled_at = NOW(),
           product_miner_enabled_by = 'SESSION_MASTER'
         WHERE (product_miner_enabled = 0 OR product_miner_enabled IS NULL)`
      );
      activatedCount = result?.affectedRows || result?.changedRows || 0;
    }

    // Update memory status for keys in memory
    for (const [code, status] of memoryKeyStatusMap.entries()) {
      if (!status.productMinerEnabled) {
        memoryKeyStatusMap.set(code, {
          ...status,
          productMinerEnabled: true,
          productMinerEnabledAt: new Date().toISOString(),
          productMinerEnabledBy: 'SESSION_MASTER',
        });
      }
    }

    const clientIp = getClientIp(req);
    await recordAdminAuditAction('ALL_STUDENTS', 'ACTIVATED_MINER_ALL', 'Acesso ao Minerador ativado para todos os alunos pelo Mentor', clientIp).catch(() => {});

    return res.json({
      success: true,
      activatedCount,
      message: 'Acesso ao Minerador ativado com sucesso para todos os alunos sem acesso!',
    });
  } catch (err: any) {
    console.error('[Admin Miner Activate All Error]:', err?.message || err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Erro ao liberar acesso ao minerador em massa.' });
  }
});

// ADMIN: Reclassify existing local products into categories without calling SocialCrawl or consuming credits
productMinerRouter.post('/admin/reclassify', async (req, res) => {
  if (!requireMentorRefresh(req, res)) return;
  const startTime = Date.now();
  try {
    const report = await reclassifyExistingDatabaseProducts();
    return res.json({ success: true, report });
  } catch (error: any) {
    console.error('[Admin Reclassify Route Error - Server Only Log]:', {
      durationMs: Date.now() - startTime,
      message: error?.message,
      code: error?.code,
      sqlState: error?.sqlState,
      sqlMessage: error?.sqlMessage,
      name: error?.name,
      stack: error?.stack ? String(error.stack).split('\n').slice(0, 5).join('\n') : undefined,
    });
    return res.status(500).json({
      success: false,
      error: 'RECLASSIFY_FAILED',
      message: 'Não foi possível concluir a organização da base. Tente novamente em alguns instantes.',
    });
  }
});

productMinerRouter.get('/admin/reclassify', async (req, res) => {
  if (!requireMentorRefresh(req, res)) return;
  const startTime = Date.now();
  try {
    const report = await reclassifyExistingDatabaseProducts();
    return res.json({ success: true, report });
  } catch (error: any) {
    console.error('[Admin Reclassify Route Error - Server Only Log]:', {
      durationMs: Date.now() - startTime,
      message: error?.message,
      code: error?.code,
      sqlState: error?.sqlState,
      sqlMessage: error?.sqlMessage,
      name: error?.name,
      stack: error?.stack ? String(error.stack).split('\n').slice(0, 5).join('\n') : undefined,
    });
    return res.status(500).json({
      success: false,
      error: 'RECLASSIFY_FAILED',
      message: 'Não foi possível concluir a organização da base. Tente novamente em alguns instantes.',
    });
  }
});

// FREE search: reads only our MySQL/cache. It never consumes SocialCrawl credits.
productMinerRouter.get('/search', async (req, res) => {
  if (!await requireProductMinerAccess(req, res)) return;
  try {
    const query = String(req.query.query || req.query.q || '').trim();
    const category = String(req.query.category || '').trim();
    const subcategory = String(req.query.subcategory || '').trim();
    const childCategory = String(req.query.childCategory || req.query.child_category || '').trim();
    const classification = String(req.query.classification || '').trim() as any;
    const hasVideoOnly = req.query.hasVideoOnly === 'true' || req.query.has_video_only === 'true' || req.query.hasVideo === 'true';
    const rawMinViews = req.query.videoViewsMin ?? req.query.minVideoViews ?? req.query.min_video_views;
    const rawMaxViews = req.query.videoViewsMax ?? req.query.maxVideoViews ?? req.query.max_video_views;
    const parsedMinViews = rawMinViews !== undefined && rawMinViews !== '' ? Number(rawMinViews) : undefined;
    const parsedMaxViews = rawMaxViews !== undefined && rawMaxViews !== '' ? Number(rawMaxViews) : undefined;
    const minVideoViews = Number.isFinite(parsedMinViews) && (parsedMinViews as number) >= 0 ? (parsedMinViews as number) : undefined;
    const maxVideoViews = Number.isFinite(parsedMaxViews) && (parsedMaxViews as number) >= 0 ? (parsedMaxViews as number) : undefined;
    const videoViewRange = req.query.videoViewRange ? String(req.query.videoViewRange) : undefined;
    const page = Number(req.query.page || 1);
    const result = await searchTikTokShopProducts({
      query,
      category,
      subcategory,
      childCategory,
      classification,
      hasVideoOnly,
      minVideoViews,
      maxVideoViews,
      videoViewsMin: minVideoViews,
      videoViewsMax: maxVideoViews,
      videoViewRange,
      page,
      region: 'BR',
      forceRefresh: false
    });
    return res.json({
      success: true,
      region: 'BR',
      query,
      category,
      subcategory,
      childCategory,
      classification,
      hasVideoOnly,
      minVideoViews,
      maxVideoViews,
      videoViewsMin: minVideoViews,
      videoViewsMax: maxVideoViews,
      videoViewRange,
      page,
      ...result
    });
  } catch (error: any) {
    console.error('[Product Miner Search Error]:', error?.message || error);
    const message = String(error?.message || 'PRODUCT_MINER_ERROR');
    if (message === 'SEARCH_QUERY_TOO_SHORT' || message === 'SEARCH_QUERY_TOO_LONG') {
      return res.status(400).json({ error: message });
    }
    return res.status(500).json({ error: 'PRODUCT_MINER_SEARCH_ERROR', detail: message });
  }
});

// Track real student interaction with a product
productMinerRouter.get('/admin/audit-diagnostic', async (req, res) => {
  if (!isDatabaseConfigured()) return res.json({ error: 'DB_NOT_CONFIGURED' });
  try {
    await ensureProductMinerTables();
    const [productsCount]: any = await db.query('SELECT COUNT(*) AS total FROM tiktok_shop_products');
    const [snapshotsCount]: any = await db.query('SELECT COUNT(*) AS total FROM tiktok_shop_product_snapshots');
    const [videosCount]: any = await db.query('SELECT COUNT(*) AS total FROM tiktok_shop_product_videos');
    const [interactionsCount]: any = await db.query('SELECT COUNT(*) AS total FROM product_interaction_events');
    const [searchEventsCount]: any = await db.query('SELECT COUNT(*) AS total FROM product_search_events');

    return res.json({
      products: productsCount[0]?.total || 0,
      snapshots: snapshotsCount[0]?.total || 0,
      videos: videosCount[0]?.total || 0,
      interactions: interactionsCount[0]?.total || 0,
      searchEvents: searchEventsCount[0]?.total || 0,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message });
  }
});

productMinerRouter.post('/track-interaction', async (req, res) => {
  try {
    const studentCode = getRequesterCode(req) || undefined;
    const productId = String(req.body?.productId || req.body?.product_id || '').trim();
    const query = String(req.body?.query || '').trim();
    const category = String(req.body?.category || '').trim();
    const subcategory = String(req.body?.subcategory || '').trim();
    const childCategory = String(req.body?.childCategory || '').trim();
    const eventType = req.body?.eventType === 'product_click' ? 'product_click' : 'product_open';

    if (productId) {
      await logProductInteractionEvent({
        studentCode,
        productId,
        query,
        category,
        subcategory,
        childCategory,
        eventType,
      });
    }
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: 'TRACK_INTERACTION_ERROR', message: err?.message });
  }
});

// PAID refresh: only the Mentor can intentionally spend SocialCrawl credits.
productMinerRouter.post('/refresh', async (req, res) => {
  if (!requireMentorRefresh(req, res)) return;
  try {
    const query = String(req.body?.query || req.body?.q || req.query.query || req.query.q || '').trim();
    const page = req.body?.page ? Number(req.body.page) : undefined;
    const maxProducts = req.body?.maxProducts ? Number(req.body.maxProducts) : undefined;
    const collectionCategory = req.body?.collectionCategory ? String(req.body.collectionCategory).trim() : undefined;
    const collectionSubcategory = req.body?.collectionSubcategory ? String(req.body.collectionSubcategory).trim() : undefined;

    const result = await refreshMultiPageTikTokShopProducts({
      query,
      region: 'BR',
      maxProducts,
      page,
      collectionCategory,
      collectionSubcategory,
    });
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
  if (!await requireProductMinerAccess(req, res)) return;
  try {
    const requestedSort = String(req.query.sort || 'opportunities');
    const sort: ProductRankingSort = (
      requestedSort === 'opportunities' ||
      requestedSort === '24h' ||
      requestedSort === '7d' ||
      requestedSort === 'spiking' ||
      requestedSort === 'total'
    )
      ? (requestedSort as ProductRankingSort)
      : 'opportunities';
    const limit = Number(req.query.limit || 150);
    const result = await getProductMinerRanking(limit, sort);
    return res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('[Product Miner Ranking Route Error]:', {
      message: error?.message || String(error),
      stack: error?.stack,
      query: req.query,
      timestamp: new Date().toISOString(),
    });
    return res.status(500).json({
      error: 'PRODUCT_MINER_RANKING_ERROR',
      detail: 'Não foi possível carregar o ranking no momento. Tente novamente.',
    });
  }
});

// Coletor: Mentor-only category statistics
productMinerRouter.get('/collector/categories', async (req, res) => {
  if (!requireMentorRefresh(req, res)) return;
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  try {
    const statsResult = await getCollectorCategoriesStats();
    return res.json({
      success: true,
      categories: statsResult.categories,
      totalStoredProducts: statsResult.totalStoredProducts,
    });
  } catch (error: any) {
    console.error('[Product Miner Collector Stats Error]:', error?.message || error);
    return res.status(500).json({ error: 'PRODUCT_MINER_COLLECTOR_STATS_ERROR' });
  }
});

// Coletor: Status da Atualização Diária da Base (Mentor-only)
productMinerRouter.get('/collector/daily-status', async (req, res) => {
  if (!requireMentorRefresh(req, res)) return;
  try {
    const status = await getDailyRefreshStatus();
    return res.json({ success: true, status });
  } catch (error: any) {
    console.error('[Product Miner Daily Status Error]:', error?.message || error);
    return res.status(500).json({ error: 'DAILY_STATUS_ERROR' });
  }
});

// Coletor: Executar Atualização Diária da Base (Mentor-only)
productMinerRouter.post('/collector/daily-refresh', async (req, res) => {
  if (!requireMentorRefresh(req, res)) return;
  try {
    const force = Boolean(req.body?.force);
    const status = await executeDailyRefresh({ force });
    return res.json({ success: true, status });
  } catch (error: any) {
    const msg = error?.message || '';
    if (msg === 'DAILY_REFRESH_IN_PROGRESS') {
      return res.status(409).json({
        error: 'DAILY_REFRESH_IN_PROGRESS',
        message: 'Uma atualização diária já está em andamento.',
      });
    }
    console.error('[Product Miner Daily Refresh Route Error]:', error?.message || error);
    return res.status(500).json({ error: 'DAILY_REFRESH_FAILED', message: error?.message || 'Falha ao executar atualização diária.' });
  }
});

// AI Script Generator Route for TikTok Shop
productMinerRouter.post('/generate-script', async (req, res) => {
  if (!await requireProductMinerAccess(req, res)) return;
  try {
    const userRole = getRequesterType(req);
    const rawCode = req.body.studentCode || req.header('x-access-code') || req.header('x-student-access-code') || '';
    const studentCode = normalizeAccessCode(rawCode) || 'STUDENT';

    if (userRole === 'STUDENT' && isDatabaseConfigured()) {
      const [rows]: any = await db.query(
        `SELECT COUNT(*) as cnt FROM product_miner_script_logs
         WHERE student_code = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`,
        [studentCode]
      );
      const count = Number(Array.isArray(rows) ? rows[0]?.cnt || 0 : 0);
      if (count >= 20) {
        return res.json({
          success: false,
          error: 'DAILY_LIMIT_EXCEEDED',
          script: 'Você atingiu o limite diário de gerações de roteiro. Tente novamente mais tarde.',
        });
      }
    }

    const { product, scriptType = 'roteiro_completo', customPrompt, variantSeed } = req.body || {};
    if (!product || !product.title) {
      return res.status(400).json({ error: 'PRODUCT_DATA_REQUIRED' });
    }

    const priceFormatted = product.priceCents !== null ? `${product.currencySymbol || 'R$'} ${(product.priceCents / 100).toFixed(2)}` : 'Preço sob consulta';
    const video = product.video;
    const videoDetails = video ? `
Vídeo associado:
- Creator: @${video.author || 'criador'} (${video.authorFollowers ? video.authorFollowers + ' seguidores' : 'N/A'})
- Views: ${video.views || 0}
- Likes: ${video.likes || 0}
- Comentários: ${video.comments || 0}
- Compartilhamentos: ${video.shares || 0}
- Salvos: ${video.saves || 0}
` : 'Sem vídeo associado.';

    let promptInstruction = '';
    switch (scriptType) {
      case 'roteiro_completo':
        promptInstruction = `Crie um ROTEIRO COMPLETO DE ALTA CONVERSÃO para TikTok Shop no seguinte formato estrito:
[HOOK]
(Gatilho magnético de 3 segundos para parar a rolagem)

[CENA 1]
(Apresentação do problema do cotidiano de forma visual e rápida)

[CENA 2]
(Demonstração prática do produto destacando diferenciais e utilidade)

[CENA 3]
(Prova social ou benefício transformador)

[CTA]
(Chamada para ação clara incentivando a clicar no carrinho amarelo do TikTok Shop)`;
        break;
      case 'roteiro_viral':
        promptInstruction = `Crie um ROTEIRO VIRAL focado em alto engajamento (views, compartilhamentos e salvamentos) para o TikTok Shop. Foque em retenção rápida, tom dinâmico e formato para narração/atuação.`;
        break;
      case 'copy_venda':
        promptInstruction = `Crie 3 opções de COPY DE VENDA persuasivas (para narração ou texto na tela) focadas em quebrar objeções e gerar compra imediata no carrinho amarelo.`;
        break;
      case 'hooks':
        promptInstruction = `Crie 5 HOOKS (Ganchos de 3 segundos) magnéticos e virais para iniciar vídeos do TikTok Shop sobre este produto.`;
        break;
      case 'cta':
        promptInstruction = `Crie 5 variações de CTA (Call to Action / Chamada para Ação) motivando o espectador a clicar no carrinho amarelo do TikTok Shop.`;
        break;
      default:
        promptInstruction = `Crie um roteiro persuasivo e de alta conversão para TikTok Shop.`;
    }

    const seedNote = variantSeed ? `Gere uma versão alternativa única (Variação #${variantSeed}) com uma abordagem e tom levemente modificados.` : '';

    const prompt = `Você é um roteirista sênior e estrategista especialista em vídeos virais e TikTok Shop no Brasil.

DADOS REAIS DO PRODUTO (NÃO invente recursos técnicos não presentes nos dados):
- Nome do Produto: ${product.title}
- Preço: ${priceFormatted}
- Unidades Vendidas: ${product.soldCount || 0}
- Avaliação: ${product.rating ? product.rating + '/5.0' : 'N/A'}
- Categoria: ${product.category || 'Geral'}
${videoDetails}

${customPrompt ? `ORIENTAÇÃO ADICIONAL DO ALUNO: "${customPrompt}"` : ''}
${seedNote}

TAREFA DE GERAÇÃO:
${promptInstruction}

DIRETRIZES OBRIGATÓRIAS:
- Linguagem natural em Português do Brasil (PT-BR) no estilo característico de vídeos curtos do TikTok.
- Foco total em conversão e engajamento no TikTok Shop (sempre citando o "carrinho amarelo").
- Sem promessas falsas ou características inventadas.
- Formato Markdown bem estruturado, limpo e legível.`;

    if (userRole === 'STUDENT' && isDatabaseConfigured()) {
      await db.query(`INSERT INTO product_miner_script_logs (student_code) VALUES (?)`, [studentCode]).catch(() => {});
    }

    try {
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
      });

      const scriptText = response.text || 'Não foi possível gerar o roteiro.';
      return res.json({ success: true, script: scriptText });
    } catch (aiErr: any) {
      console.warn('[Product Miner AI Script Error]:', aiErr?.message || aiErr);
      const fallbackScript = `### 🎬 Roteiro Sugerido (TikTok Shop)

**[HOOK - 0s a 3s]**
"Se você quer [resolver o problema comum], pare de rolar a tela agora!"

**[CENA 1 - Problema e Descoberta]**
Mostre o ${product.title} na prática e explique a dor que ele resolve no dia a dia.
*Dica:* Apresente como isso facilita a sua rotina por apenas ${priceFormatted}.

**[CENA 2 - Demonstração]**
Mostre o produto em uso close-up. Destaque a alta avaliação de ${product.rating || '4.8'}/5 e ${product.soldCount} unidades vendidas no TikTok Shop.

**[CENA 3 - Prova Social]**
"Olha só a praticidade! Por isso este produto é um dos mais procurados da categoria."

**[CTA - Chamada para Ação]**
"Gostou? Clique no **carrinho amarelo** aqui no canto inferior do vídeo e aproveite antes que esgoste!"`;

      return res.json({ success: true, script: fallbackScript, fallback: true });
    }
  } catch (error: any) {
    console.error('[Product Miner Script Route Error]:', error?.message || error);
    return res.status(500).json({ error: 'GENERATE_SCRIPT_ERROR' });
  }
});

// =========================================================================
// =========================================================================
// HELPER: BAIXAR BUFFER REAL DO VÍDEO/ÁUDIO PARA TRANSCRIÇÃO FIEL
// =========================================================================
async function fetchVideoMediaBuffer(productId: string, videoId?: string, fallbackUrl?: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const cleanProductId = String(productId || '').trim();
  const cleanVideoId = String(videoId || '').trim();

  // 1. Verificar registro persistido no banco
  let cdnUrl: string | null = null;
  if (isDatabaseConfigured()) {
    try {
      const [rows]: any = await db.query(
        `SELECT direct_media_url, status FROM tiktok_shop_video_downloads WHERE product_id = ? AND (video_id = ? OR video_id = '' OR ? = '') LIMIT 1`,
        [cleanProductId, cleanVideoId, cleanVideoId]
      );
      const record = Array.isArray(rows) && rows[0];
      if (record && record.status === 'COMPLETED' && record.direct_media_url) {
        cdnUrl = String(record.direct_media_url);
      }
    } catch {}
  }

  // 2. Se não estiver preparado ainda, acionar prepareVideoDownload
  if (!cdnUrl) {
    try {
      const prepRes = await prepareVideoDownload(cleanProductId, cleanVideoId || undefined);
      if (prepRes.success && prepRes.directMediaUrl) {
        cdnUrl = String(prepRes.directMediaUrl);
      }
    } catch (prepErr: any) {
      console.warn('[fetchVideoMediaBuffer prepare error]:', prepErr?.message || prepErr);
    }
  }

  // 3. Fallback para URL direta caso exista e seja válida
  if (!cdnUrl && fallbackUrl && (fallbackUrl.startsWith('http://') || fallbackUrl.startsWith('https://'))) {
    cdnUrl = fallbackUrl;
  }

  // 4. Se tivermos a URL de CDN, baixar o buffer do vídeo com timeout seguro
  if (cdnUrl) {
    try {
      const res = await fetch(cdnUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(45000),
      });

      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        if (buffer.length > 500) {
          const rawMime = res.headers.get('content-type') || 'video/mp4';
          const mimeType = rawMime.split(';')[0].trim() || 'video/mp4';
          return { buffer, mimeType };
        }
      }
    } catch (dlErr: any) {
      console.warn('[fetchVideoMediaBuffer cdn download error]:', dlErr?.message || dlErr);
    }
  }

  return null;
}

// =========================================================================
// ROTA: TRANSCRIÇÃO EXATA E FIEL DO VÍDEO (ANÁLISE REAL DO ÁUDIO)
// =========================================================================
productMinerRouter.post('/videos/transcription', async (req, res) => {
  const access = await requireProductMinerAccess(req, res);
  if (!access) return;

  try {
    const {
      productId,
      videoId,
      videoUrl,
      productTitle,
      productCategory,
      videoAuthor,
      videoDescription,
      forceRefresh = false,
    } = req.body || {};

    const cleanProductId = String(productId || '').trim();
    const cleanVideoId = String(videoId || '').trim();

    if (!cleanProductId) {
      return res.status(400).json({ error: 'MISSING_PRODUCT_ID', message: 'ID do produto é obrigatório.' });
    }

    // 1. Verificar cache no banco de dados (apenas registros REAIS com áudio analisado e versão >= 2)
    if (!forceRefresh && isDatabaseConfigured()) {
      try {
        const [rows]: any = await db.query(
          `SELECT * FROM tiktok_shop_video_transcripts
           WHERE product_id = ?
             AND (video_id = ? OR video_id = '' OR ? = '')
             AND (transcription_source = 'audio_extracted' OR transcription_source IS NOT NULL)
             AND (transcription_version >= 2 OR transcription_version IS NOT NULL)
           LIMIT 1`,
          [cleanProductId, cleanVideoId, cleanVideoId]
        );

        if (Array.isArray(rows) && rows.length > 0 && rows[0].raw_transcript) {
          const row = rows[0];
          // Se for cache legado não baseado em áudio real, ignora para forçar extração fiel
          if (row.transcription_source !== 'metadata_fallback') {
            let timedTranscript: Array<{ time: string; text: string }> = [];
            try {
              timedTranscript = JSON.parse(row.timed_transcript_json || '[]');
            } catch {
              timedTranscript = [];
            }

            return res.json({
              success: true,
              fromCache: true,
              productId: cleanProductId,
              videoId: cleanVideoId || row.video_id,
              originalLanguage: row.original_language || 'pt',
              isForeignLanguage: Boolean(row.is_foreign_language),
              rawTranscript: row.raw_transcript,
              timedTranscript,
              portugueseTranslation: row.portuguese_translation || null,
              durationSeconds: row.duration_seconds || 30,
              rhythm: row.rhythm || 'Cadenciado e dinâmico',
              hookOriginal: row.hook_original || '',
              structureOriginal: row.structure_original || '',
              developmentOriginal: row.development_original || '',
              ctaOriginal: row.cta_original || '',
              confidenceScore: row.confidence_score || 100,
            });
          }
        }
      } catch (cacheErr: any) {
        console.warn('[Transcription Cache Read Warning]:', cacheErr?.message || cacheErr);
      }
    }

    // 2. Coletar dados contextuais do banco
    let dbDesc = String(videoDescription || '');
    let dbTitle = String(productTitle || '');
    let dbAuthor = String(videoAuthor || '');
    let dbCategory = String(productCategory || '');
    let dbVideoUrl = String(videoUrl || '');

    if (isDatabaseConfigured()) {
      try {
        const [pRows]: any = await db.query(
          `SELECT title, category, video_url, video_author, video_views, video_likes FROM tiktok_shop_products WHERE product_id = ? LIMIT 1`,
          [cleanProductId]
        );
        if (Array.isArray(pRows) && pRows[0]) {
          if (!dbTitle) dbTitle = pRows[0].title || '';
          if (!dbCategory) dbCategory = pRows[0].category || '';
          if (!dbAuthor) dbAuthor = pRows[0].video_author || '';
          if (!dbVideoUrl) dbVideoUrl = pRows[0].video_url || '';
        }

        if (cleanVideoId) {
          const [vRows]: any = await db.query(
            `SELECT video_url, video_author, video_description FROM tiktok_shop_product_videos WHERE product_id = ? AND video_id = ? LIMIT 1`,
            [cleanProductId, cleanVideoId]
          );
          if (Array.isArray(vRows) && vRows[0]) {
            if (!dbDesc && vRows[0].video_description) dbDesc = vRows[0].video_description;
            if (vRows[0].video_url) dbVideoUrl = vRows[0].video_url;
            if (vRows[0].video_author) dbAuthor = vRows[0].video_author;
          }
        }
      } catch (dbErr: any) {
        console.warn('[Transcription Context Fetch Warning]:', dbErr?.message || dbErr);
      }
    }

    // 3. Obter arquivo de mídia REAL do vídeo para o Gemini ouvir o áudio
    const media = await fetchVideoMediaBuffer(cleanProductId, cleanVideoId || undefined, dbVideoUrl);

    if (!media || !media.buffer || media.buffer.length < 500) {
      // REGRA INEGOCIÁVEL: Se o áudio não puder ser obtido, NÃO inventar transcrição.
      return res.status(422).json({
        error: 'AUDIO_UNAVAILABLE',
        message: 'Não foi possível acessar o áudio deste vídeo para gerar uma transcrição fiel. O arquivo de mídia não está acessível no momento.',
      });
    }

    // 4. Prompt de Transcrição Exata com Máxima Fidelidade Fonética
    const transcriptionPrompt = `Você é um perito profissional em transcrição fonética e textual de vídeos curtos do TikTok Shop.
Você está OUVINDO e ASSISTINDO ao vídeo anexado.
Sua missão é produzir a TRANSCRIÇÃO EXATA e INTEGRAL da fala real do vídeo com MÁXIMA FIDELIDADE.

DADOS DE CONTEXTO DO PRODUTO:
- Nome: ${dbTitle || 'Produto TikTok Shop'}
- Categoria: ${dbCategory || 'Geral'}
- Criador: @${dbAuthor || 'criador'}

REGRAS CRÍTICAS E OBRIGATÓRIAS:
1. TRANSCREVER EXCLUSIVAMENTE O QUE É REALMENTE FALADO NO ÁUDIO DO VÍDEO.
2. PRESERVAR RIGOROSAMENTE:
   - A ordem exata das frases faladas;
   - Todas as palavras faladas, sem omitir nada;
   - Repetições de palavras e vícios de linguagem ("ó", "olha só", "tipo assim", "mano", "galera", "aí gente", "viu?", "gente");
   - Gírias, expressões coloquiais e contrações faladas ("pra", "tô", "né", "cê", "tá");
   - Hook de abertura falado (primeiras palavras);
   - CTA falado final (chamada para ação falada);
   - Sequência exata do discurso e pausas.
3. NÃO RESUMIR.
4. NÃO REESCREVER.
5. NÃO "MELHORAR" a gramática falada.
6. NÃO INVENTAR NADA: Não invente falas baseadas no título do produto ou na legenda. Apenas transcreva o que a pessoa realmente disse no áudio.
7. CASO NÃO HAJA FALA NO VÍDEO (se o vídeo contiver apenas música de fundo instrumental, silêncio ou efeitos sonoros sem voz humana):
   - Defina "rawTranscript": "[Vídeo sem fala humana / apenas trilha sonora de fundo]"
   - Defina "timedTranscript": []
   - Defina "hasSpeech": false
8. CASO HAJA FALA:
   - Divida a fala em blocos cronológicos com intervalos de tempo reais no formato "MM:SS–MM:SS" (ex: "00:00–00:03", "00:03–00:08", etc.) e a fala exata.
   - O campo "rawTranscript" deve conter o texto contínuo completo da fala transcrita.
9. IDIOMA E TRADUÇÃO:
   - Detecte o idioma original falado no áudio (ex: "pt", "en", "es", "id", "zh", etc.).
   - Se o idioma NÃO for Português do Brasil (isForeignLanguage: true):
     * Mantenha "rawTranscript" e "timedTranscript" 100% no idioma falado original.
     * Preencha "portugueseTranslation" com a tradução fiel e frase a frase para o Português do Brasil.
10. DECOMPOSIÇÃO ESTRUTURAL DA FALA REAL:
   - hookOriginal: As primeiras palavras/gancho falado exato.
   - structureOriginal: Sequência lógica identificada (ex: "Hook de Impacto -> Apresentação da Dor -> Demonstração -> CTA no Carrinho").
   - developmentOriginal: Resumo de como o criador conduziu o meio do vídeo.
   - ctaOriginal: A chamada falada final para ação.
   - rhythm: Descrição do ritmo da fala (ex: "Rápido e enérgico, com cortes secos").
   - durationSeconds: Duração estimada em segundos.

Retorne OBRIGATORIAMENTE um JSON estrito no seguinte formato:
{
  "originalLanguage": "pt",
  "isForeignLanguage": false,
  "hasSpeech": true,
  "rawTranscript": "Texto integral falado...",
  "timedTranscript": [
    { "time": "00:00–00:03", "text": "Frase falada exata..." }
  ],
  "portugueseTranslation": null,
  "durationSeconds": 28,
  "rhythm": "Rápido e dinâmico",
  "hookOriginal": "Frase de abertura falada...",
  "structureOriginal": "Hook -> Dor -> Demonstração -> CTA",
  "developmentOriginal": "Condução da fala no meio do vídeo...",
  "ctaOriginal": "Chamada falada no final...",
  "confidenceScore": 98
}`;

    const ai = getGeminiClient();
    let tmpFilePath: string | null = null;
    let uploadedFile: any = null;
    let contentsPayload: any = null;

    try {
      // Se o buffer for menor que 12MB, enviar via inlineData (rápido e direto)
      if (media.buffer.length <= 12 * 1024 * 1024) {
        contentsPayload = [
          {
            inlineData: {
              mimeType: media.mimeType || 'video/mp4',
              data: media.buffer.toString('base64'),
            },
          },
          transcriptionPrompt,
        ];
      } else {
        // Se for maior, salvar em arquivo temporário e fazer upload via Files API
        tmpFilePath = path.join(os.tmpdir(), `tiktok_media_${cleanProductId}_${cleanVideoId || 'main'}_${Date.now()}.mp4`);
        await fs.promises.writeFile(tmpFilePath, media.buffer);

        uploadedFile = await ai.files.upload({
          file: tmpFilePath,
          config: {
            mimeType: media.mimeType || 'video/mp4',
            displayName: `tiktok_${cleanProductId}_${cleanVideoId || 'main'}`,
          },
        });

        let fileState = uploadedFile;
        let pollCount = 0;
        while (fileState.state === 'PROCESSING' && pollCount < 15) {
          await new Promise((r) => setTimeout(r, 2000));
          fileState = await ai.files.get({ name: uploadedFile.name });
          pollCount++;
        }

        contentsPayload = [fileState, transcriptionPrompt];
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: contentsPayload,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const responseText = response.text || '{}';
      let parsedData: any = {};
      try {
        parsedData = JSON.parse(responseText);
      } catch (jsonErr) {
        console.warn('[Transcription JSON parse error, attempting extraction]:', jsonErr);
        const match = responseText.match(/\{[\s\S]*\}/);
        if (match) {
          parsedData = JSON.parse(match[0]);
        }
      }

      const hasSpeech = parsedData.hasSpeech !== false;
      const rawTranscript = String(parsedData.rawTranscript || '').trim() ||
        (hasSpeech && Array.isArray(parsedData.timedTranscript) ? parsedData.timedTranscript.map((t: any) => t.text).join(' ') : '[Vídeo sem fala humana / apenas trilha sonora de fundo]');

      const timedTranscript = Array.isArray(parsedData.timedTranscript)
        ? parsedData.timedTranscript
        : (hasSpeech ? [{ time: '00:00–00:30', text: rawTranscript }] : []);

      const originalLanguage = String(parsedData.originalLanguage || 'pt').toLowerCase();
      const isForeignLanguage = Boolean(parsedData.isForeignLanguage || (originalLanguage !== 'pt' && originalLanguage !== 'pt-br'));
      const portugueseTranslation = isForeignLanguage && parsedData.portugueseTranslation ? String(parsedData.portugueseTranslation) : null;
      const durationSeconds = Number(parsedData.durationSeconds) || 30;
      const rhythm = String(parsedData.rhythm || 'Cadenciado e dinâmico');
      const hookOriginal = String(parsedData.hookOriginal || (timedTranscript[0]?.text || ''));
      const structureOriginal = String(parsedData.structureOriginal || 'Hook -> Demonstração -> Benefício -> CTA');
      const developmentOriginal = String(parsedData.developmentOriginal || 'Apresentação detalhada e demonstração do produto.');
      const ctaOriginal = String(parsedData.ctaOriginal || (timedTranscript[timedTranscript.length - 1]?.text || ''));
      const confidenceScore = Number(parsedData.confidenceScore) || 98;

      // 5. Salvar no banco com transcription_source = 'audio_extracted' e transcription_version = 2
      if (isDatabaseConfigured()) {
        try {
          await db.query(
            `INSERT INTO tiktok_shop_video_transcripts (
              product_id, video_id, video_url, original_language, is_foreign_language,
              raw_transcript, timed_transcript_json, portuguese_translation, duration_seconds,
              rhythm, hook_original, structure_original, development_original, cta_original,
              confidence_score, transcription_source, transcription_version, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'audio_extracted', 2, NOW())
            ON DUPLICATE KEY UPDATE
              original_language = VALUES(original_language),
              is_foreign_language = VALUES(is_foreign_language),
              raw_transcript = VALUES(raw_transcript),
              timed_transcript_json = VALUES(timed_transcript_json),
              portuguese_translation = VALUES(portuguese_translation),
              duration_seconds = VALUES(duration_seconds),
              rhythm = VALUES(rhythm),
              hook_original = VALUES(hook_original),
              structure_original = VALUES(structure_original),
              development_original = VALUES(development_original),
              cta_original = VALUES(cta_original),
              confidence_score = VALUES(confidence_score),
              transcription_source = 'audio_extracted',
              transcription_version = 2,
              updated_at = NOW()`,
            [
              cleanProductId,
              cleanVideoId,
              dbVideoUrl,
              originalLanguage,
              isForeignLanguage ? 1 : 0,
              rawTranscript,
              JSON.stringify(timedTranscript),
              portugueseTranslation,
              durationSeconds,
              rhythm,
              hookOriginal,
              structureOriginal,
              developmentOriginal,
              ctaOriginal,
              confidenceScore,
            ]
          );
        } catch (dbSaveErr: any) {
          console.warn('[Transcription DB Save Warning]:', dbSaveErr?.message || dbSaveErr);
        }
      }

      return res.json({
        success: true,
        fromCache: false,
        productId: cleanProductId,
        videoId: cleanVideoId,
        originalLanguage,
        isForeignLanguage,
        rawTranscript,
        timedTranscript,
        portugueseTranslation,
        durationSeconds,
        rhythm,
        hookOriginal,
        structureOriginal,
        developmentOriginal,
        ctaOriginal,
        confidenceScore,
      });
    } catch (aiErr: any) {
      console.error('[Video Transcription AI Error]:', aiErr?.message || aiErr);
      // REGRA INEGOCIÁVEL: Se a IA falhar na análise do áudio, retornar erro em vez de inventar dados fictícios
      return res.status(500).json({
        error: 'TRANSCRIPTION_ERROR',
        message: 'Não foi possível analisar o áudio deste vídeo com a IA. Verifique se o vídeo possui som e tente novamente.',
      });
    } finally {
      if (tmpFilePath && fs.existsSync(tmpFilePath)) {
        try {
          await fs.promises.unlink(tmpFilePath);
        } catch {}
      }
      if (uploadedFile?.name) {
        try {
          await ai.files.delete({ name: uploadedFile.name });
        } catch {}
      }
    }
  } catch (error: any) {
    console.error('[Video Transcription Route Error]:', error?.message || error);
    return res.status(500).json({ error: 'TRANSCRIPTION_INTERNAL_ERROR', message: 'Erro interno ao processar transcrição do vídeo.' });
  }
});

// =========================================================================
// ROTA: MODELAR CONTEÚDO (ENGENHARIA REVERSA BASEADA NA TRANSCRIÇÃO EXATA)
// =========================================================================
productMinerRouter.post('/videos/model-content', async (req, res) => {
  const access = await requireProductMinerAccess(req, res);
  if (!access) return;

  try {
    const {
      productId,
      videoId,
      exactTranscript,
      originalHook,
      originalStructure,
      originalDevelopment,
      originalCta,
      originalRhythm,
      originalDuration,
      targetProduct,
      targetNiche,
      targetAngle,
      targetDifferentiator,
      voiceTone = 'Viral & Enérgico',
      structuralFidelity = 'Alta',
      customInstructions,
      variantSeed,
    } = req.body || {};

    const cleanTranscript = String(exactTranscript || '').trim();
    if (!cleanTranscript || cleanTranscript === '[Vídeo sem fala humana / apenas trilha sonora de fundo]' || cleanTranscript === 'Transcrição não disponível.') {
      return res.status(400).json({
        error: 'MISSING_TRANSCRIPTION',
        message: 'A transcrição exata e fiel do vídeo é obrigatória para realizar a modelagem de conteúdo.',
      });
    }

    const newProductName = String(targetProduct || '').trim() || 'Novo Produto';
    const niche = String(targetNiche || 'Geral').trim();
    const angle = String(targetAngle || 'Praticidade e transformação rápida').trim();
    const diff = String(targetDifferentiator || 'Maior durabilidade e melhor custo-benefício').trim();
    const tone = String(voiceTone || 'Viral & Enérgico').trim();

    // Instruções de fidelidade estrutural
    let fidelityDirectives = '';
    if (structuralFidelity === 'Alta') {
      fidelityDirectives = `1. FIDELIDADE ALTA (MÁXIMA ADERÊNCIA À MATRIZ DO VÍDEO ORIGINAL):
- Mantenha RIGOROSAMENTE a mesma sequência cronológica, quantidade de blocos, timestamps relativos e estilo de abertura (Hook) da transcrição original.
- Mantenha o mesmo padrão de chamada para ação (CTA no carrinho amarelo) e ritmo de fala.
- Substitua com precisão cirúrgica apenas as menções ao produto original pelas características, dores e diferenciais do NOVO PRODUTO ("${newProductName}").`;
    } else if (structuralFidelity === 'Livre') {
      fidelityDirectives = `1. FIDELIDADE LIVRE (INSPIRAÇÃO NO CONCEITO VIRAL):
- Use a transcrição original como inspiração de formato, gatilhos mentais e tom de voz.
- Crie uma narrativa fluida, totalmente personalizada e altamente persuasiva para o NOVO PRODUTO ("${newProductName}"), otimizada para o TikTok Shop.`;
    } else {
      fidelityDirectives = `1. FIDELIDADE MÉDIA (EQUILÍBRIO ENTRE ESTRUTURA E CRIATIVIDADE):
- Preserve a macroestrutura essencial (Hook de retenção, Apresentação da Dor, Demonstração do Produto e CTA de Conversão).
- Adapte livremente o vocabulário e os argumentos intermediários para valorizar ao máximo o NOVO PRODUTO ("${newProductName}").`;
    }

    const modelingPrompt = `Você é o estrategista sênior número 1 em Roteiros Virais e Engenharia Reversa de Conteúdo para TikTok Shop.
Sua missão é MODELAR a fórmula de sucesso de um vídeo viral (utilizando sua TRANSCRIÇÃO EXATA como matéria-prima) e gerar um ROTEIRO ADAPTADO de altíssima conversão para um NOVO PRODUTO.

==================================================
1. RAIO-X DO VÍDEO ORIGINAL (MATÉRIA-PRIMA BRUTA):
==================================================
TRANSCRIÇÃO EXATA DO VÍDEO ORIGINAL:
"""
${cleanTranscript}
"""

ESTRUTURA IDENTIFICADA NO ORIGINAL:
- HOOK ORIGINAL: ${originalHook || 'Gancho de retenção inicial'}
- ESTRUTURA ORIGINAL: ${originalStructure || 'Hook -> Dor -> Demonstração -> Benefício -> CTA'}
- DESENVOLVIMENTO: ${originalDevelopment || 'Demonstração prática dos diferenciais'}
- CTA ORIGINAL: ${originalCta || 'Chamada para clicar no carrinho'}
- RITMO: ${originalRhythm || 'Dinâmico com cortes rápidos'}
- DURAÇÃO ESTIMADA: ${originalDuration || '30'} segundos

==================================================
2. DADOS DO NOVO PRODUTO A SER MODELADO:
==================================================
- Nome do Novo Produto: ${newProductName}
- Nicho / Categoria: ${niche}
- Ângulo Principal (Dor / Desejo): ${angle}
- Diferencial Único do Produto: ${diff}
- Tom de Voz Desejado: ${tone}
- Nível de Fidelidade Estrutural: ${structuralFidelity}
${customInstructions ? `- Instrução Personalizada do Criador: "${customInstructions}"` : ''}
${variantSeed ? `- Variação #${variantSeed}: Gere um ângulo criativo e alternativo mantendo a mesma matriz estrutural.` : ''}

==================================================
3. DIRETRIZES DE MODELAGEM:
==================================================
${fidelityDirectives}
2. Dividir o roteiro adaptado em blocos cronológicos claros com timestamps estimados.
3. Para cada cena / bloco, especifique claramente:
   - time: intervalo de tempo (ex: "00:00–00:03")
   - tag: identificação da etapa (ex: "HOOK MODELADO", "CENA 1 - A DOR", "CENA 2 - DEMONSTRAÇÃO", "CENA 3 - BENEFÍCIO", "CTA MODELADO")
   - visualAction: instrução de direção visual para o criador (o que gravar na câmera, closes, expressões)
   - spokenText: o que a pessoa vai falar LITERALMENTE (palavra por palavra pronta para gravar)
   - onScreenText: texto em letras grandes na tela para retenção de quem assiste sem áudio
4. Inclua dicas estratégicas de produção para maximizar a conversão no carrinho amarelo do TikTok Shop.

Retorne OBRIGATORIAMENTE um JSON estrito no seguinte formato:
{
  "modelAnalysis": {
    "hookOriginal": "${originalHook || 'Gancho original...'}",
    "structureOriginal": "${originalStructure || 'Estrutura original...'}",
    "developmentOriginal": "${originalDevelopment || 'Desenvolvimento original...'}",
    "ctaOriginal": "${originalCta || 'CTA original...'}",
    "rhythm": "${originalRhythm || 'Ritmo original...'}",
    "duration": "${originalDuration || '30s'}",
    "whyItWorks": "Explicação técnica de por que essa estrutura converte..."
  },
  "modeledScript": {
    "title": "Roteiro Modelado: ${newProductName}",
    "targetProduct": "${newProductName}",
    "niche": "${niche}",
    "estimatedDuration": "30 segundos",
    "sections": [
      {
        "time": "00:00–00:03",
        "tag": "HOOK MODELADO",
        "visualAction": "Close rápido na câmera com expressão de surpresa...",
        "spokenText": "Fala exata do hook adaptado...",
        "onScreenText": "TEXTO EM MAIÚSCULAS NA TELA"
      },
      {
        "time": "00:03–00:10",
        "tag": "CENA 1 - APRESENTAÇÃO DA DOR",
        "visualAction": "Mostra a dificuldade comum do dia a dia...",
        "spokenText": "Fala exata...",
        "onScreenText": "TEXTO NA TELA"
      },
      {
        "time": "00:10–00:20",
        "tag": "CENA 2 - DEMONSTRAÇÃO PRÁTICA",
        "visualAction": "Mostra o novo produto em ação close-up...",
        "spokenText": "Fala exata...",
        "onScreenText": "TEXTO NA TELA"
      },
      {
        "time": "00:20–00:26",
        "tag": "CENA 3 - BENEFÍCIO TRANSFORMADOR",
        "visualAction": "Mostra o resultado imediato...",
        "spokenText": "Fala exata...",
        "onScreenText": "TEXTO NA TELA"
      },
      {
        "time": "00:26–00:30",
        "tag": "CTA MODELADO (CARRINHO AMARELO)",
        "visualAction": "Aponta para o canto inferior esquerdo onde fica o carrinho amarelo...",
        "spokenText": "Se você também precisa disso, clica no carrinho amarelo aqui embaixo antes que esgote!",
        "onScreenText": "CARRINHO AMARELO AQUI 🛒👇"
      }
    ],
    "fullScriptMarkdown": "Texto completo em Markdown formatado para cópia rápida...",
    "viralTips": [
      "Grave os 3 primeiros segundos com corte rápido e iluminação frontal.",
      "Aponte com o dedo para o carrinho amarelo exatamente na hora do CTA final.",
      "Use música em alta do TikTok Shop em volume 15% de fundo."
    ]
  }
}`;

    try {
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: modelingPrompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const responseText = response.text || '{}';
      let parsedData: any = {};
      try {
        parsedData = JSON.parse(responseText);
      } catch {
        const match = responseText.match(/\{[\s\S]*\}/);
        if (match) {
          parsedData = JSON.parse(match[0]);
        }
      }

      if (!parsedData.modeledScript || !parsedData.modeledScript.sections) {
        throw new Error('A resposta do modelo de IA não conteve os blocos do roteiro esperados.');
      }

      return res.json({
        success: true,
        productId,
        videoId,
        modelAnalysis: parsedData.modelAnalysis,
        modeledScript: parsedData.modeledScript,
      });
    } catch (aiErr: any) {
      console.error('[Model Content AI Error Details]:', aiErr?.message || aiErr);
      return res.status(500).json({
        error: 'MODEL_CONTENT_ERROR',
        message: `Falha ao gerar modelagem de conteúdo com IA: ${aiErr?.message || 'Erro de processamento'}. Tente novamente.`,
      });
    }
  } catch (error: any) {
    console.error('[Model Content Route Error]:', error?.message || error);
    return res.status(500).json({ error: 'MODEL_CONTENT_INTERNAL_ERROR', message: 'Erro interno ao processar modelagem de conteúdo.' });
  }
});

// Playback Token Helpers (5 minutes validity HMAC token)
const PLAYBACK_SECRET = process.env.PLAYBACK_TOKEN_SECRET || 'geracao-z-pro-miner-video-stream-token-2026';

export function generatePlaybackToken(productId: string, videoId?: string): { token: string; expiresAt: number } {
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes TTL
  const payload = `${productId}:${videoId || ''}:${expiresAt}`;
  const sig = crypto.createHmac('sha256', PLAYBACK_SECRET).update(payload).digest('hex');
  const token = Buffer.from(`${payload}:${sig}`).toString('base64url');
  return { token, expiresAt };
}

export function verifyPlaybackToken(token: string, productId: string, videoId?: string): boolean {
  if (!token) return false;
  try {
    const raw = Buffer.from(token, 'base64url').toString('utf8');
    const parts = raw.split(':');
    if (parts.length !== 4) return false;
    const [pId, vId, expStr, sig] = parts;
    const exp = parseInt(expStr, 10);
    if (isNaN(exp) || Date.now() > exp) return false;
    if (pId !== productId) return false;
    const expectedVideoId = String(videoId || '').trim();
    const tokenVideoId = String(vId || '').trim();
    if (expectedVideoId && tokenVideoId && tokenVideoId !== expectedVideoId) return false;
    const expectedSig = crypto.createHmac('sha256', PLAYBACK_SECRET).update(`${pId}:${vId}:${expStr}`).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig));
  } catch {
    return false;
  }
}

// Generate Playback Token (for standard HTML5 <video> tags without custom headers)
productMinerRouter.post('/videos/playback-token', async (req, res) => {
  const access = await requireProductMinerAccess(req, res);
  if (!access) return;

  try {
    const { productId, videoId } = req.body || {};
    const cleanProductId = String(productId || '').trim();
    const cleanVideoId = String(videoId || '').trim();

    if (!cleanProductId) {
      return res.status(400).json({ error: 'MISSING_PRODUCT_ID', message: 'ID do produto é obrigatório.' });
    }

    const { token, expiresAt } = generatePlaybackToken(cleanProductId, cleanVideoId || undefined);
    const streamUrl = cleanVideoId
      ? `/api/product-miner/videos/${encodeURIComponent(cleanProductId)}/${encodeURIComponent(cleanVideoId)}/stream?token=${encodeURIComponent(token)}`
      : `/api/product-miner/videos/${encodeURIComponent(cleanProductId)}/stream?token=${encodeURIComponent(token)}`;

    return res.json({
      success: true,
      token,
      streamUrl,
      expiresAt,
    });
  } catch (error: any) {
    console.error('[Playback Token Route Error]:', error?.message || error);
    return res.status(500).json({
      success: false,
      error: 'PLAYBACK_TOKEN_ERROR',
      message: 'Ocorreu um erro ao gerar o token de reprodução.',
    });
  }
});

// Video Download Preparation (Mentor Only)
productMinerRouter.post('/videos/prepare-download', async (req, res) => {
  if (!requireMentorRefresh(req, res)) return;
  try {
    const { productId, videoId } = req.body || {};
    if (!productId) {
      return res.status(400).json({ error: 'MISSING_PRODUCT_ID', message: 'ID do produto é obrigatório.' });
    }

    const result = await prepareVideoDownload(String(productId), videoId ? String(videoId) : undefined);
    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json(result);
  } catch (error: any) {
    console.error('[Prepare Video Download Route Error]:', error?.message || error);
    return res.status(500).json({
      success: false,
      error: 'PREPARE_VIDEO_DOWNLOAD_ERROR',
      message: 'Ocorreu um erro interno ao preparar o vídeo.',
    });
  }
});

// Helper for same-origin video streaming proxy
async function streamVideoProxy(req: express.Request, res: express.Response, productId: string, videoId?: string) {
  const cleanProductId = String(productId || '').trim();
  const cleanVideoId = String(videoId || '').trim();

  if (!cleanProductId) {
    return res.status(400).json({ error: 'MISSING_PRODUCT_ID' });
  }

  // Authentication: Check token in query param OR standard auth header
  const token = String(req.query.token || '').trim();
  const isTokenValid = token ? verifyPlaybackToken(token, cleanProductId, cleanVideoId || undefined) : false;

  if (!isTokenValid) {
    const access = await requireProductMinerAccess(req, res);
    if (!access) return;
  }

  try {
    if (!isDatabaseConfigured()) {
      return res.status(503).json({ error: 'DATABASE_NOT_CONFIGURED' });
    }

    // 1. Check existing completed record strictly by product_id and video_id
    let cdnUrl: string | null = null;
    const [rows]: any = await db.query(
      `SELECT direct_media_url, status FROM tiktok_shop_video_downloads WHERE product_id = ? AND video_id = ? LIMIT 1`,
      [cleanProductId, cleanVideoId]
    );
    const record = Array.isArray(rows) && rows[0];

    if (record && record.status === 'COMPLETED' && record.direct_media_url) {
      cdnUrl = String(record.direct_media_url);
    }

    // 2. If not prepared yet, prepare on demand
    if (!cdnUrl) {
      const prepRes = await prepareVideoDownload(cleanProductId, cleanVideoId || undefined);
      if (prepRes.success && prepRes.directMediaUrl) {
        cdnUrl = String(prepRes.directMediaUrl);
      }
    }

    if (!cdnUrl) {
      return res.status(404).json({
        error: 'VIDEO_ID_NOT_FOUND',
        message: 'Vídeo não encontrado para este produto.',
      });
    }

    // 3. Fetch from CDN forwarding Range header - NEVER REDIRECT 302 TO BROWSER
    const forwardHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': '*/*',
    };
    if (req.headers.range) {
      forwardHeaders['Range'] = String(req.headers.range);
    }

    let mediaResponse = await fetch(cdnUrl, {
      headers: forwardHeaders,
      redirect: 'follow',
    });

    if (!mediaResponse.ok && mediaResponse.status !== 206) {
      // Retry without Range header if CDN returned error with Range
      mediaResponse = await fetch(cdnUrl, {
        headers: {
          'User-Agent': forwardHeaders['User-Agent'],
          'Accept': '*/*',
        },
        redirect: 'follow',
      });
    }

    if (!mediaResponse.ok && mediaResponse.status !== 206) {
      return res.status(mediaResponse.status || 502).json({
        error: 'CDN_FETCH_FAILED',
        message: 'Não foi possível carregar o vídeo da fonte de mídia.',
      });
    }

    res.status(mediaResponse.status);
    res.setHeader('Content-Type', mediaResponse.headers.get('content-type') || 'video/mp4');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'private, max-age=300, no-transform');

    const contentRange = mediaResponse.headers.get('content-range');
    if (contentRange) res.setHeader('Content-Range', contentRange);

    const contentLength = mediaResponse.headers.get('content-length');
    if (contentLength) res.setHeader('Content-Length', contentLength);

    if (mediaResponse.body) {
      const reader = (mediaResponse.body as any).getReader();
      let isClientConnected = true;

      req.on('close', () => {
        isClientConnected = false;
        reader.cancel().catch(() => {});
      });

      while (isClientConnected) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      return res.end();
    } else {
      return res.status(502).json({ error: 'EMPTY_CDN_BODY' });
    }
  } catch (err: any) {
    console.error('[Video Proxy Stream Error]:', err?.message || err);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'STREAM_FAILED', message: 'Falha durante o streaming do vídeo.' });
    }
    return res.end();
  }
}

// Same-Origin Video Stream Proxy
productMinerRouter.get('/videos/:productId/:videoId/stream', async (req, res) => {
  const { productId, videoId } = req.params;
  return streamVideoProxy(req, res, productId, videoId);
});

productMinerRouter.get('/videos/:productId/stream', async (req, res) => {
  const { productId } = req.params;
  return streamVideoProxy(req, res, productId);
});

// Video Download Delivery/Proxy (Mentor Only)
productMinerRouter.get('/videos/:productId/download', async (req, res) => {
  if (!requireMentorRefresh(req, res)) return;
  try {
    const { productId } = req.params;
    const videoId = String(req.query.videoId || '').trim();
    if (!productId) {
      return res.status(400).json({ error: 'MISSING_PRODUCT_ID' });
    }

    if (!isDatabaseConfigured()) {
      return res.status(503).json({ error: 'DATABASE_NOT_CONFIGURED' });
    }

    let [rows]: any = await db.query(
      `SELECT direct_media_url, status FROM tiktok_shop_video_downloads WHERE product_id = ? AND video_id = ? LIMIT 1`,
      [productId, videoId]
    );

    if ((!Array.isArray(rows) || rows.length === 0) && videoId) {
      [rows] = await db.query(
        `SELECT direct_media_url, status FROM tiktok_shop_video_downloads WHERE product_id = ? AND (video_id = '' OR video_id IS NULL) LIMIT 1`,
        [productId]
      );
    }

    const record = Array.isArray(rows) && rows[0];
    if (!record || record.status !== 'COMPLETED' || !record.direct_media_url) {
      return res.status(404).json({
        error: 'VIDEO_NOT_PREPARED',
        message: 'Download de vídeo ainda não preparado.',
      });
    }

    const cdnUrl = String(record.direct_media_url);

    try {
      const mediaResponse = await fetch(cdnUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      if (mediaResponse.ok && mediaResponse.body) {
        res.setHeader('Content-Type', mediaResponse.headers.get('content-type') || 'video/mp4');
        res.setHeader('Content-Disposition', `attachment; filename="tiktok_video_${productId}${videoId ? `_${videoId}` : ''}.mp4"`);
        const length = mediaResponse.headers.get('content-length');
        if (length) res.setHeader('Content-Length', length);

        const reader = (mediaResponse.body as any).getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
        return res.end();
      }
    } catch (streamErr) {
      console.warn('[Video Proxy Stream Warning, falling back to redirect]:', streamErr);
    }

    // Fallback redirect if streaming fails
    return res.redirect(302, cdnUrl);
  } catch (error: any) {
    console.error('[Product Miner Video Download Route Error]:', error?.message || error);
    return res.status(500).json({ error: 'VIDEO_DOWNLOAD_ERROR' });
  }
});

// Admin Route: Manual backfill from legacy video columns to product_videos table
productMinerRouter.post('/admin/backfill-videos', async (req, res) => {
  if (!requireMentorRefresh(req, res)) return;
  try {
    const result = await backfillLegacyVideosToProductVideos();
    return res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('[Backfill Videos Error]:', error);
    return res.status(500).json({ success: false, error: error?.message || 'BACKFILL_ERROR' });
  }
});

// Admin Route: 100% READ-ONLY real taxonomy audit
productMinerRouter.get('/admin/audit-taxonomy-readonly', async (req, res) => {
  if (!requireMentorRefresh(req, res)) return;
  try {
    const { runReadOnlyTaxonomyAudit } = await import('../scripts/diagnoseTaxonomy.js');
    const result = await runReadOnlyTaxonomyAudit();
    return res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('[Audit Taxonomy ReadOnly Error]:', error);
    return res.status(500).json({ success: false, error: error?.message || 'AUDIT_ERROR' });
  }
});

// Admin Route: 100% READ-ONLY Deep audit of unclassified subcategories
productMinerRouter.get('/admin/audit-unclassified-products-readonly', async (req, res) => {
  if (!requireMentorRefresh(req, res)) return;
  try {
    const { runDeepUnclassifiedAudit } = await import('./unclassifiedAuditService.js');
    const result = await runDeepUnclassifiedAudit();
    return res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('[Audit Unclassified ReadOnly Error]:', error);
    return res.status(500).json({ success: false, error: error?.message || 'AUDIT_ERROR' });
  }
});

// Admin Route: 100% READ-ONLY Expansion Plan by Official Subcategories
productMinerRouter.get('/admin/expansion-plan-readonly', async (req, res) => {
  if (!requireMentorRefresh(req, res)) return;
  try {
    const { buildSubcategoryExpansionPlan, getCategoryExecutionHistoryStats } = await import('./subcategoryExpansionService.js');
    const { getCollectorCategoriesStats } = await import('./productMinerService.js');
    const targetLimit = Number(req.query.categoryTargetLimit || 500);
    const perSubMax = Number(req.query.perSubcategoryMax || 60);
    const selectedCatsParam = req.query.categories ? String(req.query.categories).split(',') : undefined;
    let selectedSubcategoriesMap: Record<string, string[]> | undefined = undefined;
    if (req.query.subcategoriesMap && typeof req.query.subcategoriesMap === 'string') {
      try {
        selectedSubcategoriesMap = JSON.parse(req.query.subcategoriesMap);
      } catch {
        // ignore
      }
    }

    const [stats, historyMap] = await Promise.all([
      getCollectorCategoriesStats(),
      getCategoryExecutionHistoryStats(selectedCatsParam),
    ]);

    const plans = buildSubcategoryExpansionPlan({
      categoryStats: stats.categories,
      selectedCategories: selectedCatsParam,
      selectedSubcategoriesMap,
      categoryTargetLimit: targetLimit,
      perSubcategoryMax: perSubMax,
      historyMap,
    });

    const totalSubcategories = plans.reduce((sum, p) => sum + p.subcategories.length, 0);
    const zeroCountSubcategories = plans.reduce(
      (sum, p) => sum + p.subcategories.filter((s) => s.isZeroCount).length,
      0
    );
    const totalAllocatedProducts = plans.reduce((sum, p) => sum + p.totalAllocated, 0);
    const totalEstimatedCredits = plans.reduce((sum, p) => sum + p.estimatedCredits, 0);
    const totalMinEstimatedCredits = plans.reduce((sum, p) => sum + p.minEstimatedCredits, 0);
    const totalMaxEstimatedCredits = plans.reduce((sum, p) => sum + p.maxEstimatedCredits, 0);
    const hasHistoricalDataCount = plans.filter((p) => p.hasHistoricalData).length;

    return res.json({
      success: true,
      readOnly: true,
      meta: {
        totalCategories: plans.length,
        totalSubcategories,
        zeroCountSubcategories,
        totalAllocatedProducts,
        totalEstimatedCredits,
        totalMinEstimatedCredits,
        totalMaxEstimatedCredits,
        hasHistoricalDataCount,
        categoryTargetLimit: targetLimit,
        perSubcategoryMax: perSubMax,
      },
      historyMap,
      plans,
    });
  } catch (error: any) {
    console.error('[Expansion Plan ReadOnly Error]:', error);
    return res.status(500).json({ success: false, error: error?.message || 'EXPANSION_PLAN_ERROR' });
  }
});

// Admin Route: Get category execution history stats for estimating credits
productMinerRouter.get('/admin/category-execution-history', async (req, res) => {
  if (!requireMentorRefresh(req, res)) return;
  try {
    const { getCategoryExecutionHistoryStats } = await import('./subcategoryExpansionService.js');
    const selectedCatsParam = req.query.categories ? String(req.query.categories).split(',') : undefined;
    const historyMap = await getCategoryExecutionHistoryStats(selectedCatsParam);
    return res.json({ success: true, historyMap });
  } catch (error: any) {
    console.error('[Category Execution History Error]:', error);
    return res.status(500).json({ success: false, error: error?.message || 'HISTORY_ERROR' });
  }
});

// Admin Route: Execute subcategory expansion with Real-time Stream (Mentor only)
productMinerRouter.post('/admin/execute-subcategory-expansion-stream', async (req, res) => {
  if (!requireMentorRefresh(req, res)) return;

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const sendEvent = (event: any) => {
    try {
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
        (res as any).flush?.();
      }
    } catch (writeErr) {
      console.warn('[SSE sendEvent Error]:', writeErr);
    }
  };

  // Heartbeat keep-alive para evitar timeouts de proxies reversos e browsers
  const pingInterval = setInterval(() => {
    try {
      if (!res.writableEnded) {
        res.write(': ping\n\n');
        (res as any).flush?.();
      }
    } catch {}
  }, 3000);

  let isClientClosed = false;
  req.on('close', () => {
    isClientClosed = true;
  });

  const executionId = `exp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  try {
    const { executeSubcategoryExpansion } = await import('./subcategoryExpansionService.js');
    const { createExpansionJobInDb, updateExpansionJobInDb } = await import('./database.js');
    const selectedCategories = Array.isArray(req.body?.selectedCategories) ? req.body.selectedCategories : undefined;
    const selectedSubcategoriesMap = (req.body?.selectedSubcategoriesMap && typeof req.body.selectedSubcategoriesMap === 'object')
      ? req.body.selectedSubcategoriesMap
      : undefined;
    const categoryTargetLimit = req.body?.categoryTargetLimit ? Number(req.body.categoryTargetLimit) : 300;
    const perSubcategoryMax = req.body?.perSubcategoryMax ? Number(req.body.perSubcategoryMax) : 60;
    const maxCreditBudgetPerCategory = req.body?.maxCreditBudgetPerCategory ? Number(req.body.maxCreditBudgetPerCategory) : undefined;
    const studentCode = normalizeAccessCode(req.header('x-access-code') || req.header('x-student-access-code') || '') || 'MENTOR';

    // Cria registro do job no banco para rastreamento resiliente
    await createExpansionJobInDb({
      id: executionId,
      studentCode,
      selectedCategories: selectedCategories || [],
      selectedSubcategoriesMap,
      categoryTargetLimit,
      perSubcategoryMax,
      totalCategories: selectedCategories ? selectedCategories.length : 0,
    }).catch(() => {});

    // Enviar evento INIT com o executionId para o frontend
    sendEvent({ type: 'INIT', executionId });

    const result = await executeSubcategoryExpansion({
      selectedCategories,
      selectedSubcategoriesMap,
      categoryTargetLimit,
      perSubcategoryMax,
      maxCreditBudgetPerCategory,
      shouldCancel: () => isClientClosed,
      onProgress: (progress) => {
        if (!isClientClosed) {
          sendEvent({ type: 'PROGRESS', executionId, progress });
        }
        // Atualiza progresso no MySQL
        updateExpansionJobInDb(executionId, {
          last_progress_json: JSON.stringify(progress),
          total_received: progress.totalReceived,
          total_new_products: progress.totalNewProducts,
          total_updated_products: progress.totalUpdatedProducts,
          total_valid_new_target: progress.validNewProductsForTarget,
          total_off_target: progress.offTargetProducts,
          total_unclassified: progress.unclassifiedProducts,
          total_credits_used: progress.totalCreditsUsed,
          total_requests_made: progress.totalRequestsMade,
          total_pages_processed: progress.totalPagesProcessed,
        }).catch(() => {});
      },
    });

    clearInterval(pingInterval);

    await updateExpansionJobInDb(executionId, {
      status: 'COMPLETED',
      result_json: JSON.stringify(result),
      category_summaries_json: JSON.stringify(result.categorySummaries),
      categories_completed: result.categoriesCompleted,
    }).catch(() => {});

    // Emissão do evento terminal com alias duplo (COMPLETE e DONE)
    sendEvent({ type: 'COMPLETE', executionId, result });
    sendEvent({ type: 'DONE', executionId, result });
    res.end();
  } catch (error: any) {
    clearInterval(pingInterval);
    console.error('[Execute Subcategory Expansion Stream Error]:', error);
    const { updateExpansionJobInDb } = await import('./database.js');
    await updateExpansionJobInDb(executionId, {
      status: 'FAILED',
      error_message: error?.message || 'EXPANSION_EXECUTION_ERROR',
    }).catch(() => {});
    sendEvent({ type: 'ERROR', executionId, error: error?.message || 'EXPANSION_EXECUTION_ERROR' });
    res.end();
  } finally {
    clearInterval(pingInterval);
  }
});

// Admin Route: Iniciar Job de Expansão Passo a Passo (Resumable Job)
productMinerRouter.post('/admin/expansion-jobs/start', async (req, res) => {
  if (!requireMentorRefresh(req, res)) return;
  try {
    const { initializeExpansionJobState } = await import('./subcategoryExpansionService.js');
    const { createExpansionJobInDb, updateExpansionJobInDb } = await import('./database.js');

    const selectedCategories = Array.isArray(req.body?.selectedCategories) ? req.body.selectedCategories : undefined;
    const selectedSubcategoriesMap = (req.body?.selectedSubcategoriesMap && typeof req.body.selectedSubcategoriesMap === 'object')
      ? req.body.selectedSubcategoriesMap
      : undefined;
    const categoryTargetLimit = req.body?.categoryTargetLimit ? Number(req.body.categoryTargetLimit) : 300;
    const perSubcategoryMax = req.body?.perSubcategoryMax ? Number(req.body.perSubcategoryMax) : 60;
    const rawCode = req.header('x-access-code') || req.header('x-student-access-code') || '';
    const studentCode = normalizeAccessCode(rawCode) || 'MENTOR';

    const executionId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const state = await initializeExpansionJobState({
      jobId: executionId,
      studentCode,
      selectedCategories,
      selectedSubcategoriesMap,
      categoryTargetLimit,
      perSubcategoryMax,
    });

    await createExpansionJobInDb({
      id: executionId,
      studentCode,
      selectedCategories: state.selectedCategories,
      selectedSubcategoriesMap,
      categoryTargetLimit,
      perSubcategoryMax,
      totalCategories: state.plans.length,
      plansJson: JSON.stringify(state.plans),
      stateJson: JSON.stringify(state),
    });

    return res.json({
      success: true,
      executionId,
      state,
      meta: {
        totalCategories: state.plans.length,
        totalSubcategories: state.totalSelectedSubcategories,
        plans: state.plans,
      },
    });
  } catch (error: any) {
    console.error('[Start Expansion Job Error]:', error);
    return res.status(500).json({ success: false, error: error?.message || 'START_JOB_ERROR' });
  }
});

// Admin Route: Executar um Step do Job de Expansão (Resumable Job)
productMinerRouter.post('/admin/expansion-jobs/:executionId/step', async (req, res) => {
  if (!requireMentorRefresh(req, res)) return;
  const executionId = req.params.executionId;
  const { getExpansionJobFromDb, updateExpansionJobInDb, tryAcquireExpansionJobStepLock, releaseExpansionJobStepLock } = await import('./database.js');
  const { executeSubcategoryExpansionStep, finalizeExpansionJobState } = await import('./subcategoryExpansionService.js');

  const lockToken = `lock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const acquired = await tryAcquireExpansionJobStepLock(executionId, lockToken, 60);
  if (!acquired) {
    return res.status(409).json({
      success: false,
      error: 'STEP_IN_PROGRESS',
      message: 'Já existe um step em execução para este job. Aguarde a conclusão.',
    });
  }

  try {
    const jobRow = await getExpansionJobFromDb(executionId);
    if (!jobRow) {
      return res.status(404).json({ success: false, error: 'JOB_NOT_FOUND', message: `Job ${executionId} não encontrado.` });
    }

    if (jobRow.status === 'COMPLETED' || jobRow.status === 'CANCELLED' || jobRow.status === 'FAILED' || jobRow.status === 'PARTIAL_ERROR') {
      return res.json({
        success: true,
        executionId,
        isCompleted: true,
        status: jobRow.status,
        result: jobRow.result_json ? JSON.parse(jobRow.result_json) : null,
      });
    }

    let state = jobRow.state_json ? JSON.parse(jobRow.state_json) : null;
    if (!state) {
      return res.status(400).json({ success: false, error: 'INVALID_JOB_STATE' });
    }

    const stepOutcome = await executeSubcategoryExpansionStep(state);
    let updatedState = stepOutcome.state;
    let progress = stepOutcome.progress;
    let result = stepOutcome.result;

    if (updatedState.isCompleted || result) {
      const finalized = finalizeExpansionJobState(updatedState);
      updatedState = finalized.state;
      progress = finalized.progress;
      result = finalized.result;
    }

    await updateExpansionJobInDb(executionId, {
      status: updatedState.status,
      current_category_index: updatedState.currentCatIdx,
      current_subcategory_index: updatedState.currentSubIdx,
      current_page: updatedState.currentPage,
      consecutive_no_valid_pages: updatedState.consecutiveNoValidPages,
      categories_completed: updatedState.categoriesCompleted,
      total_received: updatedState.totalProcessed,
      total_new_products: updatedState.totalNew,
      total_updated_products: updatedState.totalUpdated,
      total_valid_new_target: updatedState.totalValidNewForTarget,
      total_off_target: updatedState.totalOffTarget,
      total_unclassified: updatedState.totalUnclassified,
      total_credits_used: updatedState.totalCreditsUsed,
      total_requests_made: updatedState.totalRequestsMade,
      total_pages_processed: updatedState.totalPagesProcessed,
      technical_errors: updatedState.technicalErrors,
      subcategories_failed: updatedState.subcategoriesFailed,
      state_json: JSON.stringify(updatedState),
      last_progress_json: JSON.stringify(progress),
      category_summaries_json: JSON.stringify(updatedState.categorySummaries),
      result_json: result ? JSON.stringify(result) : undefined,
    });

    return res.json({
      success: true,
      executionId,
      isCompleted: updatedState.isCompleted,
      status: updatedState.status,
      progress,
      result: result || null,
      state: updatedState,
    });
  } catch (error: any) {
    console.error(`[Step Expansion Job Error - ${executionId}]:`, error);
    try {
      const jobRow = await getExpansionJobFromDb(executionId);
      if (jobRow?.state_json) {
        const state = JSON.parse(jobRow.state_json);
        state.errors = state.errors || [];
        state.errors.push(error?.message || 'STEP_JOB_ERROR');
        state.status = 'FAILED';
        const finalized = finalizeExpansionJobState(state);
        await updateExpansionJobInDb(executionId, {
          status: 'FAILED',
          error_message: error?.message || 'STEP_JOB_ERROR',
          result_json: JSON.stringify(finalized.result),
          category_summaries_json: JSON.stringify(finalized.state.categorySummaries),
          state_json: JSON.stringify(finalized.state),
        });
      } else {
        await updateExpansionJobInDb(executionId, {
          status: 'FAILED',
          error_message: error?.message || 'STEP_JOB_ERROR',
        });
      }
    } catch {}
    return res.status(500).json({ success: false, error: error?.message || 'STEP_JOB_ERROR' });
  } finally {
    await releaseExpansionJobStepLock(executionId, lockToken).catch(() => {});
  }
});

// Admin Route: Status do Job de Expansão
productMinerRouter.get('/admin/expansion-jobs/:executionId/status', async (req, res) => {
  if (!requireMentorRefresh(req, res)) return;
  const executionId = req.params.executionId;
  try {
    const { getExpansionJobFromDb } = await import('./database.js');
    const jobRow = await getExpansionJobFromDb(executionId);
    if (!jobRow) {
      return res.status(404).json({ success: false, error: 'JOB_NOT_FOUND' });
    }
    return res.json({
      success: true,
      job: {
        id: jobRow.id,
        status: jobRow.status,
        categoriesCompleted: jobRow.categories_completed,
        totalCategories: jobRow.total_categories,
        totalReceived: jobRow.total_received,
        totalNewProducts: jobRow.total_new_products,
        totalUpdatedProducts: jobRow.total_updated_products,
        totalValidNewTarget: jobRow.total_valid_new_target,
        totalCreditsUsed: jobRow.total_credits_used,
        totalRequestsMade: jobRow.total_requests_made,
        totalPagesProcessed: jobRow.total_pages_processed,
        technicalErrors: jobRow.technical_errors,
        subcategoriesFailed: jobRow.subcategories_failed,
        lastProgress: jobRow.last_progress_json ? JSON.parse(jobRow.last_progress_json) : null,
        result: jobRow.result_json ? JSON.parse(jobRow.result_json) : null,
        errorMessage: jobRow.error_message,
        createdAt: jobRow.created_at,
        updatedAt: jobRow.updated_at,
        completedAt: jobRow.completed_at,
      },
    });
  } catch (error: any) {
    console.error('[Get Expansion Job Status Error]:', error);
    return res.status(500).json({ success: false, error: error?.message || 'STATUS_JOB_ERROR' });
  }
});

// Admin Route: Cancelar Job de Expansão
productMinerRouter.post('/admin/expansion-jobs/:executionId/cancel', async (req, res) => {
  if (!requireMentorRefresh(req, res)) return;
  const executionId = req.params.executionId;
  try {
    const { getExpansionJobFromDb, updateExpansionJobInDb } = await import('./database.js');
    const { finalizeExpansionJobState } = await import('./subcategoryExpansionService.js');
    const jobRow = await getExpansionJobFromDb(executionId);
    let finalResultJson: string | undefined = undefined;
    if (jobRow?.state_json) {
      try {
        const state = JSON.parse(jobRow.state_json);
        state.status = 'CANCELLED';
        state.stopReason = 'CANCELLED';
        const finalized = finalizeExpansionJobState(state);
        finalResultJson = JSON.stringify(finalized.result);
      } catch {}
    }
    await updateExpansionJobInDb(executionId, {
      status: 'CANCELLED',
      result_json: finalResultJson,
      completed_at: new Date(),
    }, true);
    return res.json({ success: true, executionId, status: 'CANCELLED' });
  } catch (error: any) {
    console.error('[Cancel Expansion Job Error]:', error);
    return res.status(500).json({ success: false, error: error?.message || 'CANCEL_JOB_ERROR' });
  }
});

// ==========================================
// ROLETA / ESCOLHA DO DIA (DAILY PICK) ROUTES
// ==========================================

// Obter status do giro do dia para o usuário autenticado
productMinerRouter.get('/daily-pick/status', async (req, res) => {
  const access = await requireProductMinerAccess(req, res);
  if (!access) return;

  const requesterCode = getRequesterCode(req) || 'DEFAULT_STUDENT';
  try {
    const status = await getDailyPickStatus(requesterCode);
    return res.json({
      success: true,
      hasSpunToday: status.hasSpunToday,
      pickDate: status.pickDate,
      category: status.category,
      product: status.product,
      role: status.role,
      dailyLimit: status.dailyLimit,
      spinsUsedToday: status.spinsUsedToday,
      remainingSpins: status.remainingSpins,
      canSpin: status.canSpin,
    });
  } catch (error: any) {
    console.error('[Daily Pick Status Error]:', error);
    return res.status(500).json({ success: false, error: error?.message || 'DAILY_PICK_STATUS_ERROR' });
  }
});

// Realizar o giro da roleta
productMinerRouter.post('/daily-pick/spin', async (req, res) => {
  const access = await requireProductMinerAccess(req, res);
  if (!access) return;

  const requesterCode = getRequesterCode(req) || 'DEFAULT_STUDENT';
  const { targetCategory } = req.body || {};

  try {
    const result = await spinDailyPick(requesterCode, targetCategory);
    return res.json({
      success: true,
      hasSpunToday: result.hasSpunToday,
      pickDate: result.pickDate,
      category: result.category,
      product: result.product,
      role: result.role,
      dailyLimit: result.dailyLimit,
      spinsUsedToday: result.spinsUsedToday,
      remainingSpins: result.remainingSpins,
      canSpin: result.canSpin,
    });
  } catch (error: any) {
    console.error('[Daily Pick Spin Error]:', error);
    const statusCode = error?.message === 'DAILY_SPIN_LIMIT_REACHED' ? 429 : 500;
    return res.status(statusCode).json({ success: false, error: error?.message || 'DAILY_PICK_SPIN_ERROR' });
  }
});





