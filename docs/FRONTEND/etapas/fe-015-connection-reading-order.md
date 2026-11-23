# FE-015 — ordem de leitura derivada das conexões

## Problema observado

O canvas mostrava um grafo com um fluxo explícito, mas a prévia do editor e a página do aluno exibiam os cards pela propriedade `order` e pelo fallback espacial `y/x`. Assim, a sequência lida não correspondia às ligações desenhadas.

## Regra de apresentação

- O percurso começa nos nós `start`.
- O renderizador percorre as conexões em profundidade (depth-first).
- Quando um nó possui várias saídas, a ordem é a ordem declarada em `outputs[]`; no Quiz, Aprovado (`success`) vem antes de Reprovado (`failed`).
- Um nó é adicionado à sequência no máximo uma vez, mesmo se houver ciclos ou caminhos convergentes.
- Nós desconectados, ligações inválidas ou conteúdo legado que não seja alcançável são acrescentados depois, usando `order` e depois `y/x` como fallback. Conteúdo não é descartado silenciosamente.
- Dentro de containers, a ordenação entre irmãos usa a mesma sequência derivada do grafo.
- O marcador `start` continua oculto na apresentação ao aluno.

## Implementação

- `lessonFlow.ts` centraliza a linearização do grafo e o fallback.
- `LessonContentRenderer.tsx` recebe `nodes` e `connections`, compartilhado pela prévia e página do aluno.
- `LessonEditorPage.tsx` passa as conexões da aula ativa para a prévia.
- `AppLessonPage.tsx` usa a mesma ordenação para determinar conteúdo vazio e renderiza com as conexões persistidas.
- O contrato arquitetural esclarece que a linearização é somente apresentação.

## Semântica das ramificações

A prévia e a aula mostram os ramos sequencialmente: primeiro o percurso Aprovado, depois o Reprovado, conforme a ordem das portas. Isso resolve a ordem visual de leitura, mas não significa que o aluno percorra os dois caminhos em execução. Avaliação de Quiz, seleção de ramo, bloqueio/liberação de nós e progresso condicional continuam pertencendo à futura etapa FLOW-001.

## Testes

1. Reproduz o cenário informado com os nós inseridos em ordem diferente do grafo.
2. Verifica a ordem de saídas do Quiz mesmo quando as conexões foram gravadas em outra sequência.
3. Verifica fallback de nós desconectados/legados.
4. Verifica que ciclos e caminhos duplicados não duplicam nós.

## Validação pendente

- CI: lint, testes de idioma, hierarquia, fluxo, build frontend e build/testes .NET.
- Revisão visual da prévia e página do aluno com o grafo do exemplo.
- Validar conteúdo com containers e caminhos convergentes.
- Aceite do proprietário.
