import { AgentConfig } from '../agentTypes';

export const geradorProdutosConfig: AgentConfig = {
  id: 'agent-shop-gerador-produtos',
  name: 'Gerador de Produtos Virais',
  description: 'Criador de produtos campeões, títulos persuasivos e ganchos de oferta para o TikTok Shop',
  initialMessage: `Olá! Sou o **Gerador de Produtos Virais** 👋

Vou estruturar todo o posicionamento, oferta irresistível e ganchos de venda para o seu produto no TikTok Shop.

---

📌 **ETAPA 0 (OBRIGATÓRIA)**:
Envie a foto do seu produto ou digite o nome do produto/nicho que deseja analisar:`,
  rules: [
    { id: 'r1', rule: 'Garantir foco em alta conversão e prova social' }
  ],
  steps: [
    {
      id: 'step-0',
      order: 0,
      title: 'Produto ou Foto',
      question: '📌 **ETAPA 0** — Envie a foto do produto ou digite o nome do produto/nicho:',
      type: 'text',
      required: true,
      validation: {
        allowImageOnly: true,
        customError: 'Envie uma foto ou digite o produto/nicho.'
      },
      confirmationMessage: 'Etapa 0 confirmada.',
      nextStepId: 'step-1'
    },
    {
      id: 'step-1',
      order: 1,
      title: 'Público Alvo Principal',
      question: '📌 **ETAPA 1** — Qual é o público-alvo principal deste produto?',
      type: 'single-choice',
      required: true,
      options: [
        { id: '1', label: '1️⃣ Mulheres (Moda, Beleza, Casa, Organização)', value: 'Feminino (Moda, Beleza, Autoestima e Praticidade)' },
        { id: '2', label: '2️⃣ Homens (Tecnologia, Automotivo, Esportes)', value: 'Masculino (Praticidade, Alta Performance e Tecnologia)' },
        { id: '3', label: '3️⃣ Mães e Família (Infantil, Cuidados, Maternidade)', value: 'Família e Mães (Praticidade com os Filhos e Cuidados Diários)' },
        { id: '4', label: '4️⃣ Público Geral (Utilidades Domésticas Virais)', value: 'Geral (Curiosidade, Solução de Dor Imediata e Presentes)' }
      ],
      confirmationMessage: 'Etapa 1 confirmada.',
      nextStepId: 'step-2'
    },
    {
      id: 'step-2',
      order: 2,
      title: 'Diferencial Principal do Produto',
      question: '📌 **ETAPA 2** — Qual é o maior diferencial ou dor que o produto resolve?',
      type: 'single-choice',
      required: true,
      options: [
        { id: '1', label: '1️⃣ Economia de Tempo (Resolve algo em segundos)', value: 'Economia de tempo e esforço' },
        { id: '2', label: '2️⃣ Estética e Autoestima (Transformação visual)', value: 'Transformação visual e autoestima' },
        { id: '3', label: '3️⃣ Economia de Dinheiro (Preço de fábrica vs Loja)', value: 'Economia financeira direta' },
        { id: '4', label: '4️⃣ Exclusividade e Inovação (Ninguém viu antes)', value: 'Exclusividade e efeito UAU de novidade' }
      ],
      confirmationMessage: 'Etapa 2 confirmada.',
      nextStepId: 'step-3'
    },
    {
      id: 'step-3',
      order: 3,
      title: 'Oferta Especial / Chamada para Ação',
      question: '📌 **ETAPA 3** — Qual tipo de oferta quer destacar no vídeo?',
      type: 'single-choice',
      required: true,
      options: [
        { id: '1', label: '1️⃣ Frete Grátis + Cupom no Carrinho Amarelo', value: 'Frete Grátis + Cupom TikTok' },
        { id: '2', label: '2️⃣ Preço Promocional de Lançamento (Até durar o estoque)', value: 'Preço Promocional de Lançamento' },
        { id: '3', label: '3️⃣ Kit Leve 2 Pague 1', value: 'Combo Promocional Leve 2 Pague 1' }
      ],
      confirmationMessage: 'Etapa 3 confirmada.'
    }
  ],
  outputs: [
    {
      id: 'out-1',
      title: 'Estrutura de Vendas e Prompts de Anúncio',
      template: `==================================================================
POSICIONAMENTO E ROTEIRO DE PRODUTO CAMPEÃO
==================================================================

• PRODUTO: [step-0]
• PÚBLICO ALVO: [step-1]
• DOR REVOLUCIONADA: [step-2]
• OFERTA PRINCIPAL: [step-3]

==================================================================
1️⃣ GANCHOS DE RETENÇÃO (0-3s):
- "Aposto que você não sabia que [step-0] conseguia fazer isso..."
- "Se você faz parte de [step-1], pare de rolar a tela agora mesmo!"
- "O segredo para [step-2] finalmente chegou ao Brasil!"

2️⃣ ROTEIRO DE DEMONSTRAÇÃO (30s):
• [00:00 - 00:03] Close rápido mostrando o problema comum e a solução com [step-0].
• [00:03 - 00:15] Demonstração real e sem cortes do [step-0] funcionando em alta qualidade.
• [00:15 - 00:25] Prova do resultado transformador focando em [step-2].
• [00:25 - 00:30] Chamada final: "[step-3] disponível no link do carrinho amarelo!"

3️⃣ TITULO PERSUASIVO PARA O VÍDEO:
"Descubra por que o [step-0] virou febre no TikTok Shop!"`
    }
  ]
};
