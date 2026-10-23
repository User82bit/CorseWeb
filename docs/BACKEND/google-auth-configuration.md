# Configuração da autenticação Google

- **Estado:** em revisão.
- **Branch:** `fix/auth-google-configuration`.
- **Pull Request:** [#31 — Configurar autenticação Google por ambiente](https://github.com/User82bit/CorseWeb/pull/31).


## Como o login atual funciona

O frontend usa Google Identity Services para receber um **ID token**. O backend lê `Authentication:Google:ClientId`, valida o token com esse Client ID e cria a sessão por cookie.

- **Client ID:** necessário no frontend e no backend. O endpoint `GET /api/auth/config` retorna somente esse valor público e um indicador `configured`.
- **Client Secret:** está declarado no `appsettings.json`, mas o fluxo atual **não o utiliza**. Não é necessário para validar o ID token. Não exponha o segredo com variáveis `VITE_*` nem o envie ao navegador.
- **Arquivo `.env`:** o backend ASP.NET Core não carrega arquivos `.env` automaticamente. Use o arquivo JSON local descrito abaixo em desenvolvimento e variáveis de ambiente no serviço de produção.

## Desenvolvimento local

1. Crie o arquivo `CorseWeb.Server/appsettings.Development.local.json`. Ele é carregado automaticamente somente quando o ambiente ASP.NET Core é `Development` e está excluído do Git pelo `.gitignore`.
2. Coloque os valores locais nesse arquivo, não no `appsettings.json` versionado:

```json
{
  "Authentication": {
    "Google": {
      "ClientId": "SEU_CLIENT_ID.apps.googleusercontent.com",
      "ClientSecret": "SEU_CLIENT_SECRET"
    }
  }
}
```

3. Reinicie o backend e confira `GET /api/auth/config`. Ele deve retornar `configured: true` e o Client ID esperado; nunca deve retornar o Client Secret.

O campo `ClientSecret` do exemplo é opcional para o login atual e pode permanecer vazio. Guardá-lo não ativa um fluxo OAuth server-side. Para esse tipo de fluxo será necessária uma implementação própria antes de o segredo ter qualquer efeito.

O arquivo local é carregado abaixo dos arquivos JSON padrão, mas acima das variáveis de ambiente e dos argumentos da linha de comando. Isso significa que variáveis de ambiente podem sobrescrever os valores locais.

## Produção

Cadastre o Client ID nas configurações de ambiente **do serviço que executa o backend**:

```text
Authentication__Google__ClientId=SEU_CLIENT_ID.apps.googleusercontent.com
```

O ASP.NET Core converte o separador duplo `__` para a hierarquia `Authentication:Google:ClientId`. As variáveis de ambiente são suportadas pelo host padrão do ASP.NET Core e têm prioridade sobre os arquivos JSON.

Não cadastre o Client Secret para o fluxo atual por obrigação: ele não é consumido. Se um fluxo OAuth de autorização por código vier a ser implementado no futuro, configure o segredo no gerenciador de segredos/variáveis protegidas do host como `Authentication__Google__ClientSecret`, nunca no bundle do frontend.

No Google Cloud Console, confira as origens JavaScript autorizadas do OAuth Client ID. Inclua a origem real que serve o frontend (protocolo, host e porta; por exemplo, o endereço HTTPS local usado pelo Vite/SpaProxy e o domínio de produção). Não use a URL da API como origem se o frontend estiver em outro domínio.

## Cuidados de segurança

- Mantenha os campos de `CorseWeb.Server/appsettings.json` vazios para credenciais privadas; esse arquivo faz parte do repositório.
- O `.gitignore` protege arquivos locais não rastreados, mas não remove segredos de arquivos que já estejam versionados.
- Se um Client Secret real já tiver sido enviado a um commit ou repositório remoto, revogue/regenere esse segredo no Google Cloud Console; movê-lo para um arquivo ignorado não o remove do histórico.
- Erros de validação do ID token são registrados no log do servidor, mas a mensagem técnica detalhada não é devolvida ao cliente.
- CI/CD precisa disponibilizar as variáveis ao processo do backend em execução. Criar um GitHub Secret, isoladamente, não injeta automaticamente esse valor no ambiente de produção.
  
## Validação manual

1. Sem Client ID local nem variável de ambiente, `GET /api/auth/config` deve indicar `configured: false`.
2. Com `ClientId` em `appsettings.Development.local.json`, o endpoint deve indicar `configured: true` e expor apenas o Client ID.
3. Defina temporariamente `Authentication__Google__ClientId` com um valor de teste e confirme que ele prevalece sobre o arquivo local.
4. Faça um login Google real com as origens autorizadas no Console; confirme que o backend cria a sessão.
5. Em produção, defina a variável no host e verifique o endpoint de configuração sem nunca disponibilizar o segredo.
