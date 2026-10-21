# FE-007 — Unificar marca da Home e harmonizar seletor de idioma

## Identificação

- **Tipo:** `fix` + `style`
- **Estado:** EM REVISÃO
- **Branch:** `fix/home-brand-and-language-switcher`
- **PR:** [#6 — fix(home): unifica a marca e clareia o seletor de idioma](https://github.com/User82bit/CorseWeb/pull/6)
- **Prioridade:** P1 — consistência de marca e ajuste visual na Home pública.

## Problemas reportados

1. A marca no cabeçalho/rodapé da Home era um SVG desenhado separadamente e diferia do ícone do site, considerado pelo proprietário a identidade oficial.
2. O botão do seletor de idioma apresentava fundo muito escuro em ambientes cujo sistema operacional usa tema escuro, apesar da Home ser branca.

## Auditoria do asset

- Arquivo existente: `corseweb.client/public/favicon.ico`.
- O conteúdo binário foi inspecionado e começa com a assinatura PNG, apesar da extensão `.ico`.
- Esse é o ícone oficial solicitado pelo proprietário: quadrado azul-marinho arredondado, livro branco e barras verticais coloridas.
- A Home deve reutilizar o asset existente no cabeçalho e rodapé, evitando recriar uma segunda versão de logo.
- Em `corseweb.client/index.html`, o tipo declarado do ícone foi ajustado para `image/png`, correspondente ao conteúdo real.

## Alterações

- Substituir `BrandSymbol` por `BrandLogo` na Home e usar `/favicon.ico` como única fonte da marca no cabeçalho e rodapé.
- Aplicar dimensões responsivas ao asset: 2,45 rem no cabeçalho e 2 rem no rodapé.
- Sobrescrever os estilos globais do seletor dentro de `.home-header`: fundo branco, borda suave, sombra discreta e estado ativo azul-claro.
- Preservar hover/foco visíveis e contraste, inclusive quando o sistema operacional está em tema escuro.
- Atualizar os Kanbans e registrar a decisão.

## Arquivos afetados

- `corseweb.client/src/Pages/HomePage/HomePage.tsx`
- `corseweb.client/src/Pages/HomePage/HomePage.scss`
- `corseweb.client/index.html`
- `docs/TODO.md`
- `docs/FRONTEND/TODO.md`
- `docs/FRONTEND/etapas/fe-006-language-provider-windows-resolution.md` (registro da validação manual confirmada)
- `docs/FRONTEND/etapas/fe-007-home-brand-language-switcher.md`

## Validação

- [x] Confirmar que o asset oficial existe e é uma imagem PNG.
- [x] Confirmar que os dois pontos de marca da Home usam `BrandLogo`.
- [x] Confirmar que o seletor recebe cores claras específicas, independentes das variáveis de tema escuro do SO.
- [ ] Executar CI: `npm ci`, `npm run lint`, `npm run build`, restore/build .NET.
- [ ] Validar visualmente a marca, o seletor fechado/aberto e seus estados hover/focus no celular.
- [ ] Repetir a validação em tablet e desktop.
- [ ] Confirmar que o seletor permanece claro com o sistema operacional em tema escuro.

## Critérios de aceitação

1. A marca do cabeçalho e do rodapé corresponde exatamente ao ícone oficial.
2. Não há mais um SVG de marca alternativo desenhado dentro de `HomePage.tsx`.
3. O seletor de idioma combina com a superfície branca da Home em light e dark mode do SO.
4. O estado ativo é perceptível, sem um bloco roxo/escuro.
5. O menu de idiomas permanece funcional e acessível.
6. O layout continua mobile-first; sem dependências novas.

## Limitações

A inspeção do PNG confirma o arquivo existente, mas a verificação visual final no navegador deve ser feita pelo proprietário após integrar a branch em `Homologa`.