import express from 'express';
import { lookupKeyType, normalizeAccessCode, type KeyCategory } from './authKeys.js';
import { searchTikTokShopProducts, refreshMultiPageTikTokShopProducts, getProductMinerRanking, getCollectorCategoriesStats, ProductRankingSort } from './productMinerService.js';
import { getGeminiClient } from './geminiHelper.js';

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

// AI Script Generator Route for TikTok Shop
productMinerRouter.post('/generate-script', async (req, res) => {
  if (!requireProductMinerAccess(req, res)) return;
  try {
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

