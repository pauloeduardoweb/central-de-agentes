import { AgentConfig } from '../agentTypes';

export const vitrineRealistaConfig: AgentConfig = {
  id: 'agent-shop-vitrine-realista',
  name: 'Vitrine Realista',
  description: 'Roteiros e Prompts POV para TikTok Shop simulando vitrine e loja física',
  initialMessage: `Olá! Sou o especialista **Vitrine Realista** 👋

Vou criar um roteiro em POV de altíssima conversão para o TikTok Shop.

---

👉 **ETAPA 0**:
Envie a **foto do produto** ou digite o **título/nome do produto**:`,
  rules: [
    { id: 'r1', rule: 'Sempre uma etapa por vez' },
    { id: 'r2', rule: 'Respeitar ordem exata das perguntas' },
    { id: 'r3', rule: 'Manter estilo POV e fidelidade visual do produto' }
  ],
  steps: [
    {
      id: 'step-0',
      order: 0,
      title: 'Identificação do Produto',
      question: '👉 **ETAPA 0**:\nEnvie a **foto do produto** ou digite o **título/nome do produto** para iniciarmos:',
      type: 'text',
      required: true,
      validation: {
        allowImageOnly: true,
        customError: 'Por favor, envie uma imagem do produto ou digite o título do produto.'
      },
      confirmationMessage: 'Etapa 0 confirmada.',
      nextStepId: 'step-1'
    },
    {
      id: 'step-1',
      order: 1,
      title: 'Quem fala no vídeo',
      question: '👉 **ETAPA 1** — Quem fala no vídeo?\n*(Define o tom da locução)*',
      type: 'single-choice',
      required: true,
      options: [
        { id: '1', label: '1️⃣ Homem', value: 'Homem (Voz masculina jovem e dinâmica)' },
        { id: '2', label: '2️⃣ Mulher', value: 'Mulher (Voz feminina empolgada e natural)' }
      ],
      confirmationMessage: 'Etapa 1 confirmada.',
      nextStepId: 'step-2'
    },
    {
      id: 'step-2',
      order: 2,
      title: 'Onde o vídeo acontece',
      question: '👉 **ETAPA 2** — Onde o vídeo acontece?',
      type: 'single-choice',
      required: true,
      options: [
        { id: '1', label: '1️⃣ Loja física de rua — vitrine frontal', value: 'Loja física de rua — vitrine frontal' },
        { id: '2', label: '2️⃣ Loja física de rua — interior da loja', value: 'Loja física de rua — interior da loja' },
        { id: '3', label: '3️⃣ Academia — loja interna', value: 'Academia — loja interna' },
        { id: '4', label: '4️⃣ Academia — recepção', value: 'Academia — recepção' },
        { id: '5', label: '5️⃣ Shopping — dentro da loja', value: 'Shopping — dentro da loja' },
        { id: '6', label: '6️⃣ Shopping — vitrine frontal', value: 'Shopping — vitrine frontal' },
        { id: '7', label: '7️⃣ Feira de rua — barraca de vendas', value: 'Feira de rua — barraca de vendas' },
        { id: '8', label: '8️⃣ Loja de acessórios — vitrine de produtos', value: 'Loja de acessórios — vitrine de produtos' },
        { id: '9', label: '9️⃣ Fábrica — bancada do produto', value: 'Fábrica — bancada do produto' },
        { id: '10', label: '🔟 Fábrica — linha de produção', value: 'Fábrica — linha de produção' }
      ],
      confirmationMessage: 'Etapa 2 confirmada.',
      nextStepId: 'step-2-1'
    },
    {
      id: 'step-2-1',
      order: 3,
      title: 'Estilo das Cenas',
      question: '👉 **ETAPA 2.1** — Qual formato você prefere para as cenas?',
      type: 'single-choice',
      required: true,
      options: [
        { id: '1', label: '1️⃣ Todas as cenas em POV (ponto de vista puro sem etiqueta)', value: 'POV puro sem etiqueta', nextStepId: 'step-4' },
        { id: '2', label: '2️⃣ Todas as cenas em Vitrine Realista (com etiqueta de preço)', value: 'Vitrine Realista com etiqueta de preço', nextStepId: 'step-3' }
      ],
      confirmationMessage: 'Etapa 2.1 confirmada.'
    },
    {
      id: 'step-3',
      order: 4,
      title: 'Valor do Produto na Loja Física',
      question: '👉 **ETAPA 3** — Qual é o valor do produto na loja física?\n*(Exemplo: R$ 89,90 / R$ 149,00)*',
      type: 'text',
      required: true,
      confirmationMessage: 'Etapa 3 confirmada.',
      nextStepId: 'step-3-1'
    },
    {
      id: 'step-3-1',
      order: 5,
      title: 'Tamanho da Etiqueta',
      question: '👉 **ETAPA 3.1** — Qual é o tamanho da etiqueta de preço?',
      type: 'single-choice',
      required: true,
      options: [
        { id: '1', label: '1️⃣ Pequena', value: 'Pequena e discreta' },
        { id: '2', label: '2️⃣ Média (recomendável)', value: 'Média e visível' },
        { id: '3', label: '3️⃣ Grande', value: 'Grande e de alto impacto visual' }
      ],
      confirmationMessage: 'Etapa 3.1 confirmada.',
      nextStepId: 'step-4'
    },
    {
      id: 'step-4',
      order: 6,
      title: 'Onde o produto será mostrado',
      question: '👉 **ETAPA 4** — Onde o produto será mostrado?',
      type: 'single-choice',
      required: true,
      options: [
        { id: '1', label: '1️⃣ Na prateleira da loja', value: 'Na prateleira da loja' },
        { id: '2', label: '2️⃣ No balcão da loja', value: 'No balcão da loja' },
        { id: '3', label: '3️⃣ Na mão do funcionário', value: 'Na mão do funcionário' },
        { id: '4', label: '4️⃣ No cabide da loja', value: 'No cabide da loja' },
        { id: '5', label: '5️⃣ Dentro de uma caixa de vidro elegante', value: 'Dentro de uma caixa de vidro elegante' },
        { id: '6', label: '6️⃣ Em um display de destaque da loja', value: 'Em um display de destaque da loja' },
        { id: '7', label: '7️⃣ Na mesa de demonstração', value: 'Na mesa de demonstração' },
        { id: '8', label: '8️⃣ Na bandeja de apresentação da loja', value: 'Na bandeja de apresentação da loja' },
        { id: '9', label: '9️⃣ Em um suporte de exposição da vitrine', value: 'Em um suporte de exposição da vitrine' }
      ],
      confirmationMessage: 'Etapa 4 confirmada.',
      nextStepId: 'step-5'
    },
    {
      id: 'step-5',
      order: 7,
      title: 'Tom Principal',
      question: '👉 **ETAPA 5** — Qual o tom principal da reação no vídeo?',
      type: 'single-choice',
      required: true,
      options: [
        { id: '1', label: '1️⃣ Indignado', value: 'Indignado com o preço absurdo da loja física' },
        { id: '2', label: '2️⃣ Revoltado', value: 'Revoltado comparando o preço com o TikTok Shop' },
        { id: '3', label: '3️⃣ Surpreso', value: 'Surpreso com a qualidade x valor de promoção' },
        { id: '4', label: '4️⃣ Curioso', value: 'Curioso testando a resistência e acabamento do produto' }
      ],
      confirmationMessage: 'Etapa 5 confirmada.',
      nextStepId: 'step-6'
    },
    {
      id: 'step-6',
      order: 8,
      title: 'Quantas Cenas / Duração',
      question: '👉 **ETAPA 6** — Escolha a duração / quantidade de cenas:',
      type: 'single-choice',
      required: true,
      options: [
        { id: '1', label: '1️⃣ — 16s (2 cenas)', value: '2 Cenas (16s)' },
        { id: '2', label: '2️⃣ — 24s (3 cenas)', value: '3 Cenas (24s)' },
        { id: '3', label: '3️⃣ — 32s (4 cenas)', value: '4 Cenas (32s)' },
        { id: '4', label: '4️⃣ — 01:04 (8 cenas LIVE)', value: '8 Cenas (64s)' }
      ],
      confirmationMessage: 'Etapa 6 confirmada.'
    }
  ],
  outputs: [
    {
      id: 'out-1',
      title: 'Roteiro e Prompts Finais — Vitrine Realista',
      template: `==================================================================
ROTEIRO VITRINE REALISTA — TIKTOK SHOP
==================================================================

• PRODUTO IDENTIFICADO: [step-0]
• LOCUÇÃO: [step-1]
• CENÁRIO / AMBIENTE: [step-2]
• FORMATO DE EXIBIÇÃO: [step-2-1]
• VALOR NA LOJA FÍSICA: [step-3] (Etiqueta: [step-3-1])
• SUPORTE DO PRODUTO: [step-4]
• TOM DE REAÇÃO: [step-5]
• DURAÇÃO E ESTRUTURA: [step-6]

==================================================================
ROTEIRO DETALHADO E PROMPTS DE VÍDEO / CENÁRIO
==================================================================

🎬 CENA 1 (HOOK DE 0 A 3 SEGUNDOS):
• VISUAL: POV em primeira pessoa de uma mão segurando [step-0] em [step-4] dentro de [step-2]. Enquadramento frontal limpo, iluminação comercial realista, mostrando os detalhes e acabamento premium do produto.
• SOM AMBIENTE: Barulho natural de [step-2], passos leves, movimento suave ao fundo.
• FALA ([step-1]): "Gente, acabei de encontrar o [step-0] aqui no [step-2]! Olha esse acabamento..."
• PROMPT DO CENÁRIO (FOTO DE BASE):
"First-person POV shot holding a high quality [step-0] in a realistic [step-2], presented on [step-4]. Clean lighting, photorealistic details, crisp focus on the product, natural hands, 8k resolution, no camera visible."

🎬 CENA 2 (COMPARAÇÃO E SURPRESA):
• VISUAL: Mão virando o produto [step-0] para mostrar os detalhes do acabamento e encaixe perfeito.
• SOM AMBIENTE: Ruído ambiente imersivo do local.
• FALA ([step-1]): "Eles cobram [step-3] aqui na loja física! É um absurdo total, sendo que no carrinho amarelo do TikTok Shop sai por menos da metade!"
• PROMPT DO CENÁRIO:
"First-person POV showing the back and sides of [step-0] in [step-2]. Clean hands holding the item with precision, hyper-realistic store background, cinematic soft depth of field."

🎬 CENA 3 (CHAMADA PARA AÇÃO — CTA):
• VISUAL: Mão apontando levemente para baixo no canto inferior esquerdo indicando a sacolinha amarela.
• SOM AMBIENTE: Efeito sonoro suave de confirmação.
• FALA ([step-1]): "Se você quer garantir o seu [step-0] com desconto direto de fábrica, clica no link do carrinho amarelo aqui embaixo antes que esgoste!"
• PROMPT DO CENÁRIO:
"POV camera angle pointing downwards while holding [step-0] in [step-2], clear focus on product, professional retail lighting."

==================================================================
REGRAS TÉCNICAS APLICADAS:
• POV 100% limpo, sem reflexos de celular.
• Produto mantido em proporção física natural.
• Nenhuma terceira mão presente nas cenas.`
    }
  ]
};
