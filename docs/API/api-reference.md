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
| `POST` | `/api/courses/{slug}/publish` | Proprietário ou admin | Altera status entre publicado/arquivado/rascunho; transições efetivas incrementam a versão e gravam snapshot no histórico |

A rota de publicação aceita `status` opcional. Sem corpo/status, alterna entre `publicado` e `arquivado`. Para a entidade `Course`, `rascunho` é normalizado para `arquivado`, pois rascunhos editáveis são mantidos em `CourseDraft`. Uma transição efetiva incrementa `version`, atualiza `updatedAt`/`updatedBy`, define `changelog` e cria um `CourseVersion` cujo snapshot captura o mesmo estado. Curso e snapshot são persistidos juntos. Solicitar novamente o status já vigente, inclusive pelo alias `rascunho`, é uma operação sem alteração e não cria versão duplicada.

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
| `GET` | `/api/enrollments` | Lista matrículas do usuário atual; progresso é calculado a partir dos eventos de conclusão persistidos |
| `POST` | `/api/enrollments/{courseId}` | Matricula usuário em curso publicado; aceita ID ou slug |
| `PUT` | `/api/enrollments/{courseId}/progress` | Atualiza somente a aula atual, desde que pertença ao curso e esteja publicada |
| `POST` | `/api/enrollments/{courseId}/lessons/{lessonId}/complete` | Registra de forma idempotente a ação de conclusão de uma aula publicada; exige resposta a todos os Quizzes alcançáveis da aula |
| `POST` | `/api/enrollments/{courseId}/lessons/{lessonId}/quizzes/{quizNodeId}/attempt` | Avalia e registra a resposta de um Quiz alcançável da matrícula |
| `DELETE` | `/api/enrollments/{courseId}` | Cancela matrícula e remove os eventos de conclusão associados |

O corpo de `PUT .../progress` aceita apenas `currentLessonId`. Percentuais, estados de aulas/módulos e datas de conclusão não são aceitos como autoridade do navegador. No `POST .../complete`, o backend exige sessão e matrícula do usuário atual, curso publicado e aula com `isPublished: true` dentro daquele curso. A data é criada pelo servidor; um índice único por matrícula/aula torna a ação idempotente.

O corpo do endpoint de tentativa contém `selectedOptionIndex`. O backend exige curso e aula publicados, matrícula do usuário, Quiz configurado e atualmente alcançável no grafo. A tentativa é corrigida com o gabarito mantido no servidor; o resultado contém `lessonId`, `quizNodeId`, `selectedOptionIndex`, `isCorrect`, `passed`, `score` e `completedAt`. A mesma opção repetida é idempotente; uma resposta diferente após o resultado gera `409 Conflict`; opção inválida gera `400`; Quiz em ramo bloqueado não é encontrado para aquela matrícula. Cada matrícula/aula/card aceita uma tentativa persistida, protegida por índice único e removida em cascata ao cancelar a matrícula.

A projeção pública de `GET /api/courses` e `GET /api/courses/{slug}` usa os resultados da matrícula atual: antes do resultado, nenhum nó conectado a `success`/`failed` é enviado; após o resultado, somente o caminho escolhido é enviado. O gabarito `correctIndex` continua removido do DTO do aluno. O autor/admin recebe o grafo completo para edição. Cursos e rascunhos só podem ser publicados quando cada Quiz em aula publicada tiver pergunta, pelo menos duas opções de texto não vazias e índice correto dentro da lista.

O servidor calcula `overallPercent`, `modulesProgress` e `completedAt` a partir das aulas publicadas e dos eventos existentes em `CourseLessonCompletions`. Aulas não publicadas ou IDs de outro curso não entram no cálculo. Valores legados gravados pelo contrato antigo do cliente são ignorados; matrículas antigas voltam a mostrar 0% até que novos eventos válidos sejam registrados.

**Limite funcional atual:** o Quiz de uma pergunta/escolha única tem correção server-side e seleciona o ramo do grafo, mas não oferece tentativas múltiplas, nota mínima configurável ou banco de questões. O botão de conclusão continua sendo uma autodeclaração de que o aluno terminou a aula; o Quiz simples não é prova suficiente para certificado, conteúdo pago ou decisão de alto valor. O card Exercício ainda não é executado nem corrigido.

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
| `CourseQuizAttempt` | Matrícula, aula, Quiz, índice escolhido, correção, aprovação, score e timestamp; único por matrícula/aula/card |

Os módulos e aulas não são tabelas independentes no schema atual; ficam serializados em JSON. A evolução de nós/conexões mantém esse contrato JSON. CorseLight ainda não possui coleção de scripts persistida nem endpoints próprios.

## 7. Regras de autorização observadas

- Curso publicado pode ser consultado publicamente.
- A listagem geral retorna apenas publicados, exceto quando admin solicita explicitamente `includeAll`/`status=all`.
- Alterações em cursos exigem sessão e papel de proprietário ou admin.
- Rascunhos pertencem ao usuário; apenas proprietário/admin podem consultar/remover conforme o endpoint.
- Matrículas são isoladas pelo `UserId` da sessão.
- A autorização de administrador é calculada no backend por `AdminEmails`.

Consulte [achados de auditoria](../SECURITY/audit-findings.md) antes de ampliar o uso em produção.