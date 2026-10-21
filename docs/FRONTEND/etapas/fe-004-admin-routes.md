# FE-004 — Reconstrução das rotas administrativas

## Objetivo

Reconstruir a experiência visual e responsiva das páginas administrativas existentes do CorseWeb, mantendo os contratos de API e as operações de catálogo já implementados.

## Escopo desta branch

- /admin: painel de visão geral, estatísticas calculadas a partir do catálogo carregado e lista de cursos atualizados recentemente.
- /admin/courses: gestão do catálogo com busca, filtros por status, metadados e ações de publicação/arquivamento/exclusão já disponíveis.
- AdminLayout: navegação responsiva, menu móvel, foco de teclado, perfil administrativo, idioma e atalhos para o site e a área do aluno.
- Traduções pt-BR, en e es para os textos novos da administração.

## Fora do escopo

- Não alterar o editor AdminCourseEditor.
- Não reconstruir nem modificar o fluxo, formulário, modelo de dados ou persistência de criação/edição de cursos. Essa entrega será feita em outra branch.
- Não alterar endpoints ou regras de autorização do backend.
- Os links de criação e edição existentes são mantidos para preservar a navegação; suas páginas e fluxos não fazem parte desta etapa.

## Arquivos principais

- corseweb.client/src/Pages/AdminLayout/AdminLayout.tsx e AdminLayout.scss
- corseweb.client/src/Pages/AdminDashboard/AdminDashboard.tsx e AdminDashboard.scss
- corseweb.client/src/Pages/AdminCoursesPage/AdminCoursesPage.tsx e AdminCoursesPage.scss
- corseweb.client/src/i18n/types.ts
- corseweb.client/src/i18n/translations/pt-BR.ts
- corseweb.client/src/i18n/translations/en.ts
- corseweb.client/src/i18n/translations/es.ts

## Critérios de validação

- [x] npm run lint.
- [x] npm run test:i18n.
- [x] npm run build (TypeScript + Vite).
- [x] dotnet restore CorseWeb.slnx.
- [x] dotnet build CorseWeb.slnx --no-restore --configuration Release.
- [ ] Conferir /admin e /admin/courses em viewport de celular (320–375 px), tablet e desktop.
- [ ] Testar menu móvel, foco, Escape, seletor de idioma e navegação entre páginas.
- [ ] Confirmar busca, filtros e as ações de publicação/arquivamento/exclusão em sessão autenticada.
- [ ] Conferir textos nos idiomas pt-BR, en e es em navegador real.

CI ficou verde no commit 936d3f4928b7d5c20baf5bf1ef4661d675e992d5. A correção de mensagem de erro e a atualização documental deste commit precisam ser revalidadas pela nova execução do GitHub Actions.
