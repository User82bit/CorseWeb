# CorseWeb — índice de tarefas do frontend

Última atualização: 2026-11-17.

Este arquivo organiza o trabalho do cliente por área. **O Kanban oficial e os estados ficam somente em [`docs/TODO.md`](../TODO.md)**; não mantenha estados duplicados neste arquivo.

## Diretrizes

- Mobile-first: projetar e validar celular antes de tablet e desktop.
- React, TypeScript/TSX e SCSS/Sass continuam sendo a stack do cliente.
- Toda tela precisa tratar carregamento, vazio, erro e sucesso.
- Testar teclado, foco visível, toque, leitores de tela quando aplicável e conteúdo em pt-BR/en/es.
- O cliente não é autoridade para role, gabarito, progresso ou permissão; essas regras pertencem ao servidor.

## Frentes do frontend

| ID no Kanban | Escopo | Arquivos principais |
|---|---|---|
| I18N-001 | Completar dicionários pt-BR/en/es e validar tradução integral das rotas | `src/i18n/` e páginas/componentes |
| UI-001 | Validar páginas pública, login, aluno e administração | `src/Pages/`, `src/components/`, `src/UIComplement/` |
| EDITOR-001 | Validar workspace, autoria de grafo e experiência responsiva | `src/Pages/AdminCourseEditor/LessonEditorPage.tsx`, `.scss`, `src/types/course.ts` |
| EDITOR-002 | Revisar containers aninháveis e hierarquia visual | `nodeHierarchy.ts`, editor, LessonContentRenderer, validação da API |
| EDITOR-003 | Corrigir conexão de nós por toque e clique em celular | `LessonEditorPage.tsx`, `LessonEditorPage.scss` |
| EDITOR-004 | Ordenar prévia e aula pelo grafo de conexões | `AppLessonPage/lessonFlow.ts`, `LessonContentRenderer.tsx`, `LessonEditorPage.tsx` |
| FLOW-001 | Renderizar e enviar respostas de Quiz, mostrando somente o ramo liberado | `AppLessonPage.tsx`, `LessonContentRenderer.tsx`, `enrollmentStore.ts` e API de matrículas |
| FLOW-002 | Enviar solução de Exercise, exibir resultado e liberar o ramo | `AppLessonPage.tsx`, `LessonContentRenderer.tsx`, `LessonEditorPage.tsx` e `enrollmentStore.ts` |
| STUDENT-001 | Validar renderização do conteúdo pedagógico e ocultação de scripts | `src/Pages/AppLessonPage/AppLessonPage.tsx`, `.scss` |
| STORE-001 | Definir cache, localStorage e fallback da API | `src/store/`, `src/lib/api.ts` |
| E2E-001 | Criar testes ponta a ponta para navegação, sessão, cursos e editor | suíte de testes ainda a criar |

## Estado do editor visual

- FE-009 (estrutura de módulos/aulas) e FE-010 (blocos/colunas) são etapas históricas; o contrato atual é o grafo FE-011.
- FE-011 foi integrado em `Homologa` pelos PRs #35–#38. Inclui workspace, cards, nós/portas/conexões, câmera, pan/zoom e seleção múltipla.
- FE-012/PRs #39–#40 separa o renderizador de leitura do canvas e oculta scripts internos CL da experiência do aluno.
- FE-012 nesta branch adiciona navegação mobile por painéis, preview de celular/tablet/desktop, contrato de apresentação schema 2 e filtro de dados de autoria nas respostas públicas. A validação visual real e CI ainda são necessárias.
- FE-013 foi integrada em `Homologa` pelo PR #43: containers aninháveis com `parentId`, quatro níveis, reparenting, duplicação/exclusão de subtree, preview/aluno recursivos e validação frontend/backend. O CI #655 passou; falta inspeção manual e aceite.
- FLOW-001 conecta o card Quiz ao endpoint de avaliação: o aluno escolhe uma opção, recebe o resultado persistido e vê apenas a saída escolhida; Quizzes seguintes só aparecem quando o caminho anterior os alcança.
- FLOW-002 conecta o card Exercise ao endpoint de resposta: o campo de código/texto começa com `starterCode`, o servidor compara com a solução de referência e o aluno recebe aprovado/reprovado; somente o ramo escolhido permanece visível. A prévia do editor continua mostrando o grafo completo para autoria, sem simular decisões. O Exercise ainda não executa/compila código e a CorseLight não é executada.
- EDITOR-003: conexão mobile integrada em `Homologa` pelo PR #45; gesto de selecionar saída e depois entrada. Falta validação em dispositivo real e aceite.
- EDITOR-004: prévia e aula agora recebem `connections[]` e linearizam os nós a partir do `start`, percorrendo ramos na ordem das portas; fallback para nós desconectados/legados. PR em rascunho; CI e revisão manual pendentes. Critérios em [`fe-015-connection-reading-order.md`](./etapas/fe-015-connection-reading-order.md).
- PROG-001 altera a página da aula para solicitar conclusão ao servidor; o cliente não calcula mais percentuais nem envia status de módulos/aulas.
- Os critérios detalhados e pendências ficam em [`etapas/fe-011-lesson-editor-workspace.md`](./etapas/fe-011-lesson-editor-workspace.md).

## Validação visual mínima

| Dispositivo/viewport | Verificações |
|---|---|
| Celular (320–430 px) | Navegação, toque, scroll, canvas/controles, sem conteúdo cortado ou rolagem horizontal acidental |
| Tablet (768–1024 px) | Paleta, canvas e inspetor utilizáveis; controles não sobrepostos |
| Desktop (1280 px ou mais) | Layout completo, seleção, zoom, conexões e leitura do curso |

Executar em navegador real e registrar resultado no card do [Kanban](../TODO.md).