# CorseLight (CL) — especificação técnica v0.1

- **Nome:** CorseLight
- **Identificador:** `CL`
- **Versão da linguagem:** `0.1`
- **Versão deste documento:** `0.1-approved`
- **Estado:** contrato aprovado pelo proprietário e integrado em `Homologa` pela PR #52. A implementação CL-002 está em andamento na branch `feature/cl-002-corselight-runtime`; runtime ainda não integrado à branch-base.
- **Objetivo:** permitir lógica pequena, determinística e limitada nos cursos, interpretada pelo backend do CorseWeb.
- **Fora do objetivo:** transformar CL em linguagem geral, executar código arbitrário ou permitir que scripts controlem autenticação, autorização, navegação de segurança ou conclusão por conta própria.

Este contrato fecha sintaxe, valores, eventos, funções, efeitos, armazenamento, isolamento e limites necessários à implementação. A aprovação da especificação não significa, por si só, que a implementação esteja concluída ou disponível em produção.

## 1. Princípios obrigatórios

1. **Interpretada por AST própria:** a fonte CL nunca é compilada ou executada como JavaScript, C#, Roslyn, PowerShell, SQL ou código nativo.
2. **Allowlist fechada:** somente eventos, operadores e funções descritos neste documento são válidos. O runtime não resolve métodos arbitrários por nome, reflexão ou acesso dinâmico a serviços.
3. **Servidor como autoridade:** o backend valida sessão, propriedade, matrícula, aula publicada, atividade alcançável, resposta e resultado. Um script não pode conceder permissões nem falsificar dados enviados pelo cliente.
4. **Escopo por aluno e matrícula:** o estado persiste por matrícula e script ao longo do curso; os efeitos ficam limitados à matrícula, aula, evento e script. Um aluno nunca lê nem altera dados de outro.
5. **Sem efeitos parciais dentro de um script:** se uma invocação falhar, descarta seus writes e efeitos; scripts seguintes ainda podem ser executados.
6. **Saída declarativa:** o runtime devolve dados de efeito tipados. O script não recebe DOM, React, HTML, CSS, filesystem, rede ou acesso direto ao banco.
7. **Sem execução em catálogo:** scripts só são avaliados em eventos autenticados de uma matrícula e curso publicados, nunca ao listar ou visualizar um catálogo público.

## 2. Separação entre conteúdo e scripts

Cards pedagógicos descrevem conteúdo. Script CL é lógica interna e não é um card:

`heading`, `paragraph`, `list`, `image`, `video`, `code`, `quiz`, `exercise`, `callout`, `divider`, `embed` e `certificate`.

O formato lógico de curso terá uma coleção raiz `scripts[]`, irmã de `modules[]`:

```json
{
  "modules": [],
  "scripts": [
    {
      "id": "script-feedback-01",
      "name": "Feedback de envio",
      "language": "CL",
      "languageVersion": "0.1",
      "enabled": true,
      "source": "on activity.submit { activity.feedback(\"Resposta registrada.\", \"info\"); }"
    }
  ]
}
```

Contrato de dados:

- `id` é obrigatório, único dentro do curso e estável entre atualizações do script.
- `name` é um rótulo de autoria; não é identificador nem chamada de função.
- `language` deve ser exatamente `CL`; `languageVersion` deve ser uma versão suportada.
- `enabled` controla execução, não validação. Scripts desabilitados também precisam ser sintaticamente válidos antes da publicação.
- `source` contém um ou mais blocos `on event { ... }`. Não há campo `trigger` separado: os eventos são derivados da própria fonte para evitar divergência entre metadados e código.
- Não persistir scripts dentro de `modules[]`, `nodes[]` ou propriedades de cards.
- A evolução do backend deve acrescentar persistência própria `ScriptsJson` em `Course` e `CourseDraft`, DTOs de autoria, mapeamento de criação/atualização/publicação e snapshots de versão. Curso antigo sem scripts equivale a `scripts: []`.
- O DTO de autor/proprietário/admin pode receber `scripts[]`; o DTO público/do aluno nunca inclui fonte, AST, diagnostics privados ou estado de scripts.
- Alterações em scripts fazem parte da versão e do snapshot imutável de `CourseVersion`, assim como módulos e aulas.

O editor visual CL e o editor de código não fazem parte do CL-002; serão uma entrega separada. A persistência e a API de autoria de `scripts[]` estão sendo implementadas na branch CL-002, sem incluir uma interface de edição nesta entrega.

## 3. Sintaxe e gramática

Um programa contém um ou mais blocos de evento. Cada script pode declarar vários eventos, mas cada evento aparece no máximo uma vez no mesmo script.

```cl
on activity.submit {
  if (activity.isCorrect()) {
    activity.feedback("Muito bem!", "success");
    state.set("submissions", 1);
  } else {
    activity.feedback("Confira sua resposta.", "warning");
  }
}

on lesson.finish {
  state.set("lesson-finished", true);
}
```

### Gramática normativa (EBNF simplificada)

```ebnf
program       = event_block, { event_block } ;
event_block   = "on", event_name, block ;
event_name    = "lesson.start" | "lesson.finish" | "activity.submit" ;
block         = "{", { statement }, "}" ;
statement     = native_call, ";" | if_statement ;
if_statement  = "if", "(", expression, ")", block, [ "else", block ] ;
native_call   = native_name, "(", [ argument_list ], ")" ;
native_name   = identifier, { ".", identifier } ;
argument_list = expression, { ",", expression } ;
expression    = or_expression ;
```

A precedência das expressões, da maior para a menor, é:

1. chamada nativa e parênteses;
2. operador unário `!`;
3. comparação `<`, `<=`, `>`, `>=`;
4. igualdade `==`, `!=`;
5. AND `&&`;
6. OR `||`.

Os operadores binários são avaliados da esquerda para a direita dentro do mesmo nível. `&&` e `||` usam curto-circuito. Não há atribuição, variáveis locais, declaração de função, indexação, acesso a propriedades, ternário, concatenação, operadores aritméticos ou loops na v0.1.

### Identificadores e literais

- Identificadores: `[A-Za-z_][A-Za-z0-9_]*`. Nomes de evento e nomes de função são case-sensitive.
- Strings usam aspas duplas e escapes JSON: `\\`, `\"`, `\n`, `\r`, `\t` e `\uXXXX`. Strings são Unicode e comparadas por igualdade ordinal, sensível a maiúsculas.
- Números usam formato decimal invariável (ponto como separador), opcionalmente com sinal e expoente. Devem resultar em número finito; NaN e infinito são inválidos.
- Booleanos: `true` e `false`. Nulo: `null`.
- Comentários de linha `// ...` são permitidos. Comentários de bloco não fazem parte da v0.1.
- Separadores decimais regionais, aspas simples e escapes não listados são inválidos.

### Tipos e coerção

CL possui somente `string`, `number`, `boolean` e `null`. Não há coerção implícita.

- Condições de `if`, `&&`, `||` e `!` exigem boolean.
- `<`, `<=`, `>` e `>=` exigem dois números.
- `==` e `!=` comparam valores primitivos do mesmo tipo; `null` só é igual a `null`.
- Quando uma função retorna valor dinâmico (por exemplo, `state.get`), o runtime verifica o tipo antes da operação. Tipo incompatível gera erro daquela invocação, sem coerção silenciosa.
- `if` avalia somente o bloco selecionado; blocos não selecionados não executam chamadas nem produzem efeitos.

## 4. Eventos suportados na v0.1

| Evento | Momento exato | Frequência e requisitos |
|---|---|---|
| `lesson.start` | Após o servidor autenticar o aluno, confirmar matrícula e validar a aula publicada/acessível, quando a matrícula entra naquela aula pela primeira vez | Uma vez por matrícula/aula. Recarregar a página não reexecuta |
| `lesson.finish` | Durante `POST .../lessons/{lessonId}/complete`, depois das verificações de acesso e de todas as atividades alcançáveis respondidas, antes de persistir a conclusão | Uma vez por matrícula/aula |
| `activity.submit` | Depois que o backend aceita e avalia uma resposta de Quiz/Exercise alcançável, com resposta e `isCorrect` já calculados no servidor | Uma vez por envio aceito. Na implementação atual há uma tentativa por matrícula/aula/card |

Semântica adicional:

- O evento é disparado pelo fluxo autenticado do backend, não por um nome de evento enviado livremente pelo navegador.
- Para `lesson.start`, a transição de aula atual e a invocação de scripts precisam ser idempotentes mesmo quando `PUT .../progress` é repetido.
- Para `lesson.finish`, a conclusão normal da aula continua sob autoridade do endpoint existente. Script não pode marcar outra aula como concluída, pular a validação de atividades nem alterar o percentual.
- Para `activity.submit`, o resultado confiável é calculado antes da execução CL. `activity.isCorrect()` lê esse resultado. A lógica CL não pode substituir o gabarito ou o resultado base.
- `activity.retry` está **fora da v0.1**: FLOW-001/FLOW-002 persistem uma tentativa única e não existe política de retentativa implementada. A introdução futura desse evento depende de uma especificação de tentativas, limites e persistência próprios.
- O backend deve tratar a reexecução do mesmo evento como idempotente, usando identidade de evento gerada no servidor e registro persistido da invocação.

## 5. Funções nativas permitidas

O runtime deve usar um registro explícito de funções com validação de nome, quantidade e tipo dos argumentos. O nome de uma função não pode ser resolvido por reflexão.

### 5.1 Contexto — somente leitura

| Função | Assinatura | Disponibilidade |
|---|---|---|
| `context.get(key)` | `string -> string/number/boolean/null` | Qualquer evento |

Chaves permitidas, exclusivamente:

- `course.id`
- `lesson.id`
- `activity.id` (somente `activity.submit`)
- `event.name`
- `student.locale`

A chave deve ser literal conhecida no momento da validação. Qualquer outra chave é erro de validação. Não expor e-mail, nome civil, tokens, cookies, IP, identificadores privados do usuário, credenciais ou dados de outros alunos.

### 5.2 Estado privado por script

| Função | Assinatura | Retorno |
|---|---|---|
| `state.get(key)` | `string -> primitive/null` | valor armazenado ou `null` |
| `state.set(key, value)` | `string, primitive -> null` | nenhum |
| `state.reset(key)` | `string -> null` | nenhum |

Regras:

- Chaves são strings literais, de 1 a 64 bytes UTF-8.
- O estado é isolado por matrícula e script; chaves iguais em scripts diferentes não colidem.
- Valores são apenas string, number finito, boolean ou null. Objetos/arrays não são aceitos.
- Uma string de estado pode ter até 4 KiB UTF-8. Cada script pode manter até 64 chaves e 64 KiB serializados por matrícula.
- O runtime persiste o valor como JSON tipado; não usa uma string sem tipo que possa confundir `"1"`, `1` e `true`.
- Ler chave inexistente retorna null; reset de chave inexistente é idempotente.

### 5.3 Atividade

| Função | Assinatura | Retorno | Disponibilidade |
|---|---|---|---|
| `activity.getAnswer()` | sem argumentos | string/number/boolean/null | `activity.submit` |
| `activity.isCorrect()` | sem argumentos | boolean | `activity.submit` |
| `activity.feedback(message, tone)` | `string, string -> null` | nenhum | `activity.submit`, `lesson.finish` |

Regras:

- `getAnswer()` retorna a resposta tipada enviada para a atividade que disparou o evento: índice escolhido (number) no Quiz ou texto (string) no Exercise. Não retorna gabarito, solução de referência nem dados de outras tentativas.
- `isCorrect()` lê somente o resultado calculado pelo avaliador confiável do servidor. Não pode ser chamado em `lesson.start`/ `lesson.finish`.
- `feedback` aceita texto simples até 1 KiB UTF-8 e tom `info`, `success`, `warning` ou `error`. A saída é tratada como texto, nunca HTML/Markdown interpretável.
- `activity.setScore` e `activity.allowRetry` **não fazem parte da v0.1**. A pontuação atual de Quiz/Exercise e as portas `success`/`failed` são calculadas pelo backend, enquanto tentativas são únicas. Permitir override ou retentativa antes de definir precedência, nota de aprovação, tentativas máximas e persistência quebraria esse contrato.

### 5.4 Apresentação do conteúdo

| Função | Assinatura | Retorno |
|---|---|---|
| `content.show(nodeId)` | `string -> null` | nenhum |
| `content.hide(nodeId)` | `string -> null` | nenhum |
| `content.setText(nodeId, field, text)` | `string, string, string -> null` | nenhum |

Regras:

- `nodeId` e `field` devem ser strings literais na v0.1.
- O nó-alvo precisa pertencer à mesma aula publicada do evento.
- `show`/`hide` somente podem atuar em nós de conteúdo passivo: `heading`, `paragraph`, `list`, `image`, `video`, `code`, `callout`, `divider` e `embed`.
- `show`/`hide` não podem atuar sobre `start`, `container`, `quiz`, `exercise`, `certificate`, navegação ou controles de segurança. Não alteram conexões, ordem do grafo, acesso à atividade ou elegibilidade de conclusão.
- `setText` é limitado a: `heading.content`, `paragraph.content`, `callout.title` e `callout.content`. Campo incompatível com o tipo de nó é erro.
- Texto dinâmico tem limite de 4 KiB UTF-8 por valor e é renderizado como texto escapado. Não altera o JSON publicado, não injeta HTML/CSS e vale somente para a matrícula/evento atual.
- Os efeitos são aplicados depois da projeção de segurança do backend; não podem reexibir ramos bloqueados nem remover avisos obrigatórios do sistema.

## 6. Efeitos e persistência de execução

Cada invocação produz um resultado declarativo com as listas abaixo; listas vazias são omitidas:

```json
{
  "feedback": [{ "message": "Muito bem!", "tone": "success" }],
  "nodeVisibility": [{ "nodeId": "extra-tip", "visible": true }],
  "nodeText": [{ "nodeId": "lesson-summary", "field": "content", "value": "Resumo personalizado." }]
}
```

- Os efeitos pertencem à matrícula/evento e são devolvidos no DTO do aluno daquela matrícula. Nunca modificam o conteúdo oficial do curso.
- Para que os efeitos continuem iguais após refresh, a implementação deve persistir o resultado da invocação, não apenas devolvê-lo uma vez.
- A execução deve ter uma identidade de evento gerada pelo backend. Uma chave única por matrícula/aula/evento/origem/script impede repetir efeitos no mesmo evento.
- Os scripts habilitados são executados em ordem de sua posição em `scripts[]`; dentro de cada script, chamadas são avaliadas em ordem de fonte. A ordem é determinística e faz parte do contrato.
- Cada script tem estado separado. Se uma invocação falhar, seus writes e efeitos são descartados; registra-se diagnóstico técnico no servidor e o próximo script é executado. Erro CL não deve converter uma resposta válida em falha de Quiz/Exercise nem impedir a conclusão que já passou nas regras de negócio.
- Erro de infraestrutura/persistência do próprio evento continua sendo erro da API e não deve ser escondido como erro de script.
- A implementação deve persistir estado e invocação em tabelas próprias (por exemplo, `CourseScriptStates` e `CourseScriptExecutions`), com unicidade por matrícula/script/chave e matrícula/aula/evento/origem/script, transações e isolamento entre matrículas.
- A remoção da matrícula remove o estado e os resultados de execução correspondentes em cascata. O histórico de versão do curso não inclui estado de aluno.

## 7. Limites obrigatórios

| Recurso | Limite v0.1 |
|---|---:|
| Scripts por curso | 100 |
| Fonte por script | 16 KiB UTF-8 |
| Nós de AST por script | 1.000 |
| Profundidade de blocos/condições | 16 |
| Invocações nativas por script/evento | 256 |
| Scripts habilitados executados por evento | 16 |
| Efeitos agregados por evento | 64 |
| Payload total de efeitos por evento | 16 KiB UTF-8 |
| Texto de feedback ou texto dinâmico | 1 KiB para feedback; 4 KiB para `content.setText` |
| Estado por chave | 4 KiB serializado |
| Chaves por script/matrícula | 64 |
| Estado total por script/matrícula | 64 KiB |

Os limites são constantes do servidor, testadas e não configuráveis pelo script ou pelo cliente. O contador de instruções aumenta a cada operação AST e chamada nativa; exceder qualquer limite aborta aquela invocação. Não há loop, recursão, função definida pelo autor, espera, timer, rede ou operação de I/O.

## 8. Validação, publicação e diagnósticos

### Validação estrutural

- A coleção deve ser um array; `null` ou ausência é normalizado para `[]` em cursos legados.
- `id` não vazio e único no curso; `name` limitado a 120 caracteres; `language` e `languageVersion` devem corresponder ao runtime disponível; `enabled` boolean; `source` string.
- Cada script deve respeitar o limite de bytes e o limite de quantidade.
- Eventos repetidos dentro do mesmo script são inválidos.
- Chamada desconhecida, evento desconhecido, aridade incorreta, tipo conhecido incompatível, função em evento não permitido, ID de nó inexistente/incompatível ou limite ultrapassado impedem publicação.

### Salvar e publicar

- Rascunho pode armazenar fonte ainda inválida para permitir correção pelo autor, mas a API deve devolver diagnostics de validação; nunca executa o conteúdo enquanto inválido.
- Toda publicação valida todos os scripts, inclusive os desabilitados, para não deixar código inválido latente que possa ser habilitado depois.
- Curso criado diretamente como publicado e atualização de conteúdo publicado seguem a mesma validação.
- O backend é a autoridade final. Validação apenas no frontend não é suficiente.
- Apenas proprietário do curso e admin podem editar scripts. A sessão do aluno nunca pode enviar nem ativar fonte CL.

### Diagnósticos

Um diagnóstico deve ter pelo menos:

```json
{
  "code": "CL_UNKNOWN_FUNCTION",
  "message": "A função informada não existe na versão 0.1.",
  "line": 3,
  "column": 5,
  "endLine": 3,
  "endColumn": 24,
  "severity": "error"
}
```

- Linha/coluna começam em 1 e contam posições Unicode de modo consistente no editor.
- Mensagens não devem incluir valores privados de contexto, respostas de outros alunos ou secrets.
- Diagnósticos de sintaxe/semântica impedem publicação; diagnostics internos de runtime não devem ser devolvidos a outros alunos.
- O backend registra código de erro e script/evento envolvidos sem registrar tokens, dados de autenticação ou conteúdo sensível desnecessário.

## 9. O que CL explicitamente não permite

- JavaScript, C#, Roslyn scripting, `eval`, execução de código nativo ou shell;
- `import`, carregamento dinâmico, definição de funções/classes, reflexão ou resolução arbitrária de métodos;
- loops, recursão, async/await, promises, timers ou execução concorrente controlada pelo script;
- rede, filesystem, processos do sistema, variáveis de ambiente, relógio do sistema ou acesso direto ao banco;
- SQL, chamadas a serviços internos, manipulação direta do DOM, React, HTML, CSS ou JavaScript;
- acesso a e-mail, credenciais, tokens, cookies, IP ou dados privados de outros alunos;
- marcar aulas como concluídas, alterar matrícula, liberar ramos de Quiz/Exercise, alterar gabaritos, pontuação-base, tentativas máximas ou permissões;
- mudar a estrutura publicada do curso ou executar scripts em listagens/catálogos públicos.

## 10. Sequência de execução no backend

Para cada evento:

1. autenticar e autorizar a operação normal do aluno;
2. validar curso publicado, matrícula, aula publicada e atividade alcançável quando aplicável;
3. calcular o resultado confiável da atividade antes de `activity.submit`;
4. selecionar scripts habilitados que declaram o evento, pela ordem original de `scripts[]`;
5. verificar se aquela invocação já foi processada; se sim, reutilizar resultado persistido;
6. executar cada script na AST, com contexto reduzido e registro nativo allowlisted;
7. validar cada efeito, limite e estado antes de persistir;
8. persistir estado e resultado de execução de forma atômica por script;
9. persistir o evento principal de Quiz/Exercise ou conclusão conforme as regras existentes;
10. devolver somente efeitos autorizados ao DTO daquela matrícula.

O fluxo real deve garantir uma unidade transacional coerente entre o evento principal e os resultados CL. Se uma falha de banco impedir persistência, não retornar sucesso parcial. Se apenas um script falhar por erro de linguagem/limite, descartar seus efeitos, registrar o erro e continuar o evento principal conforme os passos acima.

## 11. Testes obrigatórios para CL-002

### Lexer/parser
- todos os eventos permitidos e evento desconhecido;
- strings/escapes, números finitos, boolean/null e comentários;
- precedência e associatividade de todos os operadores;
- blocos aninhados, `if/else` e várias instruções;
- rejeição de loops, atribuição, declaração de função, propriedade/indexação, sintaxe incompleta e trailing tokens;
- limites de fonte, AST e profundidade; diagnostics com linha/coluna.

### Semântica e funções
- nome de função, evento, aridade e tipos permitidos;
- funções de atividade em evento indevido;
- chave `context.get` fora da allowlist;
- IDs e campos de nó inexistentes/incompatíveis;
- ausência de coerção e erros de tipo dinâmico;
- proibição de `setScore`, `allowRetry` e `activity.retry` na v0.1.

### Runtime e persistência
- execução determinística pela ordem do array e da fonte;
- curto-circuito de condições;
- isolamento de estado entre alunos, matrículas e scripts;
- isolamento de falha: efeitos parciais de um script são descartados e os próximos continuam;
- idempotência em refresh/repetição de evento e chamadas concorrentes;
- persistência/replay dos efeitos após reload;
- exclusão em cascata do estado ao cancelar matrícula;
- scripts não aparecem em nenhum DTO público do aluno;
- controles CL não reabrem ramos bloqueados nem alteram gabarito/conclusão;
- limites de estado, instruções, scripts por evento e efeitos agregados.

## 12. Dependências e fora de escopo

**CL-001 (concluída):** contrato aceito e integrado em `Homologa` pela PR #52. Os critérios de aceite desta seção foram confirmados.

**CL-002 (em andamento):** a branch `feature/cl-002-corselight-runtime` adiciona `ScriptsJson` em curso/rascunho e DTOs de autoria, parser/AST, validador semântico, runtime tipado e limitado, persistência de estado/execução, ledger idempotente, integração dos três eventos, projeção segura dos efeitos no aluno, migração SQLite e testes. A entrega permanece em validação de CI e revisão; não deve ser tratada como integrada até o merge explícito.

**Futuro, depois da v0.1:** editor/diagnóstico visual, retry policy, alteração de pontuação, múltiplas tentativas, loops controlados (se algum dia forem necessários), funções definidas pelo autor, funções de tempo/rede e recursos de integração externa. Nenhum desses itens deve entrar silenciosamente na implementação v0.1.

## 13. Critérios de aceite da especificação

- [x] O proprietário aceita a gramática e os operadores.
- [x] O proprietário aceita o conjunto inicial de três eventos e os momentos de disparo.
- [x] O proprietário aceita que score override e retry fiquem fora da v0.1.
- [x] O proprietário aceita os efeitos permitidos e suas restrições.
- [x] O proprietário aceita os limites de fonte, AST, instruções, estado e efeitos.
- [x] O proprietário aceita a coleção raiz `scripts[]` e sua separação da resposta pública de aluno.

A especificação foi aceita e é o contrato normativo do CL-002. Somente a implementação publicada, validada e integrada poderá executar scripts; a branch em desenvolvimento ainda depende de CI e revisão antes da integração.
