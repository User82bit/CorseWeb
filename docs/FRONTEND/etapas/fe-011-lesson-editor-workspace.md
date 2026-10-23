# FE-011 — Canvas visual de nós e grafo de fluxo pedagógico

## Direção

O editor anterior de blocos e componentes selecionados em colunas foi descontinuado. É uma BREAKING CHANGE intencional: não haverá conversão de dados antigos, seletor do editor antigo nem camada de compatibilidade, porque não há versões anteriores de conteúdo que precisem ser preservadas.

## Fluxo principal

1. O formulário inicial recolhe apenas nome, subtítulo, descrição e capa do curso.
2. **Criar rascunho e abrir editor** cria o rascunho e redireciona imediatamente para `/admin/courses/:courseSlug/editor`.
3. O workspace é uma tela própria protegida por `RequireAdmin`, sem o shell padrão do painel administrativo.
4. A paleta esquerda contém templates reutilizáveis. Um drop cria uma nova instância identificada; não remove nem move o template original.
5. O canvas central exibe uma grade visual de 20 px e aplica snap ao posicionamento e ao redimensionamento dos nós.
6. A camada SVG desenha as curvas das conexões entre as portas de saída e de entrada.
7. O inspetor direito edita propriedades, dimensões e conteúdo do nó selecionado.
8. Módulos/aulas são mantidos na barra de ferramentas. Salvar persiste os nós e as conexões no JSON do curso.

## Modelo de conteúdo

Cada aula agora possui dois campos principais:

- `nodes[]`: instâncias posicionadas. Cada nó contém `id`, `type`, `x`, `y`, `width`, `height`, `props`, `inputs[]` e `outputs[]`.
- `connections[]`: arestas dirigidas com `id`, `sourceNode`, `sourcePort`, `targetNode` e `targetPort`.

Os tipos disponíveis incluem Início, título, texto, lista, imagem, vídeo, código, quiz, exercício, destaque, divisor, incorporação e certificado. O nó Quiz oferece as saídas `success` e `failed`. Cada porta de entrada aceita no máximo uma conexão; criar outra ligação para a mesma entrada substitui a anterior. Ao excluir um nó, as suas ligações também são removidas.

Os campos legados `elements[]` e `blocks[]` não serão convertidos nem mantidos. O contrato novo é intencionalmente incompatível.

## Limite importante: execução do fluxo

Esta etapa implementa a autoria visual e a persistência do grafo. A visualização do aluno consegue renderizar os nós existentes, mas ainda **não executa** as conexões para controlar a progressão pedagógica. Desvios condicionais por resultado de quiz, liberação de atividades, bloqueio de caminhos e emissão real de certificado ficam para uma etapa posterior do motor de execução.

## Arquivos principais

- `corseweb.client/src/Pages/AdminCourseEditor/AdminCourseEditor.tsx`
- `corseweb.client/src/Pages/AdminCourseEditor/LessonEditorPage.tsx`
- `corseweb.client/src/Pages/AdminCourseEditor/LessonEditorPage.scss`
- `corseweb.client/src/types/course.ts`
- `corseweb.client/src/Pages/AppLessonPage/AppLessonPage.tsx`
- `docs/FRONTEND/TODO.md`

## Critérios de aceitação

- [ ] Criar um rascunho abre diretamente o workspace visual.
- [ ] Os seletores de categoria/nível/idioma abaixo da capa não aparecem no formulário inicial.
- [ ] Cada template permanece na paleta após um drop e cria instância com ID próprio.
- [ ] Nós podem ser reposicionados e as coordenadas encaixam na grade.
- [ ] Portas de entrada/saída são visíveis e conexões curvas SVG são criadas e persistidas.
- [ ] O quiz oferece saídas `success` e `failed`; excluir um nó remove as conexões associadas.
- [ ] O inspetor edita conteúdo e dimensões do nó selecionado.
- [ ] Criar módulos/aulas, trocar a aula ativa, salvar rascunho e publicar funcionam.
- [ ] A visualização do aluno renderiza os novos tipos de nós.
- [ ] Layout testado em celular, tablet e desktop; navegação por teclado e toque consideradas.
- [ ] CI aprovada: lint, testes de tradução, build do frontend e restore/build .NET.

## Fora do escopo desta etapa

O motor que interpreta as conexões e conduz o aluno por caminhos condicionais, seleção múltipla, retângulo de seleção, zoom/pan, guias/réguas e edição colaborativa. A inspeção visual manual em navegador real continua pendente até ser feita pelo proprietário.
