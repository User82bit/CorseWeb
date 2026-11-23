# FLOW-001 — Quiz com ramificação server-side

## Objetivo

Fazer com que o Quiz deixe de ser apenas um card visual. A resposta deve ser corrigida pelo backend, persistida na matrícula e determinar qual saída do grafo pode ser apresentada ao aluno.

## Escopo desta primeira fatia

- Um Quiz contém uma pergunta e uma lista de opções de texto.
- O aluno escolhe exatamente uma opção.
- `props.correctIndex` permanece no JSON de autoria e não é enviado nos DTOs públicos.
- O backend determina o resultado: acerto = aprovado (score 100, porta `success`); erro = reprovado (score 0, porta `failed`).
- Uma tentativa é persistida por matrícula, aula e ID do card Quiz.
- Repetir a mesma opção é idempotente. Enviar outra opção após o resultado retorna `409 Conflict`.
- Antes do resultado, os nós conectados às duas saídas permanecem ocultos no JSON público.
- Depois do resultado, somente o ramo escolhido é projetado para a matrícula atual.
- Quizzes encadeados dentro do ramo escolhido só ficam disponíveis quando o aluno alcança esse ponto.
- O backend rejeita tentativa HTTP direta em Quiz que esteja dentro de ramo não liberado.
- A aula não pode ser marcada como concluída enquanto existir Quiz alcançável ainda sem resultado.
- Cursos publicados e publicação de rascunho validam pergunta, pelo menos duas opções de texto não vazias e `correctIndex` dentro da lista.

## Persistência e API

Entidade: `CourseQuizAttempt`.

Índice único: `(EnrollmentId, LessonId, QuizNodeId)`. A FK para matrícula usa `ON DELETE CASCADE`.

Rota:

```http
POST /api/enrollments/{courseId}/lessons/{lessonId}/quizzes/{quizNodeId}/attempt
Content-Type: application/json

{
  "selectedOptionIndex": 0
}
```

A resposta contém a projeção de matrícula com `quizAttempts[]`. Cada resultado inclui aula, card, índice selecionado, correção, aprovação, score e timestamp do servidor.

A projeção de `GET /api/courses` e `GET /api/courses/{slug}` depende da matrícula do usuário autenticado. O cache/listagem do frontend é atualizado depois de uma resposta para receber apenas o ramo selecionado.

## Segurança e integridade

- O navegador não envia gabarito, score, status, nem qual ramo deve ser liberado.
- O backend valida curso publicado, aula publicada, matrícula do usuário, configuração do Quiz e alcançabilidade do card.
- O resultado é calculado com o gabarito do conteúdo mantido no banco.
- Tentativa em Quiz de ramo bloqueado retorna `404`; opção inválida retorna `400`; alteração de resposta já registrada retorna `409`.
- A resposta correta nunca é incluída na projeção pública de curso.
- Cancelar matrícula remove os resultados em cascata.

## Testes automatizados

A suíte HTTP com `WebApplicationFactory` e SQLite cobre:

1. Ocultar os dois ramos antes da primeira resposta.
2. Remover `correctIndex` do JSON público.
3. Corrigir uma resposta correta e liberar somente `success`.
4. Corrigir uma resposta incorreta e liberar somente `failed`.
5. Idempotência para mesma resposta e conflito para outra opção.
6. Impedir acesso direto a Quiz que ainda está em ramo não selecionado.
7. Liberar um segundo Quiz depois que o primeiro caminho o alcança.
8. Bloquear conclusão da aula enquanto algum Quiz alcançável não tiver resultado.
9. Validar estrutura de Quiz na publicação.
10. Verificar migração, índice único e exclusão em cascata no SQLite.

## Limitações conhecidas

Esta etapa não implementa Quiz com várias perguntas, seleção múltipla, nota mínima configurável, retentativas, limite de tempo, banco de questões ou feedback avançado. O resultado 100/0 é deliberadamente simples e não comprova domínio do conteúdo. Exercício ainda não executa nem verifica código; certificado continua sendo um card visual. A prévia do editor mostra o grafo completo para autoria e não simula as decisões do aluno.

## Aceite manual pendente

- Testar no navegador desktop e em um celular real.
- Confirmar que as respostas, mensagens de resultado e ramos selecionados ficam corretos após recarregar a aula.
- Confirmar o caminho aprovado e reprovado com pelo menos um Quiz encadeado.
- Confirmar que a prévia do editor continua mostrando o grafo completo.
- Revisar textos pt-BR, en e es.
