# FLOW-002 — Exercício com correção textual e ramificação server-side

## Objetivo

Permitir que o card Exercise receba uma resposta do aluno, registre o resultado no servidor e libere somente a saída escolhida no grafo.

## Contrato existente no editor

O card usa os campos de autoria `instruction`, `starterCode` e `solution`. A solução é uma referência privada preenchida pelo autor. Os novos cards Exercise criados pelo editor recebem as portas `success` (Aprovado) e `failed` (Reprovado).

## Avaliação da primeira versão

O aluno envia uma string `answer` com no máximo 20.000 caracteres. O backend compara a resposta com `props.solution` após converter CRLF/CR para LF, remover espaços e tabs no fim de cada linha e aparar espaços e quebras de linha nas extremidades da resposta.

A comparação é ordinal e sensível a maiúsculas/minúsculas, indentação e espaços internos. Não há compilador, interpretador nem execução do código do aluno. Uma solução equivalente com formatação ou estrutura diferente pode ser avaliada como incorreta. A resposta enviada pelo aluno não é devolvida no DTO público da matrícula.

Correspondência produz `isCorrect=true`, `passed=true`, score 100 e saída `success`. Não correspondência produz `isCorrect=false`, `passed=false`, score 0 e saída `failed`.

Uma tentativa é persistida por matrícula, aula e card Exercise. Reenviar a mesma resposta normalizada é idempotente; uma resposta diferente após o registro retorna `409 Conflict`.

## API e persistência

Rota autenticada: `POST /api/enrollments/{courseId}/lessons/{lessonId}/exercises/{exerciseNodeId}/attempt`.

Corpo JSON: `{ "answer": "print(\"Olá CorseWeb\")" }`.

Entidade: `CourseExerciseAttempt`. Índice único: `(EnrollmentId, LessonId, ExerciseNodeId)`. A FK para matrícula usa `ON DELETE CASCADE`.

O DTO de matrícula inclui `exerciseAttempts[]` com aula, card, resultado, score e timestamp. A resposta submetida permanece privada.

## Segurança e integridade

- O navegador não envia `passed`, score ou a saída que deseja liberar.
- O backend valida curso publicado, matrícula do usuário, exercício em aula publicada, alcance atual no grafo, resposta não vazia e limite de tamanho.
- A solução de referência permanece no JSON do curso armazenado no servidor e é removida das propriedades enviadas ao aluno.
- Tentativas em Exercises de ramos bloqueados retornam `404`.
- A conclusão da aula exige resultado para todos os Quizzes e Exercises atualmente alcançáveis no caminho selecionado.
- O código enviado nunca é executado nem compilado. Essa correção não comprova que o programa funciona ou é semanticamente equivalente.

## Testes automatizados adicionados

A suíte `WebApplicationFactory` + SQLite cobre validação de Exercise com instrução e solução de referência, rejeição de Exercise publicado sem solução, submissão vazia, resposta correta com score 100 e liberação de `success`, resposta incorreta com score 0 e liberação de `failed`, ocultação de `solution`, idempotência e conflito, Exercise em ramo bloqueado, integração com Quiz encadeado, conclusão da aula após todas as atividades alcançáveis, migração SQLite, índice único e exclusão em cascata.

## Limitações conhecidas

Esta é uma correção literal por comparação textual, não execução de código. Não há avaliação de AST, testes ocultos, sandbox, linguagens selecionáveis, múltiplos casos de teste, retentativas, nota parcial, nota mínima configurável ou feedback por linha. Cada Exercise aceita uma tentativa por matrícula/aula/card. Exercícios legados com porta única `complete` não ganham ramificação automaticamente; os novos cards criados no editor usam `success`/`failed`.

## Aceite manual pendente

- Testar o exercício no navegador desktop e em celular.
- Verificar o texto inicial, envio, resultado, ramo correto e atualização depois de recarregar.
- Testar um caminho Quiz → Exercise → próximo card e outro de reprovação.
- Confirmar que a prévia do editor continua exibindo todos os ramos.
- Revisar mensagens pt-BR/en/es e acessibilidade do textarea.
