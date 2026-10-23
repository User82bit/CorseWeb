# FE-011 — Canvas visual com cards posicionados

## Direção

O editor anterior de blocos e componentes selecionados em colunas foi descontinuado. É uma BREAKING CHANGE intencional: não haverá conversão de dados antigos, seletor do editor antigo nem camada de compatibilidade, porque não há versões anteriores de conteúdo que precisem ser preservadas.

## Fluxo principal

1. O formulário inicial recolhe apenas nome, subtítulo, descrição e capa do curso.
2. **Criar rascunho e abrir editor** cria o rascunho e redireciona imediatamente para `/admin/courses/:courseSlug/editor`.
3. O workspace é uma tela própria protegida por `RequireAdmin`, sem o shell padrão do painel.
4. A paleta à esquerda contém cards arrastáveis e também permite adicionar por clique/toque.
5. O canvas central apresenta pontos a cada 24 px. Ao largar um card ou mover um já criado, a posição se encaixa na grade.
6. O inspetor à direita edita as propriedades, dimensões e conteúdo do card selecionado.
7. O seletor de aula e os comandos de módulo/aula ficam na barra de ferramentas. Salvar persiste o modelo novo no JSON dos módulos; publicar permanece disponível para rascunhos.

## Contrato novo de conteúdo

Cada aula usa `elements[]`. Cada elemento contém:

- `id`, `type` e `props`;
- posição `x`/`y` em pixels encaixados a uma grade de 24 px;
- `width`/`height` em pixels, também encaixados à grade.

A visualização do aluno renderiza as posições salvas no canvas novo. O campo antigo `blocks[]` não é convertido nem usado.

## Cards disponíveis

Título, texto, lista, imagem, vídeo, código, quiz, exercício, destaque, divisor e incorporação.

## Arquivos principais

- `corseweb.client/src/Pages/AdminCourseEditor/AdminCourseEditor.tsx`
- `corseweb.client/src/Pages/AdminCourseEditor/LessonEditorPage.tsx`
- `corseweb.client/src/Pages/AdminCourseEditor/LessonEditorPage.scss`
- `corseweb.client/src/types/course.ts`
- `corseweb.client/src/Pages/AppLessonPage/AppLessonPage.tsx` e `.scss`
- `corseweb.client/src/App.tsx`

## Critérios de aceitação

- [ ] Criar um rascunho abre diretamente o workspace visual.
- [ ] Os seletores de categoria/nível/idioma abaixo da capa não aparecem no formulário inicial.
- [ ] Cards podem ser arrastados da paleta para o canvas e movidos depois de inseridos.
- [ ] As posições e dimensões se encaixam na grade de 24 px.
- [ ] O inspetor edita o conteúdo e o tamanho do card selecionado.
- [ ] Criar módulos/aulas, trocar a aula ativa, salvar rascunho e publicar funcionam.
- [ ] A visualização do aluno renderiza `elements[]` com as posições salvas.
- [ ] Layout testado em celular, tablet e desktop; navegação por teclado e toque consideradas.
- [ ] CI aprovada: lint, testes de tradução, build do frontend e restore/build .NET.

## Limites atuais

Zoom/pan com mouse, seleção múltipla, guias/réguas e edição colaborativa não estão incluídos nesta fase. A inspeção visual manual no navegador continua pendente até ser feita pelo proprietário.
