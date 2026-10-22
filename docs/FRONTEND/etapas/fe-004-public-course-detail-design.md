# FE-004 — Redesign da página pública de detalhes do curso

## Identificação
- **Estado:** EM REVISÃO.
- **Branch:** `fix/public-course-detail-redesign`.
- **PR:** [#29 — modernizar página pública de detalhes do curso](https://github.com/User82bit/CorseWeb/pull/29), aberto como draft para validação automatizada.
- **Área:** Frontend público.
- **Rota:** `/courses/:courseSlug`.
- **Objetivo:** substituir a tela antiga e simplificada de detalhe por uma experiência moderna e responsiva coerente com o catálogo e a área de aprendizagem.

## Problema
A ação **Visualizar** no painel administrativo abre `/courses/:courseSlug`, cuja página ainda usava o componente antigo `PageHero` e dois cartões simples. O design não acompanhava o restante das telas públicas e apresentava informações do curso sem uma hierarquia visual clara.

## Escopo
- Redesenhar a página com abordagem mobile-first.
- Adicionar navegação pública consistente, seletor de idioma e links para catálogo/início/área da conta.
- Apresentar capa, categoria, nível, status, título, subtítulo, descrição e duração estimada.
- Mostrar informações do curso e currículo com módulos, aulas, quantidades e durações disponíveis.
- Adicionar estados de carregamento, curso indisponível, erro de carregamento e curso sem módulos.
- Utilizar a capa SVG local quando o curso não tiver imagem ou quando a imagem falhar.
- Traduzir todos os textos novos em pt-BR, en e es.
- Preservar a rota e os contratos de dados existentes. Não introduzir endpoints ou mudanças de persistência nesta entrega.

## Arquivos afetados
- `corseweb.client/src/Pages/CourseDetailPage/CourseDetailPage.tsx`
- `corseweb.client/src/Pages/CourseDetailPage/CourseDetailPage.scss`
- `corseweb.client/src/i18n/types.ts`
- `corseweb.client/src/i18n/translations/pt-BR.ts`
- `corseweb.client/src/i18n/translations/en.ts`
- `corseweb.client/src/i18n/translations/es.ts`
- `docs/TODO.md`
- `docs/FRONTEND/TODO.md`

## Decisões técnicas
- Reutilizar `courseStore`, `authStore`, `LanguageSwitcher`, `SvgIcon` e o formatador de duração existentes.
- Manter os detalhes do curso genéricos; nenhum curso ou idioma é codificado como caso especial.
- Em viewport estreito, organizar hero, capa, resumo e currículo em uma coluna; expandir em telas maiores.
- Não mostrar cursos arquivados como páginas públicas disponíveis.
- Rascunhos já presentes no store continuam visualizáveis no contexto local do autor, com aviso de que não estão no catálogo público.

## Critérios de aceitação
- [ ] `/courses/:courseSlug` apresenta hierarquia moderna e consistente com o catálogo.
- [ ] A página funciona em largura móvel a partir de 320 px, tablet e desktop.
- [ ] Capa ausente ou quebrada nunca deixa um quadro de imagem vazio.
- [ ] Metadados e currículo são renderizados a partir dos dados existentes.
- [ ] Estado de carregamento, curso indisponível e curso sem módulos são compreensíveis e acessíveis.
- [ ] Todos os textos adicionados possuem traduções pt-BR, en e es.
- [x] `npm run lint`, `npm run test:i18n`, `npm run build` e build .NET passaram na CI #39806223709 para o commit de código `88361228eba10262634826b765cfd2c5bcb6d62e`.
- [ ] Confirmar CI após a atualização documental desta revisão.
- [ ] O proprietário verifica manualmente a rota aberta pela ação **Visualizar** no painel administrativo.

## Validação
- CI do commit de código `88361228eba10262634826b765cfd2c5bcb6d62e`: [execução #39806223709](https://github.com/User82bit/CorseWeb/actions/runs/39806223709) concluída com sucesso (lint, teste de idioma, build frontend, restore e build .NET). A execução anterior falhou no lint por atualização síncrona de estado em effect; o problema foi corrigido. A atualização documental desta revisão gera uma nova execução, que precisa ser verificada antes de retirar o draft.
- Validação visual manual em navegador: pendente; não é possível reproduzi-la neste ambiente.

## Riscos e limitações
- A página depende do carregamento e da cache atual de cursos no store; a arquitetura de dados permanece fora do escopo.
- O build automatizado não substitui a conferência de espaçamento, leitura e interação em navegador real.

## Próximos passos
1. Revisar o diff e corrigir falhas reportadas pela CI.
2. Manter o PR #29 para `Homologa` em draft até a CI mais recente passar; depois torná-lo pronto para revisão.
3. Aguardar a revisão e a integração do proprietário em `master`.
4. Só então iniciar a próxima etapa independente do editor visual de aulas.
