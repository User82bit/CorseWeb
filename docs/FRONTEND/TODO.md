# CorseWeb — índice de tarefas do frontend

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
| EDITOR-001 | Validar workspace e autoria de grafo | `src/Pages/AdminCourseEditor/LessonEditorPage.tsx`, `.scss`, `src/types/course.ts` |
| STUDENT-001 | Validar renderização do conteúdo pedagógico e ocultação de scripts | `src/Pages/AppLessonPage/AppLessonPage.tsx`, `.scss` |
| STORE-001 | Definir cache, localStorage e fallback da API | `src/store/`, `src/lib/api.ts` |
| E2E-001 | Criar testes ponta a ponta para navegação, sessão, cursos e editor | suíte de testes ainda a criar |

## Estado do editor visual

- FE-009 (estrutura de módulos/aulas) e FE-010 (blocos/colunas) são etapas históricas; o contrato atual é o grafo FE-011.
- FE-011 foi integrado em `Homologa` pelos PRs #35–#38. Inclui workspace, cards, nós/portas/conexões, câmera, pan/zoom e seleção múltipla.
- FE-012/PRs #39–#40 separa o renderizador de leitura do canvas e oculta scripts internos CL da experiência do aluno.
- O grafo ainda não controla progressão; quiz/exercício não possuem avaliação automática no fluxo atual e a CorseLight não é executada.
- Os critérios detalhados e pendências ficam em [`etapas/fe-011-lesson-editor-workspace.md`](./etapas/fe-011-lesson-editor-workspace.md).

## Validação visual mínima

| Dispositivo/viewport | Verificações |
|---|---|
| Celular (320–430 px) | Navegação, toque, scroll, canvas/controles, sem conteúdo cortado ou rolagem horizontal acidental |
| Tablet (768–1024 px) | Paleta, canvas e inspetor utilizáveis; controles não sobrepostos |
| Desktop (1280 px ou mais) | Layout completo, seleção, zoom, conexões e leitura do curso |

Executar em navegador real e registrar resultado no card do [Kanban](../TODO.md).