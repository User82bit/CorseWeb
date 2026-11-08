# CorseWeb — visão geral da arquitetura

## 1. O que é o produto

CorseWeb é uma plataforma web de cursos com três superfícies principais:

- **Pública:** apresentação da plataforma, catálogo e página pública do curso.
- **Aluno:** painel autenticado, cursos do aluno, leitura das aulas e acompanhamento de progresso.
- **Administrativa:** painel de administração e autoria/publicação de cursos. O editor de aulas é um workspace dedicado, fora do layout comum do painel.

O modelo é genérico e multi-curso. Curso, idioma, nível, categoria e conteúdo são dados; não devem ser codificados como uma experiência especial para um único curso.

## 2. Stack e responsabilidades

| Camada | Tecnologia / localização | Responsabilidade |
|---|---|---|
| Cliente | React 19, TypeScript, React Router 7, Vite 8 | Rotas, experiência pública, área do aluno, painel e editor visual |
| Estilos | SCSS/Sass | Tokens, componentes, responsividade e layouts |
| Tradução | `src/i18n` | Locale, provider, hook `useTranslation` e dicionários pt-BR/en/es |
| Estado do cliente | `src/store` | Cache e sincronização de autenticação, cursos e matrículas |
| Acesso HTTP | `src/lib/api.ts` | `fetch` com cookie, `Content-Type` JSON e leitura de erros |
| API | ASP.NET Core 10 | Autenticação, autorização, cursos, rascunhos, mídia e matrículas |
| Persistência | EF Core 10 + SQLite | Usuários, cursos, rascunhos, versões e matrículas |
| CI | GitHub Actions | Lint/testes disponíveis/build do cliente e build .NET |

### Cliente

O ponto de entrada é `corseweb.client/src/main.tsx`; `App.tsx` declara as rotas. `components/AuthGuard.tsx` protege as áreas autenticadas. `store/authStore.ts`, `store/courseStore.ts` e `store/enrollmentStore.ts` concentram o estado de sessão, catálogo/rascunhos e matrículas. `lib/api.ts` envia `credentials: include`, pois a sessão é mantida por cookie HTTP.

O Vite encaminha `/api`, `/uploads` e `/weatherforecast` para o ASP.NET Core. Em desenvolvimento, isso permite que o cliente use o proxy sem duplicar a lógica de autenticação.

### Backend

`CorseWeb.Server/Program.cs` registra SQLite, autenticação por cookie, autorização, controllers, configuração de arquivos estáticos e fallback para o SPA. Os controllers estão em `Controllers/`; DTOs em `Dtos/`; entidades em `Models/`; mapeamento e regras auxiliares em `Helpers/`.

Os controllers mantêm as regras de acesso no servidor. Esconder um botão no React não substitui autorização no endpoint.

## 3. Rotas do cliente

| Área | Rota | Componente principal | Acesso |
|---|---|---|---|
| Pública | `/` | `HomePage` | Visitante |
| Pública | `/courses` | `CoursesPage` | Visitante |
| Pública | `/courses/:courseSlug` | `CourseDetailPage` | Visitante; apenas cursos publicados |
| Conta | `/login` | `LoginPage` | Visitante / sessão |
| Aluno | `/app` | `AppDashboard` | Usuário autenticado |
| Aluno | `/app/courses` | `AppMyCourses` | Usuário autenticado |
| Aluno | `/app/courses/:courseSlug` | `AppCourseDetailPage` | Usuário autenticado |
| Aluno | `/app/courses/:courseSlug/lessons/:lessonSlug` | `AppLessonPage` | Usuário autenticado e matriculado para concluir progresso |
| Administração | `/admin` | `AdminDashboard` | Administrador |
| Administração | `/admin/courses` | `AdminCoursesPage` | Administrador |
| Administração | `/admin/courses/new` | `AdminCourseEditor` | Administrador |
| Editor | `/admin/courses/:courseSlug/editor` | `LessonEditorPage` | Administrador; workspace dedicado |

`RequireAuth` valida a sessão do usuário. `RequireAdmin` exige o papel de administrador. O backend resolve o papel a partir da configuração `AdminEmails`; a configuração do cliente não concede permissão.

## 4. Sessão e autenticação

O backend usa autenticação por cookie chamado `corseweb.auth`, com `HttpOnly`, `SameSite=Lax`, expiração de 14 dias e renovação deslizante. O cookie é `Secure` conforme o protocolo da requisição (`SameAsRequest`) para permitir o HTTP local; a configuração de produção deve ser validada com HTTPS e proxy reverso.

Há dois fluxos de entrada:

- **Google Identity Services:** o cliente recebe um ID token; o backend valida o token e o `Authentication:Google:ClientId` usando a audiência esperada. O fluxo atual não consome `ClientSecret`.
- **Conta local:** cadastro e login por e-mail/senha; a senha é armazenada como hash com `PasswordHasher`, não como texto puro.

`GET /api/auth/me` retorna a identidade da sessão e atualiza o papel conforme `AdminEmails`. O endpoint de configuração Google expõe o Client ID público, nunca um segredo.

## 5. Curso e persistência

Os dados principais são:

- `AppUser`: usuário, e-mail, papel e hash de senha.
- `Course`: curso publicado/arquivado, metadados e conteúdo.
- `CourseDraft`: rascunho sob posse de um usuário; pode apontar para um curso existente.
- `CourseVersion`: snapshot JSON de uma versão publicada.
- `CourseEnrollment`: matrícula e progresso de um usuário em um curso.

Tags, miniatura, conteúdo de módulos e progresso de matrícula são armazenados em colunas JSON (`TagsJson`, `ThumbnailJson`, `ModulesJson`, `ModulesProgressJson` etc.). O servidor usa DTOs com `JsonElement` para preservar a evolução do conteúdo sem criar uma tabela para cada tipo de nó.

O editor grava `modules` no rascunho ou no curso. No backend, o `CourseMapper` recalcula totais de módulos, aulas e minutos a partir desse JSON. Alterações de um curso publicado incrementam `Version` e registram snapshot; a mudança de status pelo endpoint de publicação tem uma lacuna de versionamento descrita em [achados da auditoria](../SECURITY/audit-findings.md).

## 6. Fluxos de dados principais

### Criar e publicar um curso

1. O administrador preenche título, descrição e capa em `/admin/courses/new`.
2. O cliente envia `POST /api/drafts`; o servidor valida os dados mínimos e cria um rascunho vinculado ao proprietário.
3. O cliente abre `/admin/courses/:courseSlug/editor`.
4. O editor monta módulos, aulas, nós e conexões em memória; `Salvar` envia a estrutura para `PUT /api/drafts/{id}`.
5. `Publicar curso` salva primeiro e chama `POST /api/drafts/{id}/publish`.
6. O servidor cria o curso publicado ou substitui a versão do curso-fonte, grava um snapshot e remove o rascunho.

### Abrir uma aula como aluno

1. `AppLessonPage` recarrega cursos e matrículas.
2. O cliente localiza a aula em `course.modules[].lessons[]`.
3. Os nós pedagógicos permitidos são ordenados por `y` e depois `x` e renderizados em fluxo de leitura.
4. A geometria, portas e conexões do editor não são exibidas ao aluno.
5. O aluno pode usar a ação de concluir aula; hoje o payload de progresso é montado no cliente e o servidor ainda confia em parte desses valores. Essa regra precisa ser corrigida antes de ser considerada segura.

## 7. Limites funcionais atuais

- O editor de grafo representa autoria visual e persiste nós/conexões; ele não executa as conexões para decidir o caminho do aluno.
- O Quiz é apresentado como pergunta/opções, mas não existe submissão/correção automática no fluxo atual.
- O Exercício apresenta instrução e código inicial; não executa nem valida a solução.
- O card de Certificado é conteúdo visual; não é emissão real de certificado.
- CorseLight tem especificação inicial, mas não possui parser ou runtime backend.
- O estado de câmera/zoom do editor é local à sessão e não é persistido entre dispositivos ou reaberturas.

Consulte o [modelo de conteúdo](./course-content-model.md) e o [Kanban](../TODO.md) para o escopo detalhado.