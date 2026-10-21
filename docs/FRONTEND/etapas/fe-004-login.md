# FE-004 — Corrigir o fluxo de login

## Objetivo
Priorizar o funcionamento de `/login` antes de reconstruir outras páginas públicas.

## Auditoria inicial
- A tela usa `JSON.stringify(...)` nas chamadas de login, mas o wrapper `apiFetch` não definia `Content-Type: application/json` para corpos que já eram strings. O servidor recebe esses dados com `[FromBody]`.
- O script do Google é carregado com `async defer`. A tela só verificava `window.google` quando o ID do cliente chegava; caso o script ainda não estivesse pronto nesse instante, o botão poderia nunca ser inicializado.
- O endpoint `/api/auth/dev-login` é restrito ao ambiente `Development`, embora a interface antiga mostrasse o formulário de teste independentemente do ambiente.

## Alterações
- `apiFetch` define `Content-Type: application/json` para corpos de texto que começam como objetos ou arrays JSON, quando o chamador não informou outro tipo.
- `LoginPage` espera a configuração do servidor e o carregamento do script do Google, com tratamento de falha.
- O destino após login usa o destino protegido original quando disponível e, caso contrário, o redirecionamento padrão da função de autenticação.
- O formulário de login de desenvolvimento é exibido somente quando `import.meta.env.DEV` é verdadeiro.
- O layout foi ajustado para reduzir risco de estouro em telas estreitas e os estados principais usam mensagens acessíveis.

## Critérios de aceitação
- [ ] Uma requisição de login baseada em JSON envia `Content-Type: application/json`.
- [ ] O botão do Google é inicializado tanto quando o script já carregou quanto quando carrega depois da configuração.
- [ ] Falhas de configuração ou carregamento ficam visíveis; não deixam apenas uma área vazia.
- [ ] Login de desenvolvimento aparece apenas em ambiente frontend de desenvolvimento e reporta erros do servidor.
- [ ] Após autenticar, o usuário retorna à rota que motivou o login, quando houver.
- [ ] CI passa para lint, testes de idioma, build frontend, restore e build .NET.
- [ ] Revisão manual ainda deve confirmar login real por Google com Client ID válido e login de desenvolvimento com o backend em `Development`.

## Limites
- Não foram adicionadas credenciais de Google ao repositório. Para login Google fora de desenvolvimento, o servidor precisa configurar `Authentication:Google:ClientId`.
- A validação com credenciais reais depende de configuração local/de implantação e não pode ser inferida do build.
