# FE-012 — Editor responsivo, prévia e apresentação schema 2

## Objetivo

Permitir que a autoria de cursos seja executada em celular, tablet ou desktop. O editor não deve ser apenas uma tela desktop comprimida; em dispositivos menores, ferramentas são apresentadas em painéis alternáveis e o canvas conserva a área principal.

Esta etapa também separa as propriedades de apresentação do conteúdo publicado da geometria usada para editar o grafo.

## Entregas nesta branch

### Editor mobile-first

- Barra de navegação com quatro áreas: Cards, Canvas, Propriedades e Prévia.
- Em viewports abaixo de 900 px, somente o painel selecionado fica visível; o canvas deixa de dividir o espaço com paleta e inspetor.
- Selecionar um card abre Propriedades. Adicionar um card pela paleta retorna ao Canvas.
- Controles e áreas de toque têm altura mínima de 40–44 px nos principais botões.
- Pan de fundo, zoom por controles e movimentação dos cards usam Pointer Events já presentes no workspace.
- Em telas largas, paleta, canvas e inspetor mantêm o layout de colunas, com acesso à prévia por alternância.

### Prévia da aula

- O preview está dentro do workspace e permite alternar a largura de celular, tablet e desktop.
- Reutiliza CanvasNodeContent, getNodePresentationStyle, getLessonPresentationStyle e o mesmo filtro de visibilidade usado na página do aluno.
- A prévia representa o fluxo publicado, não o grafo, as coordenadas, as portas nem as conexões.
- A edição não exige salvar para que o preview mostre o estado atual em memória.

### Contrato de conteúdo schema 2

Cada aula inclui:
- contentSchemaVersion: 2;
- presentation: largura máxima do conteúdo, fundo, cor de texto, família e tamanho de fonte, alinhamento e padding.

Cada nó pode incluir:
- order: ordem de leitura explícita;
- layout: largura, alinhamento, espaçamento anterior e posterior;
- style: cor, fundo, família/tamanho/peso da fonte, alinhamento textual, arredondamento e padding.

x/y/width/height permanecem sendo coordenadas/dimensões do canvas de autoria. O layout de leitura não usa esses campos. Valores recebidos são limitados/whitelist antes de compor estilos CSS.

### Migração do conteúdo existente

Quando uma aula não possui contentSchemaVersion, o editor atribui schema 2 e valores padrão. O order inicial é gerado com a antiga convenção y/x para preservar a sequência de leitura FE-011. Não há migração de blocks[]/elements[].

### Proteção de dados do aluno

GET /api/courses e GET /api/courses/{slug} retornam CourseMapper.ToStudentDto para leitores sem permissão de autoria/administração. O mapper remove campos de autoria sensíveis dos props de nós, incluindo correctIndex e solution. O autor e administradores continuam recebendo o DTO completo. Isso reduz exposição no payload, sem depender de ocultação no React.

### Validação no cliente antes de salvar

- Limite de 500 nós por aula.
- IDs não vazios e únicos.
- Coordenadas e dimensões finitas e dentro dos limites do editor.
- Conexões devem referenciar nós e portas existentes.
- Uma única conexão por porta de entrada.

O backend ainda precisa repetir essas validações como autoridade final.

## Fora do escopo / trabalho restante

- Containers aninháveis com filhos, reparenting, ordenação de irmãos, prevenção de ciclos, limite de profundidade e exclusão em cascata. parentId existe somente como campo reservado no tipo.
- Separação estrutural definitiva de DTOs de autor/aluno e testes de segurança mais abrangentes.
- Runtime de fluxo pedagógico, avaliação de quiz/exercício e execução de LightScript.
- Persistência de viewport/câmera.
- Testes E2E e inspeção em browsers/dispositivos reais em 320, 360, 390, 430, 768, 820, 1024 e 1280 px.

## Verificações exigidas antes de aceitar

1. CI: lint, testes de i18n, build TypeScript/Vite e build Release .NET.
2. Celular: criar curso, inserir/editar/remover cards, editar propriedades, alternar painéis, pré-visualizar, salvar e publicar sem rolagem horizontal acidental.
3. Tablet/desktop: confirmar painel e canvas sem sobreposição; alternar entre editor e preview.
4. Migração: abrir conteúdo FE-011 sem order e comparar a sequência com y/x.
5. Segurança: conferir nos payloads públicos que correctIndex/solution não aparecem; confirmar que autor/admin ainda recebe conteúdo completo.
6. Regressão: conferir links, imagens, vídeo, quiz, exercício, conexões e publicação.

A implementação desta branch não deve ser considerada finalizada antes de CI e inspeção manual.