# Referência da API

Base local: o backend ASP.NET Core serve `/api/*`; no desenvolvimento Vite encaminha esse prefixo para o backend. Os endpoints protegidos usam o cookie `corseweb.auth`.

Os nomes JSON são camelCase. O contrato de curso aceita módulos como JSON estruturado; a aula na branch atual usa `nodes[]` e `connections[]`.

## 1. Autenticação — `/api/auth`

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| `GET` | `/api/auth/config` | Público | Informa se Google Client ID está configurado e devolve o Client ID público |
| `GET` | `/api/auth/me` | Sessão | Retorna o usuário da sessão e sincroniza a role a partir de `AdminEmails` |
| `POST` | `/api/auth/google` | Público | Valida ID token Google e cria sessão por cookie |
| `POST` | `/api/auth/register` | Público | Cria conta local e sessão; valida nome, e-mail e senha |
| `POST` | `/api/auth/local-login` | Público | Valida credenciais locais e cria sessão |
| `POST` | `/api/auth/dev-login` | Apenas Development | Login de desenvolvimento; não deve existir como mecanismo de produção |
| `POST` | `/api/auth/logout` | Sessão | Encerra a sessão por cookie |

## 2. Cursos publicados — `/api/courses`

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| `GET` | `/api/courses` | Público; admin pode filtrar todos | Lista cursos publicados; aceita `search`, `status` e `includeAll` para admin |
| `GET` | `/api/courses/{slug}` | Público para publicados; proprietário/admin para não publicados | Busca curso por slug |
| `POST` | `/api/courses` | Autenticado | Cria curso publicado diretamente; o fluxo normal do editor usa rascunho |
| `PUT` | `/api/courses/{slug}` | Proprietário ou admin | Atualiza metadados e/ou `modules`; incrementa versão e grava snapshot |
| `DELETE` | `/api/courses/{slug}` | Proprietário ou admin | Exclui curso e versões associadas |
| `GET` | `/api/courses/{slug}/versions` | Público para publicado; proprietário/admin para não publicado | Lista metadados das versões (não devolve o snapshot completo) |
| `POST` | `/api/courses/{slug}/publish` | Proprietário ou admin | Altera status entre publicado/arquivado/rascunho (rascunho é convertido em arquivado para `Course`) |

## 3. Rascunhos — `/api/drafts`

Todos os endpoints de rascunho exigem usuário autenticado.

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| `GET` | `/api/drafts` | Autenticado | Lista apenas os rascunhos do usuário atual |
| `GET` | `/api/drafts/{id}` | Proprietário ou admin | Busca rascunho por ID |
| `GET` | `/api/drafts/by-slug/{slug}` | Proprietário | Busca rascunho próprio por slug |
| `POST` | `/api/drafts` | Autenticado | Cria rascunho com slug único |
| `PUT` | `/api/drafts/{id}` | Proprietário | Atualiza metadados e conteúdo JSON do rascunho |
| `DELETE` | `/api/drafts/{id}` | Proprietário ou admin | Remove rascunho |
| `POST` | `/api/drafts/{id}/publish` | Proprietário ou admin | Publica novo curso ou aplica rascunho a um curso-fonte; registra snapshot e remove o rascunho |

## 4. Matrículas e progresso — `/api/enrollments`

Todos os endpoints exigem sessão.

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/enrollments` | Lista matrículas do usuário atual |
| `POST` | `/api/enrollments/{courseId}` | Matricula usuário em curso publicado; aceita ID ou slug |
| `PUT` | `/api/enrollments/{courseId}/progress` | Atualiza aula atual, percentual e progresso dos módulos |
| `DELETE` | `/api/enrollments/{courseId}` | Cancela matrícula |

`ProgressUpdateDto` atualmente recebe `overallPercent`, `currentLessonId` e `modulesProgress` do cliente. O servidor limita o percentual a 0–100, mas não recalcula a conclusão a partir de atividades verificadas. Essa é uma pendência de correção, não um contrato a ser tratado como seguro.

## 5. Mídia — `/api/course-media`

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| `POST` | `/api/course-media/covers` | Autenticado | Upload multipart da capa, até 5 MB; reconhece assinatura PNG, JPEG ou WebP e grava em `wwwroot/uploads/course-covers` |

A URL devolvida é relativa ao site, em `/uploads/course-covers/{arquivo}`. A pasta é servida como conteúdo estático.

## 6. Dados principais

| Entidade | Campos / responsabilidade |
|---|---|
| `AppUser` | Identidade, nome, e-mail, role e `PasswordHash` |
| `Course` | Curso publicado/arquivado, `ModulesJson`, metadados, status e versão |
| `CourseDraft` | Cópia editável do curso, `OwnerId`, `SourceCourseId` e `ModulesJson` |
| `CourseVersion` | `CourseId`, número, `SnapshotJson`, autor e data |
| `CourseEnrollment` | Usuário, curso, percentual, aula atual e `ModulesProgressJson` |

Os módulos e aulas não são tabelas independentes no schema atual; ficam serializados em JSON. A evolução de nós/conexões mantém esse contrato JSON. CorseLight ainda não possui coleção de scripts persistida nem endpoints próprios.

## 7. Regras de autorização observadas

- Curso publicado pode ser consultado publicamente.
- A listagem geral retorna apenas publicados, exceto quando admin solicita explicitamente `includeAll`/`status=all`.
- Alterações em cursos exigem sessão e papel de proprietário ou admin.
- Rascunhos pertencem ao usuário; apenas proprietário/admin podem consultar/remover conforme o endpoint.
- Matrículas são isoladas pelo `UserId` da sessão.
- A autorização de administrador é calculada no backend por `AdminEmails`.

Consulte [achados de auditoria](../SECURITY/audit-findings.md) antes de ampliar o uso em produção.