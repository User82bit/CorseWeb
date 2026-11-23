import { useState } from "react";
import SvgIcon from "../../UIComplement/SvgIcon/SvgIcon";
import type { CanvasConnection, CanvasNode } from "../../types/course";
import { sortNodesByLessonFlow } from "./lessonFlow";
import type { CourseCertificate, ExerciseAttemptResult, QuizAttemptResult } from "../../store/enrollmentStore";
import { getNodePresentationStyle, isStudentVisibleNode } from "./lessonPresentation";
import "./AppLessonPage.scss";

function safeUrl(value: unknown): string {
  const source = String(value ?? "").trim();
  if (!source) return "";
  try {
    const parsed = new URL(source, window.location.origin);
    return parsed.protocol === "https:" || parsed.origin === window.location.origin ? parsed.href : "";
  } catch {
    return "";
  }
}

type CanvasNodeContentProps = {
  node: CanvasNode;
  quizAttempt?: QuizAttemptResult;
  onQuizSubmit?: (nodeId: string, selectedOptionIndex: number) => void | Promise<void>;
  isSubmittingQuiz?: boolean;
  quizError?: string | null;
  exerciseAttempt?: ExerciseAttemptResult;
  onExerciseSubmit?: (nodeId: string, answer: string) => void | Promise<void>;
  isSubmittingExercise?: boolean;
  exerciseError?: string | null;
  courseCompletedAt?: string | null;
  certificate?: CourseCertificate | null;
  onCertificateIssue?: () => void | Promise<void>;
  isIssuingCertificate?: boolean;
  certificateIssueError?: string | null;
  locale?: string;
};

export function CanvasNodeContent({
  node,
  quizAttempt,
  onQuizSubmit,
  isSubmittingQuiz = false,
  quizError,
  exerciseAttempt,
  onExerciseSubmit,
  isSubmittingExercise = false,
  exerciseError,
  courseCompletedAt = null,
  certificate = null,
  onCertificateIssue,
  isIssuingCertificate = false,
  certificateIssueError,
  locale = "pt-BR",
}: CanvasNodeContentProps) {
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [exerciseAnswer, setExerciseAnswer] = useState(String(node.props?.starterCode ?? ""));
  const props = node.props ?? {};
  const text = (value: unknown) => String(value ?? "");

  switch (node.type) {
    case "start":
    case "container":
      return null;
    case "certificate": {
      const copy = locale.startsWith("en")
        ? {
            label: "Course completion certificate", title: "Certificate of completion",
            intro: "This document records that the learner completed the published lessons in this course.",
            student: "Awarded to", author: "Course author", completed: "Completed on", issued: "Issued on",
            version: "Course version", code: "Verification code", verify: "Verify certificate",
            print: "Print / Save as PDF", pending: "Complete every published lesson in this course to issue your certificate.",
            issue: "Issue certificate", issuing: "Issuing…",
            disclaimer: "This is a record of course completion. It is not a professional license or independent assessment of practical competence.",
            preview: "The certificate will be available here after all published lessons have been completed.",
          }
        : locale.startsWith("es")
          ? {
              label: "Certificado de finalización del curso", title: "Certificado de finalización",
              intro: "Este documento registra que el estudiante completó las lecciones publicadas de este curso.",
              student: "Otorgado a", author: "Autor del curso", completed: "Completado el", issued: "Emitido el",
              version: "Versión del curso", code: "Código de verificación", verify: "Verificar certificado",
              print: "Imprimir / Guardar como PDF", pending: "Completa todas las lecciones publicadas de este curso para emitir tu certificado.",
              issue: "Emitir certificado", issuing: "Emitiendo…",
              disclaimer: "Este documento acredita la finalización del curso. No es una licencia profesional ni una evaluación independiente de competencia práctica.",
              preview: "El certificado estará disponible aquí después de completar todas las lecciones publicadas.",
            }
          : {
              label: "Certificado de conclusão do curso", title: "Certificado de conclusão",
              intro: "Este documento registra que o aluno concluiu as aulas publicadas deste curso.",
              student: "Concedido a", author: "Autor do curso", completed: "Concluído em", issued: "Emitido em",
              version: "Versão do curso", code: "Código de verificação", verify: "Verificar certificado",
              print: "Imprimir / Salvar como PDF", pending: "Conclua todas as aulas publicadas deste curso para emitir seu certificado.",
              issue: "Emitir certificado", issuing: "Emitindo…",
              disclaimer: "Este documento registra a conclusão do curso. Não é uma licença profissional nem uma avaliação independente de competência prática.",
              preview: "O certificado ficará disponível aqui depois que todas as aulas publicadas forem concluídas.",
            };
      const formatDate = (value: string) => {
        const date = new Date(value);
        return Number.isNaN(date.getTime())
          ? value
          : new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(date);
      };

      if (typeof onCertificateIssue !== "function") {
        return (
          <section className="student-lesson__activity">
            <span className="student-lesson__activity-label">{copy.label}</span>
            <h3>{text(props.title || copy.title)}</h3>
            {typeof props.content === "string" && props.content.trim() && <p>{props.content}</p>}
            <p className="student-lesson__activity-note">{copy.preview}</p>
          </section>
        );
      }

      if (!certificate) {
        return (
          <section className="student-lesson__activity" aria-live="polite">
            <span className="student-lesson__activity-label">{copy.label}</span>
            <h3>{text(props.title || copy.title)}</h3>
            {typeof props.content === "string" && props.content.trim() && <p>{props.content}</p>}
            <p className="student-lesson__activity-note">{courseCompletedAt ? copy.intro : copy.pending}</p>
            {certificateIssueError && <p className="student-lesson__quiz-error" role="alert">{certificateIssueError}</p>}
            {courseCompletedAt && (
              <button
                type="button"
                className="student-lesson__quiz-submit"
                onClick={() => void onCertificateIssue()}
                disabled={isIssuingCertificate}
              >
                {isIssuingCertificate ? copy.issuing : copy.issue}
              </button>
            )}
          </section>
        );
      }

      const verificationUrl = `/api/certificates/${encodeURIComponent(certificate.verificationCode)}`;
      return (
        <section className="student-lesson__certificate" aria-label={copy.label}>
          <div className="student-lesson__certificate-paper">
            <span className="student-lesson__certificate-mark" aria-hidden="true">CORSEWEB</span>
            <p className="student-lesson__certificate-eyebrow">{copy.label}</p>
            <h2>{copy.title}</h2>
            <p className="student-lesson__certificate-intro">{copy.intro}</p>
            <p className="student-lesson__certificate-recipient-label">{copy.student}</p>
            <p className="student-lesson__certificate-recipient">{certificate.studentName}</p>
            <p className="student-lesson__certificate-course">{certificate.courseTitle}</p>
            <div className="student-lesson__certificate-meta">
              <span><small>{copy.author}</small><strong>{certificate.authorName}</strong></span>
              <span><small>{copy.completed}</small><strong>{formatDate(certificate.courseCompletedAt)}</strong></span>
              <span><small>{copy.issued}</small><strong>{formatDate(certificate.issuedAt)}</strong></span>
              <span><small>{copy.version}</small><strong>{certificate.courseVersion}</strong></span>
            </div>
            <div className="student-lesson__certificate-verification">
              <span>{copy.code}</span>
              <code>{certificate.verificationCode}</code>
              <a href={verificationUrl} target="_blank" rel="noreferrer">{copy.verify}</a>
            </div>
            <p className="student-lesson__certificate-disclaimer">{copy.disclaimer}</p>
          </div>
          <div className="student-lesson__certificate-actions">
            <button type="button" className="student-lesson__quiz-submit" onClick={() => window.print()}>{copy.print}</button>
          </div>
        </section>
      );
    }
    case "heading": {
      const level = Number(props.level ?? 2);
      const Tag = level === 1 ? "h2" : level === 3 ? "h4" : "h3";
      return <Tag className="student-lesson__content-heading">{text(props.content)}</Tag>;
    }
    case "paragraph":
      return <p className="student-lesson__text">{text(props.content)}</p>;
    case "list": {
      const items = Array.isArray(props.items) ? props.items.map((item) => String(item)) : [];
      const Tag = props.ordered ? "ol" : "ul";
      return <Tag className="student-lesson__list">{items.map((item, index) => <li key={index}>{item}</li>)}</Tag>;
    }
    case "code":
      return <pre className="student-lesson__code">{typeof props.language === "string" && props.language && <span className="student-lesson__code-language">{text(props.language)}</span>}<code>{text(props.code)}</code></pre>;
    case "image": {
      const src = safeUrl(props.url);
      return src ? <figure className="student-lesson__figure"><img src={src} alt={text(props.alt)} loading="lazy" decoding="async" />{typeof props.caption === "string" && props.caption && <figcaption>{text(props.caption)}</figcaption>}</figure> : <p className="student-lesson__unsupported">{text(props.alt || props.caption)}</p>;
    }
    case "video": {
      const src = safeUrl(props.url);
      return src ? <div className="student-lesson__video"><video controls preload="metadata" src={src}><track kind="captions" /></video>{typeof props.caption === "string" && props.caption && <p>{text(props.caption)}</p>}</div> : <p className="student-lesson__unsupported">{text(props.caption)}</p>;
    }
    case "quiz": {
      const options = Array.isArray(props.options)
        ? props.options.map((option) => String(option ?? ""))
        : [];
      const copy = locale.startsWith("en")
        ? { choose: "Choose one answer", submit: "Submit answer", submitting: "Checking…", passed: "Approved", failed: "Not approved", recorded: "Result recorded", invalid: "This Quiz has no valid answer options.", retry: "The answer could not be saved. Try again." }
        : locale.startsWith("es")
          ? { choose: "Elige una respuesta", submit: "Enviar respuesta", submitting: "Evaluando…", passed: "Aprobado", failed: "No aprobado", recorded: "Resultado guardado", invalid: "Este cuestionario no tiene opciones válidas.", retry: "No se pudo guardar la respuesta. Inténtalo de nuevo." }
          : { choose: "Escolha uma resposta", submit: "Enviar resposta", submitting: "Avaliando…", passed: "Aprovado", failed: "Reprovado", recorded: "Resultado registrado", invalid: "Este Quiz não possui opções de resposta válidas.", retry: "Não foi possível salvar a resposta. Tente novamente." };

      if (options.length < 2) {
        return <section className="student-lesson__activity"><span className="student-lesson__activity-label"><SvgIcon name="check" size="0.9rem" />Quiz</span><h3>{text(props.question)}</h3><p role="alert" className="student-lesson__quiz-error">{copy.invalid}</p></section>;
      }

      if (quizAttempt) {
        return (
          <section className="student-lesson__activity" aria-live="polite">
            <span className="student-lesson__activity-label"><SvgIcon name="check" size="0.9rem" />Quiz</span>
            <h3>{text(props.question)}</h3>
            <div className={quizAttempt.passed ? "student-lesson__quiz-result student-lesson__quiz-result--passed" : "student-lesson__quiz-result student-lesson__quiz-result--failed"}>
              <strong>{quizAttempt.passed ? copy.passed : copy.failed}</strong>
              <span>{copy.recorded} · {quizAttempt.score}%</span>
            </div>
            <p className="student-lesson__activity-note">
              {options[quizAttempt.selectedOptionIndex] ?? ""}
            </p>
            {typeof props.explanation === "string" && props.explanation.trim() && <p>{props.explanation}</p>}
          </section>
        );
      }

      if (typeof onQuizSubmit !== "function") {
        return (
          <section className="student-lesson__activity">
            <span className="student-lesson__activity-label"><SvgIcon name="check" size="0.9rem" />Atividade</span>
            <h3>{text(props.question)}</h3>
            <ol className="student-lesson__quiz-options" type="A">
              {options.map((option, index) => <li key={index}>{option}</li>)}
            </ol>
            <p className="student-lesson__activity-note">{locale.startsWith("en") ? "Interactive answers are available in the student course." : locale.startsWith("es") ? "Las respuestas interactivas están disponibles en el curso del estudiante." : "As respostas interativas aparecem na área do aluno."}</p>
          </section>
        );
      }

      return (
        <section className="student-lesson__activity">
          <span className="student-lesson__activity-label"><SvgIcon name="check" size="0.9rem" />Quiz</span>
          <h3>{text(props.question)}</h3>
          <form className="student-lesson__quiz-form" onSubmit={(event) => {
            event.preventDefault();
            if (selectedOptionIndex !== null && !isSubmittingQuiz)
              void onQuizSubmit(node.id, selectedOptionIndex);
          }}>
            <fieldset className="student-lesson__quiz-fieldset">
              <legend>{copy.choose}</legend>
              {options.map((option, index) => (
                <label className="student-lesson__quiz-option" key={index}>
                  <input
                    type="radio"
                    name={`quiz-${node.id}`}
                    value={index}
                    checked={selectedOptionIndex === index}
                    onChange={() => setSelectedOptionIndex(index)}
                    disabled={isSubmittingQuiz}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </fieldset>
            {quizError && <p role="alert" className="student-lesson__quiz-error">{quizError || copy.retry}</p>}
            <button type="submit" className="student-lesson__quiz-submit" disabled={selectedOptionIndex === null || isSubmittingQuiz}>
              {isSubmittingQuiz ? copy.submitting : copy.submit}
            </button>
          </form>
        </section>
      );
    }
    case "exercise": {
      const copy = locale.startsWith("en")
        ? {
            title: "Exercise",
            answer: "Your answer / code",
            submit: "Submit for evaluation",
            submitting: "Evaluating…",
            passed: "Approved",
            failed: "Not approved",
            recorded: "Result recorded",
            unavailable: "Interactive submission is available in the student course.",
            empty: "Enter your answer before submitting.",
            retry: "The answer could not be evaluated. Try again.",
            comparison: "This first version compares the submitted text with the reference solution. It does not run or compile code.",
          }
        : locale.startsWith("es")
          ? {
              title: "Ejercicio",
              answer: "Tu respuesta / código",
              submit: "Enviar para corregir",
              submitting: "Evaluando…",
              passed: "Aprobado",
              failed: "No aprobado",
              recorded: "Resultado guardado",
              unavailable: "El envío interactivo está disponible en el curso del estudiante.",
              empty: "Escribe tu respuesta antes de enviarla.",
              retry: "No se pudo evaluar la respuesta. Inténtalo de nuevo.",
              comparison: "Esta primera versión compara el texto enviado con la solución de referencia. No ejecuta ni compila código.",
            }
          : {
              title: "Exercício",
              answer: "Sua resposta / código",
              submit: "Enviar para correção",
              submitting: "Corrigindo…",
              passed: "Aprovado",
              failed: "Reprovado",
              recorded: "Resultado registrado",
              unavailable: "O envio interativo está disponível na área do aluno.",
              empty: "Digite sua resposta antes de enviar.",
              retry: "Não foi possível corrigir a resposta. Tente novamente.",
              comparison: "Esta primeira versão compara o texto enviado com a solução de referência. Ela não executa nem compila código.",
            };

      if (exerciseAttempt) {
        return (
          <section className="student-lesson__activity" aria-live="polite">
            <span className="student-lesson__activity-label"><SvgIcon name="check" size="0.9rem" />{copy.title}</span>
            <p>{text(props.instruction)}</p>
            <div className={exerciseAttempt.passed ? "student-lesson__quiz-result student-lesson__quiz-result--passed" : "student-lesson__quiz-result student-lesson__quiz-result--failed"}>
              <strong>{exerciseAttempt.passed ? copy.passed : copy.failed}</strong>
              <span>{copy.recorded} · {exerciseAttempt.score}%</span>
            </div>
          </section>
        );
      }

      if (typeof onExerciseSubmit !== "function") {
        return (
          <section className="student-lesson__activity">
            <span className="student-lesson__activity-label"><SvgIcon name="check" size="0.9rem" />{copy.title}</span>
            <p>{text(props.instruction)}</p>
            {text(props.starterCode).trim() && <pre className="student-lesson__code"><code>{text(props.starterCode)}</code></pre>}
            <p className="student-lesson__activity-note">{copy.unavailable}</p>
          </section>
        );
      }

      return (
        <section className="student-lesson__activity">
          <span className="student-lesson__activity-label"><SvgIcon name="check" size="0.9rem" />{copy.title}</span>
          <p>{text(props.instruction)}</p>
          <form className="student-lesson__exercise-form" onSubmit={(event) => {
            event.preventDefault();
            if (exerciseAnswer.trim() && !isSubmittingExercise)
              void onExerciseSubmit(node.id, exerciseAnswer);
          }}>
            <label className="student-lesson__exercise-label" htmlFor={`exercise-answer-${node.id}`}>{copy.answer}</label>
            <textarea
              id={`exercise-answer-${node.id}`}
              className="student-lesson__exercise-input"
              value={exerciseAnswer}
              onChange={(event) => setExerciseAnswer(event.target.value)}
              rows={8}
              spellCheck={false}
              maxLength={20000}
              disabled={isSubmittingExercise}
              autoCapitalize="off"
              autoCorrect="off"
            />
            <p className="student-lesson__activity-note">{copy.comparison}</p>
            {exerciseError && <p role="alert" className="student-lesson__quiz-error">{exerciseError || copy.retry}</p>}
            {!exerciseAnswer.trim() && <p className="student-lesson__exercise-hint">{copy.empty}</p>}
            <button type="submit" className="student-lesson__quiz-submit" disabled={!exerciseAnswer.trim() || isSubmittingExercise}>
              {isSubmittingExercise ? copy.submitting : copy.submit}
            </button>
          </form>
        </section>
      );
    }
    case "callout":
      return <aside className="student-lesson__callout student-lesson__callout--info">{typeof props.title === "string" && props.title && <strong>{text(props.title)}</strong>}<p>{text(props.content)}</p></aside>;
    case "divider":
      return <hr className="student-lesson__divider student-lesson__divider--solid" />;
    case "embed": {
      const url = safeUrl(props.url);
      return url ? <div className="student-lesson__embed"><strong>{text(props.title || "Incorporação")}</strong><a href={url} target="_blank" rel="noreferrer">{url}<SvgIcon name="arrow-right" size="0.9rem" /></a></div> : null;
    }
    default:
      return null;
  }
}

export function LessonContentTree({
  nodes,
  connections = [],
  quizAttempts = [],
  onQuizSubmit,
  submittingQuizNodeId = null,
  quizError = null,
  exerciseAttempts = [],
  onExerciseSubmit,
  submittingExerciseNodeId = null,
  exerciseError = null,
  exerciseErrorNodeId = null,
  courseCompletedAt = null,
  certificate = null,
  onCertificateIssue,
  isIssuingCertificate = false,
  certificateIssueError = null,
  locale = "pt-BR",
}: {
  nodes: CanvasNode[];
  connections?: CanvasConnection[];
  quizAttempts?: QuizAttemptResult[];
  onQuizSubmit?: (nodeId: string, selectedOptionIndex: number) => void | Promise<void>;
  submittingQuizNodeId?: string | null;
  quizError?: string | null;
  exerciseAttempts?: ExerciseAttemptResult[];
  onExerciseSubmit?: (nodeId: string, answer: string) => void | Promise<void>;
  submittingExerciseNodeId?: string | null;
  exerciseError?: string | null;
  exerciseErrorNodeId?: string | null;
  courseCompletedAt?: string | null;
  certificate?: CourseCertificate | null;
  onCertificateIssue?: () => void | Promise<void>;
  isIssuingCertificate?: boolean;
  certificateIssueError?: string | null;
  locale?: string;
}) {
  const orderedNodes = sortNodesByLessonFlow(nodes, connections);
  const visibleNodes = orderedNodes.filter(isStudentVisibleNode);
  const visibleById = new Map(visibleNodes.map((node) => [node.id, node]));
  const sourceById = new Map(nodes.map((node) => [node.id, node]));
  const attemptsByQuizNode = new Map(quizAttempts.map((attempt) => [attempt.quizNodeId, attempt]));
  const attemptsByExerciseNode = new Map(exerciseAttempts.map((attempt) => [attempt.exerciseNodeId, attempt]));

  const renderChildren = (parentId: string | null, path: Set<string>, depth: number) => {
    if (depth >= 4) return null;
    const children = visibleNodes
      .filter((node) => {
        if (parentId) return node.parentId === parentId;
        if (!node.parentId) return true;
        const parent = visibleById.get(node.parentId) ?? sourceById.get(node.parentId);
        return !parent || !isStudentVisibleNode(parent) || parent.type !== "container";
      })
;

    return children.map((node) => {
      if (path.has(node.id)) return null;
      const nextPath = new Set(path);
      nextPath.add(node.id);
      const isContainer = node.type === "container";
      return (
        <div
          className={`student-lesson__content-item student-lesson__content-item--${node.type}`}
          key={node.id}
          style={getNodePresentationStyle(node)}
        >
          {isContainer ? (
            <section className="student-lesson__container">
              {typeof node.props.title === "string" && node.props.title.trim() && (
                <h3 className="student-lesson__container-title">{node.props.title}</h3>
              )}
              {typeof node.props.content === "string" && node.props.content.trim() && (
                <p className="student-lesson__container-description">{node.props.content}</p>
              )}
              <div className="student-lesson__container-children">
                {renderChildren(node.id, nextPath, depth + 1)}
              </div>
            </section>
          ) : (
            <CanvasNodeContent
              node={node}
              quizAttempt={attemptsByQuizNode.get(node.id)}
              onQuizSubmit={onQuizSubmit}
              isSubmittingQuiz={submittingQuizNodeId === node.id}
              quizError={quizError}
              exerciseAttempt={attemptsByExerciseNode.get(node.id)}
              onExerciseSubmit={onExerciseSubmit}
              isSubmittingExercise={submittingExerciseNodeId === node.id}
              exerciseError={exerciseErrorNodeId === node.id ? exerciseError : null}
              courseCompletedAt={courseCompletedAt}
              certificate={certificate}
              onCertificateIssue={onCertificateIssue}
              isIssuingCertificate={isIssuingCertificate}
              certificateIssueError={certificateIssueError}
              locale={locale}
            />
          )}
        </div>
      );
    });
  };

  return <div className="student-lesson__content-flow">{renderChildren(null, new Set(), 0)}</div>;
}
