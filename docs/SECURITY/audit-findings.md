# Achados da auditoria — segurança e integridade

Atualizado em 2026-11-07. Esta página registra comportamentos observados no código da branch `Homologa`; não substitui teste de invasão, revisão jurídica ou validação operacional.

## Resumo por prioridade

| ID | Prioridade | Estado Kanban | Tema |
|---|---|---|---|
| PROG-001 | P0 | Precisa de correção | O servidor confia no percentual de progresso enviado pelo cliente |
| VERSION-001 | P1 | Precisa de correção | Alteração de status não cria versão nem snapshot |
| DB-001 | P1 | Revisão | Migração da coluna de senha depende de compatibilidade manual SQLite |
| AUTH-001 | P1 | Revisão | Rever sessão por cookie, CSRF e configuração por ambiente |
| MEDIA-001 | P1 | Revisão | Upload confere assinatura inicial, mas precisa validar/reprocessar imagem |
| STORE-001 | P2 | Revisão | Fallback localStorage pode confundir estado local e estado persistido |

## PROG-001 — progresso controlado pelo cliente

**Evidência:** `AppLessonPage.tsx` monta `overallPercent`, `currentLessonId` e `modulesProgress` no navegador. `EnrollmentsController.UpdateProgress` aceita os três valores do DTO; limita `overallPercent` a 0–100, serializa o JSON recebido e define `CompletedAt` quando `OverallPercent >= 100`.

**Impacto:** o servidor não comprova que as aulas, quizzes ou atividades foram concluídos. Um cliente pode enviar 100% e um progresso de módulos arbitrário, fazendo a matrícula parecer concluída sem a validação pedagógica correspondente.

**Correção recomendada:**

1. Fazer o servidor validar se o curso, módulo e aula pertencem à matrícula/curso publicado.
2. Não aceitar `overallPercent` como autoridade. Calcular totais e conclusão a partir de eventos de conclusão validados pelo servidor.
3. Criar contratos de tentativa de quiz/atividade; corrigir resposta e pontuação no servidor, sem confiar em gabarito/nota do navegador.
4. Rejeitar progresso impossível, IDs de aula desconhecidos, módulos duplicados e transições inválidas.
5. Persistir conclusão e `CompletedAt` na mesma transação após validar o evento.
6. Adicionar testes positivos e negativos para 0%, 100%, IDs estrangeiros, matrícula inexistente e repetição concorrente.

Até isso ser implementado, não usar o percentual do aluno para liberar certificados, conteúdos pagos ou decisões de acesso.

## VERSION-001 — status fora do histórico de versões

**Evidência:** `CourseMapper.ApplyUpdate` incrementa `Course.Version`; `CoursesController.Update` grava snapshot. A publicação de rascunho também incrementa versão e cria `CourseVersion`. Porém `CoursesController.PublishToggle` altera `Status`, `UpdatedAt` e `UpdatedBy` sem incrementar `Version` nem criar snapshot.

**Correção recomendada:** decidir se mudanças de status fazem parte do histórico. Se fizerem, centralizar a transição num serviço que atualize status, versão e snapshot atomicamente. Padronizar também a semântica do valor `rascunho`, que no endpoint de curso publicado é convertido para `arquivado`.

## DB-001 — criação e migração do schema

**Evidência:** `Program.cs` aplica migrações pendentes; quando não há migrações, chama `EnsureCreated`. A coluna `PasswordHash` é garantida por `EnsurePasswordHashColumn`, que usa `PRAGMA table_info` e `ALTER TABLE` específico para SQLite. A migração inicial não representa essa coluna como uma migração versionada.

**Revisão necessária:**

- Criar migração EF Core explícita para `PasswordHash` e alinhar o model snapshot.
- Testar banco vazio, banco criado com `EnsureCreated`, banco existente antigo e banco parcialmente atualizado.
- Evitar que falha de `Migrate()` seja interpretada como atualização bem-sucedida por `EnsureCreated()` num banco existente.
- Definir backup/restore e política de migração antes de qualquer banco de produção.

Não executar `EnsureCreated`, `Migrate` ou scripts corretivos sobre dados reais sem cópia de segurança.

## AUTH-001 — sessão por cookie

**Evidência:** o backend usa cookie `HttpOnly`, `SameSite=Lax`, `SecurePolicy=SameAsRequest`, validade de 14 dias e renovação deslizante. O papel de administrador é resolvido no backend por `AdminEmails`. O login Google valida ID token; a conta local usa `PasswordHasher`.

**Revisão necessária:**

- Validar que produção sempre atende por HTTPS e que o proxy reverso encaminha corretamente o protocolo original.
- Definir proteção CSRF apropriada para endpoints que alteram dados com autenticação por cookie (por exemplo, token antifalsificação ou validação estrita de origem, conforme a arquitetura de deploy).
- Cobrir login/logout, expiração, reemissão de papel, acesso de usuário comum e tentativas de chamar endpoints admin diretamente.
- Garantir que `AdminEmails` de produção seja configurado no ambiente do serviço e que o fallback de desenvolvimento nunca seja usado como controle de produção.
- Validar origem autorizada, Client ID e fluxo Google real sem expor segredo ao navegador.

Este item é uma revisão de postura/configuração; a leitura estática não comprova uma exploração CSRF.

## MEDIA-001 — upload de capa

**Evidência:** `CourseMediaController` exige sessão, limita arquivos a 5 MB, reconhece assinaturas iniciais PNG/JPEG/WebP e grava com nome aleatório em `wwwroot/uploads/course-covers`. O arquivo é disponibilizado como conteúdo estático.

**Revisão necessária:**

- Decodificar a imagem com biblioteca confiável e recusar arquivo truncado/malformado, não confiar somente nos bytes iniciais.
- Considerar reprocessamento/re-encode para remover metadados e conteúdo inesperado.
- Aplicar limites de dimensões e política de armazenamento.
- Definir limpeza de capas órfãs ao excluir rascunhos/cursos e observar falhas de escrita.
- Validar autorização, formatos, tamanho máximo, nomes aleatórios e renderização da URL.

## STORE-001 — cache e fallback local

**Evidência:** `courseStore.ts` combina caches em memória, localStorage, dados publicados/rascunhos da API e um catálogo legado local. Na criação, falhas de autenticação/rede podem levar a um fallback local; leituras também combinam backend e conteúdo legado.

**Revisão necessária:** distinguir claramente conteúdo persistido no servidor de conteúdo apenas local; não exibir mensagem de sucesso de salvamento remoto quando ocorreu fallback; permitir sincronizar ou descartar dados locais; testar expiração de cache, duas abas e conflito com o servidor.

## Limites do que foi verificado

- A auditoria foi estática; não foi feito teste dinâmico, fuzzing, teste de carga, teste de penetração nem validação de deploy.
- Os achados descrevem código e fluxo observáveis na branch de referência. Não implicam que já exista exploração conhecida em produção.
- O workflow atual executa lint, testes disponíveis do cliente e builds; não há projeto de teste de integração .NET ou suíte E2E no inventário.