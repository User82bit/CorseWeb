# E2E-001 — suíte Playwright

## Objetivo

Automatizar no navegador os fluxos públicos e de aluno do CorseWeb, detectar regressões de autenticação/autorização visual e verificar que a navegação/conclusão de uma aula realmente persiste no backend.

A suíte não substitui os testes HTTP/SQLite do .NET. Ela valida a integração entre navegador, Vite, proxy, cookie de sessão, controllers, EF Core e SQLite.

## Ambiente isolado

- Playwright 1.56.1 com Chromium.
- Runner Ubuntu 24.04 no GitHub Actions.
- ASP.NET Core iniciado pela configuração Playwright em `Testing`, na porta 51089.
- SQLite temporário exclusivo por execução; o caminho é gerado com UUID na pasta temporária do sistema.
- Vite iniciado em HTTP na porta 49189 apenas para o runner, apontando `VITE_API_PROXY_TARGET` para a API isolada.
- O HTTPS padrão do desenvolvimento local continua inalterado.
- A suíte não lê nem escreve o banco de desenvolvimento ou produção.

## Cenários cobertos

### Smoke tests com respostas HTTP controladas

1. Catálogo público visível em viewport mobile (390 × 844) e desktop (1440 × 900).
2. Rota de aluno redireciona uma sessão anônima para login.
3. Usuário comum não acessa a rota administrativa pelo guard do frontend.
4. Erro controlado na atualização de progresso: exibe mensagem e detalhe da API, envia `currentLessonId` e permite repetir a operação.

Esses cenários isolam a interface e não representam, por si, persistência real no banco.

### Fluxo de progresso com backend e banco reais

1. Registra um aluno de teste pela API.
2. Cria um curso publicado de teste e uma aula sem atividades pendentes.
3. Matricula o aluno no curso.
4. Abre a rota da aula no navegador.
5. Confirma que o frontend envia `PUT /api/enrollments/{slug}/progress` e recebe HTTP 200.
6. Conclui a aula pela interface e confirma o `POST .../complete`.
7. Consulta a API e verifica `overallPercent = 100` e status `concluido`.
8. Recarrega a página e confirma que o estado concluído continua visível.

O teste usa uma base SQLite temporária; o progresso nunca é criado por fixture ou resposta simulada.

## Execução local

Na pasta `corseweb.client`:

```bash
npm install
npm install --no-save --package-lock=false @playwright/test@1.56.1
npx playwright install chromium
npm run test:e2e
```

A configuração inicia o backend e o Vite em portas dedicadas. Não reutiliza a instância normal do desenvolvimento.

## CI

O workflow executa lint, testes frontend, build frontend, restore/build .NET, instalação do Chromium, E2E Playwright e a suíte HTTP/SQLite do backend.

O runner está fixado em `ubuntu-24.04`: Playwright 1.56.1 não conseguiu instalar Chromium na imagem Ubuntu 26.04 selecionada por `ubuntu-latest` no primeiro CI.

O grupo de concorrência usa o nome da branch tanto em eventos `push` quanto `pull_request`, para que a mesma alteração não gere duas execuções idênticas em paralelo.

## Critérios de aceite

- [ ] Lint, testes de unidade frontend e build frontend passam.
- [ ] Chromium instala no runner do CI.
- [ ] Todos os smoke tests passam com locale pt-BR determinístico.
- [ ] O cenário com API real passa usando SQLite temporário.
- [ ] A persistência do progresso/conclusão sobrevive ao reload.
- [ ] Build .NET e testes de integração HTTP/SQLite passam.
- [ ] Não há dependência de sessão, banco, curso ou segredo de produção.

## Limitações e próximos incrementos

- Ainda não há E2E completo da criação, edição e publicação pelo editor administrativo.
- Google OAuth real não é usado; o fluxo de conta local é suficiente para os cenários automatizados.
- Os cenários com mock continuam importantes para estados de erro que não devem depender de uma falha real de infraestrutura.
- O aceite da etapa exige CI verde e revisão manual do proprietário; merge isolado não finaliza o card.
