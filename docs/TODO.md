# CorseWeb — Kanban do projeto

Última atualização: 2026-11-24.

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
- CorseLight v0.1 foi aceita e integrada em `Homologa` pela PR #52. CL-002 está em revisão na PR #53; CI #935 passou, mas a implementação ainda não foi integrada. Nenhum script deve ser considerado disponível até revisão/aceite e integração. Nunca executar código do autor com `eval`, reflexão ou runtime de linguagem irrestrito.

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

- **E2E-001 · P1 · Criar suíte de testes ponta a ponta.** Cobrir visita pública, login, catálogo, matrícula, aula, conclusão, criação de curso, editor, salvar/publicar e falhas; incluir tamanhos móveis/tablet/desktop e teclado/toque.
- **DATA-001 · P2 · Definir importação/exportação de cursos.** Especificar schema versionado, validação de entrada, tratamento de mídia, nós/conexões e scripts CL sem aceitar código executável não confiável.
- **OPS-001 · P2 · Definir operação de produção.** Escolher banco/provider, backup/restore, gestão de secrets, HTTPS/proxy, armazenamento de uploads, logs e processo de migração; validar antes de publicar dados reais.

### Iniciada



- **API-TEST-001 · P1 · Criar testes de integração do backend.** Base integrada em `Homologa` pela PR #48; a infraestrutura usa `WebApplicationFactory`, cookie e SQLite em memória. A suíte agora também recebe cenários de Quiz/ramificações pela FLOW-001. Ainda faltam Google OAuth real, CSRF/expiração, concorrência e fluxos adicionais de migração. [API-TEST-001](./BACKEND/etapas/api-test-001-http-integration.md).



- **I18N-001 · P1 · Completar e revisar a experiência multilíngue.** A base pt-BR/en/es existe e a resolução de locale possui testes, mas o sistema continua registrado como incompleto. Conferir paridade dos dicionários, telas públicas/aluno/admin/editor, mensagens de erro, `html lang`, datas/números e persistência da escolha.

### Revisão

- **CL-002 · P1 · Implementar parser e runtime CorseLight v0.1.** Implementação na branch `feature/cl-002-corselight-runtime`, PR #53 aberta em rascunho para `Homologa`. Inclui `scripts[]` separado, lexer/parser/AST, validador semântico, runtime tipado, estado por matrícula/script, ledger idempotente dos três eventos, efeitos declarativos, feedback na tela do aluno e migração SQLite. CI #935 passou: builds frontend/backend e 207 assertions de contrato/SQLite/API. Falta revisão/aceite manual e integração; não habilitar scripts em produção antes disso. [PR #53](https://github.com/User82bit/CorseWeb/pull/53).

- **FLOW-002 · P1 · Executar o card Exercício no grafo pedagógico.** Integrado à `Homologa` pela PR #50. O servidor compara o texto/código com a solução privada, persiste o resultado, protege ramos bloqueados e exige resposta para atividades alcançáveis antes de concluir a aula. CI #850 passou com 138 asserções de contrato/SQLite/API e builds frontend/backend. Falta validação manual e aceite. [FLOW-002](./BACKEND/etapas/flow-002-exercise-branching.md).

- **CERT-001 · P1 · Emitir e verificar certificados de conclusão.** Integrado à `Homologa` pela PR #51. Emissão única após todas as aulas publicadas, snapshot imutável, código público de verificação e impressão A4/PDF pelo navegador. CI #862 passou em lint, testes, builds e 155 asserções de contrato/SQLite/API. Falta validação manual e aceite. O documento comprova conclusão registrada, não competência profissional.

- **FLOW-001 · P1 · Executar Quiz com ramificação server-side.** Integrado à `Homologa` pela PR #49. O Quiz de uma pergunta/escolha única é corrigido no backend; a tentativa é persistida por matrícula/aula/card; somente o ramo correspondente é projetado para o aluno, inclusive em Quizzes encadeados. CI #811 aprovou 109 asserções de contrato/SQLite/API e os builds frontend/backend. Ainda falta teste manual desktop/celular e aceite. [FLOW-001](./BACKEND/etapas/flow-001-quiz-branching.md).

- **PROG-001 · P0 · Tornar o progresso autoritativo no servidor.** Integrado em `Homologa` pelo PR #44; CI aprovada. A API valida curso/matrícula/aula publicada, grava conclusão no servidor e projeta percentuais a partir dos eventos. Permanecem pendentes os testes dinâmicos de rotas com sessão real e a revisão manual dos fluxos; o botão de conclusão ainda é autodeclaração, não avaliação de quiz/exercício. [PROG-001](./BACKEND/etapas/prog-001-server-authoritative-progress.md).

- **VERSION-001 · P1 · Versionar alterações de status de publicação.** Integrado em `Homologa` pela PR #46; transições efetivas atualizam status, versão, autor/data e changelog e gravam snapshot correspondente. Testes SQLite e API HTTP cobrem persistência, arquivamento e republicação. Ainda faltam concorrência e revisão manual do fluxo. [VERSION-001](./BACKEND/etapas/version-001-course-status-history.md).

- **EDITOR-004 · P1 · Validar ordem de leitura pelo grafo de conexões.** Integrado em `Homologa` pela PR #47; CI #751 aprovada. Prévia e aula compartilham a linearização a partir de `start`, percorrem portas na ordem declarada e mantêm fallback para nós desconectados/legados. Testes cobrem ramos, ciclos e caminhos convergentes. Falta inspeção manual e aceite do proprietário; a sequência dos ramos não executa ainda decisões condicionais. [FE-015](./FRONTEND/etapas/fe-015-connection-reading-order.md).

- **EDITOR-003 · P1 · Validar conexão de nós por toque no celular.** Correção integrada à `Homologa` pelo PR #45 e CI aprovada. A ligação agora usa toque/clique na saída e depois na entrada. Falta validação em dispositivo real e aceite do proprietário. [FE-014](./FRONTEND/etapas/fe-014-mobile-connection-gestures.md).

- **EDITOR-002 · P1 · Revisar containers aninháveis e hierarquia visual.** FE-013 foi integrado à `Homologa` pelo PR #43. Implementa `parentId` sem duplicar nós, container como único pai permitido, quatro níveis, reparenting por arrasto/inspetor, duplicação de subtree, exclusão em cascata, prévia/aluno recursivos e validação frontend/backend. CI #655 passou. Falta inspeção manual das interações e aceite do proprietário. [FE-013](./FRONTEND/etapas/fe-013-nested-containers.md).

- **UI-001 · P1 · Revisar as áreas pública, do aluno e administrativa.** As rotas e páginas estão no código; falta aceite visual/funcional do proprietário. Verificar estados vazio/erro/carregamento, responsividade, acessibilidade, navegação e integração com API.
- **AUTH-001 · P1 · Validar autenticação e autorização.** Google ID token, conta local, cookie e `AdminEmails` existem; faltam testes reais dos fluxos, expiração/reemissão, usuário comum/admin e revisão CSRF/HTTPS. Ver [achados](./SECURITY/audit-findings.md).
- **DB-001 · P1 · Revisar migrações e bootstrap SQLite.** `PasswordHash` tem correção manual SQLite em startup; alinhar model, snapshot e migrações versionadas; testar upgrade e recuperação sem dados reais.
- **MEDIA-001 · P1 · Revisar upload e ciclo de vida de capas.** O endpoint verifica tamanho e assinatura PNG/JPEG/WebP; validar decodificação/re-encode, metadados, dimensões, autorização e limpeza de arquivos órfãos.
- **EDITOR-001 · P1 · Validar visualmente o editor de grafo FE-011.** Workspace, paleta, canvas, nós, portas, ligações SVG, seleção múltipla, grade 20 px, câmera e inspetor foram integrados em `Homologa` via PRs #35–#38. A etapa FE-012 acrescenta painéis mobile, prévia e schema de apresentação 2; ainda faltam CI, inspeção manual em celular/tablet/desktop e aceite do proprietário. Critérios em [FE-011](./FRONTEND/etapas/fe-011-lesson-editor-workspace.md) e [FE-012](./FRONTEND/etapas/fe-012-responsive-editor-and-presentation.md).
- **STUDENT-001 · P1 · Validar apresentação da aula e ocultação de dados internos.** FE-012 adiciona layout/estilo por aula e elemento e DTO público que remove gabaritos/soluções; verificar conteúdo permitido, links/mídia, quiz, exercício, estilos, acessibilidade e ausência de dados privados em todos os breakpoints.
- **STORE-001 · P2 · Definir comportamento do cache/fallback localStorage.** Verificar o que é cache remoto, legado e dado local; impedir sucesso silencioso quando a API falha e validar sincronização entre abas.
- **DOC-001 · P1 · Revisar este pacote documental.** Arquitetura, conteúdo, API, setup, achados e Kanban estão preparados; revisar nomenclaturas e aceitar antes de integrar em `Homologa`.

### Finalizada

- **CL-001 · P1 · Aprovar a especificação CorseLight v0.1.** Contrato consolidado e aceito pelo proprietário, integrado em `Homologa` pela PR #52. Define gramática, precedência, três eventos, funções allowlisted, estado por matrícula/script, efeitos declarativos e limites. O aceite da especificação não equivale ao aceite do runtime CL-002. [Especificação](./ARCHITECTURE/corselight-language-v0.1.md).
- **CI-001 · P0 · Pipeline inicial de validação.** Workflow presente; executa lint/testes disponíveis/build frontend e restore/build Release .NET. A aprovação do workflow não cobre testes manuais ou E2E. Histórico: [PR #2](https://github.com/User82bit/CorseWeb/pull/2).
- **FE-006 · P0 · Corrigir resolução do LanguageProvider em Windows/Vite.** PR integrado e inicialização local confirmada pelo proprietário. Histórico: [PR #5](https://github.com/User82bit/CorseWeb/pull/5).

### Precisa de correção



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