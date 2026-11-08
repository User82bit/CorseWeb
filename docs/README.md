# CorseWeb — documentação

Última atualização: 2026-11-07.

Esta pasta reúne a explicação técnica do produto, os contratos atuais e o planejamento único do projeto. O quadro central fica em [`TODO.md`](./TODO.md); os arquivos de frontend e backend por domínio apontam para ele para evitar listas divergentes.

## Leitura recomendada

1. [Visão geral da arquitetura](./ARCHITECTURE/corseweb-architecture.md) — camadas, rotas, responsabilidades e fluxo de dados.
2. [Modelo de conteúdo e editor visual](./ARCHITECTURE/course-content-model.md) — Curso → Módulos → Aulas → Nós e conexões; diferenças entre autoria e aprendizagem.
3. [Referência da API](./API/api-reference.md) — endpoints, autenticação, permissões e persistência.
4. [Configuração e execução local](./DEVELOPMENT/local-setup.md) — pré-requisitos, comandos, HTTPS e credenciais.
5. [Achados da auditoria](./SECURITY/audit-findings.md) — riscos, limitações conhecidas e ações recomendadas.
6. [Kanban técnico](./TODO.md) — tarefas agrupadas nos cinco estados oficiais.

## Documentos existentes que continuam válidos

- [Configuração de autenticação Google](./BACKEND/google-auth-configuration.md).
- [Especificação inicial da CorseLight v0.1](./ARCHITECTURE/corselight-language-v0.1.md).
- [Workspace do editor visual e grafo pedagógico — FE-011](./FRONTEND/etapas/fe-011-lesson-editor-workspace.md).
- [Pipeline de CI inicial](./CI/etapas/ci-initial-validation-pipeline.md).

Os documentos de etapas FE-009 e FE-010 são mantidos como histórico: seus editores/contratos foram substituídos pela evolução FE-011.

## Referência da auditoria

- Repositório: [User82bit/CorseWeb](https://github.com/User82bit/CorseWeb).
- Branch de referência: `Homologa`.
- Commit auditado: `4541dc42c8627075ea44ec1b989ee28116e8d43e` (merge do PR #40).
- No momento da auditoria, `Homologa` estava 48 commits à frente de `master` e não estava atrás. Os PRs #35 a #40 foram integrados em `Homologa`; portanto, o conteúdo desses PRs não deve ser presumido como presente em `master`.
- Inventário da branch: 158 arquivos versionados. Foram examinados os arquivos centrais de backend, frontend, editor, modelos, API, autenticação, configuração, testes e documentação. Arquivos binários (SVG/ICO), dependências travadas e artefatos gerados foram inventariados, não tratados como código-fonte.

## Como interpretar esta documentação

- **Implementado** significa que existe código para a função; não significa que o proprietário aprovou o comportamento.
- **Integrado** significa que o commit está na branch indicada; não significa que está em `master`.
- **CI aprovada** significa que os comandos automatizados do workflow passaram naquela execução; não substitui teste manual de navegação, responsividade, acessibilidade ou fluxos reais.
- O projeto já registra a diretriz de que, neste momento, apenas a base de tradução deve ser considerada funcional, ainda incompleta. As demais áreas permanecem sujeitas a auditoria e validação do proprietário.
- A análise desta documentação é estática. Não foi executada uma sessão real do site, um login Google, migração de banco ou teste ponta a ponta nesta atualização.