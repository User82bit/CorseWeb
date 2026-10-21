# FE-002 — Revalidar e completar o sistema de tradução

## Identificação

- **Tipo:** `fix` + `refactor` + `test`
- **Estado:** EM DESENVOLVIMENTO
- **Branch:** `feat/i18n-resilient-locale-system`
- **PR:** a abrir para `Homologa`
- **Base:** `master` atualizada após as integrações das etapas anteriores.

## Auditoria inicial

- Cada dicionário de idioma (`pt-BR`, `en`, `es`) já é tipado como `Translations`, portanto a compilação verifica as chaves e os formatos comuns aos três idiomas.
- A preferência salva era convertida com um cast `as Locale` antes da validação.
- Ler ou gravar `window.localStorage` sem captura de exceções poderia lançar em ambientes de navegador que bloqueiam o armazenamento.
- A resolução por prefixo de `navigator.language` não normalizava maiúsculas/minúsculas ou separadores de idioma.
- `index.html` não declarava o idioma inicial do documento.
- O seletor de idioma duplicava os rótulos de cada idioma em vez de usar as chaves já definidas no dicionário.

## Alterações

- `src/i18n/types.ts`: tornar a lista suportada de idiomas a fonte única do tipo `Locale`; renomear `informatiosModel` para `InformationItem`.
- `src/i18n/locale.ts`: criar validação runtime e resolução determinística por preferência salva válida, idioma exato do navegador, subtipo de idioma e locale padrão.
- `src/i18n/LanguageProvider.tsx`: tornar leitura/gravação de armazenamento tolerante a falhas e sincronizar `document.documentElement.lang` após a inicialização e cada troca.
- `index.html`: declarar `lang="pt-BR"` como idioma inicial para acessibilidade, antes da hidratação do React.
- `src/UIComplement/LanguageSwitcher/LanguageSwitcher.tsx`: usar os rótulos dos idiomas do próprio dicionário em títulos e nomes acessíveis.
- `src/i18n/locale.test.mjs`: acrescentar testes do runtime para preferência salva, idiomas regionais, normalização, valores inválidos e fallback.
- `package.json` e `.github/workflows/ci.yml`: adicionar o comando `npm run test:i18n` à validação contínua. Não foram adicionadas dependências.

## Testes automatizados

A suíte cobre:
- preferência salva válida sobre o idioma do navegador;
- locale exato do navegador;
- variantes como `en-US` e `es-MX`;
- normalização de `PT_br`;
- preferência inválida com fallback para o idioma do navegador;
- locale ausente ou não suportado com fallback para `pt-BR`;
- validação estrita de valores de locale.

## Escopo e limites

Esta etapa fortalece o núcleo de idioma e garante que a Home reconstruída e o seletor usem o sistema tipado. As outras telas existentes ainda contêm textos hardcoded, mas o proprietário determinou que essas interfaces antigas serão redesenhadas/reconstruídas em etapas próprias; traduzi-las indiscriminadamente aqui ampliaria o escopo e trataria como aprovados fluxos ainda não auditados.

## Validação

- [ ] `npm ci`
- [ ] `npm run test:i18n`
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] `dotnet restore CorseWeb.slnx`
- [ ] `dotnet build CorseWeb.slnx --no-restore --configuration Release`
- [ ] Conferir as trocas de idioma no navegador e confirmar o atributo `html lang`.

## Critérios de aceitação

1. Valor salvo inválido ou armazenamento bloqueado não impede a inicialização nem a troca de idioma.
2. Locale do navegador é normalizado e tem fallback previsível.
3. O atributo `html lang` sempre acompanha o locale ativo.
4. Os textos dos três dicionários continuam verificáveis via TypeScript e compartilhados pela Home/seletor.
5. Os testes de resolução de idioma executam no CI sem nova dependência.
6. Telas antigas não reconstruídas permanecem fora do escopo desta entrega.
