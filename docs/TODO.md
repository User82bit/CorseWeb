# CorseWeb — Kanban do projeto

Última atualização: 2026-11-07.

Este é o quadro único de trabalho. `docs/FRONTEND/TODO.md` e `docs/BACKEND/TODO.md` funcionam como índices por domínio e não mantêm estados paralelos.

## Referência de código

- Branch de auditoria: `Homologa`.
- Commit-base: `4541dc42c8627075ea44ec1b989ee28116e8d43e`.
- Comparação no GitHub: `Homologa` estava 48 commits à frente de `master` (0 atrás). Os PRs #35, #36, #37, #38, #39 e #40 foram integrados em `Homologa`, não em `master`.
- Não havia PRs abertos no repositório no momento da auditoria.

## Premissas do projeto

- A diretriz previamente registrada pelo proprietário é que somente a base de tradução deve ser tratada como funcional, ainda incompleta. As outras áreas precisam de validação explícita antes de serem consideradas aprovadas.
- O produto é multi-curso; nenhum fluxo deve depender de um curso específico ou tratar inglês como caso especial.
- A interface segue mobile-first: estruturar e testar celular primeiro, depois tablet e desktop. A existência de media queries não substitui teste em dispositivo/navegador.
- Stack do cliente preservada: React, TypeScript/TSX, SCSS/Sass e Node.js. Backend atual: ASP.NET Core com EF Core/SQLite.
- O editor de blocos anterior foi substituído intencionalmente pelo modelo de grafo FE-011. `blocks[]` e `elements[]` não são migrados automaticamente.
- CorseLight v0.1 é especificação em revisão; não há parser/runtime. Nunca executar código do autor com `eval`, reflexão ou runtime de linguagem irrestrito.

## Significado dos estados

| Estado | Regra para colocar um item nessa coluna |
|---|---|
| **Não iniciada** | Não há implementação comprovada para o escopo da tarefa. |
| **Iniciada** | Há trabalho parcial em andamento, mas ainda não está pronto para aceite. |
| **Revisão** | Existe implementação ou especificação e faltam validação, testes, revisão de contrato ou aceite do proprietário. |
| **Finalizada** | Critérios relevantes foram validados; integração e evidências estão registradas. Não significa apenas que um PR foi mesclado. |
| **Precisa de correção** | Foi encontrado um comportamento concreto que não atende à integridade/contrato esperado e exige correção antes do aceite. |

## Kanban

### Não iniciada

- **CL-002 · P1 · Implementar parser e runtime CorseLight v0.1.** Separar `scripts[]` de `modules[]`; parser/AST próprio; validação de sintaxe, tipos, eventos, funções permitidas, permissões, limites e testes unitários. Não usar JavaScript/C# scripting, `eval` ou reflexão. Dependência: revisão/aceite de CL-001.
- **FLOW-001 · P1 · Executar o grafo de fluxo pedagógico.** Interpretar conexões no servidor; definir semântica de `success`/`failed`; controlar liberação de nós/aulas e tentativas; integrar Quiz, Exercício e certificados reais. O editor atual apenas desenha/persiste conexões.
- **API-TEST-001 · P1 · Criar testes de integração do backend.** Cobrir autenticação, roles, propriedade de curso/rascunho, publicação, versões, matrículas, progresso, uploads e migrações em banco descartável.
- **E2E-001 · P1 · Criar suíte de testes ponta a ponta.** Cobrir visita pública, login, catálogo, matrícula, aula, conclusão, criação de curso, editor, salvar/publicar e falhas; incluir tamanhos móveis/tablet/desktop e teclado/toque.
- **DATA-001 · P2 · Definir importação/exportação de cursos.** Especificar schema versionado, validação de entrada, tratamento de mídia, nós/conexões e scripts CL sem aceitar código executável não confiável.
- **OPS-001 · P2 · Definir operação de produção.** Escolher banco/provider, backup/restore, gestão de secrets, HTTPS/proxy, armazenamento de uploads, logs e processo de migração; validar antes de publicar dados reais.

### Iniciada

- **I18N-001 · P1 · Completar e revisar a experiência multilíngue.** A base pt-BR/en/es existe e a resolução de locale possui testes, mas o sistema continua registrado como incompleto. Conferir paridade dos dicionários, telas públicas/aluno/admin/editor, mensagens de erro, `html lang`, datas/números e persistência da escolha.

### Revisão

- **UI-001 · P1 · Revisar as áreas pública, do aluno e administrativa.** As rotas e páginas estão no código; falta aceite visual/funcional do proprietário. Verificar estados vazio/erro/carregamento, responsividade, acessibilidade, navegação e integração com API.
- **AUTH-001 · P1 · Validar autenticação e autorização.** Google ID token, conta local, cookie e `AdminEmails` existem; faltam testes reais dos fluxos, expiração/reemissão, usuário comum/admin e revisão CSRF/HTTPS. Ver [achados](./SECURITY/audit-findings.md).
- **DB-001 · P1 · Revisar migrações e bootstrap SQLite.** `PasswordHash` tem correção manual SQLite em startup; alinhar model, snapshot e migrações versionadas; testar upgrade e recuperação sem dados reais.
- **MEDIA-001 · P1 · Revisar upload e ciclo de vida de capas.** O endpoint verifica tamanho e assinatura PNG/JPEG/WebP; validar decodificação/re-encode, metadados, dimensões, autorização e limpeza de arquivos órfãos.
- **EDITOR-001 · P1 · Validar visualmente o editor de grafo FE-011.** Workspace, paleta, canvas, nós, portas, ligações SVG, seleção múltipla, grade 20 px, câmera e inspetor foram integrados em `Homologa` via PRs #35–#38. Falta teste manual de criação, movimento, zoom, toque, salvamento, publicação e viewport móvel/tablet/desktop. Critérios em [FE-011](./FRONTEND/etapas/fe-011-lesson-editor-workspace.md).
- **STUDENT-001 · P1 · Validar apresentação linear da aula e ocultação de scripts.** FE-012/PRs #39–#40 renderizam conteúdo em fluxo, ignoram nós internos e ocultam scripts identificados como CL. Verificar conteúdo permitido, links/mídia, quiz, exercício, acessibilidade e ausência de dados internos em todos os breakpoints.
- **CL-001 · P1 · Revisar e aprovar a especificação CorseLight v0.1.** Documento existe; revisar eventos, funções, semântica, limites e modelo de estado antes de iniciar o runtime. [Especificação](./ARCHITECTURE/corselight-language-v0.1.md).
- **STORE-001 · P2 · Definir comportamento do cache/fallback localStorage.** Verificar o que é cache remoto, legado e dado local; impedir sucesso silencioso quando a API falha e validar sincronização entre abas.
- **DOC-001 · P1 · Revisar este pacote documental.** Arquitetura, conteúdo, API, setup, achados e Kanban estão preparados; revisar nomenclaturas e aceitar antes de integrar em `Homologa`.

### Finalizada

- **CI-001 · P0 · Pipeline inicial de validação.** Workflow presente; executa lint/testes disponíveis/build frontend e restore/build Release .NET. A aprovação do workflow não cobre testes manuais ou E2E. Histórico: [PR #2](https://github.com/User82bit/CorseWeb/pull/2).
- **FE-006 · P0 · Corrigir resolução do LanguageProvider em Windows/Vite.** PR integrado e inicialização local confirmada pelo proprietário. Histórico: [PR #5](https://github.com/User82bit/CorseWeb/pull/5).

### Precisa de correção

- **PROG-001 · P0 · Tornar o progresso autoritativo no servidor.** `EnrollmentsController.UpdateProgress` aceita `overallPercent`, `currentLessonId` e JSON de módulos enviado pelo navegador; limita o percentual mas não comprova conclusão e marca a matrícula concluída quando o valor recebido chega a 100. Recalcular progresso no servidor a partir de eventos/atividades validados e criar testes negativos. Evidência e recomendação em [achados da auditoria](./SECURITY/audit-findings.md#prog-001--progresso-controlado-pelo-cliente).
- **VERSION-001 · P1 · Versionar alterações de status de publicação.** `CoursesController.PublishToggle` altera status/data/autor sem incrementar `Course.Version` nem gravar `CourseVersion`, ao contrário das atualizações normais e publicação de rascunho. Definir a semântica de arquivar/retornar a publicar e registrar snapshot de forma atômica. Evidência em [achados](./SECURITY/audit-findings.md#version-001--status-fora-do-historico-de-versoes).

## Fluxo de contribuição

1. Criar uma branch de tarefa a partir da `Homologa` atualizada.
2. Trabalhar em uma entrega por branch; não editar diretamente `master` ou `Homologa`.
3. Atualizar o estado do card e o documento da etapa no mesmo PR.
4. Executar lint, testes disponíveis, build frontend e build .NET; anexar a saída real do CI.
5. Para interface, validar celular primeiro, depois tablet/desktop; incluir teclado e toque.
6. Abrir PR para `Homologa`. O proprietário decide quando integrar `Homologa` em `master`.
7. Mover para **Finalizada** somente depois do aceite e critérios de aceite cumpridos.

## Definição de pronto

Uma tarefa só fica finalizada quando código/documentação e critérios estão coerentes, testes pertinentes foram executados, regressões foram verificadas e as limitações restantes foram registradas. Merge, CI verde ou código compilando isoladamente não são prova de funcionamento.