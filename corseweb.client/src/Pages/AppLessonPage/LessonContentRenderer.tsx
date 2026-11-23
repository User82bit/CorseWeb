import { useState } from "react";
import SvgIcon from "../../UIComplement/SvgIcon/SvgIcon";
import type { CanvasConnection, CanvasNode } from "../../types/course";
import { sortNodesByLessonFlow } from "./lessonFlow";
import type { QuizAttemptResult } from "../../store/enrollmentStore";
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
  locale?: string;
};

export function CanvasNodeContent({
  node,
  quizAttempt,
  onQuizSubmit,
  isSubmittingQuiz = false,
  quizError,
  locale = "pt-BR",
}: CanvasNodeContentProps) {
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const props = node.props ?? {};
  const text = (value: unknown) => String(value ?? "");

  switch (node.type) {
    case "start":
    case "container":
      return null;
    case "certificate":
      return <section className="student-lesson__activity"><span className="student-lesson__activity-label">Certificado</span><h3>{text(props.title || "Certificado")}</h3><p>{text(props.content)}</p></section>;
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
    case "exercise":
      return <section className="student-lesson__activity"><span className="student-lesson__activity-label"><SvgIcon name="check" size="0.9rem" />Exercício</span><p>{text(props.instruction)}</p><pre className="student-lesson__code"><code>{text(props.starterCode)}</code></pre></section>;
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
  locale = "pt-BR",
}: {
  nodes: CanvasNode[];
  connections?: CanvasConnection[];
  quizAttempts?: QuizAttemptResult[];
  onQuizSubmit?: (nodeId: string, selectedOptionIndex: number) => void | Promise<void>;
  submittingQuizNodeId?: string | null;
  quizError?: string | null;
  locale?: string;
}) {
  const orderedNodes = sortNodesByLessonFlow(nodes, connections);
  const visibleNodes = orderedNodes.filter(isStudentVisibleNode);
  const visibleById = new Map(visibleNodes.map((node) => [node.id, node]));
  const sourceById = new Map(nodes.map((node) => [node.id, node]));
  const attemptsByQuizNode = new Map(quizAttempts.map((attempt) => [attempt.quizNodeId, attempt]));

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
              locale={locale}
            />
          )}
        </div>
      );
    });
  };

  return <div className="student-lesson__content-flow">{renderChildren(null, new Set(), 0)}</div>;
}
