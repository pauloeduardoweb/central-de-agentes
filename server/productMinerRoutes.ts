import express from 'express';
import { lookupKeyType, normalizeAccessCode, type KeyCategory } from './authKeys.js';
import { searchTikTokShopProducts, refreshMultiPageTikTokShopProducts, getProductMinerRanking, getCollectorCategoriesStats, prepareVideoDownload, getDailyRefreshStatus, executeDailyRefresh, ProductRankingSort } from './productMinerService.js';
import { getGeminiClient } from './geminiHelper.js';
import { db, isDatabaseConfigured } from './database.js';

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
  try {
    const categories = await getCollectorCategoriesStats();
    return res.json({ success: true, categories });
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
    const status = await executeDailyRefresh();
    return res.json({ success: true, status });
  } catch (error: any) {
    const msg = error?.message || '';
    if (msg === 'DAILY_REFRESH_COOLDOWN') {
      return res.status(429).json({
        error: 'DAILY_REFRESH_COOLDOWN',
        message: 'A base já foi atualizada nas últimas 24 horas. Aguarde o período de intervalo para atualizar novamente.',
      });
    }
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
  if (!requireProductMinerAccess(req, res)) return;
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
- Score Geração Z Pro: ${product.score || 'N/A'}/100
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
"Olha só a praticidade! Por isso este produto é destaque no Geração Z Pro com Score ${product.score || '85'}/100."

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

