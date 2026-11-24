# CL-003 — Editor de autoria CorseLight v0.1

## Objetivo

Adicionar a experiência de autoria de scripts CorseLight ao editor administrativo sem misturar a lógica do curso com o grafo pedagógico. Os scripts permanecem em uma coleção raiz independente de módulos, aulas, nós e conexões.

## Entregue na PR #54

- Tipos de frontend para scripts CL 0.1 e diagnósticos posicionais.
- Normalização e persistência de scripts para cursos publicados e rascunhos.
- Painel CL separado do canvas pedagógico.
- Listagem, criação, exclusão, renomeação e ativação/desativação de scripts.
- Editor de fonte com contador de bytes UTF-8 e limite de 16 KiB.
- Inserção assistida dos eventos lesson.start, lesson.finish e activity.submit.
- Referência de eventos, contexto, estado, funções de atividade, efeitos de conteúdo e limites.
- Apresentação de diagnósticos retornados pelo servidor após salvar ou publicar.
- Falhas de atualização de rascunho remoto agora são propagadas; não são convertidas silenciosamente em salvamento local.
- A tela do aluno apresenta o detalhe de erro devolvido pela API ao salvar progresso.

## Contratos preservados

- scripts[] continua separado de modules[], nodes[] e connections[].
- O navegador nunca interpreta nem executa a fonte CL.
- O backend permanece autoridade para gramática, tipos, eventos, permissões, alvos e limites.
- Rascunhos podem manter fonte inválida enquanto são editados; publicar continua condicionado à validação server-side.
- Scripts desativados também passam pela validação de publicação.
- DTOs públicos do aluno não expõem a fonte ou diagnósticos de autoria.

## Validação automática

- CI #956 aprovado: lint, testes de resolução de idioma, hierarquia de containers, ordem do grafo, build frontend, restore/build .NET e testes de integração HTTP/SQLite do servidor.
- O primeiro CI identificou uso síncrono de setState dentro de um efeito React. A seleção do script passou a ser derivada da lista e o CI #956 passou integralmente.

## Revisão manual pendente

- Testar o painel CL em desktop, tablet e celular, incluindo scroll, teclado e foco.
- Criar e editar scripts em rascunho, salvar, recarregar e confirmar que a fonte persiste.
- Salvar fonte inválida, conferir diagnósticos/linha/coluna, corrigir e validar publicação.
- Atualizar um curso publicado e confirmar que scripts[] é preservado.
- Testar com uma conta de aluno sem papel administrativo e confirmar redaction dos DTOs e execução dos três eventos.
- Verificar a resposta HTTP real para a falha de progresso observada na aula de teste; a sessão de navegador disponível mostrou o alerta, mas não disponibilizou status ou corpo HTTP.

## Fora do escopo

- Editor visual por blocos/AST, realce de sintaxe avançado, autocomplete e depuração passo a passo.
- Novos eventos/funções, loops, tentativas, override de nota, rede, arquivos ou I/O.
- Execução/compilação do código submetido em Quiz ou Exercise.

PR: https://github.com/User82bit/CorseWeb/pull/54
