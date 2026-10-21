# FE-006 — Corrigir a inicialização do provedor de idioma em Windows

## Identificação

- **Tipo:** `fix`
- **Estado:** EM REVISÃO
- **Branch:** `fix/language-provider-windows-resolution`
- **PR:** [#5 — fix(i18n): corrige tela branca no Windows](https://github.com/User82bit/CorseWeb/pull/5)
- **Prioridade:** P0 — a aplicação abre em tela branca em ambiente de desenvolvimento Windows.

## Sintoma observado

O navegador exibe:

```text
Uncaught SyntaxError: The requested module 'https://localhost:49188/src/i18n/LanguageContext.ts'
doesn't provide an export named: 'LanguageProvider'
```

## Causa identificada

Existiam dois módulos com nomes que diferem apenas por maiúscula/minúscula e extensão:

- `LanguageContext.tsx`, que exportava `LanguageProvider`;
- `languageContext.ts`, que exporta o objeto `LanguageContext`.

Em Windows, o sistema de arquivos normalmente resolve nomes sem distinguir maiúsculas de minúsculas. Como a importação sem extensão era `./i18n/LanguageContext`, a resolução do Vite podia acabar encontrando o arquivo `languageContext.ts` antes do componente TSX. Esse módulo não exporta `LanguageProvider`, o que impede o carregamento do módulo principal e deixa a aplicação em branco.

O lint/build em CI não identificavam o problema porque o ambiente de CI usa um sistema de arquivos sensível a maiúsculas/minúsculas.

## Alterações desta correção

- Criar `corseweb.client/src/i18n/LanguageProvider.tsx` com o componente e sua exportação nomeada.
- Atualizar `corseweb.client/src/main.tsx` para importar `./i18n/LanguageProvider`.
- Remover `corseweb.client/src/i18n/LanguageContext.tsx`, evitando que o nome conflite com `languageContext.ts`.
- Preservar `corseweb.client/src/i18n/languageContext.ts` e o contrato usado por `useTranslation.ts`.
- Manter a alteração isolada numa branch de correção; não editar diretamente `Homologa`.

## Validação

- [x] Confirmar que não restou importação de `./i18n/LanguageContext` no ponto de entrada.
- [x] Confirmar que a exportação `LanguageProvider` agora está em `LanguageProvider.tsx`, com nome não conflitante.
- [ ] Executar `npm ci`, `npm run lint` e `npm run build` via CI. Execução de CI inicial enfileirada; aguardar conclusão antes de marcar como aprovada.
- [ ] Testar a inicialização no Windows com o servidor Vite e confirmar que a Home deixa de ficar em branco.
- [ ] Conferir o Console do navegador após recarga forçada.
- [x] Abrir PR #5 para `Homologa` e atualizar os Kanbans; resultado final da CI e teste local ainda pendentes.

## Evidência CI

- CI inicial após a abertura do PR: enfileirada, execução [#39595191005](https://github.com/User82bit/CorseWeb/actions/runs/39595191005). O resultado ainda não foi confirmado no momento desta atualização.

## Limitações

A causa estática foi identificada a partir do erro reportado e dos nomes de arquivos presentes na branch. A validação visual no computador do proprietário não pode ser simulada pelo CI; confirmar o resultado no navegador Windows continua necessário.
