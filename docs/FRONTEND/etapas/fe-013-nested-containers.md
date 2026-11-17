# FE-013 — Containers aninháveis e hierarquia de elementos

## Objetivo

Permitir que um card container agrupe outros elementos e crie uma hierarquia visual real na autoria e na apresentação da aula, mantendo uma única fonte de verdade no JSON da aula.

## Contrato de dados

A aula continua armazenando todos os elementos em uma lista plana `nodes[]`. Um elemento filho declara `parentId` com o ID do container pai. A raiz usa `parentId: null` ou campo ausente. Não duplicar objetos de filhos em arrays `children[]`.

Somente o tipo `container` aceita elementos filhos. Outros tipos continuam sendo folhas. Containers podem ser aninhados.

Os filhos mantêm coordenadas absolutas no sistema de coordenadas do canvas, para que as conexões SVG existentes não precisem de um novo referencial. O retângulo do filho precisa permanecer na área interna do container: margem horizontal de 20 px, cabeçalho de 48 px e margem inferior de 20 px.

A ordem de leitura é `order` entre irmãos do mesmo pai. As conexões continuam independentes da contenção e não determinam a ordem de leitura.

## Limites e integridade

- Profundidade máxima: quatro níveis, contando o nível principal.
- No máximo 500 nós por aula.
- O nó `start` permanece na raiz.
- IDs dos nós precisam ser únicos.
- Pai deve existir, ser do tipo `container` e não pode ser o próprio nó ou um descendente.
- Ciclos e referências inválidas são rejeitados.
- Filho precisa estar totalmente dentro da área interna do pai.
- Dimensões e coordenadas devem ser finitas e estar dentro dos limites do canvas.
- Conexões precisam referenciar nós e portas existentes; cada porta de entrada aceita uma ligação.

A validação roda no cliente antes de salvar e é repetida pela API em criação/atualização de cursos e rascunhos e antes da publicação. O servidor é a autoridade final.

## Interação no editor

- Container está disponível na paleta como um tipo de card.
- Clicar no card Container cria um container na raiz.
- Com um container selecionado, clicar em outro tipo na paleta cria o elemento como filho na próxima posição livre.
- Com um elemento filho selecionado, clicar em outro tipo na paleta cria um irmão dentro do mesmo pai.
- Arrastar um elemento e soltar dentro da área de um container reatribui seu `parentId`; soltar fora dos containers retorna-o à raiz.
- Containers aninhados recebem os elementos arrastados para a área mais profunda elegível.
- O inspetor permite escolher o container pai ou a raiz.
- O inspetor do container oferece a ação para abrir a paleta e adicionar um filho.
- Arrastar um container move todos os seus descendentes, preservando as posições relativas.
- Aumentar/reduzir um container respeita o limite dos seus filhos diretos.
- Duplicar um container duplica toda a subárvore, gera novos IDs e copia apenas conexões cujas duas extremidades estão dentro da subárvore.
- Excluir um container remove a subárvore inteira e todas as conexões ligadas a qualquer elemento removido.

## Apresentação ao aluno

A página do aluno e a prévia do editor compartilham `LessonContentTree`. A apresentação é recursiva: um container vira uma seção agrupadora e seus filhos aparecem dentro dela, na ordem dos irmãos. Scripts internos e nós não autorizados continuam ocultos.

O renderizador mantém uma defesa adicional contra ciclos e profundidade superior ao limite, para não criar loops de renderização em dados legados ou adulterados.

## Não incluído

- Containers com conexões próprias ou execução de fluxo.
- Avaliação automática de quiz/exercício.
- Editor visual independente para posicionar conteúdo dentro de coordenadas locais do container.
- LightScript runtime.
- Testes E2E com navegador real e inspeção manual de arrastar/soltar em dispositivos.

## Critérios de validação

1. Criar um container vazio, alterar título/descrição, redimensionar e salvar.
2. Inserir texto, imagem, vídeo e quiz como filhos.
3. Criar um container dentro de outro e inserir um elemento no terceiro/quarto nível.
4. Bloquear tentativa de criar quinto nível e ciclos.
5. Arrastar um elemento para dentro de container e de volta para a raiz; confirmar que a hierarquia é atualizada.
6. Arrastar container e confirmar que seus descendentes acompanham o movimento.
7. Duplicar um container com filhos e confirmar novos IDs, parentIds e conexões internas.
8. Excluir container e confirmar remoção em cascata e limpeza das conexões.
9. Salvar/publicar e reabrir o curso; confirmar a hierarquia preservada.
10. Acessar a aula como aluno e confirmar que a hierarquia aparece como agrupamento visual.
11. Enviar JSON adulterado diretamente à API e confirmar rejeição de pai inexistente, pai não-container, ciclo, profundidade acima de quatro níveis, filho fora dos limites e portas inválidas.

A etapa deve permanecer em revisão até CI, inspeção manual e aceite do proprietário.
