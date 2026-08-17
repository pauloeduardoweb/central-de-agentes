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
import { extractAudioFromMediaBuffer, getAudioBinariesHealth } from './audioExtractor.js';
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
// HELPER: VALIDAR ASSINATURA DE MÍDIA (MAGIC BYTES E CONTENT-TYPE)
// =========================================================================
interface MediaValidationResult {
  isValid: boolean;
  detectedMime: string;
  rejectReason?: string;
}

function validateMediaBuffer(buffer: Buffer, receivedContentType?: string | null): MediaValidationResult {
  if (!buffer || buffer.length < 4096) {
    return { isValid: false, detectedMime: 'unknown', rejectReason: 'BUFFER_TOO_SMALL' };
  }

  const rawMime = String(receivedContentType || '').toLowerCase().split(';')[0].trim();

  // Rejeitar expressamente formatos de texto, HTML, JSON, XML e imagens
  if (
    rawMime.startsWith('text/') ||
    rawMime.includes('html') ||
    rawMime.includes('json') ||
    rawMime.includes('xml') ||
    rawMime.startsWith('image/')
  ) {
    return { isValid: false, detectedMime: rawMime, rejectReason: `INVALID_CONTENT_TYPE_${rawMime}` };
  }

  // Verificar se o início do buffer é HTML ou JSON disfarçado
  const headStr = buffer.slice(0, 256).toString('utf8').trim().toLowerCase();
  if (
    headStr.startsWith('<!doctype') ||
    headStr.startsWith('<html') ||
    headStr.startsWith('<?xml') ||
    headStr.startsWith('{') ||
    headStr.startsWith('/*') ||
    headStr.includes('<body') ||
    headStr.includes('<script')
  ) {
    return { isValid: false, detectedMime: 'text/html', rejectReason: 'DETECTED_HTML_JSON_PAYLOAD' };
  }

  // Verificar Magic Bytes conhecidos:
  // 1. MP4 / MOV (ISO Base Media File Format: contém 'ftyp', 'moov', 'mdat' nos primeiros 32 bytes)
  const headHex = buffer.slice(0, 32).toString('hex');
  const headAscii = buffer.slice(0, 32).toString('ascii');

  if (headAscii.includes('ftyp') || headAscii.includes('moov') || headAscii.includes('mdat')) {
    return { isValid: true, detectedMime: rawMime.startsWith('video/') ? rawMime : 'video/mp4' };
  }

  // 2. WebM / MKV (EBML: 0x1A 0x45 0xDF 0xA3)
  if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
    return { isValid: true, detectedMime: 'video/webm' };
  }

  // 3. MP3 (ID3 header ou Frame Sync 0xFF 0xFB/F3/F2)
  if (
    (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) || // 'ID3'
    (buffer[0] === 0xff && (buffer[1] === 0xfb || buffer[1] === 0xf3 || buffer[1] === 0xf2))
  ) {
    return { isValid: true, detectedMime: 'audio/mpeg' };
  }

  // 4. AAC (ADTS Sync: 0xFF 0xF1 ou 0xFF 0xF9)
  if (buffer[0] === 0xff && (buffer[1] === 0xf1 || buffer[1] === 0xf9)) {
    return { isValid: true, detectedMime: 'audio/aac' };
  }

  // 5. WAV (RIFF....WAVE)
  if (headAscii.startsWith('RIFF') && headAscii.includes('WAVE')) {
    return { isValid: true, detectedMime: 'audio/wav' };
  }

  // 6. OGG (OggS)
  if (buffer[0] === 0x4f && buffer[1] === 0x67 && buffer[2] === 0x67 && buffer[3] === 0x53) {
    return { isValid: true, detectedMime: 'audio/ogg' };
  }

  // 7. Se Content-Type for explicitamente video/* ou audio/* e não tiver sido rejeitado por texto/html
  if (rawMime.startsWith('video/') || rawMime.startsWith('audio/')) {
    return { isValid: true, detectedMime: rawMime };
  }

  return { isValid: false, detectedMime: rawMime || 'unknown', rejectReason: 'UNKNOWN_MEDIA_SIGNATURE' };
}

function isDirectCdnMediaUrl(urlStr: string): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;
  const lower = urlStr.toLowerCase();
  // URLs de páginas web do TikTok não são mídias diretas
  if (
    (lower.includes('tiktok.com/@') && lower.includes('/video/')) ||
    lower.includes('vt.tiktok.com/') ||
    lower.includes('vm.tiktok.com/') ||
    lower.includes('tiktok.com/t/')
  ) {
    return false;
  }
  // Verificar se tem domínios ou padrões de CDN de mídia conhecidos
  return (
    lower.includes('tiktokcdn') ||
    lower.includes('muscdn') ||
    lower.includes('v16-webapp') ||
    lower.includes('v16a') ||
    lower.includes('v16m') ||
    lower.includes('.mp4') ||
    lower.includes('.webm') ||
    lower.includes('.mp3') ||
    lower.includes('.m4a') ||
    lower.includes('socialcrawl') ||
    lower.includes('download_media')
  );
}

// =========================================================================
// HELPER: VALIDAÇÃO ATIVA DE URL DIRETA DE CDN (DETECTAR EXPIRAÇÃO / STATUS)
// =========================================================================
async function validateDirectMediaUrl(urlStr: string): Promise<{
  isValid: boolean;
  httpStatus?: number;
  contentType?: string | null;
  domain?: string;
  error?: 'EMPTY_URL' | 'INVALID_PROTOCOL' | 'NOT_DIRECT_CDN' | 'EXPIRED_OR_FORBIDDEN' | 'HTML_OR_JSON_RESPONSE' | string;
}> {
  if (!urlStr || typeof urlStr !== 'string') return { isValid: false, error: 'EMPTY_URL' };
  if (!urlStr.startsWith('http://') && !urlStr.startsWith('https://')) return { isValid: false, error: 'INVALID_PROTOCOL' };

  let domain = 'unknown';
  try {
    domain = new URL(urlStr).hostname;
  } catch {}

  const isCdn = isDirectCdnMediaUrl(urlStr);

  // Se não passar no filtro de CDN direto, tentar uma requisição de cabeçalho para diagnóstico exato sem mascarar
  if (!isCdn) {
    try {
      const probeRes = await fetch(urlStr, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Range': 'bytes=0-512',
          'Accept': '*/*',
        },
        signal: AbortSignal.timeout(6000),
      });
      const httpStatus = probeRes.status;
      const contentType = probeRes.headers.get('content-type');
      return {
        isValid: false,
        httpStatus,
        contentType,
        domain,
        error: 'NOT_DIRECT_CDN',
      };
    } catch {
      return { isValid: false, domain, error: 'NOT_DIRECT_CDN' };
    }
  }

  try {
    const res = await fetch(urlStr, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Range': 'bytes=0-1024',
        'Accept': '*/*',
      },
      signal: AbortSignal.timeout(8000),
    });

    const httpStatus = res.status;
    const contentType = res.headers.get('content-type');

    if (httpStatus === 401 || httpStatus === 403 || httpStatus === 404 || httpStatus === 410) {
      return {
        isValid: false,
        httpStatus,
        contentType,
        domain,
        error: httpStatus === 403 ? 'HTTP_403' : 'EXPIRED_OR_FORBIDDEN',
      };
    }

    if (!res.ok && httpStatus !== 206) {
      return { isValid: false, httpStatus, contentType, domain, error: `HTTP_${httpStatus}` };
    }

    if (contentType && (contentType.includes('text/html') || contentType.includes('application/json'))) {
      return { isValid: false, httpStatus, contentType, domain, error: 'HTML_OR_JSON_RESPONSE' };
    }

    return { isValid: true, httpStatus, contentType, domain };
  } catch (err: any) {
    return { isValid: false, domain, error: err?.message || 'NETWORK_ERROR' };
  }
}

// =========================================================================
// HELPER: BAIXAR BUFFER REAL DO VÍDEO/ÁUDIO PARA TRANSCRIÇÃO FIEL
// =========================================================================
interface FetchVideoMediaBufferResult {
  buffer: Buffer;
  mimeType: string;
  mediaSource: 'DB_DIRECT_MEDIA' | 'PREPARED_DIRECT_MEDIA' | 'FALLBACK_VIDEO_URL';
  httpStatus: number;
  domain: string;
  bufferBytes: number;
}

async function fetchVideoMediaBuffer(
  productId: string,
  videoId?: string,
  fallbackUrl?: string
): Promise<{ result?: FetchVideoMediaBufferResult; errorStage?: string; errorDetails?: any }> {
  const cleanProductId = String(productId || '').trim();
  const cleanVideoId = String(videoId || '').trim();

  let cdnUrl: string | null = null;
  let mediaSource: 'DB_DIRECT_MEDIA' | 'PREPARED_DIRECT_MEDIA' | 'FALLBACK_VIDEO_URL' = 'DB_DIRECT_MEDIA';
  let prepareError: string | null = null;
  let prepareMessage: string | null = null;
  let dbUrlExpired = false;

  // 1. Verificar registro persistido no banco de dados e validar se a URL não expirou
  if (isDatabaseConfigured()) {
    try {
      const [rows]: any = await db.query(
        `SELECT direct_media_url, status FROM tiktok_shop_video_downloads WHERE product_id = ? AND (video_id = ? OR video_id = '' OR ? = '') LIMIT 1`,
        [cleanProductId, cleanVideoId, cleanVideoId]
      );
      const record = Array.isArray(rows) && rows[0];
      if (record && record.status === 'COMPLETED' && record.direct_media_url) {
        const storedUrl = String(record.direct_media_url);
        const val = await validateDirectMediaUrl(storedUrl);
        if (val.isValid) {
          cdnUrl = storedUrl;
          mediaSource = 'DB_DIRECT_MEDIA';
        } else {
          console.warn('[fetchVideoMediaBuffer] Stored direct_media_url is expired or invalid:', {
            httpStatus: val.httpStatus,
            contentType: val.contentType,
            error: val.error,
            domain: val.domain,
          });
          dbUrlExpired = true;
        }
      }
    } catch (dbErr: any) {
      console.warn('[fetchVideoMediaBuffer DB read warning]:', dbErr?.message || dbErr);
    }
  }

  // 2. Se não estiver preparado no banco ou estiver expirada, acionar prepareVideoDownload com forceRefresh
  if (!cdnUrl) {
    try {
      const prepRes = await prepareVideoDownload(cleanProductId, cleanVideoId || undefined, dbUrlExpired);
      if (prepRes.success && prepRes.directMediaUrl) {
        const prepVal = await validateDirectMediaUrl(prepRes.directMediaUrl);
        if (prepVal.isValid) {
          cdnUrl = String(prepRes.directMediaUrl);
          mediaSource = 'PREPARED_DIRECT_MEDIA';
        } else {
          console.warn('[fetchVideoMediaBuffer] Newly prepared directMediaUrl failed validation:', prepVal);
          prepareError = prepVal.error || 'PREPARED_URL_VALIDATION_FAILED';
          prepareMessage = 'A URL gerada pelo provedor de mídia não respondeu com áudio/vídeo válido.';
        }
      } else {
        prepareError = prepRes.error || 'PREPARE_FAILED';
        prepareMessage = prepRes.message || 'Falha ao preparar download do vídeo.';
      }
    } catch (prepErr: any) {
      console.warn('[fetchVideoMediaBuffer prepare error]:', prepErr?.message || prepErr);
      prepareError = prepErr?.name || 'PREPARE_EXCEPTION';
      prepareMessage = prepErr?.message || 'Exceção ao preparar vídeo.';
    }
  }

  // 3. Fallback APENAS se for URL direta de CDN de mídia (NUNCA página HTML do TikTok)
  if (!cdnUrl && fallbackUrl && (fallbackUrl.startsWith('http://') || fallbackUrl.startsWith('https://'))) {
    if (isDirectCdnMediaUrl(fallbackUrl)) {
      const fbVal = await validateDirectMediaUrl(fallbackUrl);
      if (fbVal.isValid) {
        cdnUrl = fallbackUrl;
        mediaSource = 'FALLBACK_VIDEO_URL';
      } else {
        console.info('[fetchVideoMediaBuffer] fallbackUrl failed validation:', fbVal);
      }
    } else {
      console.info('[fetchVideoMediaBuffer] Ignorando fallbackUrl pois é página web e não mídia direta:', fallbackUrl.slice(0, 60));
    }
  }

  if (!cdnUrl) {
    return {
      errorStage: 'MEDIA_PREPARE',
      errorDetails: {
        reason: prepareError ? 'PREPARE_VIDEO_DOWNLOAD_FAILED' : 'NO_DIRECT_MEDIA_URL',
        prepareError,
        prepareMessage,
        dbUrlExpired,
      },
    };
  }

  let domain = 'unknown';
  try {
    domain = new URL(cdnUrl).hostname;
  } catch {}

  // 4. Baixar buffer de mídia real com timeout e validação estrita
  try {
    const res = await fetch(cdnUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(45000),
    });

    const httpStatus = res.status;
    const rawContentType = res.headers.get('content-type');

    if (!res.ok) {
      return {
        errorStage: 'MEDIA_FETCH',
        errorDetails: { httpStatus, statusText: res.statusText, domain, mediaSource, prepareError, prepareMessage },
      };
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 5. Validar que o buffer é de fato mídia e não HTML de erro ou JSON
    const validation = validateMediaBuffer(buffer, rawContentType);
    if (!validation.isValid) {
      console.warn('[fetchVideoMediaBuffer validation failed]:', {
        rejectReason: validation.rejectReason,
        detectedMime: validation.detectedMime,
        rawContentType,
        bufferBytes: buffer.length,
        domain,
        mediaSource,
      });
      return {
        errorStage: 'MEDIA_VALIDATE',
        errorDetails: {
          rejectReason: validation.rejectReason,
          rawContentType,
          bufferBytes: buffer.length,
          domain,
          mediaSource,
          prepareError,
          prepareMessage,
        },
      };
    }

    return {
      result: {
        buffer,
        mimeType: validation.detectedMime || 'video/mp4',
        mediaSource,
        httpStatus,
        domain,
        bufferBytes: buffer.length,
      },
    };
  } catch (dlErr: any) {
    console.error('[fetchVideoMediaBuffer download exception]:', {
      message: dlErr?.message,
      name: dlErr?.name,
      domain,
      mediaSource,
    });
    return {
      errorStage: 'MEDIA_FETCH',
      errorDetails: { message: dlErr?.message, name: dlErr?.name, domain, mediaSource, prepareError, prepareMessage },
    };
  }
}

// =========================================================================
// ESTRUTURA E PARSERS DE TRANSCRIÇÃO (COMPATIBILIDADE VYRAL V2 + GERAÇÃO Z PRO)
// =========================================================================
interface TimedCaption {
  start: number;
  end: number;
  text: string;
}

function formatSecondsInterval(startSec: number, endSec: number): string {
  const formatTime = (sec: number) => {
    const m = Math.floor(Math.max(0, sec) / 60);
    const s = Math.floor(Math.max(0, sec) % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };
  return `${formatTime(startSec)}–${formatTime(endSec)}`;
}

function parseStoredTimedTranscript(jsonStr: string | null | undefined): {
  captions: TimedCaption[];
  timedTranscript: Array<{ time: string; text: string }>;
} {
  if (!jsonStr) return { captions: [], timedTranscript: [] };
  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.captions) && parsed.captions.length > 0) {
        const captions: TimedCaption[] = parsed.captions.map((c: any) => ({
          start: typeof c.start === 'number' ? Number(c.start.toFixed(3)) : Number(c.start) || 0,
          end: typeof c.end === 'number' ? Number(c.end.toFixed(3)) : Number(c.end) || 0,
          text: String(c.text || '').trim(),
        }));
        const timedTranscript = Array.isArray(parsed.timedTranscript) && parsed.timedTranscript.length > 0
          ? parsed.timedTranscript
          : captions.map((c) => ({ time: formatSecondsInterval(c.start, c.end), text: c.text }));
        return { captions, timedTranscript };
      }
      if (Array.isArray(parsed) && parsed.length > 0) {
        const timedTranscript = parsed.map((item: any) => ({
          time: String(item.time || '00:00–00:00'),
          text: String(item.text || '').trim(),
        }));
        const captions: TimedCaption[] = timedTranscript.map((item, idx) => {
          const parts = item.time.split(/[–\-]/);
          const parsePart = (p: string) => {
            const segments = p.split(':').map(Number);
            if (segments.length === 2) return (segments[0] || 0) * 60 + (segments[1] || 0);
            return Number(p) || 0;
          };
          const start = parts[0] ? parsePart(parts[0]) : idx * 3;
          const end = parts[1] ? parsePart(parts[1]) : start + 3;
          return { start, end, text: item.text };
        });
        return { captions, timedTranscript };
      }
    }
  } catch {}
  return { captions: [], timedTranscript: [] };
}

// =========================================================================
// ROTA DE DIAGNÓSTICO DE BANCO DE DADOS: GET /database-health
// (ACESSO EXCLUSIVO MENTOR / MASTER - NUNCA EXPÕE DADOS SENSÍVEIS)
// =========================================================================
productMinerRouter.get('/database-health', async (req, res) => {
  if (!requireMentorRefresh(req, res)) return;

  const dbHostPresent = Boolean(process.env.DB_HOST && process.env.DB_HOST.trim().length > 0);
  const dbNamePresent = Boolean(process.env.DB_NAME && process.env.DB_NAME.trim().length > 0);
  const dbUserPresent = Boolean(process.env.DB_USER && process.env.DB_USER.trim().length > 0);
  const dbPasswordPresent = Boolean(process.env.DB_PASSWORD && process.env.DB_PASSWORD.trim().length > 0);
  const dbConfigured = isDatabaseConfigured();

  let connectionTest = false;
  let productsTableAccessible = false;
  let totalProducts = 0;

  if (dbConfigured) {
    try {
      const [rows] = await db.query('SELECT 1 AS connected');
      connectionTest = Array.isArray(rows) && rows.length > 0;
    } catch (err: any) {
      connectionTest = false;
    }

    if (connectionTest) {
      try {
        const [prodRows]: any = await db.query('SELECT COUNT(*) AS total FROM tiktok_shop_products');
        if (Array.isArray(prodRows) && prodRows.length > 0) {
          productsTableAccessible = true;
          totalProducts = Number(prodRows[0]?.total || 0);
        }
      } catch (err: any) {
        productsTableAccessible = false;
      }
    }
  }

  return res.json({
    environment: process.env.NODE_ENV || 'development',
    dbHostPresent,
    dbNamePresent,
    dbUserPresent,
    dbPasswordPresent,
    isDatabaseConfigured: dbConfigured,
    connectionTest,
    productsTableAccessible,
    totalProducts,
  });
});

// =========================================================================
// ROTA DE DIAGNÓSTICO DE ÁUDIO: GET /audio-health
// =========================================================================
productMinerRouter.get('/audio-health', async (req, res) => {
  const access = await requireProductMinerAccess(req, res);
  if (!access) return;

  const health = getAudioBinariesHealth();
  return res.json({
    success: true,
    ffmpegAvailable: health.ffmpegAvailable,
    ffprobeAvailable: health.ffprobeAvailable,
    ffmpegConfigured: Boolean(health.ffmpegPath),
    ffprobeConfigured: Boolean(health.ffprobePath),
    ffmpegVersion: health.ffmpegVersion || null,
  });
});

// =========================================================================
// ROTA DE DIAGNÓSTICO DE RESOLUÇÃO DE MÍDIA: GET /videos/media-diagnostic/:productId/:videoId?
// (ACESSO EXCLUSIVO MENTOR / MASTER)
// =========================================================================
productMinerRouter.get(['/videos/media-diagnostic/:productId/:videoId', '/videos/media-diagnostic/:productId'], async (req, res) => {
  if (!requireMentorRefresh(req, res)) return;

  const cleanProductId = String(req.params.productId || '').trim();
  const cleanVideoId = String(req.params.videoId || req.query.videoId || '').trim();

  let databaseRecord = {
    found: false,
    status: null as string | null,
    hasDirectMediaUrl: false,
    provider: null as string | null,
    preparedAt: null as string | null,
    errorMessage: null as string | null,
  };

  let dbDirectUrl: string | null = null;
  let dbUrlExpired = false;

  if (isDatabaseConfigured()) {
    try {
      const [rows]: any = await db.query(
        `SELECT
           product_id,
           video_id,
           status,
           provider,
           provider_cached,
           prepared_at,
           error_message,
           direct_media_url,
           CASE
             WHEN direct_media_url IS NULL OR direct_media_url = '' THEN 0
             ELSE 1
           END AS has_direct_media_url
         FROM tiktok_shop_video_downloads
         WHERE product_id = ? AND (video_id = ? OR video_id = '' OR ? = '')
         LIMIT 1`,
        [cleanProductId, cleanVideoId, cleanVideoId]
      );
      if (Array.isArray(rows) && rows[0]) {
        const r = rows[0];
        databaseRecord = {
          found: true,
          status: r.status || null,
          hasDirectMediaUrl: Boolean(r.has_direct_media_url),
          provider: r.provider || null,
          preparedAt: r.prepared_at ? new Date(r.prepared_at).toISOString() : null,
          errorMessage: r.error_message || null,
        };
        if (r.direct_media_url) {
          dbDirectUrl = String(r.direct_media_url);
        }
      }
    } catch (err: any) {
      databaseRecord.errorMessage = `DB_QUERY_ERROR: ${err?.message || err}`;
    }
  }

  // Validação da URL do banco se houver
  let dbValidation: {
    isValid: boolean;
    httpStatus?: number;
    contentType?: string | null;
    domain?: string;
    error?: string;
  } | null = null;

  if (dbDirectUrl) {
    dbValidation = await validateDirectMediaUrl(dbDirectUrl);
    if (!dbValidation.isValid) {
      dbUrlExpired = true;
    }
  }

  // Verificar se fallbackVideo existe
  let fallbackVideo = {
    exists: false,
    isDirectCdn: false,
  };

  let fallbackVideoUrl = '';
  if (isDatabaseConfigured()) {
    try {
      if (cleanVideoId) {
        const [vRows]: any = await db.query(
          `SELECT video_url FROM tiktok_shop_product_videos WHERE product_id = ? AND video_id = ? LIMIT 1`,
          [cleanProductId, cleanVideoId]
        );
        if (Array.isArray(vRows) && vRows[0]?.video_url) {
          fallbackVideoUrl = String(vRows[0].video_url);
        }
      }
      if (!fallbackVideoUrl && cleanProductId) {
        const [pRows]: any = await db.query(
          `SELECT video_url FROM tiktok_shop_products WHERE product_id = ? LIMIT 1`,
          [cleanProductId]
        );
        if (Array.isArray(pRows) && pRows[0]?.video_url) {
          fallbackVideoUrl = String(pRows[0].video_url);
        }
      }
    } catch {}
  }

  if (fallbackVideoUrl) {
    fallbackVideo.exists = true;
    fallbackVideo.isDirectCdn = isDirectCdnMediaUrl(fallbackVideoUrl);
  }

  // Testar ou simular prepareVideoDownload se não tiver URL válida do DB
  let prepareVideoDownloadResult = {
    attempted: false,
    success: false,
    error: null as string | null,
    hasDirectMediaUrl: false,
  };

  let preparedValidation: {
    isValid: boolean;
    httpStatus?: number;
    contentType?: string | null;
    domain?: string;
    error?: string;
  } | null = null;

  let finalResolution = {
    success: false,
    mediaSource: null as 'DB_DIRECT_MEDIA' | 'PREPARED_DIRECT_MEDIA' | 'FALLBACK_VIDEO_URL' | null,
    reason: '',
  };

  if (dbValidation?.isValid) {
    finalResolution.success = true;
    finalResolution.mediaSource = 'DB_DIRECT_MEDIA';
    finalResolution.reason = 'Valid direct media URL found in database cache.';
  } else {
    prepareVideoDownloadResult.attempted = true;
    try {
      const prep = await prepareVideoDownload(cleanProductId, cleanVideoId || undefined, dbUrlExpired);
      prepareVideoDownloadResult.success = prep.success;
      prepareVideoDownloadResult.error = prep.error || null;
      prepareVideoDownloadResult.hasDirectMediaUrl = Boolean(prep.directMediaUrl);

      if (prep.success && prep.directMediaUrl) {
        preparedValidation = await validateDirectMediaUrl(prep.directMediaUrl);
        if (preparedValidation.isValid) {
          finalResolution.success = true;
          finalResolution.mediaSource = 'PREPARED_DIRECT_MEDIA';
          finalResolution.reason = 'Successfully resolved fresh direct media URL from provider.';
        } else {
          finalResolution.reason = `Prepared media URL failed validation: ${preparedValidation.error || 'INVALID'}`;
        }
      } else {
        finalResolution.reason = `Prepare video download failed: ${prep.message || prep.error || 'UNKNOWN'}`;
      }
    } catch (prepErr: any) {
      prepareVideoDownloadResult.error = prepErr?.message || 'EXCEPTION';
      finalResolution.reason = `Exception during prepareVideoDownload: ${prepErr?.message}`;
    }

    if (!finalResolution.success && fallbackVideo.isDirectCdn) {
      finalResolution.success = true;
      finalResolution.mediaSource = 'FALLBACK_VIDEO_URL';
      finalResolution.reason = 'Direct CDN URL used from fallback metadata.';
    }
  }

  return res.json({
    productId: cleanProductId,
    videoId: cleanVideoId,
    databaseRecord,
    dbValidation,
    prepareVideoDownload: prepareVideoDownloadResult,
    preparedValidation,
    fallbackVideo,
    finalResolution,
  });
});

// =========================================================================
// ROTA DE CONSULTA (CONSULTATION): GET /videos/transcription/:videoId
// =========================================================================
productMinerRouter.get('/videos/transcription/:videoId', async (req, res) => {
  const access = await requireProductMinerAccess(req, res);
  if (!access) return;

  const cleanVideoId = String(req.params.videoId || '').trim();
  const cleanProductId = String(req.query.productId || '').trim();

  if (!cleanVideoId && !cleanProductId) {
    return res.status(400).json({ error: 'MISSING_VIDEO_ID', message: 'ID do vídeo ou produto é obrigatório.' });
  }

  if (!isDatabaseConfigured()) {
    return res.status(200).json({
      success: false,
      exists: false,
      status: 'not_found',
      message: 'Banco de dados não configurado para consulta de transcrições persistidas.',
    });
  }

  try {
    // Exigir estritamente transcrição real comprovada por áudio (source = 'audio_extracted' AND version >= 3)
    const [rows]: any = await db.query(
      `SELECT * FROM tiktok_shop_video_transcripts
       WHERE ((video_id = ? AND ? != '') OR (product_id = ? AND ? != ''))
         AND transcription_source = 'audio_extracted'
         AND transcription_version >= 3
       ORDER BY updated_at DESC
       LIMIT 1`,
      [cleanVideoId, cleanVideoId, cleanProductId, cleanProductId]
    );

    if (Array.isArray(rows) && rows.length > 0 && rows[0].raw_transcript) {
      const row = rows[0];
      const { captions, timedTranscript } = parseStoredTimedTranscript(row.timed_transcript_json);

      return res.json({
        success: true,
        exists: true,
        fromCache: true,
        videoId: row.video_id || cleanVideoId,
        productId: row.product_id || cleanProductId,
        transcription: row.raw_transcript,
        language: row.original_language || 'pt-BR',
        captions,
        rawTranscript: row.raw_transcript,
        timedTranscript,
        original: null,
        translationSource: 'stored',
        isForeignLanguage: Boolean(row.is_foreign_language),
        portugueseTranslation: row.portuguese_translation || null,
        durationSeconds: row.duration_seconds || (captions[captions.length - 1]?.end ? Math.round(captions[captions.length - 1].end) : 30),
        rhythm: row.rhythm || 'Cadenciado e dinâmico',
        hookOriginal: row.hook_original || (captions[0]?.text || ''),
        structureOriginal: row.structure_original || 'Hook -> Demonstração -> Benefício -> CTA',
        developmentOriginal: row.development_original || 'Apresentação detalhada e demonstração do produto.',
        ctaOriginal: row.cta_original || (captions[captions.length - 1]?.text || ''),
        confidenceScore: row.confidence_score || 100,
        source: 'audio_extracted',
        version: row.transcription_version || 3,
        status: 'completed',
      });
    }

    return res.status(200).json({
      success: false,
      exists: false,
      status: 'not_found',
      videoId: cleanVideoId,
      productId: cleanProductId,
      message: 'Este vídeo ainda não possui uma transcrição gerada.',
    });
  } catch (err: any) {
    console.error('[Transcription Consultation Error]:', err?.message || err);
    return res.status(500).json({ error: 'DATABASE_ERROR', message: 'Erro ao consultar transcrição do vídeo.' });
  }
});

// Alias da rota no padrão do HAR do Vyral (v2)
productMinerRouter.get('/transcriptions/v2/:videoId', async (req, res) => {
  const access = await requireProductMinerAccess(req, res);
  if (!access) return;

  const cleanVideoId = String(req.params.videoId || '').trim();
  if (!cleanVideoId) {
    return res.status(400).json({ error: 'MISSING_VIDEO_ID', message: 'ID do vídeo é obrigatório.' });
  }

  if (!isDatabaseConfigured()) {
    return res.status(200).json({
      videoId: cleanVideoId,
      transcription: null,
      captions: [],
      status: 'not_found',
    });
  }

  try {
    const [rows]: any = await db.query(
      `SELECT * FROM tiktok_shop_video_transcripts
       WHERE video_id = ?
         AND transcription_source = 'audio_extracted'
         AND transcription_version >= 3
       ORDER BY updated_at DESC
       LIMIT 1`,
      [cleanVideoId]
    );

    if (Array.isArray(rows) && rows.length > 0 && rows[0].raw_transcript) {
      const row = rows[0];
      const { captions } = parseStoredTimedTranscript(row.timed_transcript_json);
      return res.json({
        videoId: row.video_id,
        transcription: row.raw_transcript,
        language: row.original_language || 'pt-BR',
        captions,
        original: null,
        translationSource: 'stored',
        source: 'audio_extracted',
        version: row.transcription_version || 3,
        status: 'completed',
      });
    }

    return res.status(200).json({
      videoId: cleanVideoId,
      transcription: null,
      captions: [],
      status: 'not_found',
    });
  } catch (err: any) {
    console.error('[Transcriptions V2 Error]:', err?.message || err);
    return res.status(500).json({ error: 'DATABASE_ERROR' });
  }
});

// =========================================================================
// ROTA DE GERAÇÃO E RESOLUÇÃO (RESOLUTION): POST /videos/transcription
// =========================================================================
productMinerRouter.post('/videos/transcription', async (req, res) => {
  const access = await requireProductMinerAccess(req, res);
  if (!access) return;

  let currentStage = 'MEDIA_CONTEXT';
  let cleanProductId = '';
  let cleanVideoId = '';
  let mediaSourceTracked: string = 'UNKNOWN';
  let mediaHttpStatusTracked: number = 0;
  let mediaDomainTracked: string = 'unknown';
  let mediaMimeTracked: string = 'unknown';
  let mediaBytesTracked: number = 0;
  let audioBytesTracked: number = 0;

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

    cleanProductId = String(productId || '').trim();
    cleanVideoId = String(videoId || '').trim();

    if (!cleanProductId && !cleanVideoId) {
      return res.status(400).json({ error: 'MISSING_PRODUCT_ID', message: 'ID do produto ou vídeo é obrigatório.' });
    }

    // 1. Verificar cache no banco de dados (se já existe transcrição de áudio real version >= 3 e !forceRefresh)
    if (!forceRefresh && isDatabaseConfigured()) {
      try {
        const [rows]: any = await db.query(
          `SELECT * FROM tiktok_shop_video_transcripts
           WHERE ((video_id = ? AND ? != '') OR (product_id = ? AND ? != ''))
             AND transcription_source = 'audio_extracted'
             AND transcription_version >= 3
           ORDER BY updated_at DESC
           LIMIT 1`,
          [cleanVideoId, cleanVideoId, cleanProductId, cleanProductId]
        );

        if (Array.isArray(rows) && rows.length > 0 && rows[0].raw_transcript) {
          const row = rows[0];
          const { captions, timedTranscript } = parseStoredTimedTranscript(row.timed_transcript_json);
          return res.json({
            success: true,
            fromCache: true,
            productId: cleanProductId || row.product_id,
            videoId: cleanVideoId || row.video_id,
            transcription: row.raw_transcript,
            language: row.original_language || 'pt-BR',
            captions,
            rawTranscript: row.raw_transcript,
            timedTranscript,
            originalLanguage: row.original_language || 'pt',
            isForeignLanguage: Boolean(row.is_foreign_language),
            portugueseTranslation: row.portuguese_translation || null,
            durationSeconds: row.duration_seconds || (captions[captions.length - 1]?.end ? Math.round(captions[captions.length - 1].end) : 30),
            rhythm: row.rhythm || 'Cadenciado e dinâmico',
            hookOriginal: row.hook_original || (captions[0]?.text || ''),
            structureOriginal: row.structure_original || 'Hook -> Demonstração -> Benefício -> CTA',
            developmentOriginal: row.development_original || 'Apresentação detalhada e demonstração do produto.',
            ctaOriginal: row.cta_original || (captions[captions.length - 1]?.text || ''),
            confidenceScore: row.confidence_score || 100,
            source: 'audio_extracted',
            version: row.transcription_version || 3,
            status: 'completed',
          });
        }
      } catch (cacheErr: any) {
        console.warn('[Transcription Cache Read Warning]:', cacheErr?.message || cacheErr);
      }
    }

    // 2. Coletar dados contextuais
    currentStage = 'MEDIA_CONTEXT';
    let dbDesc = String(videoDescription || '');
    let dbTitle = String(productTitle || '');
    let dbAuthor = String(videoAuthor || '');
    let dbCategory = String(productCategory || '');
    let dbVideoUrl = String(videoUrl || '');

    if (isDatabaseConfigured()) {
      try {
        if (cleanProductId) {
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
        }

        if (cleanVideoId) {
          const [vRows]: any = await db.query(
            `SELECT video_url, video_author, video_description FROM tiktok_shop_product_videos WHERE video_id = ? LIMIT 1`,
            [cleanVideoId]
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

    // 3. Obter arquivo de mídia REAL do vídeo
    currentStage = 'MEDIA_PREPARE';
    const mediaFetch = await fetchVideoMediaBuffer(cleanProductId, cleanVideoId || undefined, dbVideoUrl);

    if (!mediaFetch.result) {
      console.error('[Video Transcription Media Unavailable]:', {
        stage: mediaFetch.errorStage || currentStage,
        productId: cleanProductId,
        videoId: cleanVideoId,
        details: mediaFetch.errorDetails,
      });

      return res.status(422).json({
        error: 'AUDIO_UNAVAILABLE',
        message: 'Não foi possível acessar o vídeo para extrair o áudio. O arquivo de mídia não está acessível no momento.',
      });
    }

    const media = mediaFetch.result;
    mediaSourceTracked = media.mediaSource;
    mediaHttpStatusTracked = media.httpStatus;
    mediaDomainTracked = media.domain;
    mediaMimeTracked = media.mimeType;
    mediaBytesTracked = media.bufferBytes;

    // 4. Extrair faixa de áudio REAL via FFmpeg (isolando o áudio em MP3 mono 16kHz)
    currentStage = 'AUDIO_EXTRACT';
    const audioExtraction = await extractAudioFromMediaBuffer(media.buffer, media.mimeType);

    if (!audioExtraction.success || !audioExtraction.hasAudio || !audioExtraction.audioBuffer) {
      console.warn('[Video Transcription Audio Extraction Failed]:', {
        error: audioExtraction.error,
        productId: cleanProductId,
        videoId: cleanVideoId,
      });

      if (audioExtraction.error === 'FFMPEG_NOT_AVAILABLE' || audioExtraction.error === 'FFPROBE_NOT_AVAILABLE') {
        return res.status(503).json({
          error: audioExtraction.error,
          message: 'Não foi possível processar o áudio deste vídeo no momento.',
        });
      }

      if (audioExtraction.error === 'VIDEO_WITHOUT_AUDIO') {
        return res.status(422).json({
          error: 'VIDEO_WITHOUT_AUDIO',
          message: 'Não foi detectada nenhuma faixa de áudio neste vídeo.',
        });
      }

      return res.status(422).json({
        error: 'AUDIO_UNAVAILABLE',
        message: 'Não foi possível extrair o áudio deste vídeo para transcrição.',
      });
    }

    const audioBuffer = audioExtraction.audioBuffer;
    audioBytesTracked = audioBuffer.length;
    const audioDurationSeconds = audioExtraction.durationSeconds || 30;

    // 5. Prompt de Transcrição Fonética e Temporal Exata
    const transcriptionPrompt = `Você é um perito profissional em transcrição fonética e textual de áudio de vídeos curtos.
Você está OUVINDO a faixa de áudio extraída de um vídeo real.
Sua missão é produzir a TRANSCRIÇÃO EXATA e INTEGRAL da fala real com MÁXIMA FIDELIDADE FONÉTICA e TIMESTAMPS REAIS.

DADOS DE CONTEXTO DO PRODUTO:
- Nome: ${dbTitle || 'Produto TikTok Shop'}
- Categoria: ${dbCategory || 'Geral'}
- Criador: @${dbAuthor || 'criador'}

REGRAS CRÍTICAS E OBRIGATÓRIAS:
1. TRANSCREVER EXCLUSIVAMENTE O QUE É REALMENTE FALADO NO ÁUDIO.
2. PRESERVAR RIGOROSAMENTE:
   - A ordem exata das frases faladas;
   - Todas as palavras faladas, sem omitir nada;
   - Repetições e vícios de linguagem ("ó", "olha só", "tipo assim", "mano", "galera", "aí gente", "viu?", "gente");
   - Gírias e contrações faladas ("pra", "tô", "né", "cê", "tá");
   - Hook falado de abertura (primeiras palavras faladas);
   - CTA falado final (chamada para ação falada);
   - Sequência exata do discurso.
3. NÃO RESUMIR, NÃO REESCREVER e NÃO "MELHORAR" a gramática falada.
4. NÃO INVENTAR NADA: Não invente falas baseadas no título do produto ou na legenda. Apenas transcreva o que a pessoa realmente disse no áudio.
5. CASO NÃO HAJA FALA NO ÁUDIO (se o áudio for apenas música de fundo, ruído ou silêncio sem voz humana):
   - Defina "hasSpeech": false
   - Defina "transcription": "[Vídeo sem fala humana / apenas trilha sonora de fundo]"
   - Defina "captions": []
6. CASO HAJA FALA HUMANA:
   - Defina "hasSpeech": true
   - Divida a fala em segmentos cronológicos curtos (de 2 a 8 segundos cada) com "start" (segundo inicial, ex: 0.031) e "end" (segundo final, ex: 3.450) e "text" (fala exata desse trecho).
   - O campo "transcription" deve conter o texto contínuo completo da fala transcrita (concatenação fiel de captions).
7. IDIOMA E TRADUÇÃO:
   - Identifique o idioma falado no áudio (ex: "pt-BR", "en-US", "es-ES", etc.).
   - Se o idioma NÃO for Português do Brasil:
     * Defina isForeignLanguage: true
     * Mantenha "captions" e "transcription" 100% no idioma falado original.
     * Preencha "portugueseTranslation" com a tradução fiel para Português do Brasil.
8. DECOMPOSIÇÃO ESTRUTURAL DA FALA REAL:
   - hookOriginal: As primeiras palavras/gancho falado exato.
   - structureOriginal: Sequência lógica identificada da fala (ex: "Hook de Impacto -> Apresentação da Dor -> Demonstração -> CTA").
   - developmentOriginal: Resumo de como o criador conduziu o meio da fala.
   - ctaOriginal: A chamada falada final para ação.
   - rhythm: Ritmo da fala (ex: "Rápido e dinâmico, com cortes secos").
   - durationSeconds: Duração total da fala em segundos.

Retorne OBRIGATORIAMENTE um JSON estrito no seguinte formato:
{
  "hasSpeech": true,
  "language": "pt-BR",
  "isForeignLanguage": false,
  "transcription": "Texto integral falado...",
  "captions": [
    { "start": 0.0, "end": 3.4, "text": "Frase falada exata..." },
    { "start": 3.4, "end": 7.2, "text": "Próxima frase..." }
  ],
  "portugueseTranslation": null,
  "durationSeconds": 28,
  "rhythm": "Rápido e dinâmico",
  "hookOriginal": "Primeiras palavras faladas...",
  "structureOriginal": "Hook -> Dor -> Demonstração -> CTA",
  "developmentOriginal": "Condução do meio da fala...",
  "ctaOriginal": "Chamada final falada...",
  "confidenceScore": 98
}`;

    const ai = getGeminiClient();

    // 6. Enviar áudio compacto para o Gemini (MP3 ~400KB é instantâneo e 100% suportado em inlineData)
    currentStage = 'GEMINI_GENERATE';
    let responseText = '';
    let modelUsed = '';
    const modelsToTry = ['gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-2.5-flash'];
    let lastGeminiErr: any = null;

    for (const targetModel of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: targetModel,
          contents: [
            {
              inlineData: {
                mimeType: 'audio/mp3',
                data: audioBuffer.toString('base64'),
              },
            },
            transcriptionPrompt,
          ],
          config: {
            responseMimeType: 'application/json',
          },
        });
        responseText = response.text || '';
        if (responseText) {
          modelUsed = targetModel;
          break;
        }
      } catch (mErr: any) {
        lastGeminiErr = mErr;
        console.warn(`[Transcription Model ${targetModel} failed, trying fallback]:`, mErr?.message || mErr);
      }
    }

    if (!responseText) {
      throw lastGeminiErr || new Error('GEMINI_EMPTY_RESPONSE');
    }

    console.log(`[Transcription Success]: Audio processed via Gemini model: ${modelUsed} for videoId: ${cleanVideoId}`);

    currentStage = 'GEMINI_RESPONSE';

    currentStage = 'JSON_PARSE';
    let parsedData: any = {};
    try {
      parsedData = JSON.parse(responseText);
    } catch (jsonErr) {
      console.warn('[Transcription JSON parse error, attempting regex extraction]:', jsonErr);
      const match = responseText.match(/\{[\s\S]*\}/);
      if (match) {
        parsedData = JSON.parse(match[0]);
      }
    }

    const hasSpeech = parsedData.hasSpeech !== false;
    let rawCaptions: Array<{ start: number; end: number; text: string }> = [];

    if (Array.isArray(parsedData.captions) && parsedData.captions.length > 0) {
      rawCaptions = parsedData.captions.map((c: any) => ({
        start: Number(c.start) || 0,
        end: Number(c.end) || 0,
        text: String(c.text || '').trim(),
      })).filter((c: any) => c.text.length > 0);
    }

    let transcription = String(parsedData.transcription || parsedData.rawTranscript || '').trim();
    if (!transcription && rawCaptions.length > 0) {
      transcription = rawCaptions.map((c) => c.text).join(' ');
    }
    if (!hasSpeech && !transcription) {
      transcription = '[Vídeo sem fala humana / apenas trilha sonora de fundo]';
    }

    const timedTranscript = rawCaptions.length > 0
      ? rawCaptions.map((c) => ({ time: formatSecondsInterval(c.start, c.end), text: c.text }))
      : (hasSpeech && transcription ? [{ time: '00:00–00:30', text: transcription }] : []);

    const language = String(parsedData.language || parsedData.originalLanguage || 'pt-BR');
    const isForeignLanguage = Boolean(parsedData.isForeignLanguage || (!language.toLowerCase().startsWith('pt')));
    const portugueseTranslation = isForeignLanguage && parsedData.portugueseTranslation ? String(parsedData.portugueseTranslation) : null;
    const durationSeconds = Number(parsedData.durationSeconds) || audioDurationSeconds || 30;
    const rhythm = String(parsedData.rhythm || 'Cadenciado e dinâmico');
    const hookOriginal = String(parsedData.hookOriginal || (rawCaptions[0]?.text || ''));
    const structureOriginal = String(parsedData.structureOriginal || 'Hook -> Demonstração -> Benefício -> CTA');
    const developmentOriginal = String(parsedData.developmentOriginal || 'Apresentação detalhada e demonstração do produto.');
    const ctaOriginal = String(parsedData.ctaOriginal || (rawCaptions[rawCaptions.length - 1]?.text || ''));
    const confidenceScore = Number(parsedData.confidenceScore) || 98;

    // 7. Salvar no banco de dados com chave (product_id, video_id) e versão 3 (áudio real comprovado)
    currentStage = 'DATABASE_SAVE';
    if (isDatabaseConfigured()) {
      try {
        const storedJson = JSON.stringify({
          captions: rawCaptions,
          timedTranscript,
        });

        await db.query(
          `INSERT INTO tiktok_shop_video_transcripts (
            product_id, video_id, video_url, original_language, is_foreign_language,
            raw_transcript, timed_transcript_json, portuguese_translation, duration_seconds,
            rhythm, hook_original, structure_original, development_original, cta_original,
            confidence_score, transcription_source, transcription_version, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'audio_extracted', 3, NOW())
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
            transcription_version = 3,
            updated_at = NOW()`,
          [
            cleanProductId,
            cleanVideoId,
            dbVideoUrl,
            language,
            isForeignLanguage ? 1 : 0,
            transcription,
            storedJson,
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

    // 8. Retornar resposta completa
    return res.json({
      success: true,
      fromCache: false,
      productId: cleanProductId,
      videoId: cleanVideoId,
      transcription,
      language,
      captions: rawCaptions,
      rawTranscript: transcription,
      timedTranscript,
      original: null,
      translationSource: 'live',
      originalLanguage: language,
      isForeignLanguage,
      portugueseTranslation,
      durationSeconds,
      rhythm,
      hookOriginal,
      structureOriginal,
      developmentOriginal,
      ctaOriginal,
      confidenceScore,
      source: 'audio_extracted',
      version: 3,
      status: 'completed',
    });
  } catch (aiErr: any) {
    console.error('[Video Transcription Error Details]:', {
      stage: currentStage,
      errorName: aiErr?.name,
      errorMessage: aiErr?.message,
      errorCode: aiErr?.code,
      productId: cleanProductId,
      videoId: cleanVideoId,
      mediaSource: mediaSourceTracked,
      mediaHttpStatus: mediaHttpStatusTracked,
      mediaDomain: mediaDomainTracked,
      mediaBytes: mediaBytesTracked,
      audioBytes: audioBytesTracked,
    });

    return res.status(500).json({
      error: 'TRANSCRIPTION_ERROR',
      message: 'Não foi possível analisar o áudio deste vídeo com a IA. Verifique se o vídeo possui som e tente novamente.',
    });
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
    const angle = String(targetAngle || '').trim();
    const diff = String(targetDifferentiator || '').trim();
    const tone = String(voiceTone || 'Viral & Enérgico').trim();

    // Instruções de fidelidade estrutural
    let fidelityDirectives = '';
    if (structuralFidelity === 'Alta') {
      fidelityDirectives = `1. FIDELIDADE ALTA (MÁXIMA ADERÊNCIA 1:1 À MATRIZ DO VÍDEO ORIGINAL):
- PRIORIDADE DO RITMO/TOM ORIGINAL: O ritmo ("${originalRhythm || 'Cadência da fala original'}") e a naturalidade do áudio original têm prioridade máxima sobre o tom genérico selecionado.
- SE O PRODUTO FOR O MESMO DO VÍDEO ORIGINAL: PRESERVE A FALA ORIGINAL O MÁXIMO POSSÍVEL. Não substitua frases nem reescreva o texto por reescrever. Se uma frase já comunica a mensagem, mantenha-a idêntica ou com mínimo ajuste.
- SE O PRODUTO FOR OUTRO: Substitua com precisão cirúrgica APENAS as menções ao produto anterior pelas características do NOVO PRODUTO ("${newProductName}"), mantendo rigorosamente a mesma sequência, pausas e gatilhos da transcrição original.
- NÃO INVENTAR DADOS: É ESTRITAMENTE PROIBIDO inventar benefícios, dores, diferenciais, preço, descontos, urgências ou promessas que não estejam presentes na transcrição original ou explicitamente fornecidos nos campos abaixo.
${angle ? `- Ângulo Solicitado: "${angle}" (utilize este ângulo fornecido pelo criador).` : '- Ângulo: NÃO foi fornecido ângulo adicional. NÃO invente novas dores ou ângulos artificiais.'}
${diff ? `- Diferencial Solicitado: "${diff}" (utilize este diferencial fornecido pelo criador).` : '- Diferencial: NÃO foi fornecido diferencial adicional. NÃO invente novos benefícios ou características não mencionadas.'}`;
    } else if (structuralFidelity === 'Livre') {
      fidelityDirectives = `1. FIDELIDADE LIVRE (INSPIRAÇÃO NO CONCEITO VIRAL):
- Use a transcrição original como inspiração de formato, gatilhos mentais e estrutura.
- Crie uma narrativa fluida, totalmente personalizada e persuasiva para o NOVO PRODUTO ("${newProductName}"), otimizada para o TikTok Shop.
${angle ? `- Ângulo Solicitado: "${angle}".` : '- Sem ângulo adicional; foque na utilidade principal do produto.'}
${diff ? `- Diferencial Solicitado: "${diff}".` : '- Sem diferencial adicional.'}`;
    } else {
      fidelityDirectives = `1. FIDELIDADE MÉDIA (EQUILÍBRIO ENTRE ESTRUTURA E ADAPTAÇÃO):
- Preserve a macroestrutura essencial (Hook de retenção, Apresentação da Dor, Demonstração do Produto e CTA de Conversão).
- Adapte o vocabulário e os argumentos intermediários para valorizar o NOVO PRODUTO ("${newProductName}").
${angle ? `- Ângulo Solicitado: "${angle}".` : ''}
${diff ? `- Diferencial Solicitado: "${diff}".` : ''}`;
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
- RITMO ORIGINAL: ${originalRhythm || 'Dinâmico com cortes rápidos'}
- DURAÇÃO ESTIMADA: ${originalDuration || '30'} segundos

==================================================
2. DADOS DO PRODUTO A SER MODELADO:
==================================================
- Nome do Produto Alvo: ${newProductName}
- Nicho / Categoria: ${niche}
- Ângulo Informado: ${angle || '(Nenhum ângulo adicional informado - NÃO INVENTAR DOR ARTIFICIAL)'}
- Diferencial Informado: ${diff || '(Nenhum diferencial adicional informado - NÃO INVENTAR BENEFÍCIO ARTIFICIAL)'}
- Tom de Voz Solicitado: ${tone}
- Nível de Fidelidade Estrutural: ${structuralFidelity}
${customInstructions ? `- Instrução Personalizada do Criador: "${customInstructions}"` : ''}
${variantSeed ? `- Variação #${variantSeed}: Gere uma abordagem criativa mantendo a mesma matriz estrutural.` : ''}

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
      let responseText = '';
      let modelUsed = '';
      const modelsToTry = ['gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-2.5-flash'];
      let lastGeminiErr: any = null;

      for (const targetModel of modelsToTry) {
        try {
          const response = await ai.models.generateContent({
            model: targetModel,
            contents: modelingPrompt,
            config: {
              responseMimeType: 'application/json',
            },
          });
          responseText = response.text || '';
          if (responseText) {
            modelUsed = targetModel;
            break;
          }
        } catch (mErr: any) {
          lastGeminiErr = mErr;
          console.warn(`[Model Content ${targetModel} failed, trying fallback]:`, mErr?.message || mErr);
        }
      }

      if (!responseText) {
        throw lastGeminiErr || new Error('A resposta do modelo de IA não retornou conteúdo.');
      }

      console.log(`[Model Content Success]: Content modeling processed via Gemini model: ${modelUsed} for videoId: ${videoId}`);

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
        message: 'Não foi possível gerar a modelagem deste conteúdo. Tente novamente.',
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





