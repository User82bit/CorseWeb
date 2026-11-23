# CorseWeb — índice de tarefas do backend

Este arquivo organiza o escopo do servidor. **O Kanban oficial e os estados ficam somente em [`docs/TODO.md`](../TODO.md)**.

## Responsabilidades atuais

- ASP.NET Core 10 e controllers em `CorseWeb.Server/Controllers/`.
- Autenticação Google/local por cookie; role admin resolvida no servidor por `AdminEmails`.
- EF Core + SQLite, com entidades em `Models/`, configuração em `Data/AppDbContext.cs` e migrações em `Migrations/`.
- Cursos publicados, rascunhos, snapshots de versão, matrículas, progresso e upload de capas.
- Conteúdo de módulos/aulas serializado em JSON; o grafo usa `nodes[]` e `connections[]` dentro de `modules[]`.

## Frentes do backend

| ID no Kanban | Escopo | Arquivos principais |
|---|---|---|
| PROG-001 | Revisar eventos de conclusão e projeção de progresso server-side | `Controllers/EnrollmentsController.cs`, `Helpers/EnrollmentProgressProjector.cs`, `Models/CourseLessonCompletion.cs`, migration e testes de contrato |
| VERSION-001 | Registrar mudança de status no histórico de versões | `Controllers/CoursesController.cs`, `Helpers/CourseVersioning.cs`, `Models/CourseVersion.cs`, harness SQLite |
| AUTH-001 | Testar login, cookie, role, Google, sessão e postura CSRF/HTTPS | `Controllers/AuthController.cs`, `Program.cs`, `Helpers/AdminHelper.cs` |
| DB-001 | Alinhar migrações, model snapshot e coluna `PasswordHash` | `Program.cs`, `Migrations/`, `Models/AppUser.cs` |
| MEDIA-001 | Reforçar validação e ciclo de vida do upload de capas | `Controllers/CourseMediaController.cs` |
| CL-001 / CL-002 | Aprovar spec e implementar parser/runtime controlado | `docs/ARCHITECTURE/corselight-language-v0.1.md` e backend futuro |
| API-TEST-001 | Criar testes de integração HTTP/EF Core para endpoints e regras | `CorseWeb.ProgressTests/ApiIntegrationTestSuite.cs`, `WebApplicationFactory`, SQLite em memória e harness de contrato |

## Limites atuais importantes

- Não há runtime da CorseLight no servidor. O backend não deve executar texto de autor como código.
- PROG-001 remove percentual/status do corpo de escrita e calcula o progresso a partir de eventos server-side. Falta teste dinâmico de endpoints/migration; a conclusão é autodeclarada até haver avaliação server-side de quiz/exercício.
- VERSION-001 acrescenta versionamento e snapshot para transições efetivas do status de publicação; pedidos idempotentes não criam histórico duplicado.
- Migração de `PasswordHash` possui tratamento específico de SQLite no startup; precisa virar uma migração versionada.
- O upload de capa limita tamanho e verifica assinatura de formato, mas ainda precisa de validação de imagem completa/reprocessamento.
- O workflow compila o backend e executa o harness de contrato do projetor, migrações SQLite e suíte HTTP integrada com `WebApplicationFactory`. A cobertura inicial inclui autenticação local/cookies, roles, propriedade de curso/rascunho, publicação/versões, matrícula/progresso, isolamento e upload inválido. Ainda faltam Google OAuth real, CSRF/expiração, concorrência, fluxos adicionais de migração e suíte E2E.

Consulte o [Kanban central](../TODO.md), a [referência de API](../API/api-reference.md) e os [achados da auditoria](../SECURITY/audit-findings.md).