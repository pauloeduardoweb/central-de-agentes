import { AgentConfig } from '../agentTypes';

export const casquinhaAnimalConfig: AgentConfig = {
  id: 'agent-tiktok2k-casquinha-animal',
  name: 'Casquinha Animal IA',
  description: 'Transforme animais em fofura na casquinha de sorvete waffle para viralizar no TikTok',
  initialMessage: `Olá! Sou o **Casquinha Animal IA** 👋

Vou gerar o prompt e o roteiro perfeito de animação hiper-realista para transformar qualquer filhote em uma bola de sorvete irresistível na casquinha waffle.

---

🚀 **ETAPA 0 (OBRIGATÓRIA)**:
Qual animal vai estar na cuba retangular de metal para sorvete no balcão?`,
  rules: [
    { id: 'r1', rule: 'Fazer apenas uma pergunta por vez' },
    { id: 'r2', rule: 'Substituir [ANIMAL] e [FILHOTE DO ANIMAL] corretamente' }
  ],
  steps: [
    {
      id: 'step-0',
      order: 0,
      title: 'Escolha do Animal',
      question: `🚀 **ETAPA 0** — Escolha o animal ou filhote para a criação:`,
      type: 'single-choice',
      required: true,
      options: [
        { id: '1', label: '1️⃣ Furão', value: 'Furão' },
        { id: '2', label: '2️⃣ Guaxinim', value: 'Guaxinim' },
        { id: '3', label: '3️⃣ Capivara filhote', value: 'Capivara filhote' },
        { id: '4', label: '4️⃣ Suricato', value: 'Suricato' },
        { id: '5', label: '5️⃣ Raposa-do-campo', value: 'Raposa-do-campo' },
        { id: '6', label: '6️⃣ Coruja-real', value: 'Coruja-real' },
        { id: '7', label: '7️⃣ Coelho', value: 'Coelho' },
        { id: '8', label: '8️⃣ Pinguim-africano', value: 'Pinguim-africano' },
        { id: '9', label: '9️⃣ Outro (digite o nome)', value: 'Outro' }
      ],
      confirmationMessage: 'Etapa 0 confirmada.',
      nextStepId: 'step-1'
    },
    {
      id: 'step-1',
      order: 1,
      title: 'Nome do Animal Específico (se customizado)',
      question: 'Caso tenha escolhido "Outro" ou queira especificar melhor o animal/raça, digite o nome completo agora (ou clique em Continuar com o animal escolhido):',
      type: 'text',
      required: false,
      confirmationMessage: 'Etapa 1 confirmada.'
    }
  ],
  outputs: [
    {
      id: 'out-1',
      title: 'Prompt do Vídeo — Casquinha Animal IA',
      template: `==================================================================
PROMPT DO VÍDEO — CASQUINHA ANIMAL IA
==================================================================

• ANIMAL ESCOLHIDO: [step-0]
• DETALHES COMPLEMENTARES: [step-1]

*PROMPT DO VIDEO:*

"Uma visão em primeira pessoa em uma sorveteria bem iluminada. Um(a) [step-0] adulto(a) está deitado(a) pacificamente de barriga para cima dentro de uma cuba retangular de metal para sorvete no balcão de exibição. Uma mão usando uma luva de nitrilo azul usa uma colher de sorvete de metal para retirar suavemente uma bola de pelo perfeitamente redonda da barriga do(a) [step-0]. A bola de pelo combina exatamente com as cores, o padrão e a textura do(a) [step-0]. A mão então move a colher e coloca a bola de pelo diretamente no topo de uma casquinha de sorvete de waffle clássica segurada em primeiro plano por outra mão. Ao ser solta, a bola redonda naturalmente se revela como sendo apenas a cabeça de um pequeno e adorável filhote de [step-0] de olhos grandes. A cabeça do filhote preenche perfeitamente o topo da casquinha exatamente como uma bola de sorvete, com apenas a sua cabeça e uma única patinha visíveis descansando sobre a borda. Ele tem exatamente o mesmo padrão de cores, sem nenhum corpo aparecendo abaixo da casquinha."

==================================================================
LINK PARA IMAGEM DE REFERÊNCIA:
https://i.postimg.cc/0ybMd5DG/Alter-animal-to-Ferret-202607211728.jpg

COMANDOS EXTRAS:
MUDE O ANIMAL PARA UM [step-0]`
    }
  ]
};
