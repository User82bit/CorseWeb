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

Tipos previstos no contrato TypeScript: `start`, `heading`, `paragraph`, `list`, `image`, `video`, `code`, `quiz`, `exercise`, `callout`, `divider`, `embed` e `certificate`.

O nó `start` é um marcador de controle. O nó `certificate` existe como card de conteúdo; sua presença não significa que o backend emita um certificado.

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
- **Inspetor:** edita conteúdo, URLs, opções, respostas, dimensões e metadados do nó selecionado.
- **Conexões:** portas de entrada/saída e curvas SVG entre nós.
- **Seleção:** seleção individual, Ctrl/Cmd + clique, seleção por retângulo, duplicação e exclusão em grupo.
- **Câmera:** pan por Espaço + arrasto, botão do meio ou toque no fundo; zoom com controles ou Ctrl/Cmd + roda; ajustar à tela e centralizar em 100%.
- **Módulos e aulas:** criados e alternados na barra superior; o conteúdo permanece no estado do editor até salvar.

O SCSS apresenta três áreas empilhadas em telas menores e três colunas em telas largas. Isso é uma intenção de layout presente no código, não uma validação manual de uso em celular.

O estado da câmera (`x`, `y`, `zoom`) vive no estado React do workspace. Ele é reiniciado quando o editor é aberto novamente.

## 4. Persistência

O cliente serializa `modules[]`, incluindo `nodes[]` e `connections[]`, e chama o store de cursos.

- Em rascunho, a atualização é enviada para `PUT /api/drafts/{id}`.
- Em curso publicado, a atualização é enviada para `PUT /api/courses/{slug}`.
- A publicação de rascunho chama `POST /api/drafts/{id}/publish`.

O backend mantém o conteúdo de módulos como JSON em `Course.ModulesJson`/`CourseDraft.ModulesJson`. `CourseMapper` calcula quantidade de módulos, aulas e minutos lendo esse JSON.

## 5. Apresentação ao aluno

`AppLessonPage.tsx` não reproduz o canvas. A página:

1. seleciona tipos pedagógicos autorizados;
2. remove nós internos e scripts reconhecidos como CorseLight;
3. ordena os nós por `y` e `x` para criar uma sequência de leitura;
4. renderiza texto, título, lista, imagem, vídeo, código, quiz, exercício, destaque, divisor, incorporação e certificado como conteúdo comum.

A página não usa as coordenadas para posicionar os cartões, não mostra portas/conexões e não executa scripts.

**Importante:** a ordenação espacial é uma convenção de leitura atual. As ligações do grafo não determinam a progressão do aluno. O quiz mostra pergunta e opções, mas não aceita uma resposta nem calcula o resultado no fluxo atual. O exercício mostra instrução e código inicial, sem executar ou verificar a solução.

## 6. Quebra intencional de compatibilidade

A migração FE-011 removeu o editor anterior de blocos/componentes. `prepareModules` ignora e descarta os campos legados `blocks[]` e `elements[]`; o projeto documenta que não há dados antigos a converter e não manterá camada de compatibilidade.

Não reintroduzir silenciosamente os campos antigos. Qualquer necessidade futura de importar conteúdo de versões antigas deve ser uma ferramenta de conversão separada, com entrada/saída validadas e decisão explícita do proprietário.

## 7. CorseLight

CorseLight (CL) é uma linguagem proposta para lógica restrita de cursos, distinta do card pedagógico `code`.

- A especificação atual é [CorseLight v0.1](./corselight-language-v0.1.md).
- O contrato-alvo separa scripts internos numa coleção raiz `scripts[]`, fora de `modules[]`.
- O backend atual não possui coluna/coleção `ScriptsJson`, parser, AST ou runtime CL.
- O filtro do renderizador do aluno oculta nós/tags identificados como scripts CL; isso é uma proteção de apresentação, não execução segura nem implementação da linguagem.
- Nunca usar `eval`, JavaScript, C# scripting, reflexão ou código arbitrário para executar conteúdo escrito por autores. O runtime futuro deve obedecer à lista de funções e aos limites explícitos da especificação.

## 8. Referências no código

- Tipos: `corseweb.client/src/types/course.ts`.
- Formulário de criação de curso: `corseweb.client/src/Pages/AdminCourseEditor/AdminCourseEditor.tsx`.
- Workspace: `corseweb.client/src/Pages/AdminCourseEditor/LessonEditorPage.tsx` e `.scss`.
- Renderizador do aluno: `corseweb.client/src/Pages/AppLessonPage/AppLessonPage.tsx` e `.scss`.
- Store e persistência: `corseweb.client/src/store/courseStore.ts`.
- Contrato backend: `CorseWeb.Server/Dtos/CourseDtos.cs`, `Models/Course.cs`, `Models/CourseDraft.cs` e `Helpers/CourseMapper.cs`.
- Critérios de aceite: [FE-011](../FRONTEND/etapas/fe-011-lesson-editor-workspace.md).