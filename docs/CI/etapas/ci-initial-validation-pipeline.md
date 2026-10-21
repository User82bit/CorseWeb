# CI-001 — Pipeline inicial de validação

## Identificação

- **Tipo:** `ci`
- **Estado:** EM REVISÃO
- **Branch:** `ci/initial-validation-pipeline`
- **PR:** [#2 — ci: adiciona validação automatizada inicial](https://github.com/User82bit/CorseWeb/pull/2)
- **Base de trabalho:** `master` em `bfaac3ffbac2887005467b60fc628e52bbd08fbd`

## Objetivo

Criar uma verificação automatizada inicial para o frontend React/TypeScript/SCSS e o backend ASP.NET Core/.NET 10. A pipeline deve descobrir falhas de lint ou compilação antes de integrar uma entrega.

## Problema que resolve

O repositório não possuía workflows em `.github/workflows/`, não declarou uma suíte de testes no `package.json` e não havia status checks registrados para o commit base consultado. Assim, não existia evidência de validação automatizada contínua.

## Escopo

- Adicionar `.github/workflows/ci.yml`.
- Instalar dependências do frontend a partir do `package-lock.json`.
- Executar lint e build de produção do frontend.
- Restaurar e compilar a solução .NET.
- Registrar o Kanban inicial e as diretrizes de reconstrução mobile-first.

## Arquivos previstos

- `.github/workflows/ci.yml`
- `docs/TODO.md`
- `docs/FRONTEND/TODO.md`
- `docs/BACKEND/TODO.md`
- `docs/CI/etapas/ci-initial-validation-pipeline.md`
- Ajustes mecânicos de lint, necessários para que a pipeline verifique o estado atual sem enfraquecer as regras.

## Decisões técnicas

- Runner Linux hospedado pelo GitHub.
- Node.js 24 para o frontend; Vite 8 requer Node.js 20.19+ ou 22.12+.
- .NET SDK 10.0.x, compatível com o alvo `net10.0`.
- Actions oficiais de checkout, Node e .NET, fixadas em tags de versão principais.
- Permissão mínima `contents: read`.
- Workflow acionado em pushes de branches, PRs destinados a `master` ou `Homologa`, e execução manual.
- Sem teste unitário fictício: esta etapa valida lint e compilação até que suítes de teste reais sejam definidas.

## Implementação

- [x] Workflow de CI criado.
- [x] Kanban inicial e diretrizes mobile-first registrados.
- [x] Primeira execução do CI investigada.
- [x] Corrigidos os três erros de lint reportados pela execução inicial, sem desativar regras.
- [x] Confirmar resultado do lint após as correções.
- [x] Confirmar resultado do build frontend.
- [x] Confirmar restore/build .NET.
- [x] Revisar diff e abrir PR para `Homologa`.

## Testes e resultados

- **Execução local:** não realizada neste ambiente; clone local não disponível e SDK .NET ausente no ambiente local.
- **CI remoto inicial:** falhou na etapa de lint antes de executar o build e a compilação .NET ([execução #39433046357](https://github.com/User82bit/CorseWeb/actions/runs/39433046357)).
- **Erros identificados:** variável de estado não utilizada em `AppLessonPage.tsx`; exportação do hook junto ao provider em `LanguageContext.tsx`; inicialização redundante de variável em `api.ts`.
- **Correções nesta branch:** omitida a variável de estado não utilizada; movidos o contexto e o hook para módulos separados, preservando a API pública de `useTranslation` e sem alterar os arquivos de traduções; removida apenas a inicialização redundante em `api.ts`. Essas alterações são de estrutura/lint, não um redesenho de tela nem uma confirmação de que o fluxo da aula/API esteja funcional.
- **Aviso de dependências:** `npm ci` reportou duas vulnerabilidades de severidade alta na árvore instalada. A investigação e eventual atualização serão tratadas em uma entrega separada para evitar alterações de dependências fora do escopo atual.
- **CI após as correções — push:** aprovado em [execução #39434966738](https://github.com/User82bit/CorseWeb/actions/runs/39434966738).
- **CI do Pull Request:** aprovado em [execução #39435582824](https://github.com/User82bit/CorseWeb/actions/runs/39435582824).
- **PR:** aberto para `Homologa` e aguardando revisão do proprietário.
- Nenhum teste será declarado aprovado sem resultado visível.

## Critérios de aceitação

1. O workflow passa a executar nos eventos configurados.
2. `npm ci`, `npm run lint` e `npm run build` concluem com sucesso.
3. `dotnet restore CorseWeb.slnx` e `dotnet build CorseWeb.slnx --no-restore --configuration Release` concluem com sucesso.
4. Nenhuma credencial ou segredo é adicionado.
5. O diff contém apenas CI e documentação de acompanhamento necessária, mais ajustes estritamente mecânicos que impedem a validação.
6. PR direcionado a `Homologa` com instruções de validação manual e resultados reais dos testes — cumprido; a revisão e integração pelo proprietário continuam pendentes.

## Problemas conhecidos e riscos

- O arquivo `vite.config.ts` cria/carrega certificados HTTPS durante a avaliação da configuração, inclusive no comando de build; isso pode revelar um requisito de ambiente no runner. Se o CI falhar por esse motivo, corrigir apenas o necessário para separar requisitos do servidor de desenvolvimento do build, na mesma branch.
- O projeto inclui um `.esproj` Visual Studio JavaScript SDK na solução. A compatibilidade do build da solução no runner Linux precisa ser confirmada.
- Ainda não há suíte de testes de aplicação identificada.

## Próximos passos

1. Ler o resultado do workflow após as correções.
2. Corrigir falhas relacionadas a esta entrega sem ampliar para um redesenho geral.
3. Revisar o diff e o CI após a última alteração.
4. Abrir PR para `Homologa` somente depois das verificações obrigatórias.
5. Aguardar revisão e integração em `master` antes de criar a próxima branch.

## Resumo técnico para a próxima sessão

O projeto já tem páginas em React e controllers no ASP.NET Core, mas o proprietário determinou que tradução incompleta é a única funcionalidade atualmente considerada funcional. A reconstrução futura precisa ser mobile-first em cada entrega de interface, com expansão posterior para tablet e desktop. Esta etapa não redesenha páginas; ela estabelece CI e documenta essas restrições.
