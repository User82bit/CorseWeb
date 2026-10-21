# FE-008 — Centralizar os SVGs em assets organizados

## Identificação

- **Tipo:** `refactor`
- **Estado:** EM DESENVOLVIMENTO
- **Branch:** `refactor/svg-assets-organization`
- **PR:** a abrir para `Homologa`
- **Base:** `master` atualizada após a integração do PR #6.
- **Motivação:** pedido do proprietário para guardar o código SVG em arquivos `.svg` e organizar os recursos em `src/assets`.

## Organização de assets

- `corseweb.client/src/assets/icons/`: ícones monocromáticos reutilizáveis.
- `corseweb.client/src/assets/flags/`: bandeiras do seletor de idioma.
- `corseweb.client/src/assets/illustrations/`: ilustrações decorativas maiores da Home.

## Assets criados

### Ícones

- `arrow-left.svg`
- `arrow-right.svg`
- `bell.svg`
- `book-open.svg`
- `check.svg`
- `clock.svg`
- `close.svg`
- `home.svg`
- `log-out.svg`
- `menu.svg`
- `monitor.svg`
- `plus.svg`
- `search.svg`
- `user.svg`

### Bandeiras

- `pt-BR.svg`
- `en.svg`
- `es.svg`

### Ilustração

- `illustrations/home-open-book.svg`

## Componente reutilizável

Foi criado `corseweb.client/src/UIComplement/SvgIcon/SvgIcon.tsx` e seu SCSS. Ícones de uma cor são renderizados como máscaras CSS a partir de arquivos SVG importados com `?url`, usando `currentColor` para preservar a cor definida pelo componente pai sem incorporar SVG inline ao JSX.

## Componentes atualizados

- `src/Pages/HomePage/HomePage.tsx`: extraídos arte do livro, chevron, livro, relógio, check, plus, menu e fechar.
- `src/Pages/HomePage/HomePage.scss`: seletor de tamanho de ícone ajustado ao componente compartilhado; a ilustração utiliza `img`.
- `src/UIComplement/LanguageSwitcher/LanguageSwitcher.tsx` e `.scss`: bandeiras em arquivos externos.
- `src/Pages/AppLayout/AppLayout.tsx` e `.scss`: ícones como assets; marca substituída pelo arquivo oficial.
- `src/Pages/AdminLayout/AdminLayout.tsx` e `.scss`: ícone de saída e marca oficial compartilhada.
- `src/Pages/NotFound/NotFound.tsx`: quatro ícones externos.
- `src/Pages/AdminCoursesPage/AdminCoursesPage.tsx`: ícone de busca externo.
- `docs/TODO.md` e `docs/FRONTEND/TODO.md`.

## Validação estática inicial

- [x] Confirmar que os seis componentes TSX auditados não contêm tags `<svg>` inline.
- [x] Confirmar que as bandeiras e a ilustração são carregadas de `src/assets`.
- [x] Confirmar que os componentes que usam a marca oficial apontam para o mesmo `/favicon.ico`.
- [ ] Executar `npm ci`, `npm run lint` e `npm run build` pelo CI.
- [ ] Executar restore/build .NET no CI.
- [ ] Verificar visualmente o alinhamento e cor dos ícones em tela móvel e em larguras maiores.

## Critérios de aceitação

1. Todo SVG inline encontrado na auditoria inicial das páginas/components afetados foi extraído para um arquivo SVG em `src/assets`.
2. A ilustração do livro e as três bandeiras são arquivos standalone, sem JSX inline.
3. Ícones monocromáticos continuam herdando a cor contextual via CSS.
4. A identidade oficial é reutilizada no cabeçalho público, área do aluno e administração.
5. Sem dependências novas.
6. Lint/build passam.

## Limitações

A auditoria inicial encontrou e atualizou seis arquivos TSX com SVGs inline. O CI é usado para validar a compilação, mas não substitui a inspeção visual manual em navegador.
