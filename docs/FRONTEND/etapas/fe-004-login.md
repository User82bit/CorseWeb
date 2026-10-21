# FE-004 — Corrigir o fluxo de login

## Objetivo
Priorizar o funcionamento de `/login` antes de continuar a reconstrução das outras páginas públicas.

## Auditoria inicial
- A tela usa `JSON.stringify(...)` nas chamadas de login, mas o wrapper `apiFetch` não definia `Content-Type: application/json` para corpos que já eram strings. O servidor recebe esses dados com `[FromBody]`.
- O script do Google é carregado com `async defer`. A tela só verificava `window.google` quando o ID do cliente chegava; caso o script ainda não estivesse pronto nesse instante, o botão poderia nunca ser inicializado.
- O endpoint `/api/auth/dev-login` é restrito ao ambiente `Development`, embora a interface antiga mostrasse o formulário de teste independentemente do ambiente.

## Alterações
- [x] `apiFetch` define `Content-Type: application/json` para corpos que começam como objetos ou arrays JSON, se o chamador não definiu outro tipo.
- [x] `LoginPage` aguarda a configuração do servidor e o carregamento do script do Google, com tratamento de falha.
- [x] O destino após login usa a rota protegida original quando disponível e, caso contrário, o redirecionamento padrão da autenticação.
- [x] O formulário de login de desenvolvimento aparece somente quando `import.meta.env.DEV` é verdadeiro.
- [x] O layout se adapta a telas estreitas e os estados principais usam mensagens acessíveis.

## Validação automatizada
Execução [CI #39610783762](https://github.com/User82bit/CorseWeb/actions/runs/39610783762) passou no commit `b61b04cb2769d33ece13c0971727eb6bdf1141c0`:
- [x] `npm ci`
- [x] `npm run lint`
- [x] `npm run test:i18n`
- [x] `npm run build`
- [x] `dotnet restore CorseWeb.slnx`
- [x] `dotnet build CorseWeb.slnx --no-restore --configuration Release`

## Validação manual pendente
- [ ] Testar o login de desenvolvimento com o backend em `Development`, confirmar cookie/sessão e redirecionamento para `/app` ou para a rota original.
- [ ] Testar o login Google real com `Authentication:Google:ClientId` válido.
- [ ] Confirmar layout e teclado em 320–375 px, tablet e desktop.

## Limites
- Não foram adicionadas credenciais Google ao repositório. Para login Google fora de desenvolvimento, o servidor precisa configurar `Authentication:Google:ClientId`.
- Build verde não comprova autenticação real; os dois fluxos ainda precisam da validação manual acima.
