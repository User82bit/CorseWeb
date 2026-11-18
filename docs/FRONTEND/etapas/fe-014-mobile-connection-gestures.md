# FE-014 — conexão de nós por toque e clique

## Problema observado

No editor de aulas, arrastar cards funciona em celular, mas iniciar uma conexão na saída de um nó e terminar na entrada de outro não funciona de forma confiável.

A implementação anterior iniciava a conexão em `pointerdown` da saída e tentava concluí-la em `pointerup` da entrada. Em dispositivos touch, o navegador pode aplicar captura implícita do ponteiro ao elemento que recebeu o `pointerdown`; assim, o `pointerup` não chega à porta de entrada pretendida.

## Alteração

- A conexão passa a usar um gesto de duas etapas: tocar/clicar em uma saída e depois tocar/clicar na entrada de destino.
- Tocar novamente na mesma saída cancela a seleção da origem.
- Tocar na entrada do próprio nó de origem cancela a tentativa.
- Uma conexão nova substitui a ligação anterior que ocupava a mesma entrada.
- O estado temporário da conexão não é apagado pelo `pointerup` geral do canvas antes do evento `click`.
- A dica do canvas explica o gesto em pt-BR, inglês e espanhol.
- A movimentação de cards, seleção, pan e zoom continuam usando Pointer Events.

## Validação necessária

1. Em celular real, tocar na saída de um nó e depois na entrada de outro; confirmar que a curva aparece.
2. Repetir com Quiz, conectando saídas Aprovado e Reprovado em entradas distintas.
3. Tocar novamente na saída de origem para cancelar.
4. Selecionar uma saída e tocar na entrada do próprio nó; confirmar cancelamento.
5. Substituir uma conexão já ligada à mesma entrada.
6. Repetir em tablet e desktop, com mouse e teclado.
7. Salvar, recarregar a aula e confirmar que as conexões persistem.

## Limitação

A conexão visual continua sendo apenas autoria/persistência do grafo. A execução pedagógica de ramificações pertence à etapa FLOW-001.

A CI verifica lint e build; a interação touch precisa de validação manual/E2E em navegador real antes de ser considerada finalizada.
