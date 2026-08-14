import express from 'express';
import { lookupKeyType, normalizeAccessCode, type KeyCategory } from './authKeys.js';
import { searchTikTokShopProducts, refreshMultiPageTikTokShopProducts, getProductMinerRanking, getCollectorCategoriesStats, prepareVideoDownload, getDailyRefreshStatus, executeDailyRefresh, reclassifyExistingDatabaseProducts, backfillLegacyVideosToProductVideos, extractVideosFromSearchCachePayloads, ProductRankingSort, logProductInteractionEvent } from './productMinerService.js';
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
  try {
    const report = await reclassifyExistingDatabaseProducts();
    return res.json({ success: true, report });
  } catch (error: any) {
    console.error('[Admin Reclassify Error]:', error?.message || error);
    return res.status(500).json({ error: 'RECLASSIFY_FAILED', message: error?.message || 'Falha ao reclassificar produtos.' });
  }
});

productMinerRouter.get('/admin/reclassify', async (req, res) => {
  if (!requireMentorRefresh(req, res)) return;
  try {
    const report = await reclassifyExistingDatabaseProducts();
    return res.json({ success: true, report });
  } catch (error: any) {
    console.error('[Admin Reclassify Error]:', error?.message || error);
    return res.status(500).json({ error: 'RECLASSIFY_FAILED', message: error?.message || 'Falha ao reclassificar produtos.' });
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
    const page = Number(req.query.page || 1);
    const result = await searchTikTokShopProducts({ query, category, subcategory, childCategory, classification, page, region: 'BR', forceRefresh: false });
    return res.json({ success: true, region: 'BR', query, category, subcategory, childCategory, classification, page, ...result });
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

// Video Download Preparation (Mentor Only)
productMinerRouter.post('/videos/prepare-download', async (req, res) => {
  if (!requireMentorRefresh(req, res)) return;
  try {
    const { productId } = req.body || {};
    if (!productId) {
      return res.status(400).json({ error: 'MISSING_PRODUCT_ID', message: 'ID do produto é obrigatório.' });
    }

    const result = await prepareVideoDownload(String(productId));
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

// Video Download Delivery/Proxy (Mentor Only)
productMinerRouter.get('/videos/:productId/download', async (req, res) => {
  if (!requireMentorRefresh(req, res)) return;
  try {
    const { productId } = req.params;
    if (!productId) {
      return res.status(400).json({ error: 'MISSING_PRODUCT_ID' });
    }

    if (!isDatabaseConfigured()) {
      return res.status(503).json({ error: 'DATABASE_NOT_CONFIGURED' });
    }

    const [rows]: any = await db.query(
      `SELECT direct_media_url, status FROM tiktok_shop_video_downloads WHERE product_id = ? LIMIT 1`,
      [productId]
    );

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
        res.setHeader('Content-Disposition', `attachment; filename="tiktok_video_${productId}.mp4"`);
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
    const { buildSubcategoryExpansionPlan } = await import('./subcategoryExpansionService.js');
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

    const stats = await getCollectorCategoriesStats();
    const plans = buildSubcategoryExpansionPlan({
      categoryStats: stats.categories,
      selectedCategories: selectedCatsParam,
      selectedSubcategoriesMap,
      categoryTargetLimit: targetLimit,
      perSubcategoryMax: perSubMax,
    });

    const totalSubcategories = plans.reduce((sum, p) => sum + p.subcategories.length, 0);
    const zeroCountSubcategories = plans.reduce(
      (sum, p) => sum + p.subcategories.filter((s) => s.isZeroCount).length,
      0
    );
    const totalAllocatedProducts = plans.reduce((sum, p) => sum + p.totalAllocated, 0);
    const totalEstimatedCredits = plans.reduce((sum, p) => sum + p.estimatedCredits, 0);

    return res.json({
      success: true,
      readOnly: true,
      meta: {
        totalCategories: plans.length,
        totalSubcategories,
        zeroCountSubcategories,
        totalAllocatedProducts,
        totalEstimatedCredits,
        categoryTargetLimit: targetLimit,
        perSubcategoryMax: perSubMax,
      },
      plans,
    });
  } catch (error: any) {
    console.error('[Expansion Plan ReadOnly Error]:', error);
    return res.status(500).json({ success: false, error: error?.message || 'EXPANSION_PLAN_ERROR' });
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

  try {
    const { executeSubcategoryExpansion } = await import('./subcategoryExpansionService.js');
    const selectedCategories = Array.isArray(req.body?.selectedCategories) ? req.body.selectedCategories : undefined;
    const selectedSubcategoriesMap = (req.body?.selectedSubcategoriesMap && typeof req.body.selectedSubcategoriesMap === 'object')
      ? req.body.selectedSubcategoriesMap
      : undefined;
    const categoryTargetLimit = req.body?.categoryTargetLimit ? Number(req.body.categoryTargetLimit) : 500;
    const perSubcategoryMax = req.body?.perSubcategoryMax ? Number(req.body.perSubcategoryMax) : 60;
    const maxCreditBudgetPerCategory = req.body?.maxCreditBudgetPerCategory ? Number(req.body.maxCreditBudgetPerCategory) : undefined;

    const result = await executeSubcategoryExpansion({
      selectedCategories,
      selectedSubcategoriesMap,
      categoryTargetLimit,
      perSubcategoryMax,
      maxCreditBudgetPerCategory,
      shouldCancel: () => isClientClosed,
      onProgress: (progress) => {
        if (!isClientClosed) {
          sendEvent({ type: 'PROGRESS', progress });
        }
      },
    });

    clearInterval(pingInterval);
    // Emissão do evento terminal com alias duplo (COMPLETE e DONE)
    sendEvent({ type: 'COMPLETE', result });
    sendEvent({ type: 'DONE', result });
    res.end();
  } catch (error: any) {
    clearInterval(pingInterval);
    console.error('[Execute Subcategory Expansion Stream Error]:', error);
    sendEvent({ type: 'ERROR', error: error?.message || 'EXPANSION_EXECUTION_ERROR' });
    res.end();
  } finally {
    clearInterval(pingInterval);
  }
});



