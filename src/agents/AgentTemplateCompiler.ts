import { Agent } from '../types';
import { AgentConfig, AgentStep } from './agentTypes';
import { vitrineRealistaConfig } from './configs/vitrineRealista.config';
import { casquinhaAnimalConfig } from './configs/casquinhaAnimal.config';
import { geradorProdutosConfig } from './configs/geradorProdutos.config';

export class AgentTemplateCompiler {
  /**
   * Returns a fully valid, deterministic AgentConfig for any given Agent.
   */
  static compile(agent: Agent): AgentConfig {
    // 1. Check pre-configured agents
    if (agent.id === 'agent-shop-vitrine-realista' || agent.name.toLowerCase().includes('vitrine realista')) {
      return vitrineRealistaConfig;
    }
    if (agent.id === 'agent-tiktok2k-casquinha-animal' || agent.name.toLowerCase().includes('casquinha animal')) {
      return casquinhaAnimalConfig;
    }
    if (agent.id === 'agent-shop-gerador-produtos' || agent.id === 'agent-shop-copymaster' || agent.name.toLowerCase().includes('gerador de produtos')) {
      return geradorProdutosConfig;
    }

    // 2. Fallback Compiler: Parse or construct deterministic step config from systemInstruction
    return this.buildGenericConfig(agent);
  }

  private static buildGenericConfig(agent: Agent): AgentConfig {
    const nameLower = agent.name.toLowerCase();
    const isAntiViolacao = agent.category === 'Recurso Anti-Violação' || nameLower.includes('anti-violação');
    const isTikTokShop = agent.category === 'Tiktok Shop';
    const isFrutas = nameLower.includes('frutas');
    const isRoca = nameLower.includes('roça') || nameLower.includes('roca');

    let initialQ = "Qual é o **produto, nicho ou tema** principal deste projeto?";
    if (isAntiViolacao) {
      initialQ = "Qual é o **motivo do bloqueio ou violação** notificado pelo TikTok?";
    } else if (isTikTokShop) {
      initialQ = "Qual é o **produto do TikTok Shop** que você deseja divulgar?";
    } else if (isFrutas) {
      initialQ = "Quais **frutas** serão as personagens principais desta novela dramática?";
    } else if (isRoca) {
      initialQ = "Qual é o **causo ou história do campo** que o personagem vai contar?";
    }

    const steps: AgentStep[] = [
      {
        id: 'step-0',
        order: 0,
        title: 'Identificação do Projeto',
        question: `📌 **ETAPA 0**:\n${initialQ}\n*(Envie a foto ou digite o texto)*`,
        type: 'text',
        required: true,
        validation: {
          allowImageOnly: true,
          customError: 'Forneça o produto, tema ou uma foto explicativa para continuar.'
        },
        confirmationMessage: 'Etapa 0 confirmada.',
        nextStepId: 'step-1'
      },
      {
        id: 'step-1',
        order: 1,
        title: 'Objetivo da Ação',
        question: '📌 **ETAPA 1** — Qual é o **objetivo principal ou dor** a ser destacada?',
        type: 'single-choice',
        required: true,
        options: [
          { id: '1', label: '1️⃣ Viralização Extrema & Retenção', value: 'Viralização extrema no feed com alta retenção de público' },
          { id: '2', label: '2️⃣ Vendas Diretas & Clique no Carrinho', value: 'Foco total em conversão de vendas e cliques no carrinho' },
          { id: '3', label: '3️⃣ Quebra de Objeções & Prova Social', value: 'Demonstração de qualidade e prova social sólida' },
          { id: '4', label: '4️⃣ Defesa Formal / Recurso de Conta', value: 'Argumentação fundamentada nas diretrizes oficiais' }
        ],
        confirmationMessage: 'Etapa 1 confirmada.',
        nextStepId: 'step-2'
      },
      {
        id: 'step-2',
        order: 2,
        title: 'Estilo da Narrativa',
        question: '📌 **ETAPA 2** — Escolha o estilo do gancho e da narrativa:',
        type: 'single-choice',
        required: true,
        options: [
          { id: '1', label: '1️⃣ Curiosidade Irresistível (Quebra de padrão em 3s)', value: 'Curiosidade Irresistível e Quebra de Padrão' },
          { id: '2', label: '2️⃣ Repórter / Review Realista em POV', value: 'Repórter Sincero em POV de alta recomendação' },
          { id: '3', label: '3️⃣ Humor / POV Relacionável', value: 'POV Relacionável com tom divertido e viral' },
          { id: '4', label: '4️⃣ Urgência de Lançamento', value: 'Urgência com foco em desconto de tempo limitado' }
        ],
        confirmationMessage: 'Etapa 2 confirmada.'
      }
    ];

    return {
      id: agent.id,
      name: agent.name,
      description: agent.description,
      initialMessage: `Olá! Sou o **${agent.name}** 👋\n\n${agent.description || 'Vou guiar você passo a passo na criação do seu conteúdo de alta conversão.'}\n\n---\n\n📌 **ETAPA 0**:\n${initialQ}`,
      rawPrompt: agent.systemInstruction,
      steps,
      outputs: [
        {
          id: 'out-1',
          title: `Roteiro e Prompts Finalizados — ${agent.name}`,
          template: `==================================================================
ROTEIRO E PROMPT MESTRE — ${agent.name.toUpperCase()}
==================================================================

• PROJETO / PRODUTO: [step-0]
• OBJETIVO / PAUTA: [step-1]
• ESTILO NARRATIVO: [step-2]

==================================================================
ROTEIRO VIRAL DE 30 SEGUNDOS
==================================================================

1️⃣ GANCHOS DE RETENÇÃO (0-3s):
- Gancho 1: "Se você quer [step-1], não cometa o erro de fechar esse vídeo!"
- Gancho 2: "Por que ninguém te contou isso sobre [step-0] antes?"

2️⃣ ESTRUTURA CENA A CENA:
• [00:00 - 00:03] CENA 1: Enquadramento direto e atrativo mostrando [step-0].
  -> Áudio: "[step-1]! Preste muita atenção nisso."

• [00:03 - 00:15] CENA 2: Apresentação focada no tom de [step-2].
  -> Áudio: "Demonstração prática e sem enrolação."

• [00:15 - 00:30] CENA 3: Chamada para ação clara e direta.
  -> Áudio: "Clique no link no perfil ou no carrinho abaixo para garantir o seu!"`
        }
      ]
    };
  }
}

export default AgentTemplateCompiler;

