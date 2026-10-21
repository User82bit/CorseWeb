# CorseWeb — TODO do Frontend

## Diretriz obrigatória: mobile-first

Toda branch de interface deve começar pela experiência de celular. A definição inicial inclui conteúdo prioritário, navegação, interação por toque, foco/teclado, estados de carregamento/erro/vazio e acessibilidade. Somente depois de verificar o layout móvel serão implementadas as adaptações para tablet e desktop.

Não aceitar uma interface que apenas encolhe um layout de desktop. Cada etapa deve indicar como validar o comportamento móvel e as larguras maiores.

## Premissa de estado atual

Segundo o proprietário, apenas o sistema de tradução — ainda incompleto — deve ser considerado funcional. As outras telas, componentes, estilos e fluxos não são considerados entregas aprovadas: precisam ser avaliados e, quando reconstruídos, receber novo design. A existência do código atual serve para entender contratos e reaproveitar o que for validado, não para impor a preservação visual.

## TODO

| ID | Entrega | Estado | Critério principal |
|---|---|---|---|
| FE-001 | Reconstruir a Home pública com design responsivo mobile-first | INTEGRADA em `master` (validação visual pendente) | [PR #4](https://github.com/User82bit/CorseWeb/pull/4); inspeção visual manual em celular/tablet/desktop ainda pendente |
| FE-006 | Corrigir carregamento do provedor de idioma em Windows | INTEGRADA em `master` | [PR #5](https://github.com/User82bit/CorseWeb/pull/5); CI passou e o proprietário confirmou que a inicialização local funciona |
| FE-007 | Unificar a marca da Home com o ícone oficial e harmonizar o seletor de idioma | INTEGRADA em `master` (validação visual pendente) | [PR #6](https://github.com/User82bit/CorseWeb/pull/6); CI passou; inspeção visual responsiva ainda pendente |
| FE-008 | Centralizar SVGs inline na pasta `src/assets` | INTEGRADA em `master` (validação visual pendente) | [PR #8](https://github.com/User82bit/CorseWeb/pull/8); CI aprovada; inspeção visual responsiva pendente |
| FE-002 | Revalidar e completar o sistema de tradução | EM REVISÃO | [PR #10](https://github.com/User82bit/CorseWeb/pull/10); testes de fallback e CI aprovados; conferência manual de `html lang` no navegador pendente |
| FE-003 | Estabelecer fundamentos visuais responsivos e acessíveis | NÃO INICIADA | Tokens e componentes base definidos após auditoria, com validação móvel antes de tablet/desktop |
| FE-004 | Reconstruir as áreas pública, do aluno e administrativa por etapas independentes | NÃO INICIADA | Cada entrega com resultado verificável, sem regressões nos contratos necessários |
| FE-005 | Auditar e corrigir imagens e recursos de mídia | NÃO INICIADA | Cada recurso encontrado com caminho real, dimensões/formato adequados, alternativa textual e destino verificável |

## Regras para imagens manuais

Se a inclusão autônoma de um recurso não for possível, a entrega deve incluir: descrição básica da imagem, termos de pesquisa prontos para copiar (português e/ou inglês), nome de arquivo/extensão sugeridos, pasta exata de destino e o componente/página que utilizará o arquivo. Verificar primeiro a estrutura real do repositório e separar recursos decorativos de conteúdo que precisa de alternativa acessível.

## Dependências e limites

- FE-001 parte da `master` atualizada após a integração da CI-001.
- Não codificar o curso de inglês como um caso especial.
- Não substituir React/TypeScript/TSX/SCSS por outras tecnologias sem justificativa e autorização.
- Não criar branches futuras antes do momento previsto no fluxo.
