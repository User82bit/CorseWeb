# FE-011 — Canvas visual de nós e grafo de fluxo pedagógico

## Direção

O editor anterior de blocos e componentes selecionados em colunas foi descontinuado. É uma BREAKING CHANGE intencional: não haverá conversão de dados antigos, seletor do editor antigo nem camada de compatibilidade, porque não há versões anteriores de conteúdo que precisem ser preservadas.

## Fluxo principal

1. O formulário inicial recolhe apenas nome, subtítulo, descrição e capa do curso.
2. **Criar rascunho e abrir editor** cria o rascunho e redireciona imediatamente para `/admin/courses/:courseSlug/editor`.
3. O workspace é uma tela própria protegida por `RequireAdmin`, sem o shell padrão do painel administrativo.
4. A paleta esquerda contém templates reutilizáveis. Um drop cria uma nova instância identificada; não remove nem move o template original.
   - Durante o arrasto, um preview visual acompanha o cursor; o drop é tratado como cópia.
5. O canvas central exibe uma grade visual de 20 px. A posição do cursor é convertida para coordenadas locais do canvas sem deslocamento artificial e só então encaixada à grade; nós movidos também respeitam o snap.
6. A camada SVG desenha as curvas das conexões entre as portas de saída e de entrada.
7. O inspetor direito edita propriedades, dimensões e conteúdo do nó selecionado.
8. Módulos/aulas são mantidos na barra de ferramentas. Salvar persiste os nós e as conexões no JSON do curso.

## Modelo de conteúdo

Cada aula agora possui dois campos principais:

- `nodes[]`: instâncias posicionadas. Cada nó contém `id`, `type`, `x`, `y`, `width`, `height`, `props`, `inputs[]` e `outputs[]`.
- `connections[]`: arestas dirigidas com `id`, `sourceNode`, `sourcePort`, `targetNode` e `targetPort`.

Os tipos disponíveis incluem Início, título, texto, lista, imagem, vídeo, código, quiz, exercício, destaque, divisor, incorporação e certificado. O nó Quiz oferece as saídas `success` e `failed`. Cada porta de entrada aceita no máximo uma conexão; criar outra ligação para a mesma entrada substitui a anterior. Ao excluir um nó, as suas ligações também são removidas.

Os campos legados `elements[]` e `blocks[]` não serão convertidos nem mantidos. O contrato novo é intencionalmente incompatível.

## Correção da câmera e das curvas — PR #38

Os cards e o mecanismo de criação de conexões existentes foram preservados.

- A câmera permite pan com Espaço + arrasto do mouse, botão do meio ou arrasto do fundo por toque.
- Ctrl/Cmd + roda do mouse controla o zoom; a interface também oferece diminuir, aumentar, ajustar o conteúdo à tela e centralizar a câmera em 100%.
- Drop da paleta, seleção retangular, movimentação de nós e prévia de conexão convertem coordenadas entre a tela e o canvas, levando em conta a translação e o nível de zoom.
- As curvas SVG adaptam os pontos de controle à distância e à direção relativa entre a saída e a entrada. Ao ligar um nó que está acima da origem, a curva procura contornar a lateral correspondente em vez de repetir uma curva fixa.
- Tentativas de conexão inválidas encerram a conexão temporária.
- O estado da câmera é local à sessão do editor: persistir viewport/zoom entre reaberturas e dispositivos continua pendente.
- A CI do PR deve confirmar lint, teste de idioma, build do frontend e restore/build .NET no HEAD mais recente. A inspeção visual em navegador real, incluindo celular/tablet, continua pendente.

## Limite importante: execução do fluxo

Esta etapa implementa a autoria visual e a persistência do grafo. A área do aluno renderiza os valores permitidos de cada nó como conteúdo de leitura em fluxo responsivo, sem reproduzir o canvas, as posições/dimensões de autoria, as portas ou as conexões. O nó de Início é um controle interno e não aparece como conteúdo. Tipos desconhecidos e metadados/scripts internos também não são apresentados. Cartões pedagógicos de Código continuam exibindo o trecho explicitamente escrito pelo autor; scripts internos da aplicação não são lidos nem executados. A área do aluno ainda **não executa** as conexões para controlar a progressão pedagógica. Desvios condicionais por resultado de quiz, liberação de atividades, bloqueio de caminhos e emissão real de certificado ficam para uma etapa posterior do motor de execução.

## Correção da apresentação na área do aluno — FE-012 / PR #39

O renderizador antigo desenhava os nós sobre um canvas de 1200 px e reproduzia a disposição espacial do editor. A nova apresentação usa um fluxo de leitura comum: cada tipo de card lê apenas seus campos públicos de `props` e é renderizado no layout da página. As coordenadas `x/y`, dimensões, portas e conexões não são usadas para desenhar a área do aluno.

- O nó `start` é um marcador de controle, não uma peça de conteúdo para o aluno, e é omitido.
- Tipos de nós desconhecidos ou internos são ignorados em vez de criar cartões vazios ou mostrar dados genéricos.
- Quiz apresenta pergunta e opções sem revelar o índice correto; Exercício apresenta instrução e código inicial sem revelar a solução.
- Um nó pedagógico `code` continua exibindo o trecho escrito pelo autor. Isso é conteúdo do curso, não o script interno separado da aula; scripts internos não são executados nem enumerados por este renderizador.
- A CI deve passar no HEAD mais recente e o resultado visual precisa ser conferido manualmente em celular, tablet e desktop.

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
- [ ] O preview de arrasto acompanha o cursor e soltar em x=137 (relativo ao canvas) posiciona o nó em x=140.
- [ ] Nós podem ser reposicionados individualmente e em grupo, com coordenadas encaixadas na grade de 20 px; mover um grupo perto das bordas preserva o espaçamento relativo.
- [ ] Ctrl/Cmd + clique alterna nós em uma seleção múltipla.
- [ ] Arrastar uma área vazia cria um retângulo de seleção e seleciona os nós que o intersectam.
- [ ] Portas de entrada/saída são visíveis e conexões curvas SVG são criadas e persistidas.
- [ ] A câmera pode ser movida livremente com Espaço + arrasto, botão do meio e toque no fundo.
- [ ] O zoom pode aumentar, diminuir, enquadrar o conteúdo e voltar a 100%; Ctrl/Cmd + roda faz zoom centrado no cursor.
- [ ] Cards, seleção e criação de conexões mantêm coordenadas corretas com diferentes níveis de zoom.
- [ ] As curvas se adaptam à posição relativa da saída e da entrada quando os nós estão abaixo, ao lado ou acima.
- [ ] O quiz oferece saídas `success` e `failed`; excluir um nó remove as conexões associadas.
- [ ] O inspetor edita conteúdo e dimensões do nó selecionado.
- [ ] Criar módulos/aulas, trocar a aula ativa, salvar rascunho e publicar funcionam.
- [ ] A área do aluno apresenta valores dos nós em fluxo normal de leitura, sem reproduzir o canvas nem expor a geometria de autoria.
- [ ] Nós de controle (Início), tipos desconhecidos e scripts internos não aparecem como conteúdo do aluno.
- [ ] Perguntas e opções do Quiz são apresentadas sem revelar `correctIndex`; a solução do Exercício não é exposta.
- [ ] A área do aluno renderiza apenas conteúdo autorizado de cada tipo de nó, sem executar scripts.
- [ ] Layout do editor testado em celular, tablet e desktop; navegação por teclado e toque consideradas.
- [ ] Conteúdo da aula na área do aluno testado em celular, tablet e desktop, com scroll natural e sem canvas fixo.
- [ ] CI aprovada: lint, testes de tradução, build do frontend e restore/build .NET.

## Fora do escopo desta etapa

O motor que interpreta as conexões e conduz o aluno por caminhos condicionais, persistência da câmera entre sessões/dispositivos, guias/réguas e edição colaborativa. A inspeção visual manual em navegador real continua pendente até ser feita pelo proprietário.
