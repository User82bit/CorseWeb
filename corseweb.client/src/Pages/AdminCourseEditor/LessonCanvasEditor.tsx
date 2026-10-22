import { useMemo, useState } from "react";
import { useTranslation } from "../../i18n/useTranslation";
import type { Locale } from "../../i18n/types";
import type { Block, BlockType, Component, ComponentType, Lesson } from "../../types/course";
import "./LessonCanvasEditor.scss";

interface Props {
  lesson: Lesson;
  onChange: (blocks: Block[]) => void;
}

const BLOCK_TYPES: BlockType[] = ["texto", "imagem", "video", "codigo", "quiz", "exercicio", "divisor", "callout", "embed"];
const COMPONENT_TYPES: ComponentType[] = [
  "paragrafo", "titulo", "lista", "imagem", "video", "bloco-codigo",
  "quiz-multipla-escolha", "quiz-verdadeiro-falso", "exercicio-pratico",
  "divisor", "callout-info", "callout-aviso", "callout-sucesso", "callout-erro",
  "embed-youtube", "embed-github", "embed-figma",
];

const DEFAULT_COMPONENT: Record<BlockType, ComponentType> = {
  texto: "paragrafo",
  imagem: "imagem",
  video: "video",
  codigo: "bloco-codigo",
  quiz: "quiz-multipla-escolha",
  exercicio: "exercicio-pratico",
  divisor: "divisor",
  callout: "callout-info",
  embed: "embed-youtube",
};

const BLOCK_NAMES: Record<Locale, Record<BlockType, string>> = {
  "pt-BR": { texto: "Texto", imagem: "Imagem", video: "Vídeo", codigo: "Código", quiz: "Quiz", exercicio: "Exercício", divisor: "Divisor", callout: "Aviso", embed: "Incorporação" },
  en: { texto: "Text", imagem: "Image", video: "Video", codigo: "Code", quiz: "Quiz", exercicio: "Exercise", divisor: "Divider", callout: "Callout", embed: "Embed" },
  es: { texto: "Texto", imagem: "Imagen", video: "Vídeo", codigo: "Código", quiz: "Cuestionario", exercicio: "Ejercicio", divisor: "Separador", callout: "Aviso", embed: "Incrustación" },
};

const COMPONENT_NAMES: Record<Locale, Record<ComponentType, string>> = {
  "pt-BR": {
    paragrafo: "Parágrafo", titulo: "Título", lista: "Lista", imagem: "Imagem", video: "Vídeo", "bloco-codigo": "Código personalizado",
    "quiz-multipla-escolha": "Quiz de múltipla escolha", "quiz-verdadeiro-falso": "Verdadeiro ou falso", "exercicio-pratico": "Exercício prático",
    divisor: "Divisor", "callout-info": "Aviso informativo", "callout-aviso": "Aviso importante", "callout-sucesso": "Destaque positivo", "callout-erro": "Alerta",
    "embed-youtube": "YouTube", "embed-github": "GitHub", "embed-figma": "Figma",
  },
  en: {
    paragrafo: "Paragraph", titulo: "Heading", lista: "List", imagem: "Image", video: "Video", "bloco-codigo": "Custom code",
    "quiz-multipla-escolha": "Multiple-choice quiz", "quiz-verdadeiro-falso": "True or false", "exercicio-pratico": "Practical exercise",
    divisor: "Divider", "callout-info": "Information callout", "callout-aviso": "Warning callout", "callout-sucesso": "Success callout", "callout-erro": "Error callout",
    "embed-youtube": "YouTube", "embed-github": "GitHub", "embed-figma": "Figma",
  },
  es: {
    paragrafo: "Párrafo", titulo: "Título", lista: "Lista", imagem: "Imagen", video: "Vídeo", "bloco-codigo": "Código personalizado",
    "quiz-multipla-escolha": "Cuestionario de opción múltiple", "quiz-verdadeiro-falso": "Verdadero o falso", "exercicio-pratico": "Ejercicio práctico",
    divisor: "Separador", "callout-info": "Aviso informativo", "callout-aviso": "Aviso importante", "callout-sucesso": "Destacado positivo", "callout-erro": "Alerta",
    "embed-youtube": "YouTube", "embed-github": "GitHub", "embed-figma": "Figma",
  },
};

const COPY: Record<Locale, {
  title: string; description: string; addBlock: string; blockType: string; emptyBlocks: string;
  addComponent: string; componentType: string; emptyComponents: string; remove: string; up: string; down: string;
  columns: string; background: string; content: string; headingLevel: string; listItems: string; orderedList: string;
  imageUrl: string; altText: string; caption: string; videoUrl: string; codeLanguage: string; code: string;
  question: string; options: string; correctIndex: string; correctAnswer: string; trueLabel: string; falseLabel: string; explanation: string;
  instruction: string; starterCode: string; solution: string; style: string; url: string; embedTitle: string;
  backgrounds: Record<"transparent" | "subtle" | "accent", string>;
}> = {
  "pt-BR": {
    title: "Canvas da aula", description: "Monte o conteúdo com blocos e componentes. O código é salvo como conteúdo e não é executado aqui.",
    addBlock: "Adicionar bloco", blockType: "Tipo de bloco", emptyBlocks: "Esta aula ainda não tem blocos. Adicione um para começar.",
    addComponent: "Adicionar componente", componentType: "Componente", emptyComponents: "Este bloco está vazio.",
    remove: "Excluir", up: "Mover para cima", down: "Mover para baixo", columns: "Colunas", background: "Fundo",
    content: "Conteúdo", headingLevel: "Nível do título", listItems: "Itens (um por linha)", orderedList: "Lista numerada",
    imageUrl: "URL da imagem", altText: "Texto alternativo", caption: "Legenda", videoUrl: "URL do vídeo", codeLanguage: "Linguagem",
    code: "Código", question: "Pergunta", options: "Opções (uma por linha)", correctIndex: "Índice da resposta correta (começa em 0)",
    correctAnswer: "Resposta correta", trueLabel: "Verdadeiro", falseLabel: "Falso", explanation: "Explicação", instruction: "Instrução", starterCode: "Código inicial", solution: "Solução",
    style: "Estilo", url: "URL", embedTitle: "Título da incorporação",
    backgrounds: { transparent: "Transparente", subtle: "Suave", accent: "Destaque" },
  },
  en: {
    title: "Lesson canvas", description: "Build lesson content with blocks and components. Code is stored as content and is not executed here.",
    addBlock: "Add block", blockType: "Block type", emptyBlocks: "This lesson has no blocks yet. Add one to get started.",
    addComponent: "Add component", componentType: "Component", emptyComponents: "This block is empty.",
    remove: "Delete", up: "Move up", down: "Move down", columns: "Columns", background: "Background",
    content: "Content", headingLevel: "Heading level", listItems: "Items (one per line)", orderedList: "Numbered list",
    imageUrl: "Image URL", altText: "Alternative text", caption: "Caption", videoUrl: "Video URL", codeLanguage: "Language",
    code: "Code", question: "Question", options: "Options (one per line)", correctIndex: "Correct answer index (starts at 0)",
    correctAnswer: "Correct answer", trueLabel: "True", falseLabel: "False", explanation: "Explanation", instruction: "Instructions", starterCode: "Starter code", solution: "Solution",
    style: "Style", url: "URL", embedTitle: "Embed title",
    backgrounds: { transparent: "Transparent", subtle: "Subtle", accent: "Accent" },
  },
  es: {
    title: "Canvas de la lección", description: "Crea el contenido con bloques y componentes. El código se guarda como contenido y no se ejecuta aquí.",
    addBlock: "Añadir bloque", blockType: "Tipo de bloque", emptyBlocks: "Esta lección todavía no tiene bloques. Añade uno para comenzar.",
    addComponent: "Añadir componente", componentType: "Componente", emptyComponents: "Este bloque está vacío.",
    remove: "Eliminar", up: "Mover arriba", down: "Mover abajo", columns: "Columnas", background: "Fondo",
    content: "Contenido", headingLevel: "Nivel del título", listItems: "Elementos (uno por línea)", orderedList: "Lista numerada",
    imageUrl: "URL de la imagen", altText: "Texto alternativo", caption: "Leyenda", videoUrl: "URL del vídeo", codeLanguage: "Lenguaje",
    code: "Código", question: "Pregunta", options: "Opciones (una por línea)", correctIndex: "Índice de la respuesta correcta (empieza en 0)",
    correctAnswer: "Respuesta correcta", trueLabel: "Verdadero", falseLabel: "Falso", explanation: "Explicación", instruction: "Instrucción", starterCode: "Código inicial", solution: "Solución",
    style: "Estilo", url: "URL", embedTitle: "Título de la incrustación",
    backgrounds: { transparent: "Transparente", subtle: "Suave", accent: "Destacado" },
  },
};

function createId(prefix: string): string {
  const randomId = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${randomId}`;
}

function createComponent(type: ComponentType, order: number): Component {
  const defaults: Record<ComponentType, Record<string, unknown>> = {
    paragrafo: { content: "" },
    titulo: { content: "", level: 2 },
    lista: { items: ["Item 1", "Item 2"], ordered: false },
    imagem: { url: "", alt: "", caption: "" },
    video: { url: "", controls: true },
    "bloco-codigo": { code: "", language: "text" },
    "quiz-multipla-escolha": { question: "", options: ["Opção A", "Opção B"], correctIndex: 0, explanation: "" },
    "quiz-verdadeiro-falso": { question: "", correct: true, explanation: "" },
    "exercicio-pratico": { instruction: "", starterCode: "", solution: "" },
    divisor: { style: "solid" },
    "callout-info": { content: "" },
    "callout-aviso": { content: "" },
    "callout-sucesso": { content: "" },
    "callout-erro": { content: "" },
    "embed-youtube": { url: "", title: "" },
    "embed-github": { url: "", title: "" },
    "embed-figma": { url: "", title: "" },
  };
  return { id: createId("component"), type, order, props: defaults[type] };
}

function reorder<T>(items: T[], index: number, offset: number): T[] {
  const target = index + offset;
  if (index < 0 || target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function textValue(props: Record<string, unknown>, key: string): string {
  return typeof props[key] === "string" ? props[key] as string : "";
}

function LessonCanvasEditor({ lesson, onChange }: Props) {
  const { locale } = useTranslation();
  const copy = COPY[locale];
  const [newBlockType, setNewBlockType] = useState<BlockType>("texto");
  const [newComponentType, setNewComponentType] = useState<ComponentType>("paragrafo");
  const blocks = useMemo(() => [...(lesson.blocks ?? [])].sort((a, b) => a.order - b.order), [lesson.blocks]);

  const commit = (next: Block[]) => onChange(next.map((block, index) => ({ ...block, order: index + 1 })));

  const addBlock = () => {
    const type = newBlockType;
    const component = createComponent(DEFAULT_COMPONENT[type], 1);
    const block: Block = {
      id: createId("block"),
      type,
      order: blocks.length + 1,
      components: [component],
      layout: { columns: 1, gap: "md", padding: "md", background: "transparent" },
    };
    commit([...blocks, block]);
  };

  const updateBlock = (blockId: string, patch: Partial<Block>) => {
    commit(blocks.map((block) => block.id === blockId ? { ...block, ...patch } : block));
  };

  const deleteBlock = (blockId: string) => commit(blocks.filter((block) => block.id !== blockId));

  const moveBlock = (blockId: string, offset: number) => {
    const index = blocks.findIndex((block) => block.id === blockId);
    commit(reorder(blocks, index, offset));
  };

  const addComponent = (block: Block) => {
    const components = [...block.components].sort((a, b) => a.order - b.order);
    updateBlock(block.id, { components: [...components, createComponent(newComponentType, components.length + 1)] });
  };

  const updateComponent = (blockId: string, componentId: string, patch: Record<string, unknown>) => {
    const block = blocks.find((item) => item.id === blockId);
    if (!block) return;
    const components = block.components.map((component) => component.id === componentId
      ? { ...component, props: { ...component.props, ...patch } }
      : component);
    updateBlock(blockId, { components });
  };

  const deleteComponent = (block: Block, componentId: string) => {
    const components = [...block.components]
      .filter((component) => component.id !== componentId)
      .sort((a, b) => a.order - b.order)
      .map((component, index) => ({ ...component, order: index + 1 }));
    updateBlock(block.id, { components });
  };

  const moveComponent = (block: Block, componentId: string, offset: number) => {
    const components = [...block.components].sort((a, b) => a.order - b.order);
    const index = components.findIndex((component) => component.id === componentId);
    updateBlock(block.id, {
      components: reorder(components, index, offset).map((component, i) => ({ ...component, order: i + 1 })),
    });
  };

  return (
    <section className="lesson-canvas" aria-labelledby="lesson-canvas-title">
      <header className="lesson-canvas__header">
        <div>
          <h3 id="lesson-canvas-title" className="lesson-canvas__eyebrow">{copy.title}</h3>
          <p>{copy.description}</p>
        </div>
        <div className="lesson-canvas__add">
          <label>
            <span className="lesson-canvas__sr-only">{copy.blockType}</span>
            <select value={newBlockType} onChange={(event) => setNewBlockType(event.target.value as BlockType)}>
              {BLOCK_TYPES.map((type) => <option key={type} value={type}>{BLOCK_NAMES[locale][type]}</option>)}
            </select>
          </label>
          <button type="button" onClick={addBlock}>{copy.addBlock}</button>
        </div>
      </header>

      <div className="lesson-canvas__blocks">
        {blocks.length === 0 ? (
          <div className="lesson-canvas__empty">{copy.emptyBlocks}</div>
        ) : blocks.map((block, blockIndex) => (
          <article className={`lesson-canvas__block lesson-canvas__block--${block.layout?.background ?? "transparent"}`} key={block.id}>
            <header className="lesson-canvas__block-header">
              <div className="lesson-canvas__block-heading">
                <span className="lesson-canvas__block-index">{String(blockIndex + 1).padStart(2, "0")}</span>
                <strong>{BLOCK_NAMES[locale][block.type]}</strong>
              </div>
              <div className="lesson-canvas__actions">
                <button type="button" onClick={() => moveBlock(block.id, -1)} disabled={blockIndex === 0} aria-label={copy.up} title={copy.up}>↑</button>
                <button type="button" onClick={() => moveBlock(block.id, 1)} disabled={blockIndex === blocks.length - 1} aria-label={copy.down} title={copy.down}>↓</button>
                <button type="button" className="lesson-canvas__delete" onClick={() => deleteBlock(block.id)}>{copy.remove}</button>
              </div>
            </header>

            <div className="lesson-canvas__layout">
              <label>
                <span>{copy.columns}</span>
                <select
                  value={block.layout?.columns ?? 1}
                  onChange={(event) => updateBlock(block.id, { layout: { ...block.layout, columns: Number(event.target.value) as 1 | 2 | 3 } })}
                >
                  <option value={1}>1</option><option value={2}>2</option><option value={3}>3</option>
                </select>
              </label>
              <label>
                <span>{copy.background}</span>
                <select
                  value={block.layout?.background ?? "transparent"}
                  onChange={(event) => updateBlock(block.id, { layout: { ...block.layout, background: event.target.value as "transparent" | "subtle" | "accent" } })}
                >
                  {(["transparent", "subtle", "accent"] as const).map((background) => <option key={background} value={background}>{copy.backgrounds[background]}</option>)}
                </select>
              </label>
            </div>

            <div className="lesson-canvas__components">
              {[...block.components].sort((a, b) => a.order - b.order).map((component, componentIndex, orderedComponents) => {
                const props = component.props ?? {};
                const propText = (key: string) => textValue(props, key);
                const propList = (key: string) => Array.isArray(props[key]) ? (props[key] as unknown[]).filter((value): value is string => typeof value === "string") : [];
                const patch = (values: Record<string, unknown>) => updateComponent(block.id, component.id, values);
                const contentTypes: ComponentType[] = ["paragrafo", "titulo", "callout-info", "callout-aviso", "callout-sucesso", "callout-erro"];
                return (
                  <section className="lesson-canvas__component" key={component.id}>
                    <header className="lesson-canvas__component-header">
                      <strong>{COMPONENT_NAMES[locale][component.type]}</strong>
                      <div className="lesson-canvas__actions">
                        <button type="button" onClick={() => moveComponent(block, component.id, -1)} disabled={componentIndex === 0} aria-label={copy.up} title={copy.up}>↑</button>
                        <button type="button" onClick={() => moveComponent(block, component.id, 1)} disabled={componentIndex === orderedComponents.length - 1} aria-label={copy.down} title={copy.down}>↓</button>
                        <button type="button" className="lesson-canvas__delete" onClick={() => deleteComponent(block, component.id)}>{copy.remove}</button>
                      </div>
                    </header>

                    {contentTypes.includes(component.type) && (
                      <label className="lesson-canvas__field">
                        <span>{component.type === "titulo" ? copy.content : copy.content}</span>
                        <textarea rows={component.type === "paragrafo" ? 4 : 3} value={propText("content")} onChange={(event) => patch({ content: event.target.value })} />
                      </label>
                    )}

                    {component.type === "titulo" && (
                      <label className="lesson-canvas__field">
                        <span>{copy.headingLevel}</span>
                        <select value={Number(props.level ?? 2)} onChange={(event) => patch({ level: Number(event.target.value) as 1 | 2 | 3 })}>
                          <option value={1}>H1</option><option value={2}>H2</option><option value={3}>H3</option>
                        </select>
                      </label>
                    )}

                    {component.type === "lista" && (
                      <>
                        <label className="lesson-canvas__field"><span>{copy.listItems}</span><textarea rows={4} value={propList("items").join("\n")} onChange={(event) => patch({ items: event.target.value.split("\n") })} /></label>
                        <label className="lesson-canvas__checkbox"><input type="checkbox" checked={Boolean(props.ordered)} onChange={(event) => patch({ ordered: event.target.checked })} /><span>{copy.orderedList}</span></label>
                      </>
                    )}

                    {component.type === "imagem" && (
                      <>
                        <label className="lesson-canvas__field"><span>{copy.imageUrl}</span><input type="url" value={propText("url")} onChange={(event) => patch({ url: event.target.value })} placeholder="https://..." /></label>
                        <label className="lesson-canvas__field"><span>{copy.altText}</span><input value={propText("alt")} onChange={(event) => patch({ alt: event.target.value })} /></label>
                        <label className="lesson-canvas__field"><span>{copy.caption}</span><input value={propText("caption")} onChange={(event) => patch({ caption: event.target.value })} /></label>
                      </>
                    )}

                    {component.type === "video" && <label className="lesson-canvas__field"><span>{copy.videoUrl}</span><input type="url" value={propText("url")} onChange={(event) => patch({ url: event.target.value })} placeholder="https://..." /></label>}

                    {component.type === "bloco-codigo" && (
                      <>
                        <label className="lesson-canvas__field"><span>{copy.codeLanguage}</span><input value={propText("language")} onChange={(event) => patch({ language: event.target.value })} placeholder="typescript, python, csharp..." /></label>
                        <label className="lesson-canvas__field"><span>{copy.code}</span><textarea className="lesson-canvas__code-input" rows={8} spellCheck={false} value={propText("code")} onChange={(event) => patch({ code: event.target.value })} /></label>
                      </>
                    )}

                    {component.type === "quiz-multipla-escolha" && (
                      <>
                        <label className="lesson-canvas__field"><span>{copy.question}</span><textarea rows={2} value={propText("question")} onChange={(event) => patch({ question: event.target.value })} /></label>
                        <label className="lesson-canvas__field"><span>{copy.options}</span><textarea rows={4} value={propList("options").join("\n")} onChange={(event) => patch({ options: event.target.value.split("\n") })} /></label>
                        <label className="lesson-canvas__field"><span>{copy.correctIndex}</span><input type="number" min={0} max={Math.max(0, propList("options").length - 1)} value={Number(props.correctIndex ?? 0)} onChange={(event) => patch({ correctIndex: Math.max(0, Math.min(Math.max(0, propList("options").length - 1), Number(event.target.value) || 0)) })} /></label>
                        <label className="lesson-canvas__field"><span>{copy.explanation}</span><textarea rows={2} value={propText("explanation")} onChange={(event) => patch({ explanation: event.target.value })} /></label>
                      </>
                    )}

                    {component.type === "quiz-verdadeiro-falso" && (
                      <>
                        <label className="lesson-canvas__field"><span>{copy.question}</span><textarea rows={2} value={propText("question")} onChange={(event) => patch({ question: event.target.value })} /></label>
                        <label className="lesson-canvas__checkbox"><input type="checkbox" checked={props.correct !== false} onChange={(event) => patch({ correct: event.target.checked })} /><span>{copy.correctAnswer}: {props.correct === false ? copy.falseLabel : copy.trueLabel}</span></label>
                        <label className="lesson-canvas__field"><span>{copy.explanation}</span><textarea rows={2} value={propText("explanation")} onChange={(event) => patch({ explanation: event.target.value })} /></label>
                      </>
                    )}

                    {component.type === "exercicio-pratico" && (
                      <>
                        <label className="lesson-canvas__field"><span>{copy.instruction}</span><textarea rows={3} value={propText("instruction")} onChange={(event) => patch({ instruction: event.target.value })} /></label>
                        <label className="lesson-canvas__field"><span>{copy.starterCode}</span><textarea className="lesson-canvas__code-input" rows={5} spellCheck={false} value={propText("starterCode")} onChange={(event) => patch({ starterCode: event.target.value })} /></label>
                        <label className="lesson-canvas__field"><span>{copy.solution}</span><textarea className="lesson-canvas__code-input" rows={5} spellCheck={false} value={propText("solution")} onChange={(event) => patch({ solution: event.target.value })} /></label>
                      </>
                    )}

                    {component.type === "divisor" && (
                      <label className="lesson-canvas__field"><span>{copy.style}</span><select value={propText("style") || "solid"} onChange={(event) => patch({ style: event.target.value })}><option value="solid">Solid</option><option value="dashed">Dashed</option><option value="spaced">Spaced</option></select></label>
                    )}

                    {component.type.startsWith("embed-") && (
                      <>
                        <label className="lesson-canvas__field"><span>{copy.url}</span><input type="url" value={propText("url")} onChange={(event) => patch({ url: event.target.value })} placeholder="https://..." /></label>
                        <label className="lesson-canvas__field"><span>{copy.embedTitle}</span><input value={propText("title")} onChange={(event) => patch({ title: event.target.value })} /></label>
                      </>
                    )}
                  </section>
                );
              })}
            </div>

            <div className="lesson-canvas__add-component">
              <label>
                <span>{copy.componentType}</span>
                <select value={newComponentType} onChange={(event) => setNewComponentType(event.target.value as ComponentType)}>
                  {COMPONENT_TYPES.map((type) => <option key={type} value={type}>{COMPONENT_NAMES[locale][type]}</option>)}
                </select>
              </label>
              <button type="button" onClick={() => addComponent(block)}>{copy.addComponent}</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default LessonCanvasEditor;
