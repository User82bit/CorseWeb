# CorseWeb — Kanban técnico

Última atualização: 2026-10-23.

Este arquivo acompanha entregas significativas do frontend, backend e infraestrutura. O código existente é uma referência para auditoria, não uma garantia de funcionamento.

## Premissas de desenvolvimento

- **Estado funcional informado pelo proprietário:** no momento, somente o sistema de tradução, ainda incompleto, deve ser considerado funcional. Os demais recursos precisam ser auditados e refeitos/redesenhados; não devem ser tratados como funcionalidades aprovadas só porque há código presente.
- **Mobile-first obrigatório para trabalho de interface:** cada branch que alterar ou criar uma experiência visual deve começar pela versão móvel, incluindo layout, interação, estados e acessibilidade. Depois de validar o celular, expandir e adaptar para tablet e desktop. Não projetar primeiro para desktop e tentar comprimir depois.
- **Stack preservada:** React, TypeScript, TSX, SCSS/Sass e Node.js no frontend; manter o backend atual até que uma necessidade técnica justifique uma alteração planejada.
- **Multi-curso:** conteúdo e interfaces devem funcionar com dados genéricos, sem tratar o inglês como caso especial.
- **Imagens e recursos visuais:** se o agente não conseguir incluir uma imagem autonomamente, entregar uma descrição objetiva e termos de busca prontos para copiar, além de indicar o caminho exato da pasta de destino, nome/extensão do arquivo e componente/página que fará referência à imagem. Confirmar os caminhos na árvore real do projeto; não inventar diretórios nem declarar integração sem evidência.

## Estados do Kanban

- `NÃO INICIADA`
- `EM DESENVOLVIMENTO`
- `EM REVISÃO`
- `CONCLUÍDA`
- `PRECISA DE CORREÇÃO`

O estado de implementação deve ser distinguido de PR aberto/aprovado, integração em `master` e validação manual pelo proprietário. Só marcar uma entrega como concluída depois de verificar os critérios de aceitação e testes pertinentes.

## Visão geral

| ID | Entrega | Área | Prioridade | Estado | Branch / PR | Dependências |
|---|---|---|---|---|---|---|
| CI-001 | Pipeline inicial de validação para frontend e backend | CI | P0 | CONCLUÍDA | `ci/initial-validation-pipeline` / [PR #2](https://github.com/User82bit/CorseWeb/pull/2) — integrada em `master` | Nenhuma |
| FE-001 | Reconstruir a Home pública com design responsivo mobile-first e auditoria dos contratos usados | Frontend | P0 | INTEGRADA em `master` (validação responsiva pendente) | `feat/homepage-mobile-first` / [PR #4](https://github.com/User82bit/CorseWeb/pull/4) | CI passou; inspeção visual em celular/tablet/desktop ainda pendente |
| FE-006 | Corrigir conflito de resolução do LanguageProvider em Windows/Vite | Frontend/Dev | P0 | INTEGRADA em `master` | `fix/language-provider-windows-resolution` / [PR #5](https://github.com/User82bit/CorseWeb/pull/5) | CI aprovada e inicialização local confirmada pelo proprietário |
| FE-007 | Unificar a marca da Home com o ícone oficial e harmonizar o seletor de idioma | Frontend | P1 | INTEGRADA em `master` (validação visual pendente) | `fix/home-brand-and-language-switcher` / [PR #6](https://github.com/User82bit/CorseWeb/pull/6) | CI aprovada; revisão visual do proprietário ainda pendente |
| FE-008 | Centralizar SVGs inline em arquivos de assets organizados | Frontend | P1 | INTEGRADA em `master` (validação visual pendente) | `refactor/svg-assets-organization` / [PR #8](https://github.com/User82bit/CorseWeb/pull/8) | CI aprovada; inspeção visual manual pendente |
| FE-002 | Revalidar e completar o sistema de tradução | Frontend | P1 | INTEGRADA em `master` (validação manual pendente) | `feat/i18n-resilient-locale-system` / [PR #10](https://github.com/User82bit/CorseWeb/pull/10) | CI aprovado; conferência manual de `html lang` ainda pendente |
| FE-003 | Consolidar os fundamentos visuais responsivos e acessíveis | Frontend | P1 | INTEGRADA em `master` (validação visual pendente) | `feat/design-system-foundations` / [PR #12](https://github.com/User82bit/CorseWeb/pull/12) | CI aprovada; inspeção visual manual em navegador real pendente |
| FE-004 | Reconstruir as áreas pública, do aluno e administrativa por etapas independentes | Frontend | P1 | EM DESENVOLVIMENTO | Dashboard/login/catálogo público e rotas de aprendizagem integrados em master ([PR #14](https://github.com/User82bit/CorseWeb/pull/14), [PR #17](https://github.com/User82bit/CorseWeb/pull/17), [PR #19](https://github.com/User82bit/CorseWeb/pull/19)); painel administrativo e gestão de cursos em revisão ([PR #21](https://github.com/User82bit/CorseWeb/pull/21)) | CI do PR #21 passou no commit 936d3f4928b7d5c20baf5bf1ef4661d675e992d5 ([run #39629101208](https://github.com/User82bit/CorseWeb/actions/runs/39629101208)); validação visual manual ainda pendente; criação/edição de cursos fica para outra branch; redesign de /courses/:courseSlug em revisão no [PR #29](https://github.com/User82bit/CorseWeb/pull/29), branch fix/public-course-detail-redesign |
| FE-009 | Editor visual de estrutura com painel de seleção de módulos/aulas | SUBSTITUÍDO pelo novo canvas | [PR #23](https://github.com/User82bit/CorseWeb/pull/23); a navegação e composição passam a ocorrer no workspace visual novo |
| FE-010 | Editor em blocos/componentes e seleção de colunas | SUBSTITUÍDO por BREAKING CHANGE | [PR #33](https://github.com/User82bit/CorseWeb/pull/33); o formato antigo não será migrado nem mantido compatível |
| FE-011 | Editor visual de aulas com câmera livre e grafo de fluxo | Frontend | P1 | INTEGRADO em `Homologa` (validação visual pendente) | [PR #37](https://github.com/User82bit/CorseWeb/pull/37) e [PR #38](https://github.com/User82bit/CorseWeb/pull/38), ambos integrados somente em `Homologa` | Nós, portas, conexões SVG, pan/zoom e curvas adaptativas integrados; teste visual manual ainda pendente; motor pedagógico condicional permanece etapa posterior |
| FE-012 | Renderizar conteúdo pedagógico na área do aluno sem reproduzir o canvas do editor | Frontend | P1 | EM REVISÃO | `fix/student-lesson-content-renderer` / [PR #39](https://github.com/User82bit/CorseWeb/pull/39), destino `Homologa` | Conteúdo em fluxo de leitura responsivo a partir dos valores explícitos dos nós; ignora geometria/portas/conexões do editor e tipos desconhecidos/internos; scripts internos não são publicados nem executados; CI e validação visual manual pendentes |
| BE-000 | Preparar configuração segura das credenciais do Google em desenvolvimento e produção | Backend/Auth | P0 | EM REVISÃO | `fix/auth-google-configuration` / [PR #31](https://github.com/User82bit/CorseWeb/pull/31) | CI do código passou; validação manual e integração pendentes |
| BE-001 | Auditar e planejar a reconstrução dos fluxos de API, autenticação e persistência | Backend | P1 | NÃO INICIADA | A definir após definição do escopo | CI-001 integrada em `master` |
| DOC-001 | Consolidar decisões arquiteturais e documentação técnica de conteúdo, aulas e progresso | Documentação | P1 | NÃO INICIADA | A definir | Localizar/validar materiais arquiteturais existentes |

## Regras de fluxo

1. Trabalhar em uma branch por entrega, criada a partir da `master` atualizada.
2. Não alterar diretamente `master` ou `Homologa`.
3. Não iniciar a próxima entrega enquanto a atual aguarda revisão ou integração.
4. Abrir PR da branch da tarefa para `Homologa`; o proprietário mantém o controle de integração em `master`.
5. Registrar arquivos afetados, evidências de testes, resultados de CI, critérios de aceitação e limitações no arquivo da etapa.
6. Se os documentos arquiteturais não estiverem no repositório, localizar as versões fornecidas pelo proprietário antes de tomar decisões conflitantes. Não assumir que sua ausência na árvore do GitHub significa que as decisões não existem.
