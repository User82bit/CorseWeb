# Modelo de conteúdo e editor visual

## 1. Hierarquia

O conteúdo segue esta hierarquia:

```text
Course
└── modules[]
    └── lessons[]
        ├── nodes[]
        └── connections[]
```

Um curso contém módulos; cada módulo contém aulas. Na versão atual da branch `Homologa`, uma aula não usa mais `blocks[]`/`elements[]` como contrato de autoria. Ela armazena nós posicionados e conexões direcionadas.

## 2. Estrutura de uma aula

### `nodes[]`

Cada nó possui:

| Campo | Tipo / significado |
|---|---|
| `id` | Identificador único da instância |
| `type` | Tipo pedagógico ou de controle |
| `x`, `y` | Posição no canvas do editor |
| `width`, `height` | Dimensões do card no canvas |
| `props` | Conteúdo e propriedades específicas do tipo |
| `inputs[]` | Portas de entrada |
| `outputs[]` | Portas de saída |
| `order` | Ordem de fallback para nós sem caminho conectado e conteúdo legado; conexões válidas definem a sequência principal |
| `layout` | Largura, alinhamento e espaçamentos na página publicada |
| `style` | Cores, família/tamanho/peso da fonte, alinhamento, borda e padding |
| `parentId` | ID do nó container pai; ausente/nulo significa nível principal |

Tipos previstos no contrato TypeScript: `start`, `heading`, `paragraph`, `list`, `image`, `video`, `code`, `quiz`, `exercise`, `callout`, `divider`, `embed`, `certificate` e `container`.

O nó `start` é um marcador de controle e permanece no nível principal. O nó `certificate` é um card de emissão: na área do aluno ele consulta o certificado persistido da matrícula e permite solicitar emissão quando todas as aulas publicadas foram concluídas; no preview do editor permanece estático. Ver CERT-001 e a referência de API.

### Hierarquia visual de containers

O container é o único tipo que pode receber filhos. A aula mantém uma lista plana `nodes[]`; cada filho aparece uma única vez e aponta para o ID do pai por `parentId`. Não duplicar os filhos em `children[]`. Os filhos mantêm coordenadas absolutas do canvas, limitadas à área interna do pai (20 px de margem, 48 px reservados ao cabeçalho e 20 px de margem inferior).

A hierarquia tem no máximo quatro níveis, incluindo o nível principal. Containers podem conter outros containers; todos os outros tipos são folhas. O editor oferece adição dentro do container selecionado, arrasto para reparenting, seleção do pai no inspetor, duplicação do subtree e exclusão em cascata. Ao mover/duplicar um container, seus descendentes acompanham o movimento e recebem novos IDs ao duplicar.

A ordem principal de leitura é derivada de `connections[]`. A partir do nó `start`, o renderizador percorre o grafo em profundidade; em nós com múltiplas saídas, respeita a ordem declarada em `outputs[]` (no Quiz: `success`/Aprovado antes de `failed`/Reprovado). Nós desconectados ou de conteúdo legado são acrescentados depois, usando `order` e, como último fallback, `y/x`. Dentro de containers, os filhos seguem a mesma sequência de grafo entre irmãos. As conexões continuam independentes da contenção: não reparentam elementos nem alteram `parentId`. Remover um container remove todos os descendentes e conexões que referenciem qualquer nó removido.

O frontend e o backend validam IDs únicos, pais existentes do tipo container, ausência de ciclos, profundidade máxima, limites internos do container, dimensões e portas de conexão. O backend é a autoridade final na criação/atualização de cursos e rascunhos e antes de publicar.

### `connections[]`

Cada ligação contém:

| Campo | Significado |
|---|---|
| `id` | Identificador da ligação |
| `sourceNode` / `sourcePort` | Nó e porta de saída de origem |
| `targetNode` / `targetPort` | Nó e porta de entrada de destino |

Todos os nós exceto `start` recebem uma porta de entrada padrão. Nós comuns possuem saída `complete`; o Quiz possui as saídas `success` e `failed`; o nó `certificate` não possui saída. Cada entrada aceita uma conexão: conectar outra ligação à mesma entrada substitui a anterior. Excluir um nó remove as ligações que o referenciam.

## 3. Workspace do editor

`LessonEditorPage.tsx` implementa o editor dedicado e protegido por `RequireAdmin`.

- **Paleta:** templates de cards; arrastar cria cópia com novo ID e clicar adiciona ao canvas.
- **Canvas:** área de 1200 px de largura, grade de 20 px e posicionamento encaixado à grade.
- **Inspetor:** edita conteúdo, URLs, opções, respostas, dimensões e propriedades visuais/layout do elemento selecionado.
- **Conexões:** portas de entrada/saída e curvas SVG entre nós.
- **Preview:** alterna entre celular, tablet e desktop usando o mesmo componente de conteúdo da página do aluno.
- **Celular/tablet:** quatro painéis alternáveis (Cards, Canvas, Propriedades e Prévia); o canvas não fica comprimido entre paleta e inspetor.
- **Toque:** arrasto de cartões, pan no fundo e zoom; selecionar um cartão abre o inspetor no mobile.
- **Seleção:** seleção individual, Ctrl/Cmd + clique, seleção por retângulo, duplicação e exclusão em grupo.
- **Câmera:** pan por Espaço + arrasto, botão do meio ou toque no fundo; zoom com controles ou Ctrl/Cmd + roda; ajustar à tela e centralizar em 100%.
- **Módulos e aulas:** criados e alternados na barra superior; o conteúdo permanece no estado do editor até salvar.

Em viewports abaixo de 900 px, o workspace exibe um painel por vez por meio da navegação dedicada. Em telas largas, paleta, canvas e inspetor permanecem em colunas. A implementação ainda requer inspeção manual em navegadores e dispositivos reais.

O estado da câmera (`x`, `y`, `zoom`) vive no estado React do workspace. Ele é reiniciado quando o editor é aberto novamente.

## 4. Contrato de apresentação — schema 2

A aula recebe contentSchemaVersion = 2 e um objeto presentation (largura máxima, fundo, cor do texto, família/tamanho da fonte, alinhamento e padding). Cada nó pode declarar order, layout e style. As propriedades de leitura não reutilizam x/y/width/height: esses quatro valores continuam pertencendo exclusivamente à geometria do canvas de autoria.

layout.width aceita auto, narrow, medium, wide ou full; layout.align aceita start, center, end ou stretch. O layout também possui espaçamento anterior/posterior. style aceita cores hexadecimais, três famílias tipográficas, tamanhos/pesos limitados, alinhamento, borda arredondada e padding. O renderizador valida e limita esses valores antes de aplicá-los ao DOM.

Durante a abertura no editor, aulas sem versão recebem schema 2 e valores padrão. Para preservar a leitura FE-011, a ordem antiga é calculada por y/x e persistida em order. O schema continua serializado no JSON de modules[]; não há coluna específica no banco.

parentId está tipado como campo reservado, mas containers aninháveis ainda não estão implementados. Não use esse campo para construir uma hierarquia até a etapa de containers, que deverá validar ciclos, profundidade e tipos que aceitam filhos.

## 5. Persistência

O cliente serializa `modules[]`, incluindo `nodes[]` e `connections[]`, e chama o store de cursos.

- Em rascunho, a atualização é enviada para `PUT /api/drafts/{id}`.
- Em curso publicado, a atualização é enviada para `PUT /api/courses/{slug}`.
- A publicação de rascunho chama `POST /api/drafts/{id}/publish`.

O backend mantém o conteúdo de módulos como JSON em `Course.ModulesJson`/`CourseDraft.ModulesJson`. `CourseMapper` calcula quantidade de módulos, aulas e minutos lendo esse JSON.

## 5. Apresentação ao aluno

`AppLessonPage.tsx` não reproduz o canvas. A página:

1. seleciona tipos pedagógicos autorizados e remove nós internos/scripts;
2. ordena os nós por order, usando y/x como fallback de conteúdo legado;
3. renderiza texto, título, lista, imagem, vídeo, código, quiz, exercício, destaque, divisor, incorporação e certificado;
4. aplica o tema de apresentação da aula e as opções layout/style de cada elemento, sem usar coordenadas do canvas.

A página não usa as coordenadas do canvas para posicionar elementos dentro do fluxo, não mostra portas/conexões e não executa scripts. Containers são representados como seções agrupadoras e seus filhos são renderizados recursivamente. Preview do editor e página do aluno compartilham o renderizador e o filtro de nós visíveis.

**Execução condicional — FLOW-001/FLOW-002:** a prévia do editor continua sendo uma visão de autoria e apresenta o grafo inteiro, incluindo os dois ramos. Na página do aluno, o backend interpreta as portas `success` e `failed` de Quiz e Exercise: enquanto não existe resultado, os nós conectados às duas saídas ficam fora do JSON público; depois da resposta, somente o ramo escolhido é retornado. Atividades dentro de um ramo só ficam acessíveis quando o caminho anterior as alcança. O backend rejeita tentativas diretas em atividades bloqueadas. O renderizador apresenta controles interativos, persiste o resultado e mostra aprovado/reprovado.

O Quiz de FLOW-001 avalia uma pergunta de escolha única usando `correctIndex` privado; acerto produz score 100 e `success`, erro produz 0 e `failed`. O Exercise de FLOW-002 recebe texto/código e compara com `props.solution`, também privado, normalizando finais de linha e espaços no fim das linhas e nas extremidades. A comparação final é sensível a maiúsculas/minúsculas, indentação e espaços internos. Não há execução nem compilação do código submetido. Ambas as atividades aceitam uma tentativa por matrícula/aula/card; resposta idêntica normalizada é idempotente, uma resposta diferente conflita. As tabelas `CourseQuizAttempts` e `CourseExerciseAttempts` possuem índices únicos e FK com exclusão em cascata. A conclusão da aula é bloqueada até que todas as atividades alcançáveis no caminho selecionado tenham resultado.

Isso ainda não é um motor genérico de execução: Exercícios com testes unitários, execução em sandbox, retentativas, múltiplas perguntas/seleção, nota mínima configurável, limite de tempo e banco de questões permanecem fora do escopo. O certificado de conclusão de CERT-001 é emitido uma vez por matrícula, apenas quando o servidor projeta 100% das aulas publicadas concluídas; registra um snapshot e código público de verificação. A emissão usa conclusão autodeclarada pelo aluno após as atividades alcançáveis e não deve ser tratada como avaliação independente de aprendizagem, competência profissional ou habilitação.

## 6. Progresso e conclusão de aulas

O progresso da matrícula não é calculado pelo navegador. A tabela `CourseLessonCompletions` registra eventos por matrícula/aula com timestamp do servidor e índice único em `(EnrollmentId, LessonId)`. Uma aula só pode gerar evento quando o curso está publicado, a matrícula pertence ao usuário autenticado e a aula aparece no JSON do curso com `isPublished: true`.

O endpoint de atualização de navegação aceita apenas `currentLessonId`; percentual, status de módulos e datas enviados pelo cliente não fazem parte do contrato. O backend projeta `modulesProgress`, `overallPercent` e `completedAt` a partir dos eventos persistidos e das aulas atualmente publicadas. Dados antigos guardados em `ModulesProgressJson`/colunas de percentual não são mais considerados como fonte confiável.

A conclusão de aula continua sendo uma autodeclaração explícita do aluno, mas o backend impede que ela seja registrada enquanto houver Quiz ou Exercise alcançável sem resposta. Ambos os resultados são corrigidos no servidor e liberam o ramo correspondente; no Exercise, a correção é comparação textual com solução de referência, não execução de código. O certificado (CERT-001) só pode ser emitido após todas as aulas publicadas estarem concluídas; seus dados são armazenados como snapshot e verificados publicamente pelo código aleatório. Cancelar a matrícula não remove um certificado já emitido. Esse documento comprova somente que os eventos de conclusão foram registrados; o percentual e o certificado não comprovam domínio do conteúdo nem competência prática.

## 7. Separação de dados de autoria e aluno

As respostas dos endpoints públicos de cursos usam CourseMapper.ToStudentDto, que remove propriedades privadas dos props dos nós, incluindo correctIndex, solution, answer, acceptedAnswers e expectedOutput. O mesmo mapper aplica o resultado da matrícula atual e não envia os nós/conexões dos ramos ainda bloqueados ou não escolhidos. Administradores e autores continuam recebendo o DTO completo no acesso autenticado para editar o grafo. Esconder esses campos apenas na interface não é controle de segurança.

## 8. Quebra intencional de compatibilidade

A migração FE-011 removeu o editor anterior de blocos/componentes. `prepareModules` ignora e descarta os campos legados `blocks[]` e `elements[]`; o projeto documenta que não há dados antigos a converter e não manterá camada de compatibilidade.

Não reintroduzir silenciosamente os campos antigos. Qualquer necessidade futura de importar conteúdo de versões antigas deve ser uma ferramenta de conversão separada, com entrada/saída validadas e decisão explícita do proprietário.

## 9. CorseLight

CorseLight (CL) é a linguagem restrita de lógica de cursos, distinta do card pedagógico `code`.

- A especificação normativa aprovada é [CorseLight v0.1](./corselight-language-v0.1.md), integrada em `Homologa` pela PR #52.
- O contrato separa scripts internos numa coleção raiz `scripts[]`, irmã de `modules[]`; o backend mantém `ScriptsJson` em `Course` e `CourseDraft`, preservando o grafo pedagógico independente.
- A branch `feature/cl-002-corselight-runtime` implementa lexer, parser/AST próprios, validação semântica, runtime tipado e limitado, persistência de estado por matrícula/script e ledger de execução idempotente. A migração acrescenta as tabelas de estado/execução; snapshots de curso incluem a coleção raiz.
- Os três eventos são `lesson.start`, `lesson.finish` e `activity.submit`. O backend dispara-os após validar matrícula/aula, após verificar as atividades alcançáveis antes da conclusão e após avaliar uma submissão aceita, respectivamente.
- DTOs de autoria/admin incluem `scripts[]` e `scriptDiagnostics[]`. Os DTOs públicos do aluno enviam arrays vazios para esses campos e nunca expõem fonte, AST, diagnóstico privado ou estado de execução.
- Efeitos de apresentação são armazenados por evento e projetados apenas sobre nós passivos presentes na rota já autorizada pelo backend. `content.show` não restaura nós removidos por ramificações bloqueadas. Feedback de execução é projetado em `EnrollmentDto.scriptEffects[]`.
- `activity.retry`, `activity.setScore` e `activity.allowRetry` ficam fora da v0.1; CL não altera score, tentativas, conclusão, autorização ou navegação de segurança.
- A implementação CL-002 ainda está em revisão/CI nesta branch e não é considerada integrada até o merge explícito.
- Nunca usar `eval`, JavaScript, C# scripting, reflexão ou código arbitrário para executar conteúdo escrito por autores. O runtime obedece à allowlist e aos limites explícitos da especificação.

## 10. Referências no código

- Tipos: `corseweb.client/src/types/course.ts`.
- Formulário de criação de curso: `corseweb.client/src/Pages/AdminCourseEditor/AdminCourseEditor.tsx`.
- Workspace: `corseweb.client/src/Pages/AdminCourseEditor/LessonEditorPage.tsx` e `.scss`.
- Renderizador do aluno: `corseweb.client/src/Pages/AppLessonPage/AppLessonPage.tsx` e `.scss`.
- Store e persistência: `corseweb.client/src/store/courseStore.ts`.
- Contrato backend: `CorseWeb.Server/Dtos/CourseDtos.cs`, `Models/Course.cs`, `Models/CourseDraft.cs` e `Helpers/CourseMapper.cs`.
- Critérios de aceite: [FE-011](../FRONTEND/etapas/fe-011-lesson-editor-workspace.md).