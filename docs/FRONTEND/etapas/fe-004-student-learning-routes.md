# FE-004 — Reconstrução das rotas de aprendizagem do aluno

## Identificação
- **Estado:** EM REVISÃO
- **Branch:** `feat/student-learning-routes`
- **PR:** [#19 — biblioteca, página de curso e leitor de aula](https://github.com/User82bit/CorseWeb/pull/19)
- **Base do PR:** `Homologa`; a branch de trabalho foi criada a partir da `master` atualizada.
- **Rotas envolvidas:** `/app/courses`, `/app/courses/:courseSlug` e `/app/courses/:courseSlug/lessons/:lessonSlug`.

## Alterações
- `/app/courses`: virou a biblioteca de cursos em que o aluno realmente se inscreveu. Mostra busca, filtros por todos/em andamento/concluídos, estados de carregamento/erro/vazio e os percentuais salvos pelo backend. Não mistura cursos de autoria nem rascunhos.
- `/app/courses/:courseSlug`: mostra detalhes e currículo do curso publicado, inscrição/continuação, módulos, aulas e indicadores derivados do progresso persistido.
- `/app/courses/:courseSlug/lessons/:lessonSlug`: leitor responsivo com breadcrumbs, aulas anterior/próxima, renderização de blocos/componentes de conteúdo suportados e ação para marcar a aula concluída.
- Criado `src/store/enrollmentStore.ts` para integrar `GET /api/enrollments`, `POST /api/enrollments/{courseSlug}` e `PUT /api/enrollments/{courseSlug}/progress`.
- Ao abrir uma aula, registra-se somente a última aula acessada. A porcentagem geral aumenta apenas quando as aulas são explicitamente marcadas como concluídas.
- Adicionadas traduções para pt-BR, en e es, com ajustes para estados de erro e repetição da gravação de progresso.
- Layouts foram reconstruídos mobile-first, incluindo responsividade, foco, navegação por teclado e preferência por movimento reduzido.

## Critérios de aceitação
- [x] CI aprovada no HEAD `fec76617d6f63f0189e21e4d7fe2b46d4522830b`: [PR run #39623025551](https://github.com/User82bit/CorseWeb/actions/runs/39623025551) passou em lint, testes de idioma, build frontend, restore e build .NET.
- [ ] Inscrever-se em um curso publicado o adiciona à biblioteca do aluno.
- [ ] Uma inscrição existente continua aparecendo após recarregar a página.
- [ ] Abrir uma aula registra a última aula acessada sem incrementar conclusão artificialmente.
- [ ] Marcar uma aula como concluída persiste seu status e atualiza a porcentagem real do curso; o dado continua após recarregar.
- [ ] Cursos sem módulos/aulas, falhas de rede e repetição após erro possuem estados utilizáveis.
- [ ] Layout testado manualmente em 320–375 px, tablet e desktop; teclado, foco e traduções verificados.

## Limites conhecidos
- A CI aprovada no HEAD `fec76617d6f63f0189e21e4d7fe2b46d4522830b` ([run #39623025551](https://github.com/User82bit/CorseWeb/actions/runs/39623025551)): lint, testes de idioma, build frontend, restore e build .NET passaram.
- Interatividade completa de quizzes/exercícios ainda não foi implementada; o leitor mostra um marcador informativo para essas atividades.
- Não houve teste manual num navegador real nesta sessão. Não considerar matrícula, gravação de progresso nem qualidade visual como validados apenas por causa do build.
