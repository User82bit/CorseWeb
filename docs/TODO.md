# CorseWeb — Kanban técnico

Última atualização: 2026-10-21.

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
| FE-001 | Reconstruir a Home pública com design responsivo mobile-first e auditoria dos contratos usados | Frontend | P0 | CONCLUÍDA em `Homologa` (validação responsiva pendente) | `feat/homepage-mobile-first` / [PR #4](https://github.com/User82bit/CorseWeb/pull/4) | CI-001 integrada em `master`; integração desta entrega em `master` sob controle do proprietário |
| FE-006 | Corrigir conflito de resolução do LanguageProvider em Windows/Vite | Frontend/Dev | P0 | CONCLUÍDA em `Homologa` | `fix/language-provider-windows-resolution` / [PR #5](https://github.com/User82bit/CorseWeb/pull/5) | CI aprovada e inicialização local confirmada pelo proprietário |
| FE-007 | Unificar a marca da Home com o ícone oficial e harmonizar o seletor de idioma | Frontend | P1 | EM DESENVOLVIMENTO | `fix/home-brand-and-language-switcher` / PR a abrir | FE-006 integrada em `Homologa` |
| BE-001 | Auditar e planejar a reconstrução dos fluxos de API, autenticação e persistência | Backend | P1 | NÃO INICIADA | A definir após definição do escopo | CI-001 integrada em `master` |
| DOC-001 | Consolidar decisões arquiteturais e documentação técnica de conteúdo, aulas e progresso | Documentação | P1 | NÃO INICIADA | A definir | Localizar/validar materiais arquiteturais existentes |

## Regras de fluxo

1. Trabalhar em uma branch por entrega, criada a partir da `master` atualizada.
2. Não alterar diretamente `master` ou `Homologa`.
3. Não iniciar a próxima entrega enquanto a atual aguarda revisão ou integração.
4. Abrir PR da branch da tarefa para `Homologa`; o proprietário mantém o controle de integração em `master`.
5. Registrar arquivos afetados, evidências de testes, resultados de CI, critérios de aceitação e limitações no arquivo da etapa.
6. Se os documentos arquiteturais não estiverem no repositório, localizar as versões fornecidas pelo proprietário antes de tomar decisões conflitantes. Não assumir que sua ausência na árvore do GitHub significa que as decisões não existem.
