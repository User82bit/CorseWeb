# Configuração e execução local

## 1. Pré-requisitos

- .NET SDK 10 (`CorseWeb.Server.csproj` usa `net10.0`).
- Node.js 24 e npm (versões utilizadas pelo workflow de CI).
- Git e um navegador atualizado.
- Certificado HTTPS de desenvolvimento do .NET confiável no sistema para trabalhar com o Vite/SpaProxy HTTPS.

## 2. Restaurar dependências

Na raiz do repositório:

```powershell
dotnet restore CorseWeb.slnx
```

Instale as dependências do frontend:

```powershell
cd corseweb.client
npm ci
cd ..
```

## 3. Executar a aplicação

O perfil `https` do backend usa `https://localhost:7028` e `http://localhost:5108`. O projeto referencia o Vite pelo ASP.NET Core SpaProxy; o cliente Vite usa a porta `49188`.

```powershell
dotnet dev-certs https --trust
dotnet run --project CorseWeb.Server --launch-profile https
```

Se preferir executar o cliente separadamente:

```powershell
cd corseweb.client
$env:VITE_API_PROXY_TARGET = "https://localhost:7028"
npm run dev
```

O `vite.config.ts` cria/usa certificado de desenvolvimento e encaminha `/api`, `/uploads` e `/weatherforecast` ao backend. O destino pode ser sobrescrito por `VITE_API_PROXY_TARGET`, `ASPNETCORE_HTTPS_PORT` ou `ASPNETCORE_URLS`.

## 4. Comandos disponíveis

Execute dentro de `corseweb.client`:

| Comando | Função |
|---|---|
| `npm run dev` | Servidor Vite de desenvolvimento |
| `npm run lint` | ESLint em todo o cliente |
| `npm run test:i18n` | Testes Node para resolução de locale e utilitários de capa/duração |
| `npm run build` | TypeScript (`tsc -b`) e build de produção Vite |
| `npm run preview` | Servir localmente o build de produção |

Na raiz:

```powershell
dotnet build CorseWeb.slnx --configuration Release
```

O workflow `.github/workflows/ci.yml` executa `npm ci`, lint, `npm run test:i18n`, build do frontend, restore e build Release do .NET. Não existe projeto de testes automatizados .NET nem suíte end-to-end no inventário atual.

## 5. Configuração local do backend

O backend usa `ConnectionStrings:DefaultConnection` e, por padrão, SQLite com o arquivo `CorseWeb.Server/corseweb.db`. Esse banco local e seus arquivos auxiliares estão ignorados pelo Git.

Para credenciais privadas em desenvolvimento, crie `CorseWeb.Server/appsettings.Development.local.json` (arquivo ignorado pelo `.gitignore`). Exemplo mínimo:

```json
{
  "Authentication": {
    "Google": {
      "ClientId": "SEU_CLIENT_ID.apps.googleusercontent.com"
    }
  },
  "AdminEmails": [
    "admin@example.com"
  ]
}
```

O arquivo local é carregado apenas em `Development`. Variáveis de ambiente e argumentos de linha de comando têm prioridade superior. Para produção, configure `Authentication__Google__ClientId` e `AdminEmails` no ambiente do processo/serviço, não em arquivos versionados.

O fluxo Google atual valida um ID token e utiliza o Client ID como audiência. `ClientSecret` não é consumido pelo fluxo atual e não deve ser enviado ao frontend. Consulte [configuração Google](../BACKEND/google-auth-configuration.md) para os passos completos.

`AdminEmails` contém os e-mails autorizados como administradores. A role é decidida no backend, inclusive em `/api/auth/me`; uma role guardada no browser não é fonte de autorização.

## 6. Banco e migrações

Em startup, o backend tenta aplicar migrações pendentes. Quando não há migrações, usa `EnsureCreated`; também executa uma rotina SQLite específica que garante a coluna `PasswordHash` em bancos existentes.

Essa compatibilidade precisa ser revisada antes de ampliar os ambientes ou trocar o provider. Não apagar `corseweb.db`, executar alterações destrutivas ou testar migrações diretamente sobre um banco com dados reais sem backup e autorização.

## 7. Diagnóstico rápido

| Sintoma | Verificação inicial |
|---|---|
| Vite não inicia por certificado | Executar `dotnet dev-certs https --trust` e reiniciar o terminal |
| API responde 401 | Verificar login, cookie `corseweb.auth`, domínio/protocolo e `credentials: include` |
| Login Google indisponível | Conferir `GET /api/auth/config`, Client ID e origem autorizada no Google Cloud |
| Usuário não acessa `/admin` | Verificar `AdminEmails` no backend e chamar `GET /api/auth/me` |
| Imagem enviada não carrega | Conferir URL `/uploads/course-covers/...`, static files e pasta `wwwroot/uploads/course-covers` |
| Curso aparece apenas localmente | Conferir resposta da API e fallback de `courseStore` para localStorage |

## 8. Antes de abrir um PR

1. Atualize a branch de trabalho a partir de `Homologa`.
2. Execute lint, testes disponíveis, build frontend e build .NET.
3. Teste manualmente os fluxos afetados; para interface, começar em celular e depois verificar tablet/desktop.
4. Registre comandos, resultados, ambiente e limitações no PR.
5. Abra o PR contra `Homologa`. Não altere `master` ou `Homologa` diretamente.