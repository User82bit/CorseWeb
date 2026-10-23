# CorseWeb — TODO do Frontend

## Diretriz obrigatória: mobile-first

Toda branch de interface deve começar pela experiência de celular. A definição inicial inclui conteúdo prioritário, navegação, interação por toque, foco/teclado, estados de carregamento/erro/vazio e acessibilidade. Somente depois de verificar o layout móvel serão implementadas as adaptações para tablet e desktop.

Não aceitar uma interface que apenas encolhe um layout de desktop. Cada etapa deve indicar como validar o comportamento móvel e as larguras maiores.

## Premissa de estado atual

Segundo o proprietário, apenas o sistema de tradução — ainda incompleto — deve ser considerado funcional. As outras telas, componentes, estilos e fluxos não são considerados entregas aprovadas: precisam ser avaliados e, quando reconstruídos, receber novo design. A existência do código atual serve para entender contratos e reaproveitar o que for validado, não para impor a preservação visual.

## TODO

| ID | Entrega | Estado | Critério principal |
|---|---|---|---|
| FE-001 | Reconstruir a Home pública com design responsivo mobile-first | INTEGRADA em `master` (validação visual pendente) | [PR #4](https://github.com/User82bit/CorseWeb/pull/4); inspeção visual manual em celular/tablet/desktop ainda pendente |
| FE-006 | Corrigir carregamento do provedor de idioma em Windows | INTEGRADA em `master` | [PR #5](https://github.com/User82bit/CorseWeb/pull/5); CI passou e o proprietário confirmou que a inicialização local funciona |
| FE-007 | Unificar a marca da Home com o ícone oficial e harmonizar o seletor de idioma | INTEGRADA em `master` (validação visual pendente) | [PR #6](https://github.com/User82bit/CorseWeb/pull/6); CI passou; inspeção visual responsiva ainda pendente |
| FE-008 | Centralizar SVGs inline na pasta `src/assets` | INTEGRADA em `master` (validação visual pendente) | [PR #8](https://github.com/User82bit/CorseWeb/pull/8); CI aprovada; inspeção visual responsiva pendente |
| FE-002 | Revalidar e completar o sistema de tradução | INTEGRADA em `master` (validação manual pendente) | [PR #10](https://github.com/User82bit/CorseWeb/pull/10); testes automatizados e CI passaram; conferência manual de `html lang` pendente |
| FE-003 | Consolidar os fundamentos visuais responsivos e acessíveis | INTEGRADA em `master` (validação visual pendente) | [PR #12](https://github.com/User82bit/CorseWeb/pull/12); CI aprovada para o código; inspeção visual em navegador real pendente |
| FE-004 | Reconstruir as áreas pública, do aluno e administrativa por etapas independentes | EM DESENVOLVIMENTO | Rotas públicas e do aluno integradas em master ([PR #14](https://github.com/User82bit/CorseWeb/pull/14), [PR #17](https://github.com/User82bit/CorseWeb/pull/17), [PR #19](https://github.com/User82bit/CorseWeb/pull/19)); administração em revisão ([PR #21](https://github.com/User82bit/CorseWeb/pull/21)); CI aprovada no commit 936d3f4928b7d5c20baf5bf1ef4661d675e992d5 ([run #39629101208]); validação visual manual pendente. O sistema de criação/edição de cursos está explicitamente reservado para outra branch; o detalhe público /courses/:courseSlug está em revisão no [PR #29](https://github.com/User82bit/CorseWeb/pull/29), branch fix/public-course-detail-redesign. |
| FE-005 | Auditar e corrigir imagens e recursos de mídia | NÃO INICIADA | Cada recurso encontrado com caminho real, dimensões/formato adequados, alternativa textual e destino verificável |

| FE-009 | Criar editor visual da estrutura: módulos, aulas, reordenação e persistência | INTEGRADA em `master` (validação manual pendente) | [PR #23](https://github.com/User82bit/CorseWeb/pull/23); a estrutura Curso → Módulos → Aulas já está no editor. A composição em grid é acompanhada em FE-010 |
| FE-010 | Editor antigo em blocos/componentes e larguras de coluna | SUBSTITUÍDO por BREAKING CHANGE | [PR #33](https://github.com/User82bit/CorseWeb/pull/33); o formato-alvo agora é `elements[]` com posições livres no canvas; compatibilidade antiga não será mantida |
| FE-011 | Canvas visual de cards arrastáveis para cursos/aulas | EM REVISÃO | Branch `feat/visual-course-editor-breakchange` / [PR #36](https://github.com/User82bit/CorseWeb/pull/36); criação de rascunho abre o editor, paleta esquerda, canvas pontilhado central, inspetor direita, contrato `elements[]`; CI inicial passou; validação manual pendente. Critérios em `etapas/fe-011-lesson-editor-workspace.md` |

## Regras para imagens manuais

Se a inclusão autônoma de um recurso não for possível, a entrega deve incluir: descrição básica da imagem, termos de pesquisa prontos para copiar (português e/ou inglês), nome de arquivo/extensão sugeridos, pasta exata de destino e o componente/página que utilizará o arquivo. Verificar primeiro a estrutura real do repositório e separar recursos decorativos de conteúdo que precisa de alternativa acessível.

## Dependências e limites

- FE-001 parte da `master` atualizada após a integração da CI-001.
- Não codificar o curso de inglês como um caso especial.
- Não substituir React/TypeScript/TSX/SCSS por outras tecnologias sem justificativa e autorização.
- Não criar branches futuras antes do momento previsto no fluxo.
