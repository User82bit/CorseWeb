# FE-001 — Reconstrução da Home pública (mobile-first)

## Identificação

- **Tipo:** `feat` + `style`
- **Estado:** EM REVISÃO
- **Branch:** `feat/homepage-mobile-first`
- **PR:** [#4 — feat(home): reconstrói a Home pública mobile-first](https://github.com/User82bit/CorseWeb/pull/4)
- **Base:** `master` em `1789405eb5c7654e49ef9aa496ae7b42201ce899`

## Objetivo

Iniciar a reconstrução visual e funcional do frontend por uma entrega pública pequena e revisável: a Home. A implementação deve ser desenhada primeiro para celular e, somente depois, adaptada para tablet e desktop.

## Premissas do proprietário

- Somente a tradução, ainda incompleta, é considerada funcional no estado atual.
- Não tratar telas, componentes, APIs, autenticação ou persistência existentes como fluxos comprovadamente funcionais.
- Reutilizar o sistema de tradução como base, completando os textos necessários em português brasileiro, inglês e espanhol.
- Não preservar o design antigo por conveniência. A Home recebe uma nova composição visual.
- Não alterar diretamente `master` ou `Homologa`.

## Escopo

- Reconstruir `HomePage.tsx` e `HomePage.scss`.
- Adotar uma hierarquia visual nova com navegação compacta, hero, seção explicativa, catálogo de destaque, CTA e rodapé.
- Construir a composição ilustrativa com SVG inline e CSS, sem dependência de uma imagem externa.
- Priorizar largura móvel, áreas de toque, menu expansível, estados de carregamento/vazio/erro e foco visível.
- Adicionar chaves de tradução para toda a cópia criada nesta página nos três idiomas já definidos.
- Atualizar o Kanban e documentar a etapa.
- Manter as rotas e as interfaces públicas atualmente usadas pela página (`/courses`, `/login`, `/app`, `/admin`) sem afirmar que seus fluxos foram validados.

## Arquivos afetados

- `corseweb.client/src/Pages/HomePage/HomePage.tsx`
- `corseweb.client/src/Pages/HomePage/HomePage.scss`
- `corseweb.client/src/i18n/types.ts`
- `corseweb.client/src/i18n/translations/pt-BR.ts`
- `corseweb.client/src/i18n/translations/en.ts`
- `corseweb.client/src/i18n/translations/es.ts`
- `docs/TODO.md`
- `docs/FRONTEND/TODO.md`
- `docs/FRONTEND/etapas/fe-001-homepage-mobile-first.md`
- `docs/CI/etapas/ci-initial-validation-pipeline.md` (ajuste de estado histórico após integração)

## Decisões técnicas

- Preservar React, TypeScript, TSX, SCSS/Sass e as dependências existentes.
- Não adicionar uma biblioteca de ícones nem outro pacote para a Home.
- Definir os estilos-base para telas pequenas; media queries posteriores ampliam a composição em breakpoints maiores.
- Usar SVG/CSS para a ilustração da seção hero, evitando requisitar assets externos.
- Tratar as imagens de capa de curso como conteúdo opcional: reservar proporção, carregá-las sob demanda e manter fundo alternativo se o recurso falhar.
- Não colocar novos textos em português diretamente no JSX; os textos da Home devem vir do sistema de tradução.
- Respeitar `prefers-reduced-motion` e foco visível.

## Implementação

- [x] Confirmar que PR #2 foi integrado em `master`.
- [x] Criar a branch a partir do `master` atualizado.
- [x] Auditar a Home existente e seus pontos de integração.
- [x] Implementar uma nova composição mobile-first.
- [x] Adaptar layout para tablet e desktop.
- [x] Adicionar as novas chaves de tradução aos três idiomas.
- [x] Executar lint e build pelo CI após publicar a branch.
- [x] Inspecionar o diff completo antes de abrir PR.
- [x] Abrir PR #4 para `Homologa` e registrar a validação inicial; revisão do proprietário pendente.

## Testes e resultados

- **Execução local:** não disponível neste ambiente; a validação será realizada pelo GitHub Actions.
- **CI do push:** aprovado em [execução #39591632969](https://github.com/User82bit/CorseWeb/actions/runs/39591632969). Passaram `npm ci`, `npm run lint`, `npm run build`, `dotnet restore CorseWeb.slnx` e `dotnet build CorseWeb.slnx --no-restore --configuration Release`.
- **CI do Pull Request:** execução [#39591849630](https://github.com/User82bit/CorseWeb/actions/runs/39591849630) iniciada; aguardar resultado para confirmar o estado final do PR.
- **Consistência de tradução:** conferidas as chaves de Home utilizadas no TSX contra o tipo e as três traduções; nenhum campo ausente.
- **Teste manual em celular/tablet/desktop:** pendente; o build não comprova ausência de overflow nem qualidade visual real.
- **Testes funcionais de API/autenticação:** fora do escopo e não presumidos como funcionando.

## Critérios de aceitação

1. `npm run lint` passa sem desativar regras.
2. `npm run build` conclui com sucesso.
3. Layout começa em celular e não apresenta overflow horizontal em 320 px.
4. Navegação móvel funciona por toque e teclado; estado do menu é comunicado com `aria-expanded`.
5. As adaptações para tablet e desktop estão em media queries posteriores às regras móveis.
6. A Home e seus novos textos funcionam ao selecionar pt-BR, inglês ou espanhol.
7. O catálogo tem estados distintos de carregamento, erro de comunicação quando detectável e lista vazia.
8. Imagens de capa não causam colapso de layout se estiverem ausentes ou falharem.
9. Movimento respeita `prefers-reduced-motion`; foco visível é mantido.
10. O diff não altera arquivos de traduções fora do escopo nem muda contratos de API.
11. Kanban e esta etapa refletem o resultado efetivamente testado.

## Problemas conhecidos e riscos

- A função atual `refreshCourses` pode não expor todos os erros HTTP ao chamador; o estado de erro de interface só pode apresentar falhas que sejam propagadas pelo contrato existente. A validação completa da API será uma etapa separada do backend.
- Autenticação, catálogo e rotas ainda não foram validados funcionalmente; manter os pontos de integração não comprova que os fluxos estejam corretos.
- A tradução ainda pode ter lacunas em outras páginas. Esta etapa completa somente a cópia da Home.

## Resumo técnico para a próxima sessão

A Home foi escolhida como primeira superfície visual a reconstruir. A implementação deve evitar dependências de imagem externas, aproveitar o provedor de tradução existente e manter o design mobile-first. Após revisão e integração desta etapa, a próxima branch deverá partir da `master` atualizada e trabalhar em apenas uma entrega independente.
