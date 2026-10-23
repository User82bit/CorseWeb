# FE-010 — Editor visual em grid para componentes de aula

## Estado
- **Kanban:** EM DESENVOLVIMENTO
- **Branch:** `feat/lesson-visual-canvas-editor`
- **Área:** Frontend
- **Dependência:** FE-009 — estrutura Curso → Módulos → Aulas, integrada em `master`.

## Objetivo
Evoluir o editor atual de blocos em uma composição visual responsiva: o autor configura o número de colunas do bloco e a largura de cada componente dentro desse grid, sem editar JSON manualmente.

## Escopo desta etapa
- Acrescentar uma propriedade opcional `layout.columnSpan` em componentes existentes.
- Renderizar o conteúdo do editor em grid de 1 a 3 colunas, respeitando a largura de cada componente.
- Permitir selecionar a largura de um componente sem remover os controles acessíveis de reordenação.
- Fazer a página de aprendizagem renderizar as larguras salvas.
- Em telas estreitas, colapsar o grid para uma coluna e expandir todos os componentes para a largura total.
- Manter compatibilidade com cursos antigos: componente sem `layout.columnSpan` usa uma coluna.
- Manter traduções pt-BR, en e es para os novos controles.

## Fora do escopo
- Posicionamento livre por coordenadas, conexões entre blocos ou programação visual estilo Scratch.
- Coleção separada de scripts, importação/exportação versionada e execução de código de autoria.
- Alterações no contrato de persistência do backend; os campos opcionais continuam dentro do JSON `modules` já existente.

## Arquivos previstos
- `corseweb.client/src/types/course.ts`
- `corseweb.client/src/Pages/AdminCourseEditor/LessonCanvasEditor.tsx`
- `corseweb.client/src/Pages/AdminCourseEditor/LessonCanvasEditor.scss`
- `corseweb.client/src/Pages/AppLessonPage/AppLessonPage.tsx`
- `corseweb.client/src/Pages/AppLessonPage/AppLessonPage.scss`
- `docs/TODO.md`
- `docs/FRONTEND/TODO.md`

## Critérios de aceitação
- [ ] Um bloco com 2 ou 3 colunas permite atribuir a um componente uma largura compatível com esse grid.
- [ ] A largura salva é exibida no canvas e na página do aluno.
- [ ] Conteúdo antigo sem a propriedade opcional continua em uma coluna e não exige migração.
- [ ] Em viewport de 320–640 px, o grid colapsa para uma coluna e não cria rolagem horizontal causada por spans.
- [ ] Controles de reordenação por botões e navegação por teclado continuam disponíveis.
- [ ] Os rótulos dos novos controles existem em pt-BR, en e es.
- [ ] CI: lint, testes disponíveis, build do frontend e build do backend verificados; nenhum resultado é declarado sem evidência.
- [ ] Teste manual em navegador real e conferência móvel/tablet/desktop pelo proprietário.

## Evidências
Serão preenchidas após a execução da CI para o commit final desta branch. A validação visual manual permanece pendente até ser feita pelo proprietário.
