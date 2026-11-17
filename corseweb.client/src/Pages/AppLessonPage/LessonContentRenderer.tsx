import SvgIcon from "../../UIComplement/SvgIcon/SvgIcon";
import type { CanvasNode } from "../../types/course";
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

export function CanvasNodeContent({ node }: { node: CanvasNode }) {
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
      const options = Array.isArray(props.options) ? props.options.map((option) => String(option ?? "")) : [];
      return (
        <section className="student-lesson__activity">
          <span className="student-lesson__activity-label"><SvgIcon name="check" size="0.9rem" />Atividade</span>
          <h3>{text(props.question)}</h3>
          {options.length > 0 && (
            <ol className="student-lesson__quiz-options" type="A">
              {options.map((option, index) => <li key={index}>{option}</li>)}
            </ol>
          )}
          <p className="student-lesson__activity-note">A resposta e a validação automática serão habilitadas pelo motor de atividades.</p>
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

function compareReadingOrder(a: CanvasNode, b: CanvasNode): number {
  const orderA = typeof a.order === "number" ? a.order : Number.MAX_SAFE_INTEGER;
  const orderB = typeof b.order === "number" ? b.order : Number.MAX_SAFE_INTEGER;
  return orderA - orderB || a.y - b.y || a.x - b.x;
}

export function LessonContentTree({ nodes }: { nodes: CanvasNode[] }) {
  const visibleNodes = nodes.filter(isStudentVisibleNode);
  const visibleById = new Map(visibleNodes.map((node) => [node.id, node]));
  const sourceById = new Map(nodes.map((node) => [node.id, node]));

  const renderChildren = (parentId: string | null, path: Set<string>, depth: number) => {
    if (depth > 4) return null;
    const children = visibleNodes
      .filter((node) => {
        if (parentId) return node.parentId === parentId;
        if (!node.parentId) return true;
        const parent = visibleById.get(node.parentId) ?? sourceById.get(node.parentId);
        return !parent || !isStudentVisibleNode(parent) || parent.type !== "container";
      })
      .sort(compareReadingOrder);

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
            <CanvasNodeContent node={node} />
          )}
        </div>
      );
    });
  };

  return <div className="student-lesson__content-flow">{renderChildren(null, new Set(), 0)}</div>;
}
