# CERT-001 — Certificado de conclusão de curso

## Objetivo

Transformar o card `certificate`, antes meramente informativo, em um ponto de emissão de um comprovante de conclusão do curso. O certificado registra a conclusão das aulas publicadas segundo os eventos persistidos pelo servidor. Não é diploma, licença profissional nem avaliação independente de competência.

## Regras do backend

- `POST /api/enrollments/{courseId}/certificate` exige sessão e matrícula do próprio usuário.
- O curso precisa estar publicado e `EnrollmentProgressProjector` precisa retornar `CompletedAt` não nulo, o que significa que todas as aulas atualmente publicadas possuem evento de conclusão.
- A conclusão de uma aula continua sendo uma ação explícita do aluno, bloqueada até que todas as atividades Quiz/Exercise alcançáveis tenham resultado.
- Uma matrícula pode ter apenas um certificado. Pedidos repetidos retornam o mesmo snapshot.
- O snapshot contém nome do aluno, título do curso, autor, versão publicada, momento de conclusão, momento de emissão e código aleatório de 128 bits.
- `GET /api/certificates/{verificationCode}` é público e retorna os dados de conferência. Código malformado/inexistente retorna 404.
- Certificados não possuem FK com matrícula/curso: registros emitidos são preservados após cancelamento da matrícula ou exclusão do curso.

## Experiência do aluno

- O preview do editor continua mostrando o card de modo estático, sem emitir certificado.
- Na página do aluno, antes da conclusão aparece a condição de emissão.
- Quando todas as aulas publicadas estão concluídas, o aluno pode solicitar emissão.
- Após emissão, são mostrados aluno, curso, autor, versão, datas, código e link para a API pública de verificação.
- A ação de imprimir usa `window.print()` com folha A4 paisagem; no diálogo do navegador, o aluno pode escolher “Salvar como PDF”. O backend não gera um PDF.

## Testes

A etapa inclui testes de migração/SQLite para persistência, projeção no DTO e unicidade por matrícula; testes HTTP para bloqueio antes de completar o curso, emissão, repetição idempotente, consulta pública, código inválido e sobrevivência após cancelar a matrícula.

## Critérios de aceite manual

- Concluir uma amostra de curso com mais de uma aula e confirmar bloqueio do certificado enquanto faltar qualquer aula publicada.
- Confirmar que a emissão exibe os dados corretos e que recarregar a página não gera outro código.
- Abrir o link público em janela anônima e conferir o snapshot.
- Imprimir/salvar o certificado em PDF e verificar a orientação A4 paisagem, quebra de página, acentuação e legibilidade em celular/desktop.
- Confirmar que o card no preview do editor não tenta emitir certificado.

## Limitações

O sistema ainda usa conclusão autodeclarada das aulas após os controles existentes; por isso o certificado só pode ser divulgado como comprovante de conclusão registrada no CorseWeb. Não deve ser usado como evidência independente de domínio técnico, habilitação ou competência profissional.
