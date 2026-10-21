# FE-004 — Reconstruir a área do aluno: dashboard e navegação mobile

## Identificação

- **Tipo:** `feat` + `style` + `a11y`
- **Estado:** EM REVISÃO
- **Branch:** `feat/student-dashboard-mobile-first`
- **PR:** [#14 — Reconstruir dashboard e navegação mobile do aluno](https://github.com/User82bit/CorseWeb/pull/14)
- **Base:** `master` no commit `ee2e927432fc1952518fad32cce0b20ab41142c9`, após a integração do PR #12 (FE-003).
- **Escopo desta entrega:** primeira fatia independente de FE-004, restrita ao dashboard inicial e à navegação global da área do aluno.

## Auditoria inicial

- `AppDashboard` apresentava rascunhos e cursos publicados juntos como se fossem cursos de estudo do aluno.
- A Home da área do aluno tinha CTAs de criação de curso que direcionavam para o espaço administrativo.
- O dashboard afirmava que o usuário poderia continuar de onde parou, mas não existe persistência de progresso integrada a essa página.
- O botão de menu móvel no `AppLayout` não possuía estado ou ação; a sidebar permanecia inacessível no celular.
- A navegação não identificava corretamente a rota ativa.
- O controle de notificações se parecia com um botão, mas não tinha ação funcional.
- O catálogo já fornece dados genéricos de cursos, com título, descrição, categoria, nível, miniatura e contagem de aulas. O dashboard pode exibir os cursos publicados sem inventar progresso individual.
- A plataforma é multi-curso e prioriza acessibilidade e mobile-first.

## Decisões para o escopo

1. Dashboard inicial apresenta somente cursos publicados (`status === "publicado"`). Rascunhos permanecem no fluxo de autoria/administrativo e não são apresentados como cursos de aprendizagem disponíveis.
2. Não exibir porcentagens de conclusão, “última aula” ou tempo de estudo como se fossem dados pessoais; o modelo de progresso existe no tipo, mas esta tela ainda não consome um serviço de progresso.
3. As métricas são explicitamente sobre o catálogo: total de cursos publicados, total de aulas descritas nos metadados e categorias distintas.
4. Conteúdo do dashboard e rótulos da navegação usam traduções pt-BR, inglês e espanhol. Os três dicionários continuam sob o tipo `Translations`.
5. O menu móvel usa estado real, botão de fechar por backdrop, Escape para fechar, indicador `aria-expanded`, `aria-controls` e estado ativo nas rotas. Em larguras maiores a sidebar fica visível permanentemente.
6. A notificação não funcional é removida nesta etapa, em vez de sugerir uma capacidade indisponível.
7. Não são adicionadas dependências nem alterados endpoints, dados persistidos ou contratos de backend.
8. Cores, raios, transições e camadas reutilizam os tokens de FE-003 sempre que aplicável.

## Arquivos afetados

- `corseweb.client/src/Pages/AppDashboard/AppDashboard.tsx`
- `corseweb.client/src/Pages/AppDashboard/AppDashboard.scss`
- `corseweb.client/src/Pages/AppLayout/AppLayout.tsx`
- `corseweb.client/src/Pages/AppLayout/AppLayout.scss`
- `corseweb.client/src/i18n/types.ts`
- `corseweb.client/src/i18n/translations/pt-BR.ts`
- `corseweb.client/src/i18n/translations/en.ts`
- `corseweb.client/src/i18n/translations/es.ts`
- `docs/TODO.md`
- `docs/FRONTEND/TODO.md`
- `docs/FRONTEND/etapas/fe-004-student-dashboard.md`

## Implementação

- [x] Reconstruir o dashboard com abordagem mobile-first e catálogo publicado.
- [x] Criar estados de carregamento, catálogo vazio e erro com tentativa de recuperação.
- [x] Apresentar métricas do catálogo sem afirmar que são progresso individual.
- [x] Corrigir a navegação móvel (abrir/fechar, backdrop, Escape, indicador de rota ativa).
- [x] Adicionar skip link e rótulos acessíveis da navegação.
- [x] Adicionar traduções para esta tela em pt-BR, en e es.
- [x] Corrigir o estado de FE-003 e remover a linha duplicada no TODO do frontend.
- [x] CI aprovada no commit `81bf4a317a567b3adf63a1415f105b7553a254ad`: lint, testes de idioma, build frontend e build .NET passaram.
- [ ] Inspecionar manualmente em navegador real a 320–375 px, tablet e desktop.

## Critérios de aceitação

1. TypeScript verifica a paridade dos três dicionários de tradução.
2. O dashboard lista somente cursos publicados que o store disponibiliza e não trata rascunhos como conteúdo de estudo.
3. As métricas apresentadas são derivadas exclusivamente dos metadados dos cursos visíveis.
4. Se não houver cursos, a tela explica o estado e oferece ação apropriada; erro de rede oferece tentativa de recuperação.
5. O menu móvel abre e fecha por botão, backdrop e tecla Escape; a navegação fecha depois de escolher um destino.
6. A rota ativa é identificável visualmente e através de `aria-current`.
7. O skip link leva ao conteúdo principal e pode ser alcançado por teclado.
8. Não foram introduzidas dependências nem mudanças no backend.
9. A CI aprova lint, teste de idioma, build frontend e build .NET.

## Evidência CI

- Execução [#39608617508](https://github.com/User82bit/CorseWeb/actions/runs/39608617508): `npm ci`, lint, `npm run test:i18n`, build frontend, restore e build .NET concluíram com sucesso no HEAD inicial da implementação.

## Validação manual mobile-first

1. A 320 px e 375 px: confirmar que cabeçalho, saudação, métricas, miniaturas e cards não causam rolagem horizontal.
2. Abrir o menu com mouse/toque e teclado; confirmar backdrop, fechamento clicando fora e Escape.
3. Usar Tab/Shift+Tab para garantir que um menu fechado não mantenha links invisíveis no percurso de foco.
4. Navegar entre `/app`, `/app/courses` e detalhes; validar o destaque de rota ativa.
5. Alternar pt-BR, English e Español; validar saudação, navegação, estados vazio/erro e cards.
6. Repetir em tablet e desktop, confirmando sidebar permanente, grades responsivas e preferência por movimento reduzido.
7. Conferir tema claro/escuro e foco visível.

## Limitações

- Não foi feita inspeção visual em navegador real nesta sessão; ela permanece pendente para o proprietário.
- Esta etapa não implementa inscrição em cursos, histórico de aulas ou persistência de progresso. A tela evita prometer essas funções com métricas inventadas.
- A tradução das demais áreas antigas permanece fora deste escopo, como previsto no plano por etapas.
