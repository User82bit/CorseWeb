# FE-003 — Consolidar os fundamentos visuais responsivos e acessíveis

## Identificação

- **Tipo:** `style` + `refactor`
- **Estado:** EM REVISÃO
- **Branch:** `feat/design-system-foundations`
- **PR:** [#12 — fundamentos visuais responsivos e acessíveis](https://github.com/User82bit/CorseWeb/pull/12)
- **Base:** `master` no commit `277f5c22c32705aa4af852fbf77e14b7cfaef436`, após a integração do PR #11.
- **Objetivo:** completar a fundação visual já existente sem criar um segundo sistema de tokens ou reescrever páginas fora do escopo.

## Auditoria inicial

- `src/Styles/SetGlobalsColors.scss` já possui tokens de cores, tipografia, espaçamento, raios, sombras, breakpoints e superfícies.
- `src/Styles/Primitives.scss` já define superfícies, cards, botões e estilos tipográficos básicos.
- `src/index.scss` contém o reset, suporte global a foco visível, preferência por movimento reduzido, utilitários e container responsivo.
- A marca semântica global usava violeta, embora a Home reconstruída utilize azul e ciano. Os botões genéricos também usavam o brilho violeta.
- Durações de transição e a escala de camadas não tinham tokens dedicados; os limites do container estavam declarados diretamente em pixels no SCSS global.
- Faltavam primitivas compartilhadas para campos de formulário, badges de estado, texto apenas para leitores de tela e links de salto.
- Os utilitários `.text-muted`, `.text-secondary` e `.text-brand` estavam duplicados entre `Primitives.scss` e `index.scss`.
- As ações de perigo/sucesso utilizavam fundos que não preservavam contraste suficiente para texto branco em alguns dos estados.

## Decisões técnicas

1. Estender `SetGlobalsColors.scss` como fonte única de tokens, sem criar outro arquivo global de tokens.
2. Alinhar o token de marca com o azul já usado pela Home; manter cores de estado semântico independentes da marca.
3. Adicionar tokens para contraste de texto de estados, ações de sucesso/perigo, movimento, camadas, limites responsivos e blur de vidro.
4. Manter o container mobile-first: 2rem de espaço lateral em larguras pequenas, 3rem a partir do breakpoint de tablet e 4rem no breakpoint XL; aumentar o limite de largura somente em telas XL.
5. Reutilizar `Primitives.scss` para as classes `.field*`, `.badge*`, `.sr-only` e `.skip-link`; não criar componentes React sem um consumidor validado nesta etapa.
6. Preservar o suporte existente a `prefers-reduced-motion` e à preferência de tema do sistema operacional.
7. Não redesenhar a Home ou as telas antigas nesta etapa, nem introduzir dependências.

## Arquivos afetados

- `corseweb.client/src/Styles/SetGlobalsColors.scss`
- `corseweb.client/src/Styles/Primitives.scss`
- `corseweb.client/src/index.scss`
- `docs/TODO.md`
- `docs/FRONTEND/TODO.md`
- `docs/FRONTEND/etapas/fe-003-design-foundations.md`

## Implementação desta branch

- [x] Auditar e estender os tokens existentes.
- [x] Unificar a cor semântica de marca com a paleta azul existente na Home.
- [x] Centralizar durações/easing, camadas, espaço lateral e largura máxima do container.
- [x] Adicionar primitivas acessíveis de formulário e badges sem impor conteúdo específico a um curso.
- [x] Remover regras utilitárias globais duplicadas.
- [x] Atualizar o Kanban para refletir a integração de FE-002 em `master`.
- [x] CI aprovada para o código da etapa no commit `1a9f47e66ffae6f4cc508f32799c2bbae1c69c24`.
- [ ] Inspecionar visualmente em navegador real e validar teclado/leitor de tela quando aplicável.

## Testes e resultados

A execução [#39605172498](https://github.com/User82bit/CorseWeb/actions/runs/39605172498), no commit `1a9f47e66ffae6f4cc508f32799c2bbae1c69c24`, passou em `npm ci`, lint, testes de idioma, build frontend, restore e build .NET. Esta atualização documental dispara uma nova execução; a inspeção visual em navegador real permanece pendente.

## Critérios de aceitação

1. O build TypeScript/Vite continua funcionando.
2. O lint continua funcionando sem desativar regras.
3. O projeto .NET continua compilando, sem mudanças no backend.
4. O sistema visual permanece usando um único arquivo de tokens e o conjunto compartilhado de primitivas existente.
5. Campos, mensagens de erro, badges e botões possuem estados de foco/erro/disabled e usam tokens semânticos.
6. O container se adapta de celular para tablet e desktop por meio dos breakpoints existentes.
7. Não são adicionadas dependências.
8. A documentação separa as verificações automatizadas da inspeção visual manual pendente.

## Como validar manualmente (mobile-first)

1. Abra a aplicação a 320–375 px e verifique ausência de rolagem horizontal e margens do container.
2. Inspecione telas que usem `.button`, `.field__control` ou `.badge` em larguras pequenas.
3. Use Tab/Shift+Tab para confirmar foco perceptível, link de salto e navegação sem depender do mouse.
4. Teste campos desabilitados e campos com `aria-invalid="true"`; confirme se a mensagem de erro está vinculada semanticamente no componente consumidor.
5. Repita em tablet (a partir de 48rem) e desktop XL (a partir de 80rem).
6. Ative a preferência de movimento reduzido e o tema escuro do sistema, verificando transições e contraste.

## Limitações conhecidas

- A validação de renderização, contraste real em contexto e tecnologias assistivas permanece pendente de inspeção manual.
- As primitivas CSS estão disponíveis para uso incremental; esta etapa não migra formulários/card existentes nem reconstrói telas antigas.
- O estado INTEGRADA de FE-002 se refere à integração em `master`; a conferência manual do atributo `html lang` permanece pendente.
