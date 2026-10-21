# FE-006 — Corrigir a inicialização do provedor de idioma em Windows

## Identificação

- **Tipo:** `fix`
- **Estado:** EM DESENVOLVIMENTO
- **Branch:** `fix/language-provider-windows-resolution`
- **PR:** a abrir para `Homologa`
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

- [ ] Confirmar que não restou importação de `./i18n/LanguageContext`.
- [ ] Confirmar que há somente um nome de módulo correspondente à exportação `LanguageProvider`.
- [ ] Executar `npm ci`, `npm run lint` e `npm run build` via CI.
- [ ] Testar a inicialização no Windows com o servidor Vite e confirmar que a Home deixa de ficar em branco.
- [ ] Conferir o Console do navegador após recarga forçada.
- [ ] Atualizar esta etapa e os Kanbans com o resultado final da CI.

## Limitações

A causa estática foi identificada a partir do erro reportado e dos nomes de arquivos presentes na branch. A validação visual no computador do proprietário não pode ser simulada pelo CI; confirmar o resultado no navegador Windows continua necessário.
