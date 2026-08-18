/**
 * Configuração de disponibilidade da Academia de Desafios.
 * 
 * - `false`: Apenas as 2 chaves mestras (BIGODE7144, 7144BIGODE)
 *   têm acesso completo à Academia de Desafios. Todos os demais alunos visualizam o card "Em breve".
 * 
 * - `true`: Toda a Academia de Desafios é liberada automaticamente para todos os alunos.
 */
export const ACADEMIA_DESAFIOS_LIBERADA = false;

/**
 * Feature Flag para Transcrição e Modelagem de Conteúdo por IA no Minerador de Produtos.
 * 
 * - `false`: Oculta os botões "Transcrição" e "Modelar Conteúdo" da interface e bloqueia as rotas no backend,
 *   garantindo 0 consumo extra de créditos. A arquitetura, cache e pipelines permanecem preservados.
 * 
 * - `true`: Reativa os botões e a funcionalidade completa de Transcrição e Modelagem de Conteúdo.
 */
export const PRODUCT_CONTENT_AI_ENABLED = false;

