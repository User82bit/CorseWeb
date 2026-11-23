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
| CL-001 | Fechar contrato da linguagem: gramática, eventos, catálogo nativo, isolamento, efeitos e limites | `docs/ARCHITECTURE/corselight-language-v0.1.md` |
| CL-002 | Implementar coleção `ScriptsJson`, lexer/parser/AST, validador, runtime e persistência isolada | `Models/Course.cs`, `Models/CourseDraft.cs`, DTOs, `CourseMapper`, controllers, runtime CL, migrações e testes |
| API-TEST-001 | Criar testes de integração HTTP/EF Core para endpoints e regras | `CorseWeb.ProgressTests/ApiIntegrationTestSuite.cs`, `WebApplicationFactory`, SQLite em memória e harness de contrato |
| FLOW-001 | Avaliar Quiz no servidor e liberar ramo pelo resultado | `Controllers/EnrollmentsController.cs`, `Helpers/CourseQuizEvaluator.cs`, `Helpers/StudentLessonFlowProjector.cs`, `Models/CourseQuizAttempt.cs`, migração e testes HTTP |
| FLOW-002 | Corrigir Exercise por comparação textual e liberar ramo | `Controllers/EnrollmentsController.cs`, `Helpers/CourseExerciseEvaluator.cs`, `Models/CourseExerciseAttempt.cs`, migração e testes HTTP/SQLite |
| CERT-001 | Emitir, persistir e verificar certificado de conclusão | `Controllers/EnrollmentsController.cs`, `Controllers/CertificatesController.cs`, `Models/CourseCertificate.cs`, migração e testes HTTP/SQLite |

## Limites atuais importantes

- Não há runtime da CorseLight no servidor. O backend não deve executar texto de autor como código.
- PROG-001 remove percentual/status do corpo de escrita e calcula o progresso a partir de eventos server-side. A conclusão manual permanece uma autodeclaração. FLOW-001 acrescenta avaliação server-side para o Quiz simples, mas não transforma o percentual em prova de aprendizagem.
- VERSION-001 acrescenta versionamento e snapshot para transições efetivas do status de publicação; pedidos idempotentes não criam histórico duplicado.
- Migração de `PasswordHash` possui tratamento específico de SQLite no startup; precisa virar uma migração versionada.
- O upload de capa limita tamanho e verifica assinatura de formato, mas ainda precisa de validação de imagem completa/reprocessamento.
- FLOW-001 (PR #49, integrado) introduz `CourseQuizAttempts`: uma resposta por matrícula/aula/card, correção e score 100/0 no servidor. A rota de aluno só retorna os nós alcançáveis após o resultado; tentativas em ramos bloqueados são rejeitadas. Limite: uma pergunta e uma escolha por card.
- FLOW-002 adiciona `CourseExerciseAttempts`: uma resposta por matrícula/aula/card, guardada no servidor e comparada com `props.solution` após normalização de finais de linha e espaços de extremidade. Resultado correto/errado usa score 100/0 e libera `success`/`failed`; o código do aluno nunca é executado nem compilado. Exercícios exigem instrução e solução de referência para publicação.
- CERT-001 adiciona `CourseCertificates`, endpoint de emissão idempotente após conclusão de todas as aulas publicadas e consulta pública por código aleatório de 128 bits. O certificado é um snapshot imutável dos dados de emissão e permanece verificável após cancelamento da matrícula. É comprovante de conclusão registrada, não avaliação independente de competência; o PDF é obtido pela impressão do navegador.
- CL-001 candidate.2 consolida a especificação da linguagem, ainda sem aceite do proprietário. A v0.1 proposta limita-se a `lesson.start`, `lesson.finish` e `activity.submit`, state isolado por matrícula/script e efeitos declarativos; não oferece loops, retry, override de score ou I/O. CL-002 só deve começar após aceite e deve incluir parser/AST próprios, allowlist, isolamento, idempotência e testes de limites.
- O workflow compila o backend e executa o harness de contrato do projetor, migrações SQLite e suíte HTTP integrada com `WebApplicationFactory`. A cobertura inicial inclui autenticação local/cookies, roles, propriedade de curso/rascunho, publicação/versões, matrícula/progresso, isolamento, upload inválido e os dois caminhos de Quiz (incluindo Quiz aninhado) e submissões Exercise corretas/incorretas, encadeamento, acesso bloqueado, migração e exclusão em cascata. Ainda faltam Google OAuth real, CSRF/expiração, concorrência, fluxos adicionais de migração e suíte E2E.

Consulte o [Kanban central](../TODO.md), a [referência de API](../API/api-reference.md) e os [achados da auditoria](../SECURITY/audit-findings.md).