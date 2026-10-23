# CorseWeb — TODO do Backend

## Premissa de estado atual

O proprietário informou que, no estado atual do projeto, somente a tradução (frontend e ainda incompleta) deve ser considerada funcional. Portanto, nenhuma API, autenticação, regra de autorização, persistência ou fluxo de publicação aqui existente deve ser considerado validado sem teste. O código atual será auditado e os recursos necessários serão refeitos com escopo incremental.

## TODO

| ID | Entrega | Estado | Critério principal |
|---|---|---|---|
| BE-000 | Configurar credenciais Google locais e por ambiente | EM DESENVOLVIMENTO | Arquivo local ignorado em Development; Client ID por variável de ambiente em produção; segredo nunca retornado ao cliente |
| BE-001 | Inventariar endpoints, modelos, autorização e persistência | NÃO INICIADA | Contratos documentados; riscos e comportamentos atuais verificados sem alterar dados |
| BE-002 | Definir testes de integração para autenticação e permissões | NÃO INICIADA | Casos positivos e negativos para usuário comum, administrador e visitante |
| BE-003 | Revalidar criação, edição, rascunho, publicação e arquivamento de cursos | NÃO INICIADA | Fluxos validados por testes; consistência de versão e estado demonstrada |
| BE-004 | Rever persistência e migrações com estratégia de recuperação | NÃO INICIADA | Migrações testadas em banco descartável, sem operação destrutiva não autorizada |
| BE-005 | Definir e validar importação/exportação versionada de cursos | NÃO INICIADA | Modelo portátil genérico, referências estáveis e validação de entrada não confiável |

## Restrições

- Não presumir que esconder ações no frontend protege endpoints: autorização precisa ser verificada no backend.
- Não executar scripts importados sem isolamento e política de permissões explícitos.
- Não aplicar migrações destrutivas nem excluir dados sem autorização e plano de recuperação.
- Não alterar contratos de API na mesma entrega de um redesenho visual, salvo dependência documentada e aprovada.
- As tarefas devem aguardar a integração da branch em andamento, conforme o fluxo de PR do projeto.
