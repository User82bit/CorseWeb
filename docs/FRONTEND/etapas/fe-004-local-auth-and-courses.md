# FE-004 — Autenticação local e reconstrução de Login/Catálogo

## Escopo
- Adicionar cadastro e login por e-mail/senha usando o banco do backend.
- Preservar a autenticação Google existente.
- Reconstruir visualmente `/login` e `/courses`, mobile-first, com navegação acessível e suporte a pt-BR, English e Español.
- Não enviar alterações diretamente para `master`; esta entrega usa uma branch independente baseada em `Homologa`.

## Auditoria e decisões
- `AppUser` ainda não possuía hash de senha. Foi adicionado `PasswordHash` nullable para permitir usuários que continuam autenticando somente com Google.
- Senhas locais são processadas com `PasswordHasher<AppUser>` do ASP.NET Core Identity; não são salvas em texto puro nem retornadas em `UserDto`.
- O endpoint de cadastro é `POST /api/auth/register`; ele valida nome, e-mail e senha, calcula o hash, salva o usuário e cria a sessão por cookie.
- O endpoint de login local é `POST /api/auth/local-login`; verifica o hash no backend e emite o mesmo cookie HttpOnly da autenticação Google.
- Cadastro exige senha de pelo menos 8 caracteres e limita a 128; e-mail é normalizado para minúsculas. A permissão de administrador continua definida pelo servidor via `AdminEmails`, nunca por dados enviados pelo cliente.
- Como o banco SQLite existente é inicializado com `EnsureCreated` e não recebe novas colunas automaticamente, a inicialização garante a presença de `Users.PasswordHash` sem apagar os dados atuais.
- A interface apresenta modos de entrar/criar conta, validação do formulário, alternância com Google, estados de carregamento/erro e retorno à rota originalmente solicitada.
- A tela `/courses` tem identidade visual própria alinhada à Home, com busca, filtros de categoria e nível, ordenação e estados de carregamento/erro/vazio/sem resultados. Só exibe cursos publicados.

## Arquivos afetados
- `CorseWeb.Server/Models/AppUser.cs`
- `CorseWeb.Server/Dtos/AuthDtos.cs`
- `CorseWeb.Server/Controllers/AuthController.cs`
- `CorseWeb.Server/Program.cs`
- `corseweb.client/src/store/authStore.ts`
- `corseweb.client/src/Pages/Login/LoginPage.tsx`
- `corseweb.client/src/Pages/Login/LoginPage.scss`
- `corseweb.client/src/Pages/CoursesPage/CoursesPage.tsx`
- `corseweb.client/src/Pages/CoursesPage/CoursesPage.scss`
- `corseweb.client/src/i18n/types.ts`
- `corseweb.client/src/i18n/translations/{pt-BR,en,es}.ts`
- `docs/TODO.md`
- `docs/FRONTEND/TODO.md`

## Validação
- [ ] CI completa: lint, testes de idiomas, build frontend, restore e build .NET.
- [ ] Testar cadastro local com e-mail novo e verificar que uma sessão é criada.
- [ ] Sair, entrar com o e-mail/senha recém-cadastrados e confirmar o redirecionamento.
- [ ] Confirmar que senha incorreta e e-mail desconhecido recebem a mesma mensagem genérica.
- [ ] Confirmar que usuário Google existente continua conseguindo entrar com Google.
- [ ] Confirmar que o botão Google continua renderizado com o script carregando antes/depois da configuração.
- [ ] Abrir `/login` e `/courses` em 320–375 px, tablet e desktop; testar teclado, foco, menu mobile, idioma e filtros do catálogo.

## Limitações
- Usuários existentes criados exclusivamente pelo Google não têm senha local automaticamente. Eles continuam podendo usar Google; o cadastro local não permite tomar uma conta existente por e-mail.
- Não foi implementado fluxo de recuperação de senha ou verificação de e-mail, pois o repositório não tem serviço de e-mail configurado.
- A aprovação de build não substitui os testes manuais de login e validação visual. Não declarar esses testes como concluídos até serem realizados.
