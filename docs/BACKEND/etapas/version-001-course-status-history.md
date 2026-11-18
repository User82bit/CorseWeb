# VERSION-001 — histórico de versões para status do curso

## Problema

O endpoint `POST /api/courses/{slug}/publish` alterava `Status`, `UpdatedAt` e `UpdatedBy`, mas não incrementava `Course.Version` nem criava `CourseVersion`. Assim, o histórico não refletia arquivamento e republicação.

## Regra de domínio

- Alterações editoriais continuam usando o versionamento de `CourseMapper.ApplyUpdate`.
- Uma transição efetiva de status também constitui uma nova versão.
- `Course` não possui estado editável `rascunho`: esse estado existe em `CourseDraft`. No endpoint de curso existente, `rascunho` é mantido como alias para `arquivado`.
- Repetir uma solicitação equivalente ao estado atual não é uma nova alteração e não cria versão.
- Cada snapshot deve registrar o estado final do curso, número da versão, autor e timestamp da transição.

## Implementação

- `CourseVersioning.ApplyStatusTransition` aplica a normalização, valida os status suportados, evita no-op e atualiza status/versão/changelog/autor/data.
- `CourseVersioning.CreateSnapshot` cria o registro imutável a partir do DTO do curso já atualizado.
- `CoursesController.PublishToggle` adiciona curso e snapshot ao contexto antes de um único `SaveChangesAsync`, usando a transação padrão relacional do EF Core.
- A API documenta o contrato e a semântica do alias `rascunho`.

## Testes adicionados

O harness SQLite verifica:

1. Publicado → arquivado incrementa a versão de 1 para 2.
2. O snapshot persistido contém status e versão iguais aos campos do curso.
3. Autor e timestamp são registrados na transição e no snapshot.
4. Solicitar `rascunho` quando o curso já está arquivado não incrementa a versão nem gera snapshot.
5. Arquivado → publicado cria a versão 3 e mais um snapshot.

## Validação pendente

- CI (lint/build/teste SQLite).
- Revisão do contrato e do uso do endpoint pelo frontend.
- Teste HTTP de integração com sessão real, autorização do proprietário/admin e banco SQLite.
- Aceite do proprietário.

A conclusão da CI não substitui teste HTTP integrado nem inspeção do fluxo pela interface.
