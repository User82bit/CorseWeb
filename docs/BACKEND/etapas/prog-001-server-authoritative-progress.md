# PROG-001 — Progresso autoritativo no servidor

## Objetivo

Impedir que o cliente declare percentuais, módulos ou aulas concluídos. A API deve validar a ação de conclusão, persistir o evento no servidor e calcular o progresso retornado à interface.

## Contrato atualizado

- `GET /api/enrollments`: monta o progresso com os eventos da matrícula e as aulas publicadas do curso.
- `PUT /api/enrollments/{courseId}/progress`: atualiza apenas `currentLessonId`, depois de validar se a aula pertence ao curso publicado e tem `isPublished: true`.
- `POST /api/enrollments/{courseId}/lessons/{lessonId}/complete`: recebe a declaração de conclusão de uma aula; exige sessão, curso publicado, matrícula do usuário autenticado e aula publicada pertencente ao curso.
- `DELETE /api/enrollments/{courseId}`: remove a matrícula; os eventos relacionados são removidos pela FK com cascade.

O contrato de escrita não recebe `overallPercent`, `modulesProgress`, timestamps ou status de aula/módulo do cliente.

## Persistência e cálculo

A entidade `CourseLessonCompletion` grava `EnrollmentId`, `LessonId` e `CompletedAt` gerado por `DateTime.UtcNow`. A FK aponta para a matrícula e o índice único `(EnrollmentId, LessonId)` impede eventos duplicados inclusive em chamadas simultâneas.

`EnrollmentProgressProjector` lê a estrutura `modules[].lessons[]` do curso e considera somente aulas com `isPublished: true`. O percentual geral é concluídas / publicadas; percentual de módulo segue a mesma regra dentro do módulo. `CompletedAt` da matrícula só é preenchido quando todas as aulas publicadas têm evento.

Dados legados em `OverallPercent`, `CompletedAt` e `ModulesProgressJson` não são usados pelo projetor. Isso evita preservar registros de conclusão que poderiam ter sido forjados pelo contrato antigo. Matrículas antigas podem voltar a 0% até que o aluno registre novas conclusões válidas.

## Limite pedagógico e segurança

A ação do botão “Concluir aula” é uma autodeclaração. A API prova que o usuário matriculado registrou a conclusão de uma aula publicada, mas não que o navegador apresentou ou que o aluno leu cada bloco. Atualmente quiz/exercício não possui correção no backend.

Portanto, o percentual ainda não deve liberar certificado, conteúdo pago ou decisões de acesso de alto valor. Uma etapa futura precisa acrescentar tentativas de avaliação server-side, validação das respostas, pontuação e critérios de aprovação definidos pelo autor.

## Testes

O projeto `CorseWeb.ProgressTests` executa testes sem dependências externas de teste, cobrindo:

1. Ignorar percentual, data e status legados enviados pelo contrato antigo.
2. Considerar somente aulas publicadas na contagem.
3. Recusar aulas não publicadas ou IDs desconhecidos.
4. Calcular percentuais de curso e módulo com eventos persistidos.
5. Só marcar o curso completo depois da conclusão de todas as aulas publicadas.
6. Ignorar eventos pertencentes a outra matrícula.

Comandos:

```bash
dotnet run --project CorseWeb.ProgressTests/CorseWeb.ProgressTests.csproj --configuration Release
dotnet build CorseWeb.slnx --configuration Release
```

## Critérios ainda pendentes

- Validar a migration em banco SQLite vazio e num banco criado pela versão anterior.
- Testar endpoints com sessão real, matrícula de outro usuário, curso arquivado, IDs de aula desconhecidos e aula não publicada.
- Verificar repetição sequencial e concorrente de conclusão.
- Confirmar que telas de cursos/aluno exibem corretamente 0%, parcial e 100%.
- Criar avaliação de quiz/exercício no backend antes de usar conclusão como prova pedagógica.
