# CorseLight (CL) — especificação inicial da linguagem

- **Nome:** CorseLight
- **Identificador:** `CL`
- **Versão da especificação:** `0.1`
- **Estado:** proposta técnica em revisão; ainda não é um interpretador implementado.
- **Objetivo:** permitir que autores adicionem lógica pequena e previsível aos cursos, interpretada pelo backend do CorseWeb. CL não substitui os cards pedagógicos nem é JavaScript/C#.

## 1. Separação entre conteúdo e scripts

Os cards `heading`, `paragraph`, `list`, `image`, `video`, `code`, `quiz`, `exercise`, `callout`, `divider`, `embed` e `certificate` descrevem conteúdo que pode ser apresentado ao aluno. Um script CL é lógica interna do curso: **não deve ser renderizado como card, texto ou código na área do aluno**.

No formato lógico de exportação, scripts ficam na coleção raiz `scripts`, separada da coleção `modules` e das aulas:

```json
{
  "modules": [],
  "scripts": [
    {
      "id": "script-feedback-01",
      "name": "Feedback da atividade",
      "language": "CL",
      "languageVersion": "0.1",
      "trigger": "activity.submit",
      "enabled": true,
      "source": "on activity.submit { activity.feedback(\"Resposta registrada.\", \"info\"); }"
    }
  ]
}
```

Esse é o contrato-alvo da linguagem. No backend atual, o conteúdo persistido está concentrado em `ModulesJson`; uma coleção persistente `ScriptsJson`, DTOs correspondentes e o runtime ainda precisam ser implementados. Não considerar scripts CL executáveis só porque foram salvos ou importados.

## 2. Sintaxe da versão 0.1

Um arquivo CL contém um ou mais blocos de evento. Instruções usam chamadas nomeadas e terminam com ponto e vírgula. A condição aceita literais e expressões booleanas; `if/else` é o único controle de fluxo nesta versão.

```cl
on activity.submit {
  if (activity.isCorrect()) {
    activity.setScore(100);
    activity.feedback("Muito bem!", "success");
  } else {
    activity.setScore(0);
    activity.feedback("Tente novamente.", "warning");
    activity.allowRetry(true);
  }
}
```

### Eventos permitidos

| Evento | Momento |
|---|---|
| `lesson.start` | Quando o aluno abre/inicia uma aula |
| `lesson.finish` | Quando a conclusão da aula está sendo processada |
| `activity.submit` | Quando uma resposta de atividade é enviada |
| `activity.retry` | Quando o aluno solicita uma nova tentativa |

Eventos não listados são rejeitados pelo validador. Um script pode declarar apenas eventos que o backend realmente envia.

### Tipos de valor

A versão 0.1 trabalha com `string`, `number` finito, `boolean` e `null`. Chaves de estado são strings curtas. Arrays, objetos livres, funções definidas pelo autor e coerção implícita de tipos não fazem parte desta versão.

## 3. Funções permitidas

As chamadas abaixo formam a lista inicial de funções nativas. O backend deve usar um registro explícito de funções permitidas; não deve resolver nomes arbitrários por reflexão.

### Contexto — somente leitura

| Função | Retorno | Regra |
|---|---|---|
| `context.get(key)` | valor primitivo ou `null` | Só aceita `course.id`, `lesson.id`, `activity.id`, `event.name` e `student.locale`. Não expõe e-mail, credenciais, tokens ou identificadores privados do aluno. |

### Estado privado do script

| Função | Retorno | Regra |
|---|---|---|
| `state.get(key)` | valor primitivo ou `null` | Lê uma chave do estado pertencente ao aluno, inscrição, curso e script atuais. |
| `state.set(key, value)` | `null` | Grava apenas tipos primitivos. O backend aplica limites de tamanho e quantidade de chaves. |
| `state.reset(key)` | `null` | Remove a chave atual; não apaga estados de outros scripts nem de outros alunos. |

O runtime deve isolar o estado por aluno e inscrição. Um script nunca pode ler ou modificar o estado de outro aluno.

### Atividades

| Função | Retorno | Regra |
|---|---|---|
| `activity.getAnswer()` | valor primitivo ou `null` | Lê a resposta enviada para a atividade que disparou o evento. |
| `activity.isCorrect()` | `boolean` | O servidor calcula o resultado a partir da configuração confiável da atividade; não confia em um booleano enviado pelo cliente. |
| `activity.setScore(value)` | `null` | Define a pontuação da tentativa atual; aceita número finito entre 0 e 100. O backend valida a atividade e persiste o resultado. |
| `activity.feedback(message, tone)` | `null` | Solicita que o cliente apresente texto simples com tom `info`, `success`, `warning` ou `error`. Não aceita HTML. |
| `activity.allowRetry(enabled)` | `null` | Permite ou bloqueia nova tentativa para a resposta atual. O servidor continua sendo a autoridade sobre o limite de tentativas. |

### Conteúdo dinâmico da aula

| Função | Retorno | Regra |
|---|---|---|
| `content.show(nodeId)` | `null` | Solicita mostrar um nó de conteúdo da aula atual. |
| `content.hide(nodeId)` | `null` | Solicita ocultar um nó de conteúdo da aula atual; não pode ocultar componentes de segurança ou navegação do sistema. |
| `content.setText(nodeId, text)` | `null` | Altera somente o campo textual autorizado de um nó compatível. Não pode injetar HTML, CSS ou executar código. |

O backend valida que todo `nodeId` pertence à aula atual e a um tipo de conteúdo modificável. As chamadas `content.*` produzem efeitos estruturados que o cliente aplica à apresentação; o script não acessa DOM ou componentes React diretamente.

## 4. Expressões e limites

A v0.1 permite chamadas nativas, literais e os operadores `==`, `!=`, `<`, `<=`, `>`, `>=`, `&&`, `||` e `!`, respeitando os tipos. O controle de fluxo é apenas `if/else`.

Limites iniciais recomendados para o validador:

- código-fonte com no máximo 16 KiB UTF-8;
- até 1.000 nós de sintaxe (AST);
- profundidade máxima de blocos/condições: 16;
- até 256 chamadas nativas por disparo de evento;
- tamanho máximo de texto emitido: 4 KiB por valor.

Como não há laços, recursão nem funções definidas pelo autor, cada execução tem um número finito e limitado de instruções. Os limites devem ser constantes de configuração testadas, e não valores controláveis pelo script.

## 5. O que CL explicitamente não permite

- JavaScript, C#, Roslyn scripting, `eval` ou execução de código nativo;
- `import`, carregamento dinâmico, definição de funções/classes ou recursão;
- laços `for`/`while` ou qualquer mecanismo de repetição ilimitada;
- rede, filesystem, processos do sistema, variáveis de ambiente, relógio do sistema ou acesso direto ao banco;
- SQL, reflexão, chamadas a métodos arbitrários ou acesso a serviços internos;
- HTML/CSS/JavaScript cru, manipulação direta do DOM ou leitura de dados privados de outros alunos;
- marcar uma aula como concluída, editar a estrutura publicada do curso ou contornar permissões/progresso.

## 6. Contrato de execução no backend

1. O backend carrega apenas scripts habilitados cuja versão de linguagem seja suportada e cujo autor tenha permissão para modificar o curso.
2. Ao salvar/publicar, o código passa por análise léxica/sintática, validação de evento, função, tipos, IDs e limites. Erros impedem publicação/ativação.
3. No evento, o runtime interpreta uma AST própria e invoca exclusivamente as funções do catálogo acima. Não compila a fonte como outra linguagem.
4. Os efeitos são acumulados numa transação temporária. Se houver erro de execução, descartar efeitos parciais e registrar detalhes técnicos apenas no log do servidor.
5. O resultado é um DTO de efeitos limitado e validado, nunca uma instrução executável enviada pelo servidor ao navegador.
6. A resposta correta, notas, limites de tentativas e progresso são calculados/validados no servidor. A interface não recebe gabarito por executar CL.
7. Scripts não devem rodar em listagens/catálogos de cursos; só em eventos autenticados e autorizados da aula/atividade correspondente.

## 7. Itens que seguem pendentes

- adicionar a coleção raiz `scripts` ao contrato frontend/API e persistência de cursos/rascunhos;
- implementar validação e interpretador CL em C# com testes unitários para sintaxe, permissões, tipos e limites;
- ligar os eventos às aulas e atividades e devolver efeitos no contrato da API;
- criar editor/diagnóstico de scripts e impedir publicação de scripts inválidos;
- validar migração, isolamento por aluno, tentativas concorrentes e compatibilidade de cursos existentes.

Até esses itens serem concluídos, CL v0.1 é uma especificação inicial e scripts não são executados.
