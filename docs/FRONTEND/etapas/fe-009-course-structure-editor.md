# FE-009 — Editor visual da estrutura do curso

## Identificação

- **Estado Kanban:** EM DESENVOLVIMENTO
- **Branch:** `feat/course-visual-authoring-studio`
- **Área:** Frontend e persistência existente do conteúdo
- **Objetivo:** permitir que a autoria organize módulos e aulas sem editar JSON manualmente.

## Problema que resolve

O editor administrativo só permite editar metadados do curso e exibe um espaço reservado para a estrutura educacional. Não existe uma interface utilizável para criar, renomear, ordenar ou excluir módulos e aulas.

## Escopo desta entrega

- Quadro responsivo em colunas por módulo, com aulas contidas em cada módulo.
- Criar, renomear, reordenar e excluir módulos.
- Criar, renomear, reordenar e excluir aulas.
- Editar descrições e duração estimada; marcar aula como prévia gratuita.
- Manter IDs, slugs e metadados de criação/atualização; normalizar a ordem e os totais derivados.
- Persistir a coleção `modules` por meio dos endpoints existentes de rascunhos e cursos publicados.
- Adicionar traduções para pt-BR, en e es.
- Documentar a entrega e seus critérios de validação.

## Fora do escopo desta etapa

- Canvas visual para adicionar e posicionar blocos dentro da aula.
- Programação visual por blocos no estilo Scratch.
- Editor para inserir código próprio dentro de um bloco.
- Coleção persistente de scripts separada dos módulos e das aulas.
- Execução de código arbitrário de cursos.
- Importação/exportação versionada de cursos.

Essas funcionalidades permanecem previstas para etapas posteriores; scripts importados não devem ser executados sem uma arquitetura de isolamento e permissões.

## Arquivos afetados

- `corseweb.client/src/Pages/AdminCourseEditor/AdminCourseEditor.tsx`
- `corseweb.client/src/Pages/AdminCourseEditor/AdminCourseEditor.scss`
- `corseweb.client/src/Pages/AdminCourseEditor/CourseStructureEditor.tsx`
- `corseweb.client/src/Pages/AdminCourseEditor/CourseStructureEditor.scss`
- `corseweb.client/src/store/courseStore.ts`
- `corseweb.client/src/i18n/types.ts`
- `corseweb.client/src/i18n/translations/pt-BR.ts`
- `corseweb.client/src/i18n/translations/en.ts`
- `corseweb.client/src/i18n/translations/es.ts`
- `docs/TODO.md`
- `docs/FRONTEND/TODO.md`

## Decisões técnicas

- Preservar React, TypeScript/TSX, SCSS e as rotas atuais.
- Reutilizar o contrato atual de módulos/aulas serializado na propriedade `modules`.
- A coleção de scripts não faz parte desta entrega e não é embutida nos módulos nesta fase.
- Não executar conteúdo fornecido pelo usuário.
- Priorizar layouts móveis; em telas estreitas, o quadro permite rolagem horizontal intencional para navegar entre módulos.
- Reordenação possui controles acessíveis de subir/descer, sem depender exclusivamente de arrastar e soltar.

## Implementado até o momento

- [x] Componente de quadro responsivo para módulos e aulas.
- [x] Formulários para criar módulos e aulas.
- [x] Edição de títulos, descrições, duração e disponibilidade de prévia gratuita.
- [x] Reordenação por controles de teclado/toque.
- [x] Confirmação antes de excluir módulo ou aula.
- [x] Traduções pt-BR, en e es.
- [x] Envio de módulos ao atualizar rascunhos e cursos publicados.
- [x] Revisar as alterações e validar TypeScript, lint e teste de resolução de idioma no CI.
- [x] CI verde no commit de implementação `2b3436a8e1b5c82a8dc0b5068aece5f35c0d93d0` (lint, testes de idioma, build frontend, restore/build .NET).\n- [ ] Reexecutar a CI após a atualização documental desta revisão.
- [x] Abrir PR em rascunho para `Homologa`: [PR #23](https://github.com/User82bit/CorseWeb/pull/23).\n- [ ] Tornar o PR pronto para revisão após a CI mais recente passar.

## Critérios de aceitação

- [ ] É possível criar um módulo e várias aulas sem sair do editor.
- [ ] Renomear e reordenar módulos/aulas mantém a ordem esperada.
- [ ] Excluir um módulo remove suas aulas apenas após confirmação.
- [ ] Descrição, duração e opção de prévia permanecem após salvar e recarregar.
- [ ] A estrutura existente de cursos é preservada ao editar apenas metadados.
- [ ] O editor é utilizável por teclado e em viewport móvel a partir de 320 px.
- [ ] pt-BR, en e es possuem rótulos para todos os controles novos.
- [ ] Lint, testes disponíveis, build frontend e build backend são verificados; nenhuma verificação é declarada aprovada sem evidência.

## Evidências de validação\n\n- CI run `39770612200` (commit `2b3436a8e1b5c82a8dc0b5068aece5f35c0d93d0`): sucesso.\n- `npm run lint`, `npm run test:i18n` e `npm run build` executados pela GitHub Actions; restauração e build .NET também concluídos com sucesso.\n- Não executado localmente, nem testado em navegador real nesta sessão.\n\n## Riscos e problemas conhecidos

- A CI precisa ser reexecutada após as atualizações documentais mais recentes; a revisão de implementação anterior passou.
- Build e lint não puderam ser executados localmente nesta sessão; há evidência de sucesso apenas pela GitHub Actions.
- O canvas e os scripts ainda não existem nesta entrega.
- A validação visual manual em navegador real continua necessária após a CI.

## Resumo técnico para a próxima sessão

`CourseStructureEditor` opera sobre `Module[]` e chama `onChange` ao atualizar a estrutura. `AdminCourseEditor` mantém essa coleção em estado React e inclui-a no envio de `updateCourse`. `courseStore.updateDraft` agora serializa `modules` no corpo de atualização de rascunhos; `updatePublishedCourse` também envia `modules` quando presentes. O backend já aceita `Modules` em DTOs de atualização/criação. O editor mostra um aviso indicando que o canvas da aula pertence à próxima etapa.

## Próximos passos

1. Verificar os diffs e possíveis problemas de TypeScript/SCSS.
2. Atualizar os estados documentais com evidências reais.
3. Esperar pelo resultado da GitHub Actions antes de abrir PR.
4. Após integrar esta entrega em `master), partir da nova base para a etapa do canvas, blocos visuais e scripts.
