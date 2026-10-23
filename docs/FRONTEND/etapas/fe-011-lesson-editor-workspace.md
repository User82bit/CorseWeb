# FE-011 — Workspace dedicado para edição visual de aulas

## Objetivo

Abrir o editor visual de uma aula em uma tela própria, inspirada na organização do Figma, com uma área pontilhada que torne a escala do grid perceptível.

## Comportamento

- A partir da configuração da aula na estrutura do curso, o botão **Abrir editor visual** navega para `/admin/courses/:courseSlug/editor/lessons/:lessonId`.
- A tela é protegida por `RequireAdmin` e não inclui o shell geral do painel administrativo.
- A navegação lateral e um seletor acessível permitem alternar entre aulas sem sair do workspace.
- O canvas reutiliza o editor de blocos existente, com fundo escuro, pontos brancos espaçados em 22 px e cards de conteúdo em superfície clara.
- O inspetor mantém os campos de título, descrição, duração e prévia gratuita da aula.
- **Aplicar e voltar** transfere módulos e metadados editados para o formulário do curso; a persistência continua vinculada ao botão **Salvar** do curso.
- A disposição dos painéis adapta-se a telas estreitas.

## Fora de escopo

- Arrastar livremente os cards por coordenadas arbitrárias ou snapping magnético por ponteiro.
- Zoom/pan do canvas, guias, réguas e atalhos de teclado do Figma.
- Salvamento automático em cada alteração ou mudanças de API/contrato.

## Arquivos principais

- `corseweb.client/src/App.tsx`
- `corseweb.client/src/Pages/AdminCourseEditor/CourseStructureEditor.tsx`
- `corseweb.client/src/Pages/AdminCourseEditor/AdminCourseEditor.tsx`
- `corseweb.client/src/Pages/AdminCourseEditor/LessonEditorPage.tsx`
- `corseweb.client/src/Pages/AdminCourseEditor/LessonEditorPage.scss`
- `corseweb.client/src/i18n/types.ts` e traduções pt-BR, en e es

## Critérios de aceitação

- [ ] Abrir uma aula navega para a tela dedicada e mantém o contexto do curso.
- [ ] É possível editar título, descrição, duração, prévia gratuita, blocos e componentes.
- [ ] Alternar aulas não descarta alterações da sessão do editor.
- [ ] Aplicar e voltar restaura os dados no formulário do curso sem limpar metadados ainda não salvos.
- [ ] O botão Salvar do curso continua responsável pela persistência.
- [ ] O canvas exibe pontos brancos e os cards preservam o grid de colunas já suportado.
- [ ] Layout usável em 320 px, tablet e desktop; controles com rótulos acessíveis.
- [ ] CI aprovada: lint, testes de tradução, build React/Vite e restore/build .NET.

## Validação manual pendente

CI não substitui a inspeção visual no navegador real. Revisar estados vazio e preenchido, troca de aulas, retorno ao curso, mudança de idioma e larguras de celular/tablet/desktop.
