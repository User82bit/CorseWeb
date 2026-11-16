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
| PROG-001 | Corrigir confiança no progresso vindo do browser | `Controllers/EnrollmentsController.cs`, DTOs de progresso |
| VERSION-001 | Registrar mudança de status no histórico de versões | `Controllers/CoursesController.cs`, `Models/CourseVersion.cs` |
| AUTH-001 | Testar login, cookie, role, Google, sessão e postura CSRF/HTTPS | `Controllers/AuthController.cs`, `Program.cs`, `Helpers/AdminHelper.cs` |
| DB-001 | Alinhar migrações, model snapshot e coluna `PasswordHash` | `Program.cs`, `Migrations/`, `Models/AppUser.cs` |
| MEDIA-001 | Reforçar validação e ciclo de vida do upload de capas | `Controllers/CourseMediaController.cs` |
| CL-001 / CL-002 | Aprovar spec e implementar parser/runtime controlado | `docs/ARCHITECTURE/corselight-language-v0.1.md` e backend futuro |
| API-TEST-001 | Criar testes automatizados para endpoints e regras | projeto de testes .NET ainda inexistente |

## Limites atuais importantes

- Não há runtime da CorseLight no servidor. O backend não deve executar texto de autor como código.
- O endpoint de progresso recebe dados do cliente e ainda precisa de validação autoritativa.
- A mudança de status pelo endpoint de publicação não grava uma nova versão/snapshot.
- Migração de `PasswordHash` possui tratamento específico de SQLite no startup; precisa virar uma migração versionada.
- O upload de capa limita tamanho e verifica assinatura de formato, mas ainda precisa de validação de imagem completa/reprocessamento.
- O workflow compila o backend, mas não existe suíte de testes de integração .NET.

Consulte o [Kanban central](../TODO.md), a [referência de API](../API/api-reference.md) e os [achados da auditoria](../SECURITY/audit-findings.md).