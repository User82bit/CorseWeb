# API-TEST-001 — integração HTTP do backend

## Objetivo

Validar os contratos públicos do ASP.NET Core através de requisições HTTP reais em um servidor de teste, executando autenticação por cookie, autorização, controllers e persistência EF Core/SQLite no mesmo fluxo.

## Infraestrutura

- `Microsoft.AspNetCore.Mvc.Testing` e `WebApplicationFactory<Program>`.
- Ambiente isolado `Testing`, sem depender do login de desenvolvimento.
- `AdminEmails` configurado exclusivamente para os testes.
- SQLite em memória compartilhado, mantido aberto por uma conexão guardiã durante a suíte.
- Migrações reais executadas pelo startup da aplicação.
- Cada cliente HTTP mantém seu próprio cookie, permitindo validar isolamento entre usuários.

## Cobertura da primeira etapa

### Autenticação e autorização
- Requisição anônima a rota protegida retorna 401.
- Registro cria sessão por cookie; `/api/auth/me` reconhece a sessão.
- E-mail duplicado retorna 409.
- Senha local incorreta retorna 401.
- Papel admin é derivado de `AdminEmails`, não do corpo da requisição.
- Logout invalida a sessão e chamadas protegidas retornam 401.

### Cursos, versões e rascunhos
- Usuário autenticado cria curso válido; usuário anônimo não pode criar.
- Curso publicado é consultável por outro usuário.
- Proprietário pode atualizar; outro usuário recebe 403.
- Atualização gera nova versão/snapshot.
- Arquivar esconde o curso da consulta pública; republicar o torna visível novamente.
- Histórico contém snapshot inicial, atualização e transições de status.
- Rascunho não pode ser lido por outro usuário comum; admin pode consultar e remover.

### Matrícula e progresso
- Aluno pode matricular-se em curso publicado.
- Percentual enviado no corpo de progresso é ignorado.
- Aula não publicada não pode ser definida como atual nem concluída.
- Conclusão de aula publicada gera 100% no cenário de uma aula elegível.
- Repetir conclusão é idempotente.
- Um terceiro usuário não visualiza nem cancela matrícula de outro.
- Cancelamento remove eventos de conclusão por cascade delete.

### Upload
- Upload sem sessão retorna 401.
- Conteúdo sem assinatura PNG/JPEG/WebP suportada é rejeitado.

## Validação automatizada

A suíte é chamada pelo mesmo executável `CorseWeb.ProgressTests` que verifica as regras de projeção do progresso, esquema/migrações SQLite e versionamento. O workflow de CI executa esse harness depois do build Release.

## Lacunas conhecidas

A primeira etapa não afirma cobertura completa de API. Ainda precisam ser adicionados:

- Google OAuth com token válido/inválido sem chamadas reais a contas externas (usar token/verificador substituível de teste).
- Expiração, renovação deslizante e reemissão de cookie quando a role muda.
- Proteção CSRF e validação de origem conforme a configuração final de produção.
- Concorrência em cadastro, matrículas, publicações e conclusão simultânea.
- Atualização/publicação de rascunho (novo curso e edição de curso existente), exclusão de cursos e casos de autorização administrativos adicionais.
- Upload de arquivos de imagem válidos, tamanho máximo, formatos truncados e falhas de armazenamento.
- Upgrade de banco legado e recuperação de migração, sem usar dados reais.
- Testes HTTP de resposta pública sem gabaritos/soluções privados.

A conclusão desta primeira etapa move API-TEST-001 para **Iniciada**, não para Finalizada. A aprovação do CI valida somente os cenários automatizados listados acima.
